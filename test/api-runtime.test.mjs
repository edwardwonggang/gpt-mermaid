/*
 * 职责：消费真实模块入口的内存构建，验证公开 load 契约与发行 runtime 导出。
 * 依赖：项目锁定的 esbuild、Node VM、隔离 script 事件夹具；不写 dist、不开浏览器。
 * 红线：不伪造 api.load；夹具只负责 script 网络事件和 document.currentScript。
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { installRuntimeDocument, runtimeDocument, fakeRuntime } from "./fixtures/runtime-document.mjs";

async function bundle(entry, format) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(`../src/${entry}`, import.meta.url))],
    bundle: true, target: ["es2020"], loader: { ".css": "text" }, format, write: false,
    // ESM 用 data URL 消费内存字节；只补真实模块位置，避免 data URL 无相对目录。
    ...(format === "esm" ? {
      define: { "import.meta.url": JSON.stringify("https://fixture.invalid/assets/gpt-mermaid.esm.js") },
    } : {}),
  });
  return result.outputFiles[0].text;
}

test("real ESM default API exposes load and preloads the renderer's exact runtime", async (t) => {
  const { requests } = installRuntimeDocument(t);
  const source = await bundle("esm-entry.js", "esm");
  const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const api = module.default;
  assert.equal(typeof api.load, "function");
  api.configure({ runtimeUrl: "/pinned/runtime.js", runtimeTimeoutMs: 200, autoInjectStyles: false });
  const first = api.load();
  const failure = assert.rejects(first, /failed to load/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].src, "https://fixture.invalid/pinned/runtime.js");
  requests[0].emit("error");
  await failure;
  const loaded = api.load();
  assert.equal(requests.length, 2, "the real public factory must retry failed downloads");
  const calls = [];
  const runtime = {
    initialize() { calls.push("initialize"); },
    async render() { calls.push("render"); throw new Error("runtime execution reached"); },
  };
  requests[1].succeed(runtime);
  assert.equal(await loaded, runtime);
  await assert.rejects(module.renderSvg("flowchart LR\nA-->B"), /runtime execution reached/);
  assert.deepEqual(calls, ["initialize", "render"]);
  assert.equal(requests.length, 2, "renderSvg must reuse the preloaded runtime");
});

test("公开 API 的连续配置和单次覆盖正确传到 runtime 初始化", async (t) => {
  const { requests } = installRuntimeDocument(t);
  const source = await bundle("esm-entry.js", "esm");
  // 隔离模块级全局配置；仍消费真实入口，不复用其它测试 configure 留下的状态。
  const { default: api } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#style-config`);
  const initialized = [];
  const reachedRuntime = new Error("已抵达真实初始化后的执行边界");
  const runtime = {
    initialize(config) { initialized.push(config); },
    async render() { throw reachedRuntime; },
  };
  async function render(options) {
    // 仅替代第三方绘图；factory、配置合并、初始化与缓存均执行真实源码。
    await assert.rejects(api.renderSvg("flowchart LR\nA-->B", options), (error) => error === reachedRuntime);
    return initialized.at(-1);
  }

  api.configure({ runtime, autoInjectStyles: false, themeVariables: { primaryColor: "#123456" } });
  api.configure({ preset: "tokyo", fontFamily: "Georgia, serif" });
  const global = await render();
  assert.equal(global.themeVariables.primaryColor, "#123456");
  assert.equal(global.themeVariables.flowchartNodeColor, api.presets.tokyo.node);
  assert.equal(global.fontFamily, "Georgia, serif");
  assert.equal(global.themeVariables.fontFamily, "Georgia, serif");

  const once = await render({
    preset: "github",
    fontFamily: "Arial, sans-serif",
    themeVariables: { primaryColor: "#abcdef", fontSize: "18px" },
  });
  assert.equal(once.themeVariables.primaryColor, "#abcdef");
  assert.equal(once.themeVariables.flowchartNodeColor, api.presets.github.node);
  assert.equal(once.themeVariables.fontFamily, "Arial, sans-serif");
  assert.equal(once.themeVariables.fontSize, "18px");
  assert.deepEqual(await render(), global, "单次覆盖与执行失败不能污染全局配置");
  assert.equal(initialized.length, 3);
  await render();
  assert.equal(initialized.length, 3, "相同有效配置仍复用初始化缓存");

  api.configure({ preset: "gpt", fontFamily: "Courier New, monospace" });
  const reset = await render();
  assert.equal(reset.themeVariables.flowchartNodeColor, api.presets.gpt.node);
  assert.equal(reset.themeVariables.primaryColor, "#123456");
  assert.equal(reset.themeVariables.fontFamily, "Courier New, monospace");
  assert.equal(reset.themeVariables.fontSize, "14px");
  assert.equal(initialized.length, 4);
  const snapshot=api.configure({preset:"gpt"});
  api.configure({preset:"tokyo",fontFamily:"Georgia, serif"});
  api.configure(snapshot);
  const afterRestore=await render({fontFamily:"Arial, sans-serif"});
  assert.equal(afterRestore.themeVariables.fontFamily,"Arial, sans-serif","公开快照往返不能锁住派生字体");
  assert.equal(afterRestore.themeVariables.primaryColor,"#123456","快照恢复仍保留显式覆盖");
  assert.equal(requests.length, 0, "显式注入 runtime 的验证不访问网络");
});

for (const [entry, format] of [["cjs-entry.cjs", "cjs"], ["umd-entry.js", "iife"]]) {
  test(`real ${format} API loads the shipped runtime bytes without adopting foreign Mermaid`, async () => {
    const source = await bundle(entry, format);
    const context = vm.createContext({
      console, setTimeout, clearTimeout, AbortController, URL,
      module: { exports: {} }, __dirname: "/fixture/assets", addEventListener() {},
    });
    context.window = context;
    context.self = context;
    const { doc, requests } = runtimeDocument(context);
    context.document = doc;
    context.mermaid = fakeRuntime("foreign");
    vm.runInContext(source, context);
    const api = format === "cjs" ? context.module.exports : context.GPTMermaid;
    assert.equal(typeof api.load, "function");
    const loading = api.load({ runtimeUrl: "https://fixture.invalid/pinned/runtime.js", runtimeTimeoutMs: 2000 });
    assert.equal(requests.length, 1);
    const shipped = await fs.readFile(new URL("../dist/gpt-mermaid.runtime.min.js", import.meta.url), "utf8");
    requests[0].execute(() => vm.runInContext(shipped, context));
    const owned = context.mermaid;
    // load 回调前被外部覆写仍不能抢占本 script 导出的对象。
    context.mermaid = fakeRuntime("foreign-after");
    requests[0].emit("load");
    const runtime = await loading;
    assert.equal(runtime, owned);
    assert.equal(typeof runtime.render, "function");
    assert.equal(typeof runtime.initialize, "function");
    assert.equal(runtime, context.__esbuild_esm_mermaid_nm.mermaid.default);
    assert.equal(await api.load({ runtimeUrl: "https://fixture.invalid/pinned/runtime.js" }), runtime);
    assert.equal(requests.length, 1);
  });
}

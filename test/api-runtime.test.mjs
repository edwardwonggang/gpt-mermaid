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

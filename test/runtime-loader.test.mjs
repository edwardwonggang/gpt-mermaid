import test from "node:test";
import assert from "node:assert/strict";
import { createRenderer } from "../src/render.js";
import { DEFAULT_RUNTIME_TIMEOUT_MS } from "../src/runtime-guard.js";
import { installRuntimeDocument, fakeRuntime } from "./fixtures/runtime-document.mjs";

const tick = () => new Promise((resolve) => setImmediate(resolve));
const options = { runtimeTimeoutMs: 200 };

test("failed script is removed and the same renderer retries with a fresh request", async (t) => {
  const { requests, scripts } = installRuntimeDocument(t);
  const renderer = createRenderer("https://fixture.invalid/assets/");
  const first = renderer.load(options);
  const failed = assert.rejects(first, /failed to load/);
  requests[0].emit("error");
  await failed;
  assert.equal(scripts.length, 0);
  assert.equal(requests[0].listenerCount(), 0);

  const expected = fakeRuntime();
  const retry = renderer.load(options);
  assert.equal(requests.length, 2);
  requests[1].succeed(expected);
  assert.equal(await retry, expected);
  assert.equal(await renderer.load(options), expected);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].listenerCount(), 0);
});

test("a silent script cannot leave runtimePromise permanently pending", async (t) => {
  const { requests, scripts } = installRuntimeDocument(t);
  const renderer = createRenderer();
  await assert.rejects(renderer.load({ runtimeTimeoutMs: 10 }), /runtime load timed out/);
  assert.equal(scripts.length, 0);
  const retry = renderer.load(options);
  assert.equal(requests.length, 2);
  // 已超时脚本即使迟到执行，也不能给第二次请求冒充导出。
  requests[0].succeed(fakeRuntime("late"));
  const expected = fakeRuntime("retry");
  requests[1].succeed(expected);
  assert.equal(await retry, expected);
});

test("shared downloads have a deadline independent of callers with longer budgets", async (t) => {
  const { requests, scripts } = installRuntimeDocument(t);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const renderer = createRenderer();
  const loading = renderer.load({ runtimeTimeoutMs: DEFAULT_RUNTIME_TIMEOUT_MS * 2 });
  const failure = assert.rejects(loading, /runtime download timed out/);
  t.mock.timers.tick(DEFAULT_RUNTIME_TIMEOUT_MS);
  await failure;
  assert.equal(scripts.length, 0);
  const retry = renderer.load(options);
  requests[1].succeed(fakeRuntime());
  await retry;
});

test("one caller aborts while another renderer finishes the shared URL", async (t) => {
  const { requests, scripts } = installRuntimeDocument(t);
  const first = createRenderer(), second = createRenderer();
  const controller = new AbortController();
  const cancelled = first.load({ ...options, signal: controller.signal });
  const failure = assert.rejects(cancelled, (error) => error.name === "AbortError");
  const retained = second.load(options);
  assert.equal(requests.length, 1);
  controller.abort();
  await failure;
  assert.equal(scripts.length, 1);
  const expected = fakeRuntime();
  requests[0].succeed(expected);
  assert.equal(await retained, expected);
});

test("one short waiter times out without cancelling a longer waiter", async (t) => {
  const { requests, scripts } = installRuntimeDocument(t);
  const renderer = createRenderer();
  const short = renderer.load({ runtimeTimeoutMs: 10 });
  const failure = assert.rejects(short, /runtime load timed out/);
  const long = renderer.load(options);
  await failure;
  assert.equal(scripts.length, 1);
  requests[0].succeed(fakeRuntime());
  await long;
  assert.equal(requests.length, 1);
});

test("the last cancellation cleans up listeners and a later caller can retry", async (t) => {
  const { requests, scripts } = installRuntimeDocument(t);
  const renderer = createRenderer();
  const controller = new AbortController();
  const loading = renderer.load({ ...options, signal: controller.signal });
  const failure = assert.rejects(loading, (error) => error.name === "AbortError");
  controller.abort();
  await failure;
  assert.equal(scripts.length, 0);
  assert.equal(requests[0].listenerCount(), 0);
  assert.equal(Object.hasOwn(globalThis, "mermaid"), false, "temporary global capture must be restored");
  const retry = renderer.load(options);
  requests[1].succeed(fakeRuntime());
  await retry;
});

test("URLs own independent instances and ready loads ignore unrelated globals", async (t) => {
  const { requests } = installRuntimeDocument(t);
  const foreign = fakeRuntime("foreign");
  globalThis.mermaid = foreign;
  const firstRenderer = createRenderer();
  const secondRenderer = createRenderer();
  const first = firstRenderer.load({ ...options, runtimeUrl: "/a.js" });
  const second = secondRenderer.load({ ...options, runtimeUrl: "/b.js" });
  assert.equal(requests.length, 2, "an existing global must not short-circuit downloading");
  const a = fakeRuntime("A"), b = fakeRuntime("B");
  requests[1].succeed(b);
  requests[0].succeed(a);
  assert.equal(await first, a);
  assert.equal(await second, b);
  globalThis.mermaid = foreign;
  assert.equal(await secondRenderer.load({ ...options, runtimeUrl: "/a.js" }), a);
  assert.equal(await firstRenderer.load({ ...options, runtimeUrl: "/b.js" }), b);
  assert.equal(requests.length, 2);
});

test("a foreign assignment during download cannot satisfy an empty runtime script", async (t) => {
  const { requests, scripts } = installRuntimeDocument(t);
  const renderer = createRenderer();
  const first = renderer.load(options);
  const failure = assert.rejects(first, /runtime must expose initialize and render/);
  globalThis.mermaid = fakeRuntime("foreign");
  requests[0].emit("load");
  await failure;
  assert.equal(scripts.length, 0);
  const retry = renderer.load(options);
  requests[1].succeed(fakeRuntime());
  await retry;
});

test("explicit runtime injection is validated, needs no DOM and respects cancellation", async (t) => {
  const { requests } = installRuntimeDocument(t);
  const renderer = createRenderer();
  const injected = fakeRuntime("injected");
  delete globalThis.document;
  assert.equal(await renderer.load({ runtime: injected }), injected);
  await assert.rejects(renderer.load({ runtime: { render() {} } }), /initialize and render/);
  await assert.rejects(renderer.load(), /requires a document or explicit runtime/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(renderer.load({ runtime: injected, signal: controller.signal }),
    (error) => error.name === "AbortError");
  assert.equal(requests.length, 0);
});

test("script insertion errors and unusable exports are terminal and retryable", async (t) => {
  const { doc, requests, scripts } = installRuntimeDocument(t);
  const renderer = createRenderer();
  const append = doc.head.append;
  doc.head.append = () => { throw new Error("insertion denied"); };
  await assert.rejects(renderer.load(options), /insertion denied/);
  assert.equal(Object.hasOwn(globalThis, "mermaid"), false);
  doc.head.append = append;
  const unusable = renderer.load(options);
  const failure = assert.rejects(unusable, /initialize and render/);
  requests[0].succeed({ render() {} });
  await failure;
  assert.equal(scripts.length, 0);
  const retry = renderer.load(options);
  requests[1].succeed(fakeRuntime());
  await retry;
});

test("foreign export accessors are preserved and require explicit injection", async (t) => {
  const { requests } = installRuntimeDocument(t);
  const foreign = fakeRuntime("foreign");
  const get = () => foreign;
  Object.defineProperty(globalThis, "mermaid", { configurable: true, get });
  const renderer = createRenderer();
  await assert.rejects(renderer.load(options), /pass an explicit runtime/);
  assert.equal(Object.getOwnPropertyDescriptor(globalThis, "mermaid").get, get);
  assert.equal(await renderer.load({ runtime: foreign }), foreign);
  assert.equal(requests.length, 0);
});

test("empty or blocked sources fail before downloading", async (t) => {
  const { requests } = installRuntimeDocument(t);
  await assert.rejects(createRenderer().renderSvg("", options), /diagram source is empty/);
  assert.equal(requests.length, 0);
});

test("renderers sharing an injected runtime do not initialize over a timed-out execution", async (t) => {
  installRuntimeDocument(t);
  const events = [];
  let release;
  const runtime = {
    initialize(config) { events.push(config.themeVariables.name); },
    render() { return new Promise((resolve) => { release = resolve; }); },
  };
  const first = createRenderer(), second = createRenderer();
  const settings = { runtime, renderTimeoutMs: 10, themeVariables: { name: "first" } };
  const timed = first.renderSvg("flowchart LR\nA-->B", settings);
  await assert.rejects(timed, /render timed out/);
  await assert.rejects(second.renderSvg("flowchart LR\nC-->D", {
    ...settings, themeVariables: { name: "second" },
  }), /render queue timed out/);
  assert.deepEqual(events, ["first"]);
  const independent = {
    initialize() { events.push("independent"); },
    async render() { throw new Error("independent reached"); },
  };
  await assert.rejects(second.renderSvg("flowchart LR\nC-->D", {
    ...settings, runtime: independent,
  }), /independent reached/);
  assert.deepEqual(events, ["first", "independent"], "another runtime has its own execution lock");
  release({ svg: "<svg/>" });
  await tick();
  // 前次结果在 signal 检查处被丢弃；新的 render 才能安全重新初始化同一实例。
  runtime.render = async () => { throw new Error("resumed"); };
  await assert.rejects(second.renderSvg("flowchart LR\nC-->D", {
    ...settings, themeVariables: { name: "second" },
  }), /resumed/);
  assert.deepEqual(events, ["first", "independent", "second"]);
});

test("initialization cache follows runtime identity and configuration across renderers", async (t) => {
  installRuntimeDocument(t);
  const events = [];
  const make = (name) => ({
    initialize(config) { events.push(`${name}:${config.themeVariables.name}`); },
    async render() { throw new Error("stop before SVG"); },
  });
  const a = make("a"), b = make("b");
  const first = createRenderer(), second = createRenderer();
  async function render(renderer, runtime, name) {
    await assert.rejects(renderer.renderSvg("flowchart LR\nA-->B", {
      runtime, themeVariables: { name }, renderTimeoutMs: 200,
    }), /stop before SVG/);
  }
  await render(first, a, "one");
  await render(first, b, "one");
  await render(second, a, "two");
  await render(first, a, "one");
  assert.deepEqual(events, ["a:one", "b:one", "a:two", "a:one"]);
});

/*
 * 职责：按 document / URL 共享有截止时间的运行库下载及其实际导出。
 * 调用方：render.js 的 load / renderSvg；依赖 runtime-guard 的等待保护。
 * 红线：调用方取消只退出自己的等待；失败必须删除本次 script，才能重试。
 * 只认 document.currentScript 指向本次节点时的导出，不能接管页面其它 Mermaid。
 */

import {
  DEFAULT_RUNTIME_TIMEOUT_MS, abortError, positiveTimeout, throwIfAborted,
  timeoutError, withAbortTimeout,
} from "./runtime-guard.js";

const downloads = new WeakMap();
const captures = new WeakMap();

function validateRuntime(runtime) {
  if (typeof runtime?.render !== "function" || typeof runtime?.initialize !== "function") {
    throw new Error("gpt-mermaid: runtime must expose initialize and render");
  }
  return runtime;
}

// 发行 runtime 用同步 classic script 写 globalThis.mermaid。临时保留普通全局
// 属性的读写语义，并按 currentScript 归属捕获；迟到/外部 script 的赋值不会被认领。
function captureRuntime(globalObject, doc, script, receive) {
  let capture = captures.get(globalObject);
  if (!capture) {
    const descriptor = Object.getOwnPropertyDescriptor(globalObject, "mermaid");
    if (descriptor && (!descriptor.configurable || !("value" in descriptor) || !descriptor.writable)) {
      throw new Error("gpt-mermaid: cannot track runtime export; pass an explicit runtime");
    }
    let value = descriptor?.value;
    const owners = new Map();
    const get = () => value;
    const set = (next) => {
      value = next;
      owners.get(doc.currentScript)?.(next);
    };
    Object.defineProperty(globalObject, "mermaid", {
      configurable: true, enumerable: descriptor?.enumerable ?? true, get, set,
    });
    capture = {
      owners,
      release() {
        if (owners.size) return;
        const current = Object.getOwnPropertyDescriptor(globalObject, "mermaid");
        // 外部代码重定义了属性时不覆盖它；本模块只恢复自己安装的捕获器。
        if (current?.get === get && current?.set === set) {
          if (!descriptor && value === undefined) delete globalObject.mermaid;
          else Object.defineProperty(globalObject, "mermaid", {
            configurable: true, enumerable: true, writable: true, ...descriptor, value,
          });
        }
        captures.delete(globalObject);
      },
    };
    captures.set(globalObject, capture);
  }
  capture.owners.set(script, receive);
  return () => {
    capture.owners.delete(script);
    capture.release();
  };
}

function startDownload(doc, url, registry) {
  const globalObject = doc.defaultView || globalThis;
  const script = doc.createElement("script");
  const record = { state: "loading", script, waiters: 0, runtime: null, promise: null, fail: null };
  let resolve;
  let reject;
  record.promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  // 最后一个等待者退出时共享操作仍需进入终态，拒绝必须始终有人消费。
  record.promise.catch(() => {});
  registry.set(url, record);
  let releaseCapture = () => {};
  let exported;
  let timer;
  function finish(error, runtime) {
    if (record.state !== "loading") return;
    record.state = error ? "failed" : "ready";
    clearTimeout(timer);
    script.removeEventListener("load", onLoad);
    script.removeEventListener("error", onError);
    releaseCapture();
    if (error) {
      script.remove();
      if (registry.get(url) === record) registry.delete(url);
      reject(error);
    } else {
      record.runtime = runtime;
      resolve(runtime);
    }
  }
  function onLoad() {
    try { finish(null, validateRuntime(exported)); }
    catch (error) { finish(error); }
  }
  function onError() { finish(new Error(`gpt-mermaid: failed to load ${url}`)); }
  record.fail = finish;
  try {
    releaseCapture = captureRuntime(globalObject, doc, script, (runtime) => { exported = runtime; });
    script.src = url;
    script.async = true;
    script.dataset.gptMermaidRuntime = url;
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    // 共享下载有独立的硬上限，不能由不断加入的调用者延长；各调用方可提前退出。
    timer = setTimeout(() => finish(timeoutError("gpt-mermaid: runtime download timed out")),
      DEFAULT_RUNTIME_TIMEOUT_MS);
    doc.head.append(script);
  } catch (error) {
    finish(error);
  }
  return record;
}

export async function loadRuntime(config = {}, baseUrl, signal = config.signal) {
  throwIfAborted(signal);
  if (config.runtime != null) return validateRuntime(config.runtime);
  const doc = globalThis.document;
  if (!doc?.head) throw new Error("gpt-mermaid: runtime loading requires a document or explicit runtime");
  const url = new URL(config.runtimeUrl || "gpt-mermaid.runtime.min.js",
    config.baseUrl || baseUrl || doc.baseURI).href;
  let registry = downloads.get(doc);
  if (!registry) { registry = new Map(); downloads.set(doc, registry); }
  const record = registry.get(url) || startDownload(doc, url, registry);
  record.waiters++;
  try {
    return await withAbortTimeout(record.promise, {
      signal,
      timeoutMs: positiveTimeout(config.runtimeTimeoutMs, DEFAULT_RUNTIME_TIMEOUT_MS),
      timeoutMessage: "gpt-mermaid: runtime load timed out",
    });
  } finally {
    record.waiters--;
    // 无人等待的悬挂下载立即淘汰；有其它等待者时绝不能撤掉共享 script。
    if (!record.waiters && record.state === "loading") {
      record.fail(abortError("gpt-mermaid: runtime download has no waiters"));
    }
  }
}

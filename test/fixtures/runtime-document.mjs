// 只替代浏览器 script 事件；load / factory / 队列均执行真实源码。
export function runtimeDocument(globalObject = globalThis) {
  const scripts = [];
  const requests = [];
  const doc = {
    baseURI: "https://fixture.invalid/",
    currentScript: null,
    defaultView: globalObject,
    getElementById() { return {}; },
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return scripts; },
    createElement(tag) {
      const handlers = new Map();
      const script = {
        tagName: tag.toUpperCase(), dataset: {},
        addEventListener(name, fn) {
          if (!handlers.has(name)) handlers.set(name, new Set());
          handlers.get(name).add(fn);
        },
        removeEventListener(name, fn) { handlers.get(name)?.delete(fn); },
        emit(name) { for (const fn of [...handlers.get(name) || []]) fn(); },
        listenerCount() { return [...handlers.values()].reduce((sum, fns) => sum + fns.size, 0); },
        remove() { const index = scripts.indexOf(script); if (index !== -1) scripts.splice(index, 1); },
        execute(callback) {
          doc.currentScript = script;
          try { callback(); } finally { doc.currentScript = null; }
        },
        succeed(runtime) {
          script.execute(() => { globalObject.mermaid = runtime; });
          script.emit("load");
        },
      };
      return script;
    },
    head: { append(script) { scripts.push(script); requests.push(script); } },
  };
  return { doc, scripts, requests };
}

export function installRuntimeDocument(t) {
  const oldDoc = Object.getOwnPropertyDescriptor(globalThis, "document");
  const oldRuntime = Object.getOwnPropertyDescriptor(globalThis, "mermaid");
  const fixture = runtimeDocument();
  globalThis.document = fixture.doc;
  delete globalThis.mermaid;
  t.after(() => {
    if (oldDoc) Object.defineProperty(globalThis, "document", oldDoc);
    else delete globalThis.document;
    if (oldRuntime) Object.defineProperty(globalThis, "mermaid", oldRuntime);
    else delete globalThis.mermaid;
  });
  return fixture;
}

export const fakeRuntime = (version = "test") => ({
  version, initialize() {}, async render() { return { svg: "<svg/>" }; },
});

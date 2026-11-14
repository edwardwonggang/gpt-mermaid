import { createGPTMermaid } from "./factory.js";

function moduleBase() {
  const current = document.currentScript;
  if (current?.src) return new URL(".", current.src).href;
  return new URL(".", document.baseURI).href;
}

const api = createGPTMermaid(globalThis, moduleBase());
globalThis.GPTMermaid = api;
export default api;

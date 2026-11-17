/// <reference path="../../../types/umd.d.ts" />

const controller = new AbortController();
const config = {
  preset: "gpt",
  signal: controller.signal,
  renderTimeoutMs: 12_000,
  runtimeTimeoutMs: 15_000,
};
GPTMermaid.configure(config);
void GPTMermaid.renderSvg("flowchart LR\nA --> B", config);
void GPTMermaid.renderAll(document, config);
window.GPTMermaid.configure({ preset: "tokyo" });

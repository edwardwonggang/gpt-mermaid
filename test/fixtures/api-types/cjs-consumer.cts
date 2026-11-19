import GPTMermaid = require("gpt-mermaid");
import type { GPTMermaidConfig } from "gpt-mermaid";

const controller = new AbortController();
const config: GPTMermaidConfig = {
  preset: "gpt",
  signal: controller.signal,
  renderTimeoutMs: 12_000,
  runtimeTimeoutMs: 15_000,
};
const typed: GPTMermaid.GPTMermaidApi = GPTMermaid;
typed.configure(config);
const loaded: Promise<GPTMermaid.GPTMermaidRuntime> = typed.load(config);
void loaded.then((runtime) => typed.load({ runtime }));
void typed.renderSvg("flowchart LR\nA --> B", config);
void typed.render("flowchart LR\nA --> B", { ...config, target: "#diagram" });
void typed.renderAll(document, config);
void typed.autoRender(config);

// @ts-expect-error The CommonJS runtime exports the API object directly.
GPTMermaid.default;

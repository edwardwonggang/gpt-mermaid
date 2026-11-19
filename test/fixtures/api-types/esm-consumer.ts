import GPTMermaid, {
  mount,
  render,
  renderAll,
  renderSvg,
  version,
  type GPTMermaidConfig,
  type GPTMermaidRuntime,
} from "gpt-mermaid";

const controller = new AbortController();
const config: GPTMermaidConfig = {
  preset: "gpt",
  signal: controller.signal,
  renderTimeoutMs: 12_000,
  runtimeTimeoutMs: 15_000,
};
GPTMermaid.configure(config);
const loaded: Promise<GPTMermaidRuntime> = GPTMermaid.load(config);
void loaded.then((runtime) => GPTMermaid.load({ runtime }));
// @ts-expect-error 显式运行库必须有 initialize 与 render 两种能力。
void GPTMermaid.load({ runtime: { render: async () => ({ svg: "<svg/>" }) } });
void renderSvg("flowchart LR\nA --> B", config);
void mount("#diagram", "flowchart LR\nA --> B", config);
void render("flowchart LR\nA --> B", { ...config, target: "#diagram" });
void renderAll(document, config);
void GPTMermaid.autoRender(config);
void version;

// @ts-expect-error AbortSignal is required; arbitrary objects are not signals.
GPTMermaid.renderSvg("flowchart LR\nA --> B", { signal: {} });
// @ts-expect-error Timeouts are numeric milliseconds.
GPTMermaid.renderAll(document, { renderTimeoutMs: "12000" });

// The UMD-only declaration must not leak into the npm ESM entry.
// @ts-expect-error window.GPTMermaid is available only through types/umd.d.ts.
window.GPTMermaid;

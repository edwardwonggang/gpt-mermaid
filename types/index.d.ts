export interface GPTMermaidRuntime {
  initialize(config: Record<string, unknown>): void;
  render(id: string, source: string): Promise<{ svg: string }>;
  version?: string;
}

export interface GPTMermaidConfig {
  preset?: "gpt" | "github" | "linear" | "tokyo" | "nord" | string;
  themeVariables?: Record<string, string>;
  fontFamily?: string;
  runtimeUrl?: string | null;
  runtime?: GPTMermaidRuntime | null;
  baseUrl?: string | null;
  signal?: AbortSignal;
  /** 排队与实际执行分别使用此预算；超时不代表底层第三方任务已停止。 */
  renderTimeoutMs?: number;
  /** 当前调用方的等待预算；共享 script 下载另有 15000ms 硬上限。 */
  runtimeTimeoutMs?: number;
  autoInjectStyles?: boolean;
  securityLevel?: "strict";
  menu?: boolean;
  fullscreen?: boolean;
  copyImage?: boolean;
  download?: boolean;
  maxInlineWidth?: number;
  fitMaxHeight?: number;
  adaptiveLayout?: false | {
    enabled?: boolean;
    maxWidth?: number;
    maxHeight?: number;
    gap?: number;
  };
  target?: string | Element;
  container?: string | Element;
  sourceElement?: Element | null;
  [key: string]: unknown;
}

export interface GPTMermaidRenderResult {
  svg: string;
  width: number;
  height: number;
  source: string;
  routing: {
    status: "clear" | "unresolved" | "not-applicable";
    checkedEdges: number;
    crossings: number;
    crossingsBefore: number;
    spacingFactor: number;
    reason: "" | "non-planar-edge-bound" | "search-budget" | "fixed-obstacles";
  };
}

export interface GPTMermaidDiagram {
  figure: HTMLElement;
  stage: HTMLElement;
  image: HTMLImageElement;
  source: string;
  result: GPTMermaidRenderResult | null;
  destroy(): void;
  fit(): void;
  zoomIn(): void;
  zoomOut(): void;
  download(): void;
  copySource(): Promise<void>;
  copyImage(): Promise<void>;
  expand(): void;
}

export interface GPTMermaidApi {
  readonly version: string;
  readonly presets: Record<string, Record<string, string>>;
  configure(options?: GPTMermaidConfig): GPTMermaidConfig;
  /** 预加载并返回本 URL 实际导出的运行库；取消只退出当前调用方的等待。 */
  load(options?: GPTMermaidConfig): Promise<GPTMermaidRuntime>;
  renderSvg(source: string, options?: GPTMermaidConfig): Promise<GPTMermaidRenderResult>;
  sanitizeSource(source: string): string | null;
  sanitizeSvg(svg: string): string;
  mount(target: string | Element, source: string, options?: GPTMermaidConfig): Promise<GPTMermaidDiagram>;
  render(source: string, options?: GPTMermaidConfig): Promise<GPTMermaidDiagram>;
  renderAll(root?: ParentNode, options?: GPTMermaidConfig): Promise<GPTMermaidDiagram[]>;
  autoRender(options?: GPTMermaidConfig): Promise<GPTMermaidDiagram[]>;
  destroy(diagram: GPTMermaidDiagram): void;
}

declare const GPTMermaid: GPTMermaidApi;
export default GPTMermaid;

export const version: string;
export const presets: Record<string, Record<string, string>>;
export const configure: GPTMermaidApi["configure"];
export const renderSvg: GPTMermaidApi["renderSvg"];
export const sanitizeSource: GPTMermaidApi["sanitizeSource"];
export const sanitizeSvg: GPTMermaidApi["sanitizeSvg"];
export const mount: GPTMermaidApi["mount"];
export const render: GPTMermaidApi["render"];
export const renderAll: GPTMermaidApi["renderAll"];
export const autoRender: GPTMermaidApi["autoRender"];
export const destroy: GPTMermaidApi["destroy"];

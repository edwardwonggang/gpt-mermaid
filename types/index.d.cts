// CommonJS declarations for the module.exports object built by src/cjs-entry.cjs.
import type {
  GPTMermaidApi as Api,
  GPTMermaidConfig as Config,
  GPTMermaidDiagram as Diagram,
  GPTMermaidRenderResult as RenderResult,
  GPTMermaidRuntime as Runtime,
} from "./index.js";

declare const GPTMermaid: Api;

declare namespace GPTMermaid {
  type GPTMermaidApi = Api;
  type GPTMermaidConfig = Config;
  type GPTMermaidDiagram = Diagram;
  type GPTMermaidRenderResult = RenderResult;
  type GPTMermaidRuntime = Runtime;
}

export = GPTMermaid;

// UMD-only declarations. Include explicitly from a browser script project with:
// /// <reference path="./node_modules/gpt-mermaid/types/umd.d.ts" />
import type { GPTMermaidApi } from "./index.js";

export as namespace GPTMermaid;
export = GPTMermaid;

declare const GPTMermaid: GPTMermaidApi;

declare global {
  interface Window {
    GPTMermaid: GPTMermaidApi;
  }
}

/* 职责：组装公共 API，注入样式并暴露可被 UMD/ESM/CJS 复用的 factory。 */

import { DEFAULT_CONFIG, PRESETS, VERSION, resolveConfig } from "./defaults.js";
import { createRenderer } from "./render.js";
import { sanitizeMermaidSource, sanitizeSvgMarkup } from "./sanitize.js";
import { createUi } from "./ui.js";
import cssText from "./styles.css";

function injectStyles(doc, enabled) {
  if (!enabled || !doc?.head || doc.getElementById("gpt-mermaid-styles")) return;
  const style = doc.createElement("style");
  style.id = "gpt-mermaid-styles";
  style.textContent = cssText;
  doc.head.append(style);
}

export function createGPTMermaid(globalObject, baseUrl) {
  let config = resolveConfig({}, DEFAULT_CONFIG);
  const renderer = createRenderer(baseUrl || globalObject.document?.baseURI || "http://localhost/");
  const ui = createUi({
    renderSvg: (source, options) => renderer.renderSvg(source, resolveConfig(options, config)),
    getConfig: (options) => resolveConfig(options, config),
  });

  function configure(next = {}) {
    config = resolveConfig(next, config);
    if (globalObject.document) injectStyles(globalObject.document, config.autoInjectStyles);
    return { ...config, themeVariables: { ...config.themeVariables } };
  }

  async function renderSvg(source, options = {}) {
    const effective = resolveConfig(options, config);
    if (globalObject.document) injectStyles(globalObject.document, effective.autoInjectStyles);
    return renderer.renderSvg(source, effective);
  }

  async function mount(target, source, options = {}) {
    const effective = resolveConfig(options, config);
    if (globalObject.document) injectStyles(globalObject.document, effective.autoInjectStyles);
    const element = typeof target === "string" ? globalObject.document.querySelector(target) : target;
    if (!element) throw new Error(`gpt-mermaid: mount target not found: ${target}`);
    return ui.mount(element, source, { ...effective, ...options });
  }

  async function render(source, options = {}) {
    if (options.target || options.container) {
      return mount(options.target || options.container, source, options);
    }
    const target = globalObject.document.createElement("div");
    globalObject.document.body.append(target);
    return mount(target, source, options);
  }

  function renderAll(root = globalObject.document, options = {}) {
    if (globalObject.document) injectStyles(globalObject.document, resolveConfig(options, config).autoInjectStyles);
    return ui.renderAll(root, { ...resolveConfig(options, config), ...options });
  }

  function autoRender(options = {}) {
    if (globalObject.document?.readyState === "loading") {
      return new Promise((resolve) => {
        globalObject.document.addEventListener("DOMContentLoaded", () => resolve(renderAll(globalObject.document, options)), { once: true });
      });
    }
    return renderAll(globalObject.document, options);
  }

  function destroy(record) {
    if (record?.destroy) record.destroy();
  }

  const api = {
    version: VERSION,
    presets: PRESETS,
    configure,
    renderSvg,
    sanitizeSource: sanitizeMermaidSource,
    sanitizeSvg: sanitizeSvgMarkup,
    mount,
    render,
    renderAll,
    autoRender,
    destroy,
    createDiagram: mount,
    ui,
  };
  if (globalObject.document) injectStyles(globalObject.document, config.autoInjectStyles);
  return api;
}

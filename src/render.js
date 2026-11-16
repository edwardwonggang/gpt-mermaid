/* 职责：加载 gpt-mermaid 运行时、应用 GPT 主题、后处理并返回净化后的 SVG。 */

import { buildFlowchartThemeCSS, buildGlobalThemeCSS } from "./defaults.js";
import { sanitizeMermaidSource, sanitizeSvgMarkup, svgSize } from "./sanitize.js";

const FLOWCHART_RE = /^\s*(?:flowchart|graph)\b/im;

function isFlowchart(source) {
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) continue;
    return FLOWCHART_RE.test(line);
  }
  return false;
}

function ensureCssClass(node, name) {
  const current = node.getAttribute("class") || "";
  if (!current.split(/\s+/).includes(name)) node.setAttribute("class", `${current} ${name}`.trim());
}

function postProcessSvg(svgMarkup, variables) {
  const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const svg = doc.documentElement;
  if (doc.querySelector("parsererror") || svg?.localName !== "svg") return svgMarkup;

  // 某些版本的 Mermaid 不会给判定框附加类名；用圆角矩形节点中常见的
  // labelPadding 差异无法可靠区分，因此优先保留上游类名，缺失时由
  // gpt-mermaid 的 question 补丁负责添加。
  for (const node of svg.querySelectorAll("g.node")) {
    const rect = node.querySelector(":scope > rect.basic.label-container");
    if (!rect) continue;
    const rx = Number(rect.getAttribute("rx"));
    if (Number.isFinite(rx) && rx > 0) {
      rect.setAttribute("rx", String(Math.max(12, rx)));
      rect.setAttribute("ry", String(Math.max(12, rx)));
    }
  }

  // Mermaid 的 state 节点用外框宽度做布局，但 label group 仍可能保留
  // wrappingWidth/2 的硬编码水平位移。把直接 label 的水平位移归零，并用
  // text-anchor=middle 让 SVG 文本以节点中心为锚点，避免英文被推到框外。
  for (const node of svg.querySelectorAll("g.node")) {
    const label = node.querySelector(":scope > g.label");
    if (!label) continue;
    const transform = label.getAttribute("transform") || "";
    const match = transform.match(/translate\(\s*([-+]?\d*\.?\d+)(?:[,\s]+([-+]?\d*\.?\d+))?\s*\)/);
    if (match && Math.abs(Number(match[1])) > 0.01) {
      label.setAttribute("transform", `translate(0, ${match[2] || "0"})`);
    }
    for (const text of label.querySelectorAll("text")) {
      text.setAttribute("text-anchor", "middle");
      for (const tspan of text.querySelectorAll("tspan")) {
        if (tspan.hasAttribute("x")) tspan.setAttribute("x", "0");
      }
    }
  }

  // 边标签：与 ChatGPT 一样使用无框大圆角胶囊。
  for (const labelGroup of svg.querySelectorAll("g.edgeLabel g.label")) {
    const rect = labelGroup.querySelector("rect.background");
    if (!rect) continue;
    const width = Number(rect.getAttribute("width"));
    const height = Number(rect.getAttribute("height"));
    const x = Number(rect.getAttribute("x"));
    const y = Number(rect.getAttribute("y"));
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) continue;
    const nextWidth = width + 16;
    const nextHeight = Math.max(26, height + 6);
    rect.setAttribute("x", String(x - (nextWidth - width) / 2));
    rect.setAttribute("y", String(y - (nextHeight - height) / 2));
    rect.setAttribute("width", String(nextWidth));
    rect.setAttribute("height", String(nextHeight));
    rect.setAttribute("rx", "13");
    rect.setAttribute("ry", "13");
    rect.style.removeProperty("stroke");
  }

  // 把实心三角箭头换成细线开放箭头。
  for (const marker of svg.querySelectorAll('marker[id$="-pointEnd"], marker[id*="-pointEnd_"], marker[id$="-pointStart"], marker[id*="-pointStart_"]')) {
    marker.setAttribute("viewBox", "-5 -5 10 10");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "10");
    marker.setAttribute("refX", "0");
    marker.setAttribute("refY", "0");
    for (const path of marker.querySelectorAll("path")) {
      path.style.fill = "none";
      path.style.strokeWidth = "1";
      path.style.strokeDasharray = "none";
      path.style.strokeLinecap = "round";
      path.style.strokeLinejoin = "round";
    }
  }
  const halfWing = 4.5 / Math.SQRT2;
  const tipBack = 4 - halfWing;
  for (const path of svg.querySelectorAll('marker[id$="-pointEnd"] path, marker[id*="-pointEnd_"] path')) {
    path.setAttribute("d", `M 0 0 L 4 0 M ${tipBack} ${-halfWing} L 4 0 L ${tipBack} ${halfWing}`);
  }
  for (const path of svg.querySelectorAll('marker[id$="-pointStart"] path, marker[id*="-pointStart_"] path')) {
    path.setAttribute("d", `M 0 0 L -4 0 M ${-tipBack} ${-halfWing} L -4 0 L ${-tipBack} ${halfWing}`);
  }

  // 非流程图图种的柔和化：把上游硬编码的亮蓝描边和蓝色分割线
  // 替换为主题里的低饱和色。
  for (const pathEl of svg.querySelectorAll("g.outer-path path, g.divider path")) {
    if (pathEl.getAttribute("fill") === "#e5f2ff") pathEl.setAttribute("fill", variables.flowchartNodeColor);
    if (pathEl.getAttribute("stroke") === "#339cff") {
      pathEl.setAttribute("stroke", pathEl.closest(".divider") ? variables.flowchartLineColor : variables.flowchartNodeBorderColor);
      pathEl.setAttribute("stroke-width", "1");
    }
  }
  for (const marker of svg.querySelectorAll('marker[id$="-barbEnd"] path')) {
    marker.setAttribute("fill", variables.lineColor);
    marker.setAttribute("stroke", variables.lineColor);
  }
  for (const element of svg.querySelectorAll("[filter]")) {
    if (/drop-shadow/i.test(element.getAttribute("filter") || "")) element.removeAttribute("filter");
  }

  for (const node of svg.querySelectorAll("g.node")) {
    if (node.classList.contains("mermaid-decision")) ensureCssClass(node, "mgpt-decision");
  }
  return new XMLSerializer().serializeToString(svg);
}

function absoluteRuntimeUrl(config, baseUrl) {
  const raw = config.runtimeUrl || "gpt-mermaid.runtime.min.js";
  try {
    return new URL(raw, config.baseUrl || baseUrl || document.baseURI).href;
  } catch {
    return raw;
  }
}

function loadScript(url) {
  const existing = [...document.querySelectorAll("script[data-gpt-mermaid-runtime]")]
    .find((script) => script.dataset.gptMermaidRuntime === url);
  if (existing) {
    return existing.dataset.loaded === "true"
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("gpt-mermaid: failed to load runtime")), { once: true });
      });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.gptMermaidRuntime = url;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`gpt-mermaid: failed to load ${url}`)), { once: true });
    document.head.append(script);
  });
}

export function createRenderer(baseUrl = document.baseURI) {
  let runtimePromise = null;
  let renderChain = Promise.resolve();
  let sequence = 0;
  let initialized = false;
  let configKey = "";

  async function runtime(config) {
    if (config.runtime && typeof config.runtime.render === "function") return config.runtime;
    if (globalThis.mermaid?.render) return globalThis.mermaid;
    if (!runtimePromise) {
      const url = absoluteRuntimeUrl(config, baseUrl);
      runtimePromise = loadScript(url).then(() => {
        if (!globalThis.mermaid?.render) throw new Error("gpt-mermaid: runtime did not expose window.mermaid");
        return globalThis.mermaid;
      }).catch((error) => {
        runtimePromise = null;
        throw error;
      });
    }
    return runtimePromise;
  }

  function initialize(mermaid, config, flowchart) {
    const nextKey = JSON.stringify({ preset: config.preset, themeVariables: config.themeVariables, isDark: config.isDark });
    if (initialized && configKey === nextKey) return;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "base",
      themeVariables: config.themeVariables,
      layout: "elk",
      themeCSS: flowchart ? buildFlowchartThemeCSS(config.themeVariables) : buildGlobalThemeCSS(config.themeVariables),
      darkMode: false,
      fontFamily: config.fontFamily,
      htmlLabels: false,
      look: "classic",
      flowchart: {
        useMaxWidth: false,
        curve: "basis",
        minNodeWidth: 0,
        wrappingWidth: 200,
        subGraphTitleMargin: { top: 8, bottom: 12 },
      },
      sequence: { useMaxWidth: false },
      gantt: { useMaxWidth: false },
      journey: { useMaxWidth: false },
      class: { useMaxWidth: false },
      // 状态图默认 wrappingWidth 约 120，会把 WAIT_CONDITION 这类状态名
      // 强行拆行；放宽到 360 后由节点宽度自然决定是否换行。
      state: { useMaxWidth: false, wrappingWidth: 360 },
      er: { useMaxWidth: false },
      pie: { useMaxWidth: false },
      quadrantChart: { useMaxWidth: false },
      xyChart: { useMaxWidth: false },
      requirement: { useMaxWidth: false },
      mindmap: { useMaxWidth: false },
      kanban: { useMaxWidth: false },
      timeline: { useMaxWidth: false },
      gitGraph: { useMaxWidth: false },
      c4: { useMaxWidth: false },
      sankey: { useMaxWidth: false },
      block: { useMaxWidth: false },
      packet: { useMaxWidth: false },
      architecture: { useMaxWidth: false },
      radar: { useMaxWidth: false },
    });
    initialized = true;
    configKey = nextKey;
  }

  async function renderSvg(rawSource, config) {
    const source = sanitizeMermaidSource(rawSource);
    if (!source) throw new Error("gpt-mermaid: diagram source is empty or contains blocked directives");
    const task = renderChain.then(async () => {
      const flowchart = isFlowchart(source);
      const mermaid = await runtime(config);
      initialize(mermaid, config, flowchart);
      const id = `mgpt-${Date.now().toString(36)}-${++sequence}`;
      const result = await mermaid.render(id, source);
      if (!result?.svg) throw new Error("gpt-mermaid: renderer returned no SVG");
      const themeCSS = flowchart ? buildFlowchartThemeCSS(config.themeVariables) : buildGlobalThemeCSS(config.themeVariables);
      // 上游 runtime 已获取 themeCSS；这里重新把非流程图主题文件也写入
      // 一个内联 style，兼容不支持 mermaid.initialize themeCSS 的旧构建。
      let svg = result.svg;
      if (!flowchart && themeCSS && !svg.includes("mgpt-global-theme")) {
        const style = `<style id="mgpt-global-theme">${themeCSS}</style>`;
        svg = svg.replace(/<svg\b[^>]*>/, (tag) => `${tag}${style}`);
      }
      const processed = postProcessSvg(svg, config.themeVariables);
      const clean = sanitizeSvgMarkup(processed);
      const size = svgSize(clean);
      return {
        svg: clean,
        width: size.width,
        height: size.height,
        source,
      };
    });
    renderChain = task.then(() => undefined, () => undefined);
    return task;
  }

  function load(config) {
    return runtime(config);
  }

  return { renderSvg, load, postProcessSvg };
}

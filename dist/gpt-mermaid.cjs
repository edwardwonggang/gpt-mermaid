/*! gpt-mermaid v1.0.1 | MIT | https://github.com/edwardwonggang/gpt-mermaid */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/defaults.js
function resolveConfig(input = {}, previous = DEFAULT_CONFIG) {
  const presetName = input.preset || previous.preset || "gpt";
  const preset = PRESETS[presetName] || PRESETS.gpt;
  const colors = { ...PRESETS.gpt, ...preset };
  const isDark = presetName === "tokyo" || presetName === "nord";
  const fontFamily = input.fontFamily || previous.fontFamily;
  const cScale = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`cScale${index}`, SERIES[index % SERIES.length]]));
  const fillType = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`fillType${index}`, SERIES[index % SERIES.length]]));
  const pie = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`pie${index + 1}`, SERIES[index % SERIES.length]]));
  const git = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`git${index}`, SERIES[index % SERIES.length]]));
  const variables = {
    fontFamily,
    fontSize: "14px",
    background: "transparent",
    surfaceColor: colors.decision,
    primaryColor: colors.node,
    primaryTextColor: colors.text,
    primaryBorderColor: colors.border,
    secondaryColor: colors.decision,
    secondaryTextColor: colors.text,
    secondaryBorderColor: colors.line,
    tertiaryColor: colors.decision,
    tertiaryTextColor: colors.text,
    tertiaryBorderColor: colors.border,
    textColor: colors.text,
    titleColor: colors.text,
    lineColor: colors.line,
    arrowheadColor: colors.line,
    mainBkg: colors.node,
    nodeBkg: colors.node,
    nodeBorder: colors.border,
    nodeTextColor: colors.text,
    clusterBkg: isDark ? colors.decision : "#f7f9fc",
    clusterBorder: colors.border,
    edgeLabelBackground: colors.label,
    flowchartNodeColor: colors.node,
    flowchartNodeBorderColor: colors.border,
    flowchartTextColor: colors.text,
    flowchartDecisionColor: colors.decision,
    flowchartLineColor: colors.line,
    flowchartEdgeLabelColor: colors.label,
    flowchartEdgeLabelBorderColor: colors.line,
    actorBkg: colors.node,
    actorBorder: colors.border,
    actorTextColor: colors.text,
    actorLineColor: colors.line,
    signalColor: colors.line,
    signalTextColor: colors.text,
    labelBoxBkgColor: colors.label,
    labelBoxBorderColor: colors.border,
    labelTextColor: colors.text,
    loopTextColor: colors.text,
    noteBkgColor: isDark ? "#3b4252" : "#fefaf0",
    noteBorderColor: isDark ? "#4c566a" : "#e5ddc3",
    noteTextColor: isDark ? "#eceff4" : "#6e5400",
    sectionBkgColor: colors.decision,
    sectionBkgColor2: colors.node,
    taskBkgColor: colors.node,
    taskBorderColor: colors.border,
    activeTaskBkgColor: colors.node,
    activeTaskBorderColor: colors.line,
    doneTaskBkgColor: colors.decision,
    doneTaskBorderColor: colors.line,
    critBkgColor: isDark ? "#4c2d2d" : "#fee2e2",
    critBorderColor: isDark ? "#bf616a" : "#f87171",
    taskTextColor: colors.text,
    taskTextOutsideColor: colors.text,
    pieTitleTextColor: colors.text,
    pieSectionTextColor: colors.text,
    pieLegendTextColor: colors.text,
    pieStrokeColor: colors.label,
    pieStrokeWidth: "2px",
    pieOuterStrokeColor: colors.label,
    pieOuterStrokeWidth: "2px",
    ...Object.fromEntries([
      "quadrant1TextFill",
      "quadrant2TextFill",
      "quadrant3TextFill",
      "quadrant4TextFill",
      "quadrantPointTextFill",
      "quadrantXAxisTextFill",
      "quadrantYAxisTextFill",
      "quadrantTitleFill"
    ].map((key) => [key, colors.text])),
    ...cScale,
    ...fillType,
    ...pie,
    ...git
  };
  return {
    ...DEFAULT_CONFIG,
    ...previous,
    ...input,
    preset: presetName,
    fontFamily,
    themeVariables: { ...variables, ...previous.themeVariables || {}, ...input.themeVariables || {} },
    isDark
  };
}
function buildFlowchartThemeCSS(vars) {
  return `
.node text { font-size: 14px; font-weight: 600; letter-spacing: normal; fill: ${vars.flowchartTextColor}; }
.edgeLabels text { font-size: 13px; font-weight: 600; letter-spacing: -0.08px; fill: ${vars.flowchartTextColor}; }
.node tspan[font-weight="normal"], .edgeLabels tspan[font-weight="normal"] { font-weight: 600; }
.edgeLabel .label rect { opacity: 1; rx: 13px; ry: 13px; fill: ${vars.flowchartEdgeLabelColor}; stroke: ${vars.flowchartEdgeLabelBorderColor}; stroke-width: 1.2px; }
.node rect, .node circle, .node ellipse, .node polygon, .node path { fill: ${vars.flowchartNodeColor}; stroke: ${vars.flowchartNodeBorderColor}; stroke-width: 1.2px; }
.node rect { rx: 16px; ry: 16px; }
.node.default.mermaid-decision .label-container, .mermaid-decision .label-container { fill: ${vars.flowchartDecisionColor}; stroke: ${vars.flowchartLineColor}; stroke-dasharray: 2 2; }
.cluster rect { rx: 16px; ry: 16px; fill: ${vars.clusterBkg}; stroke: ${vars.clusterBorder}; stroke-width: 1px; }
.cluster-label text, .cluster-label tspan { font-size: 13px; font-weight: 600; fill: ${vars.textColor}; }
.edgePaths .flowchart-link { stroke: ${vars.flowchartLineColor}; stroke-width: 1.2px; stroke-linecap: round; stroke-linejoin: round; }
.marker { fill: ${vars.flowchartLineColor}; stroke: ${vars.flowchartLineColor}; }
`;
}
function buildGlobalThemeCSS(vars) {
  return `
.node rect, .node circle, .node ellipse, .node polygon, .node path { fill: ${vars.flowchartNodeColor}; stroke: ${vars.flowchartNodeBorderColor}; stroke-width: 1.2px; }
.node rect { rx: 12px; ry: 12px; }
.node text, .node tspan { fill: ${vars.flowchartTextColor}; font-size: 14px; font-weight: 600; }
rect.actor, rect.actor-top, rect.actor-bottom { fill: ${vars.actorBkg}; stroke: ${vars.actorBorder}; stroke-width: 1px; rx: 12px; ry: 12px; }
text.actor, text.actor > tspan { fill: ${vars.actorTextColor}; font-size: 14px; font-weight: 600; }
.actor-line { stroke: ${vars.actorLineColor}; stroke-width: 1px; }
.messageLine0, .messageLine1 { stroke: ${vars.signalColor}; stroke-width: 1.2px; }
.messageText { fill: ${vars.signalTextColor}; font-size: 13px; font-weight: 500; }
.statediagram-state rect.basic.label-container { fill: ${vars.flowchartNodeColor}; stroke: ${vars.flowchartNodeBorderColor}; stroke-width: 1.2px; rx: 14px; ry: 14px; }
.statediagram-state text, .statediagram-state tspan { fill: ${vars.flowchartTextColor}; font-size: 14px; font-weight: 600; }
.transition { stroke: ${vars.flowchartLineColor}; stroke-width: 1.2px; }
g.classGroup rect, g.classGroup line { fill: ${vars.flowchartNodeColor}; stroke: ${vars.flowchartNodeBorderColor}; }
.node .outer-path path { stroke: ${vars.flowchartNodeBorderColor}; stroke-width: 1.2px; }
.divider path { stroke: ${vars.flowchartLineColor}; stroke-width: 1.2px; }
.entityBox { fill: ${vars.flowchartNodeColor}; stroke: ${vars.flowchartNodeBorderColor}; rx: 10px; ry: 10px; }
.relationshipLine { stroke: ${vars.flowchartLineColor}; stroke-width: 1.2px; }
.edgeLabel .label rect, .edgeLabel rect.labelBkg { opacity: 1; rx: 13px; ry: 13px; fill: ${vars.flowchartEdgeLabelColor}; stroke: ${vars.flowchartEdgeLabelBorderColor}; stroke-width: 1.2px; }
.edgeLabel text, .edgeLabel tspan { fill: ${vars.flowchartTextColor}; font-size: 13px; font-weight: 600; }
.note { fill: ${vars.noteBkgColor}; stroke: ${vars.noteBorderColor}; rx: 10px; ry: 10px; }
.noteText, .noteText > tspan { fill: ${vars.noteTextColor}; font-size: 13px; }
`;
}
var VERSION, PRESETS, DEFAULT_CONFIG, SERIES;
var init_defaults = __esm({
  "src/defaults.js"() {
    VERSION = "1.0.1";
    PRESETS = Object.freeze({
      gpt: Object.freeze({
        node: "#e5f3ff",
        decision: "#f5faff",
        text: "#004f99",
        line: "#9fb8ce",
        border: "#8bb9e0",
        label: "#f5faff"
      }),
      github: Object.freeze({
        node: "#f6f8fa",
        decision: "#ffffff",
        text: "#1f2328",
        line: "#d0d7de",
        border: "rgba(31, 35, 40, 0.16)",
        label: "#ffffff"
      }),
      linear: Object.freeze({
        node: "#eef2ff",
        decision: "#f8faff",
        text: "#2f3b5c",
        line: "#a9b6d6",
        border: "rgba(47, 59, 92, 0.18)",
        label: "#ffffff"
      }),
      tokyo: Object.freeze({
        node: "#24283b",
        decision: "#1f2335",
        text: "#c0caf5",
        line: "#3b4261",
        border: "rgba(192, 202, 245, 0.18)",
        label: "#1f2335"
      }),
      nord: Object.freeze({
        node: "#3b4252",
        decision: "#2e3440",
        text: "#eceff4",
        line: "#4c566a",
        border: "rgba(236, 239, 244, 0.16)",
        label: "#2e3440"
      })
    });
    DEFAULT_CONFIG = Object.freeze({
      preset: "gpt",
      themeVariables: {},
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif',
      runtimeUrl: null,
      baseUrl: null,
      autoInjectStyles: true,
      securityLevel: "strict",
      menu: true,
      fullscreen: true,
      copyImage: true,
      download: true,
      maxInlineWidth: 740,
      fitMaxHeight: Infinity
    });
    SERIES = ["#339cff", "#f3883b", "#5dc977", "#eb77b1", "#9b79ec", "#3ab9b1"];
  }
});

// src/sanitize.js
function safeURL(value) {
  const url = String(value || "").trim();
  return /^#[\w:.-]+$/.test(url) || /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(url);
}
function safeCSS(value) {
  const css = String(value || "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  if (/[\\<]/.test(css) || /@(?:import|namespace)|expression\s*\(|(?:-moz-binding|behavior)\s*:|(?:image-set|paint)\s*\(/i.test(css)) return "";
  for (const match of css.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    if (!safeURL(match[2])) return "";
  }
  const stripped = css.replace(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi, "");
  return /url\s*\(/i.test(stripped) ? "" : css;
}
function safeInitDirective(directive) {
  const match = directive.match(INIT_RE);
  if (!match) return "";
  try {
    const parsed = JSON.parse((match[1] || "").replaceAll("'", '"'));
    const sequenceColor = parsed?.themeVariables?.sequenceNumberColor;
    const validColor = typeof sequenceColor === "string" && /^#(?:[a-f0-9]{3}|(?:[a-f0-9]{2}){2,4})$/i.test(sequenceColor) ? sequenceColor : void 0;
    const themeCSS = typeof parsed?.themeCSS === "string" ? safeCSS(parsed.themeCSS) : "";
    if (!validColor && !themeCSS) return "";
    return `%%{init: ${JSON.stringify({
      theme: "base",
      ...validColor ? { themeVariables: { sequenceNumberColor: validColor } } : {},
      ...themeCSS ? { themeCSS } : {}
    })}}%%`;
  } catch {
    return "";
  }
}
function sanitizeMermaidSource(source) {
  let blocked = false;
  const stripped = String(source || "").replace(DIRECTIVE_RE, (directive) => {
    if (SECURITY_RE.test(directive)) {
      blocked = true;
      return "";
    }
    return safeInitDirective(directive);
  });
  if (blocked) return null;
  const cleaned = stripped.replace(CLICK_RE, "").trim();
  return cleaned || null;
}
function sanitizeSvgMarkup(markup) {
  if (typeof DOMParser !== "function" || typeof XMLSerializer !== "function") {
    throw new Error("gpt-mermaid: DOMParser/XMLSerializer is required");
  }
  const doc = new DOMParser().parseFromString(String(markup || ""), "image/svg+xml");
  const root = doc.documentElement;
  if (doc.querySelector("parsererror") || root?.localName !== "svg") {
    throw new Error("gpt-mermaid: renderer returned invalid SVG");
  }
  for (const node of [root, ...root.querySelectorAll("*")]) {
    if (node.namespaceURI !== SVG_NS || DENY_TAGS.has(node.localName) || !SVG_TAGS.has(node.localName)) {
      node.remove();
      continue;
    }
    for (const attribute of [...node.attributes]) {
      const name = attribute.name;
      const value = attribute.value;
      if (/^on/i.test(name) || name === "srcset" || name === "xml:base") {
        node.removeAttribute(name);
        continue;
      }
      if (["href", "xlink:href", "src"].includes(name) && !safeURL(value)) {
        node.removeAttribute(name);
        continue;
      }
      if (name === "style") {
        const safe = safeCSS(value);
        if (safe) node.setAttribute("style", safe);
        else node.removeAttribute("style");
        continue;
      }
      if (/url\s*\(/i.test(value) && !safeCSS(value)) node.removeAttribute(name);
    }
    if (node.localName === "style") {
      const safe = safeCSS(node.textContent);
      if (safe) node.textContent = safe;
      else node.remove();
    }
  }
  return new XMLSerializer().serializeToString(root);
}
function svgSize(markup) {
  const doc = new DOMParser().parseFromString(String(markup || ""), "image/svg+xml");
  const root = doc.documentElement;
  const viewBox = (root.getAttribute("viewBox") || "").trim().split(/[ ,]+/).map(Number);
  const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? Math.min(1e5, value) : fallback;
  const width = positive(viewBox.length === 4 ? viewBox[2] : Number(root.getAttribute("width")), 800);
  const height = positive(viewBox.length === 4 ? viewBox[3] : Number(root.getAttribute("height")), 500);
  return { width, height };
}
var DIRECTIVE_RE, INIT_RE, SECURITY_RE, CLICK_RE, SVG_NS, SVG_TAGS, DENY_TAGS;
var init_sanitize = __esm({
  "src/sanitize.js"() {
    DIRECTIVE_RE = /%%\{[\s\S]*?\}%%/g;
    INIT_RE = /^%%\{\s*(?:init|initialize)\s*:\s*(\{[\s\S]*\})\s*\}%%$/i;
    SECURITY_RE = /["']?securityLevel["']?\s*:/i;
    CLICK_RE = /^\s*click\s+.*$/gim;
    SVG_NS = "http://www.w3.org/2000/svg";
    SVG_TAGS = new Set("svg g a path defs symbol desc title text tspan textPath rect line polyline polygon circle ellipse marker pattern linearGradient radialGradient stop clipPath mask filter feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence style image use".split(" "));
    DENY_TAGS = /* @__PURE__ */ new Set(["script", "iframe", "object", "embed", "form", "input", "button", "textarea", "foreignObject", "image", "animate", "animateMotion", "animateTransform", "set"]);
  }
});

// src/render.js
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
  for (const node of svg.querySelectorAll("g.node")) {
    const rect = node.querySelector(":scope > rect.basic.label-container");
    if (!rect) continue;
    const rx = Number(rect.getAttribute("rx"));
    if (Number.isFinite(rx) && rx > 0) {
      rect.setAttribute("rx", String(Math.max(12, rx)));
      rect.setAttribute("ry", String(Math.max(12, rx)));
    }
  }
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
function absoluteRuntimeUrl(config, baseUrl2) {
  const raw = config.runtimeUrl || "gpt-mermaid.runtime.min.js";
  try {
    return new URL(raw, config.baseUrl || baseUrl2 || document.baseURI).href;
  } catch {
    return raw;
  }
}
function loadScript(url) {
  const existing = [...document.querySelectorAll("script[data-gpt-mermaid-runtime]")].find((script) => script.dataset.gptMermaidRuntime === url);
  if (existing) {
    return existing.dataset.loaded === "true" ? Promise.resolve() : new Promise((resolve, reject) => {
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
function createRenderer(baseUrl2 = document.baseURI) {
  let runtimePromise = null;
  let renderChain = Promise.resolve();
  let sequence = 0;
  let initialized = false;
  let configKey = "";
  async function runtime(config) {
    if (config.runtime && typeof config.runtime.render === "function") return config.runtime;
    if (globalThis.mermaid?.render) return globalThis.mermaid;
    if (!runtimePromise) {
      const url = absoluteRuntimeUrl(config, baseUrl2);
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
        subGraphTitleMargin: { top: 8, bottom: 12 }
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
      radar: { useMaxWidth: false }
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
        source
      };
    });
    renderChain = task.then(() => void 0, () => void 0);
    return task;
  }
  function load(config) {
    return runtime(config);
  }
  return { renderSvg, load, postProcessSvg };
}
var FLOWCHART_RE;
var init_render = __esm({
  "src/render.js"() {
    init_defaults();
    init_sanitize();
    FLOWCHART_RE = /^\s*(?:flowchart|graph)\b/im;
  }
});

// src/ui.js
function icon(doc, name) {
  const shapes = ICONS[name];
  if (!shapes) return null;
  const svg = doc.createElementNS(NS, "svg");
  svg.setAttribute("class", "mgpt-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const [tag, attrs] of shapes) {
    const node = doc.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    svg.append(node);
  }
  return svg;
}
function button(doc, action, label, iconName = null, iconOnly = false) {
  const el = doc.createElement("button");
  el.type = "button";
  el.dataset.mgptAction = action;
  if (iconName) {
    const symbol = icon(doc, iconName);
    if (symbol) el.append(symbol);
  }
  if (iconOnly) {
    el.setAttribute("aria-label", label);
    el.title = label;
  } else {
    const span = doc.createElement("span");
    span.className = "mgpt-action-label";
    span.textContent = label;
    el.append(span);
  }
  return el;
}
function setLabel(el, text) {
  const span = el?.querySelector?.(".mgpt-action-label");
  if (span) span.textContent = text;
  else if (!el?.querySelector?.(".mgpt-icon")) el.textContent = text;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
async function svgToPng(record) {
  const scale = Math.min(
    4,
    8192 / record.result.width,
    8192 / record.result.height,
    Math.sqrt(24 * 1024 * 1024 / (record.result.width * record.result.height))
  );
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(record.result.svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(record.result.width * scale));
  canvas.height = Math.max(1, Math.round(record.result.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png");
  });
}
function createUi({ renderSvg, getConfig }) {
  const states = /* @__PURE__ */ new WeakMap();
  function uiState(doc) {
    let state = states.get(doc);
    if (!state) {
      state = { records: /* @__PURE__ */ new Set(), viewer: null, outside: null };
      state.outside = (event) => {
        if (!event.target.closest?.("[data-gpt-mermaid]")) closeMenus(state);
      };
      doc.addEventListener("pointerdown", state.outside, true);
      states.set(doc, state);
    }
    return state;
  }
  function closeMenus(state, except = null) {
    for (const record of state.records) {
      if (record === except || !record.menu) continue;
      record.menu.hidden = true;
      record.figure.dataset.menuOpen = "false";
      record.menuButton?.setAttribute("aria-expanded", "false");
    }
  }
  function setStatus(record, status, message) {
    record.figure.dataset.state = status;
    record.status.textContent = message;
    record.status.hidden = status === "ready";
    record.retry.hidden = status !== "error";
    for (const action of ["copy-image", "download", "zoom-in", "zoom-out", "fit", "expand"]) {
      const el = record.buttons[action];
      if (el) el.disabled = status !== "ready";
    }
  }
  function zoom(record, value, reset = false, anchor = null) {
    if (!record.result) return;
    const previous = record.zoom || 1;
    const next = Math.min(8, Math.max(0.25, value));
    const box = record.stage.getBoundingClientRect();
    if (reset) record.panX = record.panY = 0;
    else if (anchor) {
      const x = anchor.x - box.left - box.width / 2;
      const y = anchor.y - box.top - box.height / 2;
      record.panX = x - (x - (record.panX || 0)) * next / previous;
      record.panY = y - (y - (record.panY || 0)) * next / previous;
    }
    record.zoom = next;
    const inDialog = Boolean(record.state.viewer?.dialog?.open && record.state.viewer.dialog.contains(record.stage));
    const available = Math.max(1, record.stage.clientWidth || box.width || record.result.width);
    const maxHeight = inDialog ? Math.max(240, box.height || 760) : record.config.fitMaxHeight;
    const fitted = Math.min(1, available / record.result.width, maxHeight / record.result.height);
    const width = record.result.width * fitted;
    const height = record.result.height * fitted;
    const stageHeight = inDialog ? Math.max(240, box.height || height) : Math.max(112, height);
    record.stage.style.height = `${stageHeight}px`;
    record.image.style.width = `${width}px`;
    record.image.style.height = `${height}px`;
    const capX = (width * next + available) / 2 - 24;
    const capY = (height * next + stageHeight) / 2 - 24;
    record.panX = Math.min(capX, Math.max(-capX, record.panX || 0));
    record.panY = Math.min(capY, Math.max(-capY, record.panY || 0));
    record.image.style.transform = `translate(calc(-50% + ${record.panX}px), calc(-50% + ${record.panY}px)) scale(${next})`;
    record.stage.dataset.zoom = String(next);
    record.stage.dataset.panX = String(record.panX);
    record.stage.dataset.panY = String(record.panY);
    setLabel(record.buttons.fit, next === 1 ? "\u590D\u4F4D" : `${Math.round(next * 100)}%`);
    if (!inDialog) {
      if (record.result.width > record.config.maxInlineWidth) record.figure.dataset.wide = "true";
      else delete record.figure.dataset.wide;
    }
  }
  function bindMotion(record) {
    let pointer = null;
    record.motion = {
      wheel(event) {
        if (!event.ctrlKey || !record.result) return;
        event.preventDefault();
        zoom(record, record.zoom * Math.exp(-event.deltaY * 2e-3), false, { x: event.clientX, y: event.clientY });
      },
      down(event) {
        if (event.button !== 0 || !record.result) return;
        event.preventDefault();
        pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        record.stage.setPointerCapture?.(event.pointerId);
        record.stage.dataset.dragging = "true";
      },
      move(event) {
        if (!pointer || pointer.id !== event.pointerId) return;
        record.panX = (record.panX || 0) + event.clientX - pointer.x;
        record.panY = (record.panY || 0) + event.clientY - pointer.y;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        zoom(record, record.zoom);
      },
      end() {
        pointer = null;
        record.stage.dataset.dragging = "false";
      },
      key(event) {
        if (event.key === "Home") {
          event.preventDefault();
          zoom(record, 1, true);
        } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          record.panX = (record.panX || 0) + (event.key === "ArrowLeft" ? -24 : event.key === "ArrowRight" ? 24 : 0);
          record.panY = (record.panY || 0) + (event.key === "ArrowUp" ? -24 : event.key === "ArrowDown" ? 24 : 0);
          zoom(record, record.zoom);
        }
      }
    };
    record.stage.addEventListener("wheel", record.motion.wheel, { passive: false });
    record.stage.addEventListener("pointerdown", record.motion.down);
    record.stage.addEventListener("pointermove", record.motion.move);
    record.stage.addEventListener("pointerup", record.motion.end);
    record.stage.addEventListener("pointercancel", record.motion.end);
    record.stage.addEventListener("lostpointercapture", record.motion.end);
    record.stage.addEventListener("keydown", record.motion.key);
  }
  function viewer(state, record) {
    const doc = record.figure.ownerDocument;
    if (!state.viewer) {
      const dialog = doc.createElement("dialog");
      dialog.className = "mgpt-dialog";
      dialog.setAttribute("aria-label", "Diagram fullscreen viewer");
      const bar = doc.createElement("div");
      bar.className = "mgpt-dialog-bar";
      const group = doc.createElement("div");
      group.className = "mgpt-dialog-actions";
      for (const [action, label, symbol] of [
        ["zoom-out", "\u7F29\u5C0F", "zoom-out"],
        ["fit", "\u9002\u5E94\u7A97\u53E3", "fit"],
        ["zoom-in", "\u653E\u5927", "zoom-in"]
      ]) {
        const item = button(doc, action, label, symbol, true);
        item.className = "mgpt-icon-button";
        group.append(item);
      }
      const close = button(doc, "close", "\u5173\u95ED", "close", true);
      close.className = "mgpt-icon-button";
      bar.append(group, close);
      const viewport = doc.createElement("div");
      viewport.className = "mgpt-dialog-viewport";
      dialog.append(bar, viewport);
      doc.body.append(dialog);
      state.viewer = { dialog, viewport, record: null };
      dialog.addEventListener("close", () => {
        if (!dialog.open) closeViewer(state, false);
      });
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeViewer(state);
      });
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeViewer(state);
        handleClick(state, event);
      });
    }
    if (state.viewer.record && (state.viewer.record !== record || !state.viewer.dialog.open)) closeViewer(state, false);
    state.viewer.record = record;
    state.viewer.viewport.append(record.stage);
    if (!state.viewer.dialog.open) state.viewer.dialog.showModal();
    zoom(record, 1, true);
  }
  function closeViewer(state, closeDialog = true) {
    const current = state.viewer;
    if (!current) return;
    const record = current.record;
    current.record = null;
    if (record) {
      record.viewport.append(record.stage);
      zoom(record, 1, true);
    }
    if (closeDialog && current.dialog.open) current.dialog.close();
  }
  function handleClick(state, event) {
    const actionEl = event.target.closest?.("[data-mgpt-action]");
    if (!actionEl) {
      closeMenus(state);
      return;
    }
    const action = actionEl.dataset.mgptAction;
    const dialog = actionEl.closest(".mgpt-dialog");
    const record = dialog ? state.viewer?.record : [...state.records].find((item) => item.figure === actionEl.closest("[data-gpt-mermaid]"));
    if (!record) return;
    event.preventDefault();
    if (action === "close") {
      closeViewer(state);
      return;
    }
    if (action === "menu") {
      const open = record.menu.hidden;
      closeMenus(state, open ? record : null);
      record.menu.hidden = !open;
      record.figure.dataset.menuOpen = open ? "true" : "false";
      record.menuButton.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    closeMenus(state);
    if (action === "copy") {
      navigator.clipboard.writeText(record.source).then(() => {
        setLabel(actionEl, "\u5DF2\u590D\u5236\u6E90\u7801");
      }).catch((error) => record.status.textContent = `\u590D\u5236\u6E90\u7801\u5931\u8D25\uFF1A${error.message}`);
      return;
    }
    if (action === "download" && record.result) {
      downloadBlob(new Blob([record.result.svg], { type: "image/svg+xml;charset=utf-8" }), "mermaid-diagram.svg");
      return;
    }
    if (action === "copy-image" && record.result) {
      svgToPng(record).then(async (blob) => {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setLabel(actionEl, "\u5DF2\u590D\u5236\u56FE\u7247");
      }).catch((error) => record.status.textContent = `\u590D\u5236\u56FE\u7247\u5931\u8D25\uFF1A${error.message}`);
      return;
    }
    if (action === "expand") {
      viewer(state, record);
      return;
    }
    if (action === "fit") zoom(record, 1, true);
    else if (action === "zoom-in") zoom(record, record.zoom * 1.25);
    else if (action === "zoom-out") zoom(record, record.zoom / 1.25);
    else if (action === "retry") void renderRecord(record);
  }
  async function renderRecord(record) {
    if (record.loading || record.figure.dataset.state === "ready") return;
    record.loading = true;
    setStatus(record, "loading", "\u6B63\u5728\u6E32\u67D3\u56FE\u8868\u2026");
    try {
      const result = await renderSvg(record.source, record.config);
      if (!record.figure.isConnected || record.destroyed) return;
      if (record.url) URL.revokeObjectURL(record.url);
      record.result = result;
      record.url = URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }));
      record.image.onload = () => {
        if (record.destroyed) return;
        record.loading = false;
        setStatus(record, "ready", "\u56FE\u8868\u5DF2\u6E32\u67D3");
        zoom(record, record.zoom);
      };
      record.image.onerror = () => {
        record.loading = false;
        setStatus(record, "error", "\u56FE\u7247\u65E0\u6CD5\u663E\u793A\uFF0C\u53EF\u91CD\u8BD5\u6216\u68C0\u67E5\u6E90\u7801\u3002");
      };
      record.image.src = record.url;
      record.image.hidden = false;
    } catch (error) {
      record.loading = false;
      setStatus(record, "error", error.message || String(error));
    }
  }
  function createRecord(source, sourceElement, options) {
    const doc = options.document || sourceElement?.ownerDocument || document;
    const state = uiState(doc);
    const config = getConfig(options);
    const figure = doc.createElement("figure");
    figure.className = "mgpt-diagram";
    figure.dataset.gptMermaid = "";
    figure.dataset.state = "pending";
    figure.setAttribute("aria-label", "Mermaid diagram");
    const toolbar = doc.createElement("div");
    toolbar.className = "mgpt-floatbar";
    toolbar.setAttribute("role", "toolbar");
    const menuButton = button(doc, "menu", "\u56FE\u8868\u9009\u9879", "menu", true);
    menuButton.className = "mgpt-icon-button";
    menuButton.setAttribute("aria-haspopup", "menu");
    menuButton.setAttribute("aria-expanded", "false");
    const expandButton = button(doc, "expand", "\u653E\u5927\u56FE\u8868", "expand", true);
    expandButton.className = "mgpt-icon-button";
    const menu = doc.createElement("div");
    menu.className = "mgpt-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    const buttons = { expand: expandButton };
    for (const [action, label, symbol] of [
      ["copy", "\u590D\u5236\u6E90\u7801", "copy"],
      ["copy-image", "\u590D\u5236\u56FE\u7247", "image"],
      ["download", "\u4E0B\u8F7D SVG", "download"],
      ["zoom-in", "\u653E\u5927", "zoom-in"],
      ["zoom-out", "\u7F29\u5C0F", "zoom-out"],
      ["fit", "\u590D\u4F4D", "fit"]
    ]) {
      const item = button(doc, action, label, symbol);
      item.className = "mgpt-menuitem";
      item.setAttribute("role", "menuitem");
      menu.append(item);
      buttons[action] = item;
    }
    toolbar.append(menuButton, expandButton, menu);
    const status = doc.createElement("div");
    status.className = "mgpt-status";
    status.setAttribute("role", "status");
    const retry = button(doc, "retry", "\u91CD\u65B0\u6E32\u67D3");
    retry.className = "mgpt-retry";
    const viewport = doc.createElement("div");
    viewport.className = "mgpt-viewport";
    viewport.tabIndex = 0;
    viewport.setAttribute("aria-label", "Diagram preview");
    const stage = doc.createElement("div");
    stage.className = "mgpt-stage";
    stage.tabIndex = 0;
    stage.setAttribute("aria-label", "Ctrl+wheel to zoom, drag to pan, Home to reset");
    const image = doc.createElement("img");
    image.className = "mgpt-image";
    image.alt = "Mermaid diagram";
    image.draggable = false;
    image.hidden = true;
    stage.append(image);
    viewport.append(stage);
    figure.append(toolbar, status, retry, viewport);
    const record = {
      state,
      config,
      figure,
      menu,
      menuButton,
      buttons,
      status,
      retry,
      viewport,
      stage,
      image,
      source,
      sourceElement,
      result: null,
      url: null,
      zoom: 1,
      panX: 0,
      panY: 0,
      loading: false,
      destroyed: false
    };
    state.records.add(record);
    bindMotion(record);
    setStatus(record, "pending", "\u6EDA\u52A8\u5230\u6B64\u5904\u65F6\u663E\u793A\u56FE\u8868\u2026");
    if (window.ResizeObserver) {
      record.resize = new ResizeObserver(() => {
        if (record.result) zoom(record, record.zoom);
      });
      record.resize.observe(stage);
    }
    record.destroy = () => {
      if (record.destroyed) return;
      record.destroyed = true;
      record.resize?.disconnect();
      if (state.viewer?.record === record) closeViewer(state);
      if (record.url) URL.revokeObjectURL(record.url);
      state.records.delete(record);
      record.figure.remove();
    };
    record.fit = () => zoom(record, 1, true);
    record.zoomIn = () => zoom(record, record.zoom * 1.25);
    record.zoomOut = () => zoom(record, record.zoom / 1.25);
    record.download = () => {
      if (!record.result) throw new Error("diagram is not ready");
      downloadBlob(new Blob([record.result.svg], { type: "image/svg+xml;charset=utf-8" }), "mermaid-diagram.svg");
    };
    record.copySource = () => navigator.clipboard.writeText(record.source);
    record.copyImage = async () => {
      if (!record.result) throw new Error("diagram is not ready");
      const blob = await svgToPng(record);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    };
    record.expand = () => viewer(state, record);
    return record;
  }
  async function mount(target, source, options = {}) {
    const doc = target?.ownerDocument || document;
    const sourceElement = options.sourceElement || null;
    const record = createRecord(source, sourceElement, { ...options, document: doc });
    if (sourceElement) {
      sourceElement.hidden = true;
      record.figure.append(sourceElement);
    }
    if (target) target.replaceWith(record.figure);
    else doc.body.append(record.figure);
    record.figure.addEventListener("click", (event) => handleClick(uiState(doc), event));
    void renderRecord(record);
    return record;
  }
  function renderAll(root = document, options = {}) {
    const doc = root.ownerDocument || root;
    const diagrams = [];
    const codeBlocks = [...root.querySelectorAll("pre > code.language-mermaid, pre > code.lang-mermaid")];
    for (const code of codeBlocks) {
      if (code.closest("[data-gpt-mermaid]")) continue;
      const pre = code.parentElement;
      const source = code.textContent || "";
      const record = createRecord(source, pre, { ...options, document: doc });
      pre.replaceWith(record.figure);
      pre.hidden = true;
      record.figure.append(pre);
      record.figure.addEventListener("click", (event) => handleClick(uiState(doc), event));
      void renderRecord(record);
      diagrams.push(record);
    }
    for (const target of root.querySelectorAll("[data-gpt-mermaid-source]")) {
      if (target.closest("[data-gpt-mermaid]")) continue;
      const source = target.dataset.source || target.textContent || "";
      const record = createRecord(source, null, { ...options, document: doc });
      target.replaceWith(record.figure);
      record.figure.addEventListener("click", (event) => handleClick(uiState(doc), event));
      void renderRecord(record);
      diagrams.push(record);
    }
    return Promise.all(diagrams.map((record) => new Promise((resolve) => {
      if (record.result) return resolve(record);
      const timer = setInterval(() => {
        if (record.figure.dataset.state === "ready" || record.figure.dataset.state === "error") {
          clearInterval(timer);
          resolve(record);
        }
      }, 30);
      if (record.figure.dataset.state === "error") {
        clearInterval(timer);
        resolve(record);
      }
    })));
  }
  return { mount, renderAll, handleClick, uiState, closeMenus, svgToPng };
}
var NS, ICONS;
var init_ui = __esm({
  "src/ui.js"() {
    NS = "http://www.w3.org/2000/svg";
    ICONS = {
      menu: [
        ["circle", { cx: "5", cy: "12", r: "1.25", fill: "currentColor", stroke: "none" }],
        ["circle", { cx: "12", cy: "12", r: "1.25", fill: "currentColor", stroke: "none" }],
        ["circle", { cx: "19", cy: "12", r: "1.25", fill: "currentColor", stroke: "none" }]
      ],
      expand: [["path", { d: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" }]],
      copy: [
        ["rect", { x: "8", y: "8", width: "14", height: "14", rx: "2" }],
        ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]
      ],
      image: [
        ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }],
        ["circle", { cx: "9", cy: "9", r: "2" }],
        ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]
      ],
      download: [
        ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
        ["polyline", { points: "7 10 12 15 17 10" }],
        ["line", { x1: "12", y1: "15", x2: "12", y2: "3" }]
      ],
      "zoom-in": [
        ["circle", { cx: "11", cy: "11", r: "8" }],
        ["line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }],
        ["line", { x1: "11", y1: "8", x2: "11", y2: "14" }],
        ["line", { x1: "8", y1: "11", x2: "14", y2: "11" }]
      ],
      "zoom-out": [
        ["circle", { cx: "11", cy: "11", r: "8" }],
        ["line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }],
        ["line", { x1: "8", y1: "11", x2: "14", y2: "11" }]
      ],
      fit: [
        ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
        ["path", { d: "M3 3v5h5" }]
      ],
      close: [["path", { d: "M18 6 6 18M6 6l12 12" }]]
    };
  }
});

// src/styles.css
var styles_default;
var init_styles = __esm({
  "src/styles.css"() {
    styles_default = '/* \u804C\u8D23\uFF1Agpt-mermaid \u7684 ChatGPT \u98CE\u683C\u5185\u8054\u56FE\u8868\u6837\u5F0F\u3002 */\n.mgpt-diagram {\n  position: relative;\n  display: block;\n  width: 100%;\n  min-width: 0;\n  max-width: 100%;\n  margin: 18px 0;\n  border: 0;\n  background: transparent;\n  color: #263244;\n  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;\n}\n.mgpt-diagram[data-wide="true"] {\n  width: min(calc(100% + 8rem), 96vw);\n  max-width: 96vw;\n  margin-left: 50%;\n  transform: translateX(-50%);\n}\n.mgpt-floatbar {\n  position: absolute;\n  top: 4px;\n  right: 4px;\n  z-index: 8;\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  padding: 2px;\n  border: 1px solid rgba(26, 28, 31, .06);\n  border-radius: 9999px;\n  background: rgba(255, 255, 255, .94);\n  box-shadow: 0 1px 4px rgba(24, 32, 48, .08);\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity .15s ease;\n}\n.mgpt-diagram:hover .mgpt-floatbar,\n.mgpt-diagram:focus-within .mgpt-floatbar,\n.mgpt-diagram[data-menu-open="true"] .mgpt-floatbar,\n.mgpt-diagram[data-state="error"] .mgpt-floatbar {\n  opacity: 1;\n  pointer-events: auto;\n}\n@media (hover: none), (pointer: coarse) {\n  .mgpt-floatbar { opacity: 1; pointer-events: auto; }\n}\n.mgpt-icon-button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 32px;\n  height: 32px;\n  padding: 0;\n  border: 0;\n  border-radius: 9999px;\n  background: transparent;\n  color: #626f82;\n  cursor: pointer;\n}\n.mgpt-icon-button:hover:not(:disabled),\n.mgpt-diagram[data-menu-open="true"] .mgpt-floatbar [data-mgpt-action="menu"] {\n  background: #ebf0f7;\n  color: #263244;\n}\n.mgpt-icon-button:focus-visible,\n.mgpt-menuitem:focus-visible {\n  outline: 2px solid #2563c9;\n  outline-offset: 1px;\n}\n.mgpt-icon {\n  width: 16px;\n  height: 16px;\n  flex-shrink: 0;\n}\n.mgpt-menu {\n  position: absolute;\n  top: calc(100% + 6px);\n  right: 0;\n  z-index: 20;\n  display: flex;\n  flex-direction: column;\n  min-width: 148px;\n  padding: 6px;\n  border: 1px solid #e1e7ef;\n  border-radius: 12px;\n  background: #fff;\n  box-shadow: 0 8px 32px #1b2b4212, 0 1px 4px #1b2b4208;\n}\n.mgpt-menu[hidden] { display: none; }\n.mgpt-menuitem {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  padding: 7px 10px;\n  border: 0;\n  border-radius: 8px;\n  background: transparent;\n  color: #263244;\n  font: inherit;\n  font-size: 12.5px;\n  line-height: 1.5;\n  text-align: left;\n  cursor: pointer;\n}\n.mgpt-menuitem:hover:not(:disabled) { background: #f2f5f9; }\n.mgpt-menuitem:disabled,\n.mgpt-icon-button:disabled { opacity: .42; cursor: default; }\n.mgpt-status {\n  padding: 12px 16px;\n  color: #626f82;\n  font-size: 12px;\n  line-height: 1.6;\n}\n.mgpt-diagram[data-state="error"] .mgpt-status { color: #a44c32; }\n.mgpt-retry {\n  margin: 0 16px 12px;\n  padding: 5px 9px;\n  border: 1px solid #e1e7ef;\n  border-radius: 7px;\n  background: #fff;\n  color: #263244;\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n}\n.mgpt-retry[hidden] { display: none; }\n.mgpt-viewport {\n  box-sizing: border-box;\n  width: 100%;\n  min-width: 0;\n  max-width: 100%;\n  padding: 8px 0;\n  overflow: visible;\n  background: transparent;\n}\n.mgpt-stage {\n  position: relative;\n  width: 100%;\n  min-height: 112px;\n  overflow: hidden;\n  cursor: grab;\n  touch-action: pan-y;\n  user-select: none;\n}\n.mgpt-stage[data-dragging="true"] { cursor: grabbing; }\n.mgpt-stage:focus-visible { outline: 2px solid #2563c9; outline-offset: -2px; }\n.mgpt-image {\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  display: block;\n  width: 100%;\n  height: auto;\n  max-width: none;\n  margin: 0;\n  border: 0;\n  object-fit: contain;\n  pointer-events: none;\n  transform-origin: center;\n}\n.mgpt-diagram > pre {\n  max-height: 420px;\n  margin: 0;\n  overflow: auto;\n}\n.mgpt-dialog {\n  box-sizing: border-box;\n  width: min(1440px, calc(100vw - 32px));\n  height: min(900px, calc(100dvh - 32px));\n  max-width: none;\n  padding: 0;\n  border: 1px solid #e1e7ef;\n  border-radius: 16px;\n  background: #fff;\n  color: #263244;\n  box-shadow: 0 8px 32px #1b2b4212;\n  overflow: hidden;\n}\n.mgpt-dialog::backdrop { background: #0006; }\n.mgpt-dialog[open] { display: flex; flex-direction: column; }\n.mgpt-dialog-bar {\n  display: flex;\n  align-items: center;\n  flex: 0 0 auto;\n  min-height: 42px;\n  padding: 5px 8px;\n  border-bottom: 1px solid #f1f4f8;\n  background: #fafbfd;\n}\n.mgpt-dialog-actions { display: flex; align-items: center; gap: 2px; }\n.mgpt-dialog-bar > [data-mgpt-action="close"] { margin-left: auto; }\n.mgpt-dialog-viewport { flex: 1; min-height: 0; }\n.mgpt-dialog-viewport .mgpt-stage { height: 100%; min-height: 100%; }\n@media (max-width: 900px) {\n  .mgpt-diagram[data-wide="true"] {\n    width: 100%;\n    max-width: 100%;\n    margin-left: 0;\n    transform: none;\n  }\n}\n@media (max-width: 640px) {\n  .mgpt-diagram { margin: 14px 0; }\n  .mgpt-viewport { padding: 4px 0; }\n  .mgpt-dialog { width: calc(100vw - 12px); height: calc(100dvh - 12px); }\n}\n';
  }
});

// src/factory.js
var factory_exports = {};
__export(factory_exports, {
  createGPTMermaid: () => createGPTMermaid
});
function injectStyles(doc, enabled) {
  if (!enabled || !doc?.head || doc.getElementById("gpt-mermaid-styles")) return;
  const style = doc.createElement("style");
  style.id = "gpt-mermaid-styles";
  style.textContent = styles_default;
  doc.head.append(style);
}
function createGPTMermaid(globalObject, baseUrl2) {
  let config = resolveConfig({}, DEFAULT_CONFIG);
  const renderer = createRenderer(baseUrl2 || globalObject.document?.baseURI || "http://localhost/");
  const ui = createUi({
    renderSvg: (source, options) => renderer.renderSvg(source, resolveConfig(options, config)),
    getConfig: (options) => resolveConfig(options, config)
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
    ui
  };
  if (globalObject.document) injectStyles(globalObject.document, config.autoInjectStyles);
  return api;
}
var init_factory = __esm({
  "src/factory.js"() {
    init_defaults();
    init_render();
    init_sanitize();
    init_ui();
    init_styles();
  }
});

// src/cjs-entry.cjs
var { createGPTMermaid: createGPTMermaid2 } = (init_factory(), __toCommonJS(factory_exports));
var baseUrl = typeof __dirname === "string" ? `file://${__dirname}/` : "http://localhost/";
module.exports = createGPTMermaid2(globalThis, baseUrl);

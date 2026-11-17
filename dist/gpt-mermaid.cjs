/*! gpt-mermaid v1.0.2 | MIT | https://github.com/edwardwonggang/gpt-mermaid */
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
    gptMermaidLineRight: colors.lineRight,
    gptMermaidLineDown: colors.lineDown,
    gptMermaidLineLeft: colors.lineLeft,
    gptMermaidLineUp: colors.lineUp,
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
    // 时序图的序号圆点由 marker 绘制，默认深色字压在深灰圆点上几乎不可见。
    // 固定使用白字，保证在四方向深色连线上都有足够对比度。
    sequenceNumberColor: "#ffffff",
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
    adaptiveLayout: input.adaptiveLayout === false || input.adaptiveLayout === void 0 && previous.adaptiveLayout === false ? false : { ...DEFAULT_CONFIG.adaptiveLayout, ...previous.adaptiveLayout || {}, ...input.adaptiveLayout || {} },
    themeVariables: { ...variables, ...previous.themeVariables || {}, ...input.themeVariables || {} },
    isDark
  };
}
function buildFlowchartThemeCSS(vars) {
  return `
.node text { font-size: 14px; font-weight: 600; letter-spacing: normal; fill: ${vars.flowchartTextColor}; }
.edgeLabels text { font-size: 13px; font-weight: 600; letter-spacing: -0.08px; fill: ${vars.flowchartTextColor}; }
.node tspan[font-weight="normal"], .edgeLabels tspan[font-weight="normal"] { font-weight: 600; }
.edgeLabel .label rect { opacity: 1; rx: 13px; ry: 13px; fill: ${vars.flowchartEdgeLabelColor}; stroke: ${vars.flowchartEdgeLabelBorderColor}; stroke-width: 1.5px; }
.node rect, .node circle, .node ellipse, .node polygon, .node path { fill: ${vars.flowchartNodeColor}; stroke: ${vars.flowchartNodeBorderColor}; stroke-width: 1.5px; }
.node rect { rx: 16px; ry: 16px; }
.node.default.mermaid-decision .label-container, .mermaid-decision .label-container { fill: ${vars.flowchartDecisionColor}; stroke: ${vars.flowchartLineColor}; stroke-dasharray: 2 2; }
.cluster rect { rx: 16px; ry: 16px; fill: ${vars.clusterBkg}; stroke: ${vars.clusterBorder}; stroke-width: 1.5px; }
.cluster-label text, .cluster-label tspan { font-size: 13px; font-weight: 600; fill: ${vars.textColor}; }
.edgePaths .flowchart-link { stroke: ${vars.flowchartLineColor}; stroke-width: 1.6px; stroke-linecap: round; stroke-linejoin: round; }
.marker { fill: ${vars.flowchartLineColor}; stroke: ${vars.flowchartLineColor}; }
`;
}
function buildGlobalThemeCSS(vars) {
  return `
.node rect, .node circle, .node ellipse, .node polygon, .node path { fill: ${vars.flowchartNodeColor}; stroke: ${vars.flowchartNodeBorderColor}; stroke-width: 1.5px; }
.node rect { rx: 12px; ry: 12px; }
.node text, .node tspan { fill: ${vars.flowchartTextColor}; font-size: 14px; font-weight: 600; }
rect.actor, rect.actor-top, rect.actor-bottom { fill: ${vars.actorBkg}; stroke: ${vars.actorBorder}; stroke-width: 1.5px; rx: 12px; ry: 12px; }
text.actor, text.actor > tspan { fill: ${vars.actorTextColor}; font-size: 14px; font-weight: 600; }
.actor-line { stroke: ${vars.actorLineColor}; stroke-width: 1px; }
.messageLine0, .messageLine1 { stroke: ${vars.signalColor}; stroke-width: 1.6px; }
.messageText { fill: ${vars.signalTextColor}; font-size: 13px; font-weight: 500; }
.statediagram-state rect.basic.label-container { fill: ${vars.flowchartNodeColor}; stroke: ${vars.flowchartNodeBorderColor}; stroke-width: 1.5px; rx: 14px; ry: 14px; }
.statediagram-state text, .statediagram-state tspan { fill: ${vars.flowchartTextColor}; font-size: 14px; font-weight: 600; }
.transition { stroke: ${vars.flowchartLineColor}; stroke-width: 1.6px; }
g.classGroup rect, g.classGroup line { fill: ${vars.flowchartNodeColor}; stroke: ${vars.flowchartNodeBorderColor}; stroke-width: 1.5px; }
.node .outer-path path { stroke: ${vars.flowchartNodeBorderColor}; stroke-width: 1.5px; }
.divider path { stroke: ${vars.flowchartLineColor}; stroke-width: 1.5px; }
.entityBox { fill: ${vars.flowchartNodeColor}; stroke: ${vars.flowchartNodeBorderColor}; stroke-width: 1.5px; rx: 10px; ry: 10px; }
.relationshipLine { stroke: ${vars.flowchartLineColor}; stroke-width: 1.6px; }
.edgeLabel .label rect, .edgeLabel rect.labelBkg { opacity: 1; rx: 13px; ry: 13px; fill: ${vars.flowchartEdgeLabelColor}; stroke: ${vars.flowchartEdgeLabelBorderColor}; stroke-width: 1.5px; }
.edgeLabel text, .edgeLabel tspan { fill: ${vars.flowchartTextColor}; font-size: 13px; font-weight: 600; }
.note { fill: ${vars.noteBkgColor}; stroke: ${vars.noteBorderColor}; rx: 10px; ry: 10px; }
.noteText, .noteText > tspan { fill: ${vars.noteTextColor}; font-size: 13px; }
`;
}
var VERSION, PRESETS, DEFAULT_CONFIG, SERIES;
var init_defaults = __esm({
  "src/defaults.js"() {
    VERSION = "1.0.2";
    PRESETS = Object.freeze({
      gpt: Object.freeze({
        node: "#e5f3ff",
        decision: "#f5faff",
        text: "#004f99",
        line: "#66798c",
        border: "#5b8fbd",
        label: "#f5faff",
        lineRight: "#2563eb",
        lineDown: "#0f766e",
        lineLeft: "#c2410c",
        lineUp: "#7c3aed"
      }),
      github: Object.freeze({
        node: "#f6f8fa",
        decision: "#ffffff",
        text: "#1f2328",
        line: "#d0d7de",
        border: "rgba(31, 35, 40, 0.16)",
        label: "#ffffff",
        lineRight: "#0969da",
        lineDown: "#1a7f37",
        lineLeft: "#bc4c00",
        lineUp: "#8250df"
      }),
      linear: Object.freeze({
        node: "#eef2ff",
        decision: "#f8faff",
        text: "#2f3b5c",
        line: "#a9b6d6",
        border: "rgba(47, 59, 92, 0.18)",
        label: "#ffffff",
        lineRight: "#2563eb",
        lineDown: "#0f766e",
        lineLeft: "#c2410c",
        lineUp: "#7c3aed"
      }),
      tokyo: Object.freeze({
        node: "#24283b",
        decision: "#1f2335",
        text: "#c0caf5",
        line: "#3b4261",
        border: "rgba(192, 202, 245, 0.18)",
        label: "#1f2335",
        lineRight: "#7aa2f7",
        lineDown: "#9ece6a",
        lineLeft: "#ff9e64",
        lineUp: "#bb9af7"
      }),
      nord: Object.freeze({
        node: "#3b4252",
        decision: "#2e3440",
        text: "#eceff4",
        line: "#4c566a",
        border: "rgba(236, 239, 244, 0.16)",
        label: "#2e3440",
        lineRight: "#88c0d0",
        lineDown: "#a3be8c",
        lineLeft: "#d08770",
        lineUp: "#b48ead"
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
      fitMaxHeight: Infinity,
      // 阈值表示折返前允许的主轴长度；复杂反馈/子图仍保留布局器的拓扑。
      adaptiveLayout: Object.freeze({ enabled: true, maxWidth: 1200, maxHeight: 1e3, gap: 80 })
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
    SVG_TAGS = new Set("svg g a path defs symbol desc title text tspan textPath rect line polyline polygon circle ellipse marker pattern linearGradient radialGradient stop clipPath mask filter feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence style image use switch".split(" "));
    DENY_TAGS = /* @__PURE__ */ new Set(["script", "iframe", "object", "embed", "form", "input", "button", "textarea", "foreignObject", "image", "animate", "animateMotion", "animateTransform", "set"]);
  }
});

// src/path-intersections.js
function segmentIntersection(a, b, c, d) {
  const v = delta(a, b), w = delta(c, d), offset = delta(a, c);
  const determinant = cross(v, w), length2 = v.x * v.x + v.y * v.y;
  if (length2 < EPS || w.x * w.x + w.y * w.y < EPS) return null;
  if (Math.abs(determinant) < EPS) {
    if (Math.abs(cross(offset, v)) > EPS * Math.sqrt(length2)) return null;
    const project = (p) => ((p.x - a.x) * v.x + (p.y - a.y) * v.y) / length2;
    const t0 = project(c), t1 = project(d);
    const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1));
    if (lo > hi + EPS) return null;
    const t2 = (lo + hi) / 2;
    return { x: a.x + t2 * v.x, y: a.y + t2 * v.y, kind: hi - lo > EPS ? "overlap" : "touch" };
  }
  const t = cross(offset, w) / determinant, u = cross(offset, v) / determinant;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return {
    x: a.x + t * v.x,
    y: a.y + t * v.y,
    kind: t > EPS && t < 1 - EPS && u > EPS && u < 1 - EPS ? "cross" : "touch"
  };
}
var EPS, cross, delta;
var init_path_intersections = __esm({
  "src/path-intersections.js"() {
    EPS = 1e-7;
    cross = (a, b) => a.x * b.y - a.y * b.x;
    delta = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
  }
});

// src/svg-routing.js
function nodeShape(node) {
  return node.querySelector(":scope > .label-container, :scope > .outer-path, :scope > rect, :scope > circle, :scope > ellipse, :scope > polygon, :scope > path") || [...node.children].find((child) => child.localName === "g" && !child.classList.contains("label") && child.querySelector("path,rect,circle,ellipse,polygon"));
}
function inSvg(svg, element, point) {
  return new DOMPoint(point.x, point.y).matrixTransform(element.getScreenCTM()).matrixTransform(svg.getScreenCTM().inverse());
}
function fromSvg(svg, element, point) {
  return new DOMPoint(point.x, point.y).matrixTransform(svg.getScreenCTM()).matrixTransform(element.getScreenCTM().inverse());
}
function boundsInSvg(svg, element) {
  const box = element.getBBox();
  const a = inSvg(svg, element, box);
  const b = inSvg(svg, element, { x: box.x + box.width, y: box.y + box.height });
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y)
  };
}
function readPoints(edge) {
  try {
    const points = JSON.parse(atob(edge.getAttribute("data-points") || ""));
    return Array.isArray(points) && points.length >= 2 && points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) ? points : null;
  } catch {
    return null;
  }
}
function simplifyPoints(points) {
  const result = [];
  for (const point of points) {
    if (result.length && distance(result.at(-1), point) < EPS2) continue;
    while (result.length >= 2) {
      const a = result.at(-2), b = result.at(-1);
      const cross2 = (b.x - a.x) * (point.y - b.y) - (b.y - a.y) * (point.x - b.x);
      const forward = (b.x - a.x) * (point.x - b.x) + (b.y - a.y) * (point.y - b.y);
      if (Math.abs(cross2) > EPS2 || forward < 0) break;
      result.pop();
    }
    result.push({ x: point.x, y: point.y });
  }
  return result;
}
function routeQuality(input) {
  const invalid = { length: Infinity, bends: 0, selfIntersections: 0, retraces: 0, score: Infinity };
  if (!Array.isArray(input) || input.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return invalid;
  const points = simplifyPoints(input);
  if (points.length < 2) return invalid;
  let length = 0, selfIntersections = 0, retraces = 0;
  const cross2 = (a, b) => a.x * b.y - a.y * b.x;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], v = { x: b.x - a.x, y: b.y - a.y };
    length += distance(a, b);
    for (let j = i + 1; j < points.length; j++) {
      const c = points[j - 1], d = points[j], w = { x: d.x - c.x, y: d.y - c.y };
      const offset = { x: c.x - a.x, y: c.y - a.y }, determinant = cross2(v, w);
      if (Math.abs(determinant) < EPS2) {
        if (Math.abs(cross2(offset, v)) > EPS2) continue;
        const axis = Math.abs(v.x) > Math.abs(v.y) ? "x" : "y";
        const overlap = Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis])) - Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]));
        if (overlap > EPS2) retraces++;
        else if (overlap >= -EPS2 && j > i + 1) selfIntersections++;
      } else if (j > i + 1) {
        const t = cross2(offset, w) / determinant, u = cross2(offset, v) / determinant;
        if (t >= -1e-7 && t <= 1 + 1e-7 && u >= -1e-7 && u <= 1 + 1e-7) selfIntersections++;
      }
    }
  }
  const bends = Math.max(0, points.length - 2);
  return {
    length,
    bends,
    selfIntersections,
    retraces,
    score: selfIntersections || retraces ? Infinity : length + bends * BEND_COST
  };
}
function roundedPath(input, radius = 7) {
  const points = simplifyPoints(input);
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const r = Math.min(radius, distance(a, b) / 2, distance(b, c) / 2);
    const before = { x: b.x + (a.x - b.x) * r / distance(a, b), y: b.y + (a.y - b.y) * r / distance(a, b) };
    const after = { x: b.x + (c.x - b.x) * r / distance(b, c), y: b.y + (c.y - b.y) * r / distance(b, c) };
    d += `L${before.x},${before.y}Q${b.x},${b.y} ${after.x},${after.y}`;
  }
  return `${d}L${points.at(-1).x},${points.at(-1).y}`;
}
function writePoints(svg, edge, rootPoints) {
  const points = simplifyPoints(rootPoints).map((p) => fromSvg(svg, edge, p)).map(({ x, y }) => ({ x, y }));
  edge.setAttribute("data-points", btoa(JSON.stringify(points)));
  edge.setAttribute("d", roundedPath(points));
}
function segmentBlocked(a, b, boxes, pad = 0) {
  return boxes.some((box) => {
    let lo = 0, hi = 1;
    for (const [p, q] of [
      [-(b.x - a.x), a.x - box.x + pad - EPS2],
      [b.x - a.x, box.right + pad - a.x - EPS2],
      [-(b.y - a.y), a.y - box.y + pad - EPS2],
      [b.y - a.y, box.bottom + pad - a.y - EPS2]
    ]) {
      if (Math.abs(p) < 1e-9) {
        if (q < 0) return false;
      } else if (p < 0) lo = Math.max(lo, q / p);
      else hi = Math.min(hi, q / p);
    }
    return lo <= hi;
  });
}
function clearRoute(points, boxes, pad = 0) {
  return points.slice(1).every((p, i) => !segmentBlocked(points[i], p, boxes, pad));
}
function orthogonalRoute(start, end, boxes, clearance = CLEARANCE, occupied = [], directions = {}) {
  const xs = [.../* @__PURE__ */ new Set([start.x, end.x, ...directions.extraX || [], ...boxes.flatMap((b) => [b.x - clearance, b.right + clearance])])].sort((a, b) => a - b);
  const ys = [.../* @__PURE__ */ new Set([start.y, end.y, ...directions.extraY || [], ...boxes.flatMap((b) => [b.y - clearance, b.bottom + clearance])])].sort((a, b) => a - b);
  if (xs.length * ys.length > 4e4) return null;
  const startIndex = ys.indexOf(start.y) * xs.length + xs.indexOf(start.x);
  const endIndex = ys.indexOf(end.y) * xs.length + xs.indexOf(end.x);
  const point = (index) => ({ x: xs[index % xs.length], y: ys[Math.floor(index / xs.length)] });
  const costs = /* @__PURE__ */ new Map(), parents = /* @__PURE__ */ new Map(), queue = [];
  const visibility = /* @__PURE__ */ new Map(), congestionCache = /* @__PURE__ */ new Map();
  const estimate = (index) => {
    const p = point(index);
    return Math.abs(p.x - end.x) + Math.abs(p.y - end.y);
  };
  const push = (state) => {
    queue.push(state);
    let i = queue.length - 1;
    while (i > 0) {
      const p = i - 1 >> 1;
      if (queue[p].priority <= state.priority) break;
      queue[i] = queue[p];
      i = p;
    }
    queue[i] = state;
  };
  const pop = () => {
    const first = queue[0], last = queue.pop();
    if (queue.length) {
      let i = 0;
      while (i * 2 + 1 < queue.length) {
        let j = i * 2 + 1;
        if (j + 1 < queue.length && queue[j + 1].priority < queue[j].priority) j++;
        if (queue[j].priority >= last.priority) break;
        queue[i] = queue[j];
        i = j;
      }
      queue[i] = last;
    }
    return first;
  };
  const axisOf = (v) => Math.abs(v.x) > Math.abs(v.y) ? 0 : 1;
  for (const axis of directions.start ? [axisOf(directions.start)] : [0, 1]) {
    const key = startIndex * 2 + axis;
    costs.set(key, 0);
    push({ index: startIndex, axis, key, cost: 0, priority: estimate(startIndex) });
  }
  let finish;
  let visited = 0;
  while (queue.length) {
    const current = pop();
    if (current.cost !== costs.get(current.key)) continue;
    if (++visited > (directions.maxVisited || 8e4)) return null;
    if (directions.budget && --directions.budget.remaining < 0) return null;
    if (current.index === endIndex) {
      finish = current.key;
      break;
    }
    const x = current.index % xs.length, y = Math.floor(current.index / xs.length);
    for (const [nx, ny, axis] of [[x - 1, y, 0], [x + 1, y, 0], [x, y - 1, 1], [x, y + 1, 1]]) {
      if (nx < 0 || nx >= xs.length || ny < 0 || ny >= ys.length) continue;
      const index = ny * xs.length + nx, a = point(current.index), b = point(index);
      const movement = { x: b.x - a.x, y: b.y - a.y };
      const backwards = (v) => v && movement.x * v.x + movement.y * v.y < -EPS2;
      if (current.index === startIndex && backwards(directions.start) || index === endIndex && backwards(directions.end)) continue;
      const segmentKey = current.index < index ? `${current.index}:${index}` : `${index}:${current.index}`;
      if (!visibility.has(segmentKey)) visibility.set(segmentKey, !segmentBlocked(a, b, boxes) && !(directions.avoidSegments || []).some(([p, q]) => segmentIntersection(a, b, p, q)));
      if (!visibility.get(segmentKey)) continue;
      let congestion = congestionCache.get(segmentKey);
      if (congestion === void 0) {
        congestion = 0;
        for (const [p, q] of occupied) {
          const horizontal = near(a.y, b.y), otherHorizontal = near(p.y, q.y);
          if (horizontal !== otherHorizontal) continue;
          const axis2 = horizontal ? "x" : "y", cross2 = horizontal ? "y" : "x";
          if (Math.abs(a[cross2] - p[cross2]) > 4) continue;
          const overlap = Math.min(Math.max(a[axis2], b[axis2]), Math.max(p[axis2], q[axis2])) - Math.max(Math.min(a[axis2], b[axis2]), Math.min(p[axis2], q[axis2]));
          if (overlap > 0) congestion += overlap * 6;
        }
        congestionCache.set(segmentKey, congestion);
      }
      const cost = current.cost + distance(a, b) + (axis === current.axis ? 0 : BEND_COST) + congestion + (index === endIndex && directions.end && axis !== axisOf(directions.end) ? BEND_COST : 0);
      const key = index * 2 + axis;
      if (cost >= (costs.get(key) ?? Infinity)) continue;
      costs.set(key, cost);
      parents.set(key, current.key);
      push({ index, axis, key, cost, priority: cost + estimate(index) });
    }
  }
  if (finish === void 0) return null;
  const result = [];
  for (let key = finish; key !== void 0; key = parents.get(key)) result.push(point(Math.floor(key / 2)));
  return simplifyPoints(result.reverse());
}
function flowGeometry(svg, graph) {
  if (!graph?.nodes || !graph?.edges) return null;
  const nodes = new Map(graph.nodes.map((model) => {
    const element = svg.getElementById(`${svg.id}-${model.domId}`) || svg.getElementById(model.domId);
    const shape = element?.querySelector(":scope > .label-container, :scope > .outer-path");
    return [model.id, element && shape && !model.isGroup ? { model, element, shape, box: boundsInSvg(svg, shape) } : null];
  }).filter(([, node]) => node));
  const byId = new Map([...svg.querySelectorAll("path.flowchart-link[data-id]")].map((e) => [e.dataset.id, e]));
  const edges = graph.edges.map((model) => {
    const element = byId.get(model.id), source = nodes.get(model.start), target = nodes.get(model.end);
    const raw = element && readPoints(element);
    return element && source && target && raw ? {
      model,
      element,
      source,
      target,
      points: simplifyPoints(raw.map((p) => inSvg(svg, element, p)))
    } : null;
  }).filter(Boolean);
  return { nodes, edges };
}
function sideOf(point, adjacent) {
  const dx = adjacent.x - point.x, dy = adjacent.y - point.y;
  return Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "bottom" : "top";
}
function onSide(box, side, cross2) {
  return horizontalSide(side) ? { x: side === "left" ? box.x : box.right, y: cross2 } : { x: cross2, y: side === "top" ? box.y : box.bottom };
}
function movePort(edge, start, side, value, reach) {
  let points = (start ? edge.points : edge.points.slice().reverse()).map((p) => ({ ...p }));
  const cross2 = horizontalSide(side) ? "y" : "x", axis = cross2 === "x" ? "y" : "x";
  const old = points[0][cross2];
  points[0][cross2] = value;
  if (points.length === 2 && !near(value, points[1][cross2])) {
    const middle = reach === void 0 ? (points[0][axis] + points[1][axis]) / 2 : points[0][axis] + signOf(side) * reach;
    points.splice(1, 0, { ...points[0], [axis]: middle }, { ...points[1], [axis]: middle });
  } else if (points.length > 2) {
    points[1][cross2] = value;
    if (reach !== void 0) {
      const middle = points[0][axis] + signOf(side) * reach;
      points[1][axis] = middle;
      if (points.length === 3 || near(points[1][axis], points[2][axis]) || near(old, points[2][cross2])) {
        points.splice(2, 0, { ...points[2], [axis]: middle });
      } else if (points.length >= 4) points[2][axis] = middle;
    }
  }
  edge.points = simplifyPoints(start ? points : points.reverse());
}
function simplifyPortJog(edge, start, side, peers, boxes) {
  const points = start ? edge.points : edge.points.slice().reverse();
  if (points.length < 4) return;
  const cross2 = horizontalSide(side) ? "y" : "x", axis = cross2 === "x" ? "y" : "x";
  if (!near(points[0][cross2], points[1][cross2]) || !near(points[1][axis], points[2][axis]) || !near(points[2][cross2], points[3][cross2])) return;
  const nextCross = points[2][cross2], delta2 = Math.abs(points[0][cross2] - nextCross);
  const box = (start ? edge.source : edge.target).box;
  const low = horizontalSide(side) ? box.y : box.x, span = horizontalSide(side) ? box.height : box.width;
  if (delta2 > 12 || nextCross < low + 12 || nextCross > low + span - 12) return;
  if (peers.some((peer) => peer.edge !== edge && Math.abs(peer.value - nextCross) < PORT_GAP)) return;
  const next = [{ ...points[0], [cross2]: nextCross }, ...points.slice(3)];
  if (!clearRoute(next, boxes)) return;
  edge.points = start ? next : next.reverse();
}
function routeFlowEdges(svg, graph) {
  const geometry2 = flowGeometry(svg, graph);
  if (!geometry2) return;
  const { nodes, edges } = geometry2;
  const groups = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    edge.element.setAttribute("data-gptm-source", edge.source.element.id);
    edge.element.setAttribute("data-gptm-target", edge.target.element.id);
    for (const start of [true, false]) {
      const points = start ? edge.points : edge.points.slice().reverse(), node = start ? edge.source : edge.target;
      const side = sideOf(points[0], points[1]), value = points[0][horizontalSide(side) ? "y" : "x"];
      const key = `${node.model.id}\0${side}`;
      if (!groups.has(key)) groups.set(key, { node, side, ports: [] });
      groups.get(key).ports.push({ edge, start, side, value });
    }
  }
  let bundled = 0, loops = 0, simplified = 0;
  for (const { node, side, ports } of groups.values()) {
    const units = [], bundles = /* @__PURE__ */ new Map();
    for (const port of ports) {
      const { edge, start } = port;
      const compatible = !start && edge.source !== edge.target && edge.model.arrowTypeStart === "none" && edge.model.arrowTypeEnd === "arrow_point" && edge.model.pattern === "normal" && !edge.model.animate;
      const key = compatible ? JSON.stringify([edge.model.thickness, edge.model.style, edge.model.cssCompiledStyles]) : null;
      if (key !== null && bundles.has(key)) bundles.get(key).push(port);
      else {
        const unit = [port];
        units.push(unit);
        if (key !== null) bundles.set(key, unit);
      }
    }
    units.sort((a, b) => a.reduce((n, p) => n + p.value, 0) / a.length - b.reduce((n, p) => n + p.value, 0) / b.length);
    const low = horizontalSide(side) ? node.box.y : node.box.x, span = horizontalSide(side) ? node.box.height : node.box.width;
    const margin = Math.min(12, span * 0.15), available = span - margin * 2;
    const spacing = units.length > 1 ? Math.min(PORT_GAP, available / (units.length - 1)) : PORT_GAP;
    const crowded = ports.some((p, i) => ports.some((q, j) => j !== i && Math.abs(p.value - q.value) < PORT_GAP));
    units.forEach((unit, index) => {
      const value = crowded || unit.length > 1 ? low + span / 2 + (index - (units.length - 1) / 2) * spacing : unit[0].value;
      const bundle = unit.length > 1;
      for (const port of unit) {
        if (crowded || bundle) movePort(port.edge, port.start, side, value, bundle ? 30 : void 0);
        port.value = value;
        const previousSpan = Number(port.edge.element.getAttribute("data-gptm-port-span")) || Infinity;
        port.edge.element.setAttribute("data-gptm-port-span", String(Math.min(previousSpan, spacing)));
        if (bundle) port.edge.element.setAttribute("data-gptm-shared-tip", unit[0].edge.model.id);
      }
      if (bundle) {
        bundled += unit.length - 1;
        for (const port of unit.slice(1)) port.edge.element.removeAttribute("marker-end");
      }
    });
    for (const port of ports) {
      if (port.edge.source === port.edge.target || port.edge.element.hasAttribute("data-gptm-shared-tip")) continue;
      const count = port.edge.points.length;
      const boxes = [...nodes.values()].filter((n) => n !== port.edge.source && n !== port.edge.target).map((n) => n.box);
      simplifyPortJog(port.edge, port.start, side, ports, boxes);
      if (port.edge.points.length < count) simplified++;
    }
  }
  for (const edge of edges) {
    if (edge.source === edge.target) {
      const box = edge.source.box, side = sideOf(edge.points[0], edge.points[1]);
      const horizontal = horizontalSide(side), center = horizontal ? box.y + box.height / 2 : box.x + box.width / 2;
      const span = Math.min(32, (horizontal ? box.height : box.width) * 0.7);
      const label = [...svg.querySelectorAll("g.edgeLabel .label[data-id]")].find((l) => l.dataset.id === edge.model.id);
      const size = label ? boundsInSvg(svg, label) : { width: 0, height: 0 };
      const reach = Math.max(42, (horizontal ? size.width : size.height) + 24);
      const a = onSide(box, side, center - span / 2), b = onSide(box, side, center + span / 2);
      const axis = horizontal ? "x" : "y";
      edge.points = [a, { ...a, [axis]: a[axis] + signOf(side) * reach }, { ...b, [axis]: b[axis] + signOf(side) * reach }, b];
      edge.element.setAttribute("data-gptm-self-loop", "true");
      loops++;
    }
    const obstacles = [...nodes.values()].filter((node) => node !== edge.source && node !== edge.target).map((node) => node.box);
    if (!clearRoute(edge.points, obstacles, 1)) {
      const first = edge.points[0], last = edge.points.at(-1);
      const lead = (point, adjacent, amount) => {
        const d = distance(point, adjacent);
        return { x: point.x + (adjacent.x - point.x) / d * amount, y: point.y + (adjacent.y - point.y) / d * amount };
      };
      const start = lead(first, edge.points[1], 8);
      const end = lead(last, edge.points.at(-2), edge.element.hasAttribute("data-gptm-shared-tip") ? 30 : 8);
      const route = orthogonalRoute(start, end, [...nodes.values()].map((node) => node.box), CLEARANCE);
      if (route) {
        edge.points = [first, ...route, last];
        edge.element.setAttribute("data-gptm-obstacle-rerouted", "true");
      }
    }
    writePoints(svg, edge.element, edge.points);
  }
  svg.setAttribute("data-gptm-shared-arrows", String(bundled));
  svg.setAttribute("data-gptm-self-loops", String(loops));
  svg.setAttribute("data-gptm-simplified-jogs", String(simplified));
}
function fitSvgBounds(svg, padding = 12) {
  const boxes = [...svg.children].filter((el) => el.localName === "g" || el.localName === "text").map((el) => boundsInSvg(svg, el)).filter((b) => b.width > 0 || b.height > 0);
  if (!boxes.length) return;
  const x = Math.min(...boxes.map((b) => b.x)) - padding, y = Math.min(...boxes.map((b) => b.y)) - padding;
  const width = Math.max(...boxes.map((b) => b.right)) - x + padding;
  const height = Math.max(...boxes.map((b) => b.bottom)) - y + padding;
  svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.style.maxWidth = "none";
}
function asPath(element) {
  if (element.localName === "path") return element;
  const path = element.ownerDocument.createElementNS(NS, "path");
  for (const attribute of element.attributes) path.setAttribute(attribute.name, attribute.value);
  for (const name of ["x1", "x2", "y1", "y2"]) path.removeAttribute(name);
  element.replaceWith(path);
  return path;
}
function nativeLabelBox(center, size) {
  return {
    x: center.x - size.width / 2 - 7,
    y: center.y - size.height / 2 - 7,
    right: center.x + size.width / 2 + 7,
    bottom: center.y + size.height / 2 + 7
  };
}
function labelOnRoute(svg, points, size, barriers, occupied, original) {
  const old = { x: size.x + size.width / 2, y: size.y + size.height / 2 }, candidates = [];
  const add = (point) => {
    const box = nativeLabelBox(point, size);
    if (barriers.some((b) => boxesOverlap(box, b)) || occupied.some(([a, b]) => segmentBlocked(a, b, [box], 2))) return;
    candidates.push({ x: point.x, y: point.y, box, score: distance(point, old) });
  };
  if (original?.getTotalLength) {
    const length = original.getTotalLength(), steps = Math.min(1e3, Math.max(20, Math.ceil(length / 5)));
    for (let i = 1; i < steps; i++) add(inSvg(svg, original, original.getPointAtLength(length * i / steps)));
  } else {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = distance(a, b);
      if (length < 1) continue;
      const margin = 8, lo = margin / length, hi = 1 - lo;
      if (lo > hi) continue;
      const projection = ((old.x - a.x) * (b.x - a.x) + (old.y - a.y) * (b.y - a.y)) / (length * length);
      const samples = /* @__PURE__ */ new Set([Math.max(lo, Math.min(hi, projection)), 0.5]);
      const steps = Math.min(200, Math.ceil(length / 8));
      for (let j = 0; j <= steps; j++) samples.add(lo + (hi - lo) * j / steps);
      for (const t of samples) add({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return candidates.sort((a, b) => a.score - b.score)[0];
}
function routeNativeEdges(svg) {
  const nodes = new Map([...svg.querySelectorAll("g.node[data-id]")].map((element) => {
    const shape = nodeShape(element);
    return [element.dataset.id, shape && { element, shape, box: boundsInSvg(svg, shape) }];
  }).filter(([, node]) => node));
  const native = [...svg.querySelectorAll("path.transition[data-source],path.relation[data-source]")];
  const edges = native.map((element) => {
    const source = nodes.get(element.dataset.source), target = nodes.get(element.dataset.target), raw = readPoints(element);
    if (!source || !target || !raw) return null;
    element.setAttribute("data-gptm-source", source.element.id);
    element.setAttribute("data-gptm-target", target.element.id);
    const compatible = ["marker-start", "marker-end"].every((attribute) => {
      const value = element.getAttribute(attribute);
      return !value || /(?:barbEnd|extension(?:Start|End)|dependency(?:Start|End))\)/.test(value);
    });
    return { element, source, target, points: raw.map((p) => inSvg(svg, element, p)), compatible };
  }).filter(Boolean);
  const groups = /* @__PURE__ */ new Map(), ports = /* @__PURE__ */ new Map();
  for (const edge of edges) for (const start of [true, false]) {
    const node = start ? edge.source : edge.target, anchor = start ? edge.points[0] : edge.points.at(-1), box = node.box;
    const normalizedX = (anchor.x - box.x - box.width / 2) / box.width;
    const normalizedY = (anchor.y - box.y - box.height / 2) / box.height;
    const side = Math.abs(normalizedX) > Math.abs(normalizedY) ? normalizedX > 0 ? "right" : "left" : normalizedY > 0 ? "bottom" : "top";
    const key = `${node.element.id}\0${side}`;
    if (!groups.has(key)) groups.set(key, []);
    const value = anchor[horizontalSide(side) ? "y" : "x"];
    const port = { edge, start, side, node, value, anchor: onSide(box, side, value), spacing: PORT_GAP };
    groups.get(key).push(port);
    ports.set(`${edge.element.id}:${start}`, port);
  }
  const changed = /* @__PURE__ */ new Set();
  for (const group of groups.values()) {
    if (group.length < 2 || group.some((port) => !port.edge.compatible)) continue;
    group.sort((a, b) => a.value - b.value);
    if (!group.some((port, i) => i && port.value - group[i - 1].value < PORT_GAP)) continue;
    const { node, side } = group[0], box = node.box, horizontal = horizontalSide(side);
    const span = horizontal ? box.height : box.width, low = horizontal ? box.y : box.x;
    const margin = Math.min(12, span * 0.2), spacing = Math.min(24, (span - margin * 2) / (group.length - 1));
    group.forEach((port, index) => {
      const cross2 = low + span / 2 + (index - (group.length - 1) / 2) * spacing;
      port.anchor = onSide(box, side, cross2);
      port.spacing = spacing;
      const previous = Number(port.edge.element.getAttribute("data-gptm-port-span")) || Infinity;
      port.edge.element.setAttribute("data-gptm-port-span", String(Math.min(previous, spacing)));
      changed.add(port.edge);
    });
  }
  const boxes = [...nodes.values()].map((node) => node.box), occupied = [];
  for (const edge of edges.filter((edge2) => !edge2.compatible || edge2.source === edge2.target)) {
    for (let i = 1; i < edge.points.length; i++) occupied.push([edge.points[i - 1], edge.points[i]]);
  }
  const labelById = new Map([...svg.querySelectorAll("g.edgeLabel")].map((label) => [
    label.querySelector("[data-id]")?.dataset.id,
    label
  ]));
  const reservedLabels = [];
  const shields = [...ports.values()].filter((port) => port.edge.compatible).map((port) => {
    const arrow = port.edge.element.hasAttribute(port.start ? "marker-start" : "marker-end");
    const half = arrow ? Math.min(9, port.spacing * 0.38) : 2.5, p = port.anchor, horizontal = horizontalSide(port.side);
    const distance2 = arrow ? 20 : 6, out = signOf(port.side) * distance2;
    const x = horizontal ? Math.min(p.x, p.x + out) : p.x - half;
    const y = horizontal ? p.y - half : Math.min(p.y, p.y + out);
    return {
      edge: port.edge,
      x,
      y,
      right: x + (horizontal ? distance2 : half * 2),
      bottom: y + (horizontal ? half * 2 : distance2)
    };
  });
  const approaches = [...ports.values()].filter((port) => port.edge.compatible).map((port) => {
    const p = port.anchor, horizontal = horizontalSide(port.side), out = signOf(port.side) * 24;
    return {
      edge: port.edge,
      x: horizontal ? Math.min(p.x, p.x + out) : p.x - 2.5,
      right: horizontal ? Math.max(p.x, p.x + out) : p.x + 2.5,
      y: horizontal ? p.y - 2.5 : Math.min(p.y, p.y + out),
      bottom: horizontal ? p.y + 2.5 : Math.max(p.y, p.y + out)
    };
  });
  const labelSizes = new Map(edges.map((edge) => {
    const label = labelById.get(edge.element.dataset.id);
    return [edge, label?.textContent.trim() ? boundsInSvg(svg, label) : null];
  }));
  const routingOrder = edges.filter((edge) => edge.compatible).sort((a, b) => (labelSizes.get(b)?.width || 0) - (labelSizes.get(a)?.width || 0));
  for (const edge of routingOrder) {
    if (edge.source === edge.target) continue;
    const a = ports.get(`${edge.element.id}:true`), b = ports.get(`${edge.element.id}:false`);
    const lead = (port) => {
      const point = { ...port.anchor }, axis = horizontalSide(port.side) ? "x" : "y";
      point[axis] += signOf(port.side) * 24;
      return point;
    };
    const start = lead(a), end = lead(b);
    const foreignShields = shields.filter((shield) => shield.edge !== edge);
    const barriers = [...boxes, ...foreignShields, ...reservedLabels];
    const labelBarriers = [...boxes, ...shields, ...approaches.filter((item) => item.edge !== edge), ...reservedLabels];
    const foreign = [...nodes.values()].filter((node) => node !== edge.source && node !== edge.target).map((node) => node.box);
    const completeBarriers = [...foreign, ...foreignShields, ...reservedLabels];
    const size = labelSizes.get(edge);
    const vector2 = (a2, b2) => ({ x: b2.x - a2.x, y: b2.y - a2.y });
    const directions = { start: vector2(a.anchor, start), end: vector2(end, b.anchor) };
    let best;
    const consider = (points2, original = false) => {
      const quality = routeQuality(points2);
      if (!Number.isFinite(quality.score) || !clearRoute(points2, completeBarriers)) return;
      const reservation2 = size && labelOnRoute(svg, points2, size, labelBarriers, occupied, original && edge.element);
      if (size && !reservation2) return;
      const score = quality.score + (reservation2?.score || 0) * 0.02;
      if (!best || score < best.score) best = { points: points2, reservation: reservation2, score, original };
    };
    if (!changed.has(edge)) consider(edge.points, true);
    if (!best) {
      const route = orthogonalRoute(start, end, barriers, CLEARANCE, occupied, directions);
      if (route) consider(simplifyPoints([a.anchor, ...route, b.anchor]));
    }
    if (!best && size) {
      const center = { x: size.x + size.width / 2, y: size.y + size.height / 2 }, candidates = [];
      for (let row = -6; row <= 6; row++) for (let column = -6; column <= 6; column++) {
        const point = { x: center.x + column * 22, y: center.y + row * 18 }, box = nativeLabelBox(point, size);
        if (labelBarriers.some((b2) => boxesOverlap(box, b2)) || occupied.some(([p, q]) => segmentBlocked(p, q, [box], 2))) continue;
        candidates.push({ ...point, box, score: distance(start, point) + distance(point, end) });
      }
      candidates.sort((a2, b2) => a2.score - b2.score);
      for (const candidate of candidates.slice(0, 16)) for (const horizontal of [true, false]) {
        const first = horizontal ? { x: candidate.x - 8, y: candidate.y } : { x: candidate.x, y: candidate.y - 8 };
        const last = horizontal ? { x: candidate.x + 8, y: candidate.y } : { x: candidate.x, y: candidate.y + 8 };
        const forward = distance(start, first) + distance(end, last) <= distance(start, last) + distance(end, first);
        const enter = forward ? first : last, exit = forward ? last : first, through = vector2(enter, exit);
        const before = orthogonalRoute(start, enter, barriers, CLEARANCE, occupied, { start: directions.start, end: through });
        const after = orthogonalRoute(exit, end, barriers, CLEARANCE, occupied, { start: through, end: directions.end });
        if (before && after) consider(simplifyPoints([a.anchor, ...before, ...after, b.anchor]));
      }
    }
    if (!best) {
      for (let i = 1; i < edge.points.length; i++) occupied.push([edge.points[i - 1], edge.points[i]]);
      continue;
    }
    const { points, reservation } = best;
    if (!best.original) {
      writePoints(svg, edge.element, points);
      edge.element.setAttribute("data-gptm-native-rerouted", "true");
    }
    for (let i = 1; i < points.length; i++) occupied.push([points[i - 1], points[i]]);
    if (reservation) {
      reservedLabels.push(reservation.box);
      edge.element.setAttribute("data-gptm-label-x", String(reservation.x));
      edge.element.setAttribute("data-gptm-label-y", String(reservation.y));
    }
  }
  svg.setAttribute("data-gptm-native-routes", String(edges.filter((e) => e.element.hasAttribute("data-gptm-native-rerouted")).length));
}
var NS, EPS2, PORT_GAP, CLEARANCE, BEND_COST, near, distance, horizontalSide, signOf, boxesOverlap;
var init_svg_routing = __esm({
  "src/svg-routing.js"() {
    init_path_intersections();
    NS = "http://www.w3.org/2000/svg";
    EPS2 = 0.05;
    PORT_GAP = 18;
    CLEARANCE = 10;
    BEND_COST = 22;
    near = (a, b) => Math.abs(a - b) < EPS2;
    distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    horizontalSide = (side) => side === "left" || side === "right";
    signOf = (side) => side === "left" || side === "top" ? -1 : 1;
    boxesOverlap = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
  }
});

// src/svg-labels.js
function shift(element, x, y) {
  if (Math.abs(x) + Math.abs(y) < 1e-3) return;
  element.setAttribute("transform", `translate(${x}, ${y}) ${element.getAttribute("transform") || ""}`.trim());
}
function centerTitles(svg) {
  for (const node of svg.querySelectorAll("g.node")) {
    const labels = [...node.querySelectorAll(":scope > g.label")];
    const label = labels.find((item) => item.classList.contains("name")) || (labels.length === 1 ? labels[0] : null);
    const shape = node.querySelector(":scope > .label-container, :scope > .outer-path");
    if (!label || !shape || !label.textContent.trim()) continue;
    const texts = [...label.querySelectorAll("text")].filter((text) => text.textContent.trim());
    if (!texts.length) continue;
    const box = shape.getBoundingClientRect();
    const textBoxes = texts.map((text) => text.getBoundingClientRect());
    const left = Math.min(...textBoxes.map((item) => item.left));
    const right = Math.max(...textBoxes.map((item) => item.right));
    const inverse = node.getScreenCTM()?.inverse();
    if (!inverse) continue;
    const center = new DOMPoint((left + right) / 2, textBoxes[0].top).matrixTransform(inverse);
    const target = new DOMPoint(box.left + box.width / 2, box.top).matrixTransform(inverse);
    shift(label, target.x - center.x, 0);
  }
}
function journeyLabels(svg, variables) {
  for (const text of svg.querySelectorAll("text.journey-section, text.task")) {
    text.style.setProperty("fill", variables.textColor, "important");
    text.style.setProperty("font-family", variables.fontFamily);
    text.style.setProperty("font-weight", "600");
    for (const span of text.querySelectorAll("tspan")) span.style.setProperty("fill", variables.textColor, "important");
  }
}
function c4Labels(svg) {
  for (const node of svg.querySelectorAll(".c4-shape")) {
    const background = node.querySelector(".label-container rect, .label-container");
    const rgb = background && getComputedStyle(background).fill.match(/[\d.]+/g)?.map(Number);
    if (!rgb || rgb.length < 3) continue;
    const luminance = rgb.slice(0, 3).map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const fill = luminance < 0.18 ? "#ffffff" : "#172b4d";
    for (const text of node.querySelectorAll("text, tspan")) text.style.setProperty("fill", fill, "important");
  }
}
function overlaps(a, b, gap = 5) {
  return a.x < b.right + gap && a.right > b.x - gap && a.y < b.bottom + gap && a.bottom > b.y - gap;
}
function placeEdgeLabels(svg) {
  const paths = new Map([...svg.querySelectorAll("[data-id]")].filter((p) => p instanceof SVGGeometryElement).map((p) => [p.dataset.id, p]));
  const nodes = [...svg.querySelectorAll("g.node > .label-container, g.node > .outer-path")].map((n) => boundsInSvg(svg, n));
  const lines = [...paths.values()].map((edge) => {
    const length = edge.getTotalLength(), steps = Math.min(2e3, Math.max(2, Math.ceil(length / 3)));
    const points = Array.from({ length: steps + 1 }, (_, i) => inSvg(svg, edge, edge.getPointAtLength(length * i / steps)));
    return { edge, points };
  });
  const occupied = [];
  const labels = [...svg.querySelectorAll("g.edgeLabel")];
  const available = (label) => {
    const id = label.querySelector("[data-id]")?.dataset.id || label.dataset.id, edge = paths.get(id);
    if (!edge) return Infinity;
    if (edge.hasAttribute("data-gptm-label-x")) return -Infinity;
    const box = boundsInSvg(svg, label);
    return edge.getTotalLength() - Math.max(box.width, box.height);
  };
  const space = new Map(labels.map((label) => [label, available(label)]));
  labels.sort((a, b) => space.get(a) - space.get(b));
  for (const label of labels) {
    const id = label.querySelector("[data-id]")?.dataset.id || label.dataset.id;
    const edge = paths.get(id);
    if (!edge) continue;
    const box = boundsInSvg(svg, label), old = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (box.width === 0 || box.height === 0) continue;
    if (edge.hasAttribute("data-gptm-label-x") && edge.hasAttribute("data-gptm-label-y")) {
      const target2 = { x: Number(edge.getAttribute("data-gptm-label-x")), y: Number(edge.getAttribute("data-gptm-label-y")) };
      const before2 = fromSvg(svg, label.parentElement, old), after2 = fromSvg(svg, label.parentElement, target2);
      shift(label, after2.x - before2.x, after2.y - before2.y);
      label.setAttribute("data-gptm-label-edge", edge.id);
      occupied.push({ x: target2.x - box.width / 2, y: target2.y - box.height / 2, right: target2.x + box.width / 2, bottom: target2.y + box.height / 2 });
      continue;
    }
    const length = edge.getTotalLength(), candidates = [];
    if (!Number.isFinite(length) || length < 1) continue;
    const add = (offset) => {
      const point = inSvg(svg, edge, edge.getPointAtLength(offset));
      const proposed = {
        x: point.x - box.width / 2,
        y: point.y - box.height / 2,
        right: point.x + box.width / 2,
        bottom: point.y + box.height / 2
      };
      const a = inSvg(svg, edge, edge.getPointAtLength(Math.max(0, offset - 4)));
      const b = inSvg(svg, edge, edge.getPointAtLength(Math.min(length, offset + 4)));
      const diagonal = Math.min(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      const collision = [...nodes, ...occupied].filter((n) => overlaps(proposed, n)).length;
      const foreign = lines.filter((line) => line.edge !== edge && line.points.some((p) => p.x > proposed.x - 2 && p.x < proposed.right + 2 && p.y > proposed.y - 2 && p.y < proposed.bottom + 2)).length;
      const nearEnd = Math.min(offset, length - offset) < Math.max(box.width, box.height) / 2 + 16;
      candidates.push({ point, proposed, score: collision * 1e6 + foreign * 1e5 + (nearEnd ? 1e4 : 0) + diagonal * 20 + Math.hypot(point.x - old.x, point.y - old.y) });
    };
    const steps = Math.min(1e3, Math.max(20, Math.ceil(length / 5)));
    for (let i = 1; i < steps; i++) add(length * i / steps);
    const points = readPoints(edge);
    if (points) {
      let bestOffset = 0, bestDistance = Infinity;
      for (let i = 0; i <= steps; i++) {
        const offset = length * i / steps, p = inSvg(svg, edge, edge.getPointAtLength(offset));
        const d = Math.hypot(p.x - old.x, p.y - old.y);
        if (d < bestDistance) {
          bestDistance = d;
          bestOffset = offset;
        }
      }
      let lo = Math.max(0, bestOffset - length / steps), hi = Math.min(length, bestOffset + length / steps);
      for (let i = 0; i < 20; i++) {
        const l = lo + (hi - lo) / 3, r = hi - (hi - lo) / 3;
        const a = inSvg(svg, edge, edge.getPointAtLength(l)), b = inSvg(svg, edge, edge.getPointAtLength(r));
        if (Math.hypot(a.x - old.x, a.y - old.y) < Math.hypot(b.x - old.x, b.y - old.y)) hi = r;
        else lo = l;
      }
      add((lo + hi) / 2);
    }
    candidates.sort((a, b) => a.score - b.score);
    const target = candidates[0];
    if (!target) continue;
    const before = fromSvg(svg, label.parentElement, old), after = fromSvg(svg, label.parentElement, target.point);
    shift(label, after.x - before.x, after.y - before.y);
    label.setAttribute("data-gptm-label-edge", edge.id);
    occupied.push(target.proposed);
  }
}
function sequenceAnchor(svg, actorId, y, referenceX, towardsX) {
  const lifeline = [...svg.querySelectorAll('[data-et="life-line"]')].find((line) => line.getAttribute("data-id") === actorId);
  if (!lifeline) return null;
  const x = Number(lifeline.getAttribute("x1"));
  const activations = [...svg.querySelectorAll('rect[class^="activation"]')].filter((rect) => {
    const box = rect.getBBox();
    return y >= box.y - 0.1 && y <= box.y + box.height + 0.1 && Math.abs(box.x + box.width / 2 - x) <= box.width * 1.5;
  }).sort((a, b) => {
    const aBox = a.getBBox();
    const bBox = b.getBBox();
    return Math.abs(aBox.x + aBox.width / 2 - referenceX) - Math.abs(bBox.x + bBox.width / 2 - referenceX);
  });
  const activation = activations[0]?.getBBox();
  if (!activation) return { center: x, border: x };
  const center = activation.x + activation.width / 2;
  return { center, border: towardsX >= center ? activation.x + activation.width : activation.x };
}
function sequenceNumbers(svg, variables) {
  for (const text of svg.querySelectorAll("text.sequenceNumber")) {
    const markerLine = text.previousElementSibling;
    const message = markerLine?.previousElementSibling;
    if (markerLine?.localName !== "line" || message?.getAttribute("data-et") !== "message") continue;
    const x = Number(markerLine.getAttribute("x1"));
    const y = Number(markerLine.getAttribute("y1"));
    const source = sequenceAnchor(svg, message.getAttribute("data-from"), y, x, x);
    if (!source) continue;
    markerLine.setAttribute("x1", String(source.center));
    markerLine.setAttribute("x2", String(source.center));
    text.setAttribute("x", String(source.center));
    for (const span of text.querySelectorAll("tspan[x]")) span.setAttribute("x", String(source.center));
    text.style.setProperty("fill", variables.sequenceNumberColor || "#ffffff");
    text.style.setProperty("font-weight", "600");
    const box = text.getBBox();
    shift(text, source.center - (box.x + box.width / 2), y - (box.y + box.height / 2));
  }
}
function fixSvgLabels(svg, variables) {
  centerTitles(svg);
  journeyLabels(svg, variables);
  sequenceNumbers(svg, variables);
  c4Labels(svg);
}
var init_svg_labels = __esm({
  "src/svg-labels.js"() {
    init_svg_routing();
  }
});

// src/svg-shaft.js
function triangleDepth(svg, edge, endpoint) {
  const id = (edge.getAttribute(`marker-${endpoint}`) || "").match(/^url\(#([^)]+)\)$/)?.[1];
  if (!id) return 0;
  const marker = svg.getElementById(id);
  if (!marker || marker.getAttribute("markerUnits") !== "userSpaceOnUse") return 0;
  const viewBox = (marker.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
  if (viewBox.length !== 4 || viewBox.some((value, index) => value !== [0, 0, 10, 8][index])) return 0;
  const path = marker.querySelector(":scope > path");
  if (!path || !SHAFT_TRIANGLE_RE.test(path.getAttribute("d") || "")) return 0;
  const width = Number(marker.getAttribute("markerWidth"));
  return Number.isFinite(width) && width > 0 ? width : 0;
}
function normalizedViewportDiagonal(edge, svg) {
  const viewport = edge.ownerSVGElement || svg;
  const box = viewport.viewBox?.baseVal;
  let width = box?.width;
  let height = box?.height;
  if (!(width > 0 && height > 0)) {
    width = viewport.width?.baseVal?.value;
    height = viewport.height?.baseVal?.value;
  }
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? Math.hypot(width, height) / Math.SQRT2 : null;
}
function readLength(value, diagonal) {
  const match = String(value || "").trim().match(SHAFT_LENGTH_RE);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  if (match[2] === "%") return diagonal === null ? null : number * diagonal / 100;
  return number;
}
function readDash(style, diagonal, scale) {
  const raw = String(style.strokeDasharray || "none").trim();
  if (raw === "none") return { pattern: [], offset: 0 };
  const lengths = raw.split(/[\s,]+/).map((value) => readLength(value, diagonal));
  if (!lengths.length || lengths.some((value) => value === null || value < 0)) return null;
  let pattern = lengths.map((value) => value * scale);
  if (pattern.length % 2) pattern = [...pattern, ...pattern];
  const period = pattern.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(period)) return null;
  if (period === 0) return { pattern: [], offset: 0 };
  const offset = readLength(style.strokeDashoffset || "0", diagonal);
  if (offset === null) return null;
  return { pattern, offset: offset * scale };
}
function clippedSegments(length, head, tail, pattern, offset) {
  const end = length - tail;
  if (head >= end) return [];
  if (!pattern.length) return [[head, end]];
  const period = pattern.reduce((sum, value) => sum + value, 0);
  const phase = (offset % period + period) % period;
  const firstOrigin = -phase + Math.floor((head + phase) / period) * period;
  const cycles = Math.max(0, Math.ceil((end - firstOrigin) / period));
  if (!Number.isFinite(cycles) || cycles * pattern.length > SHAFT_MAX_SEGMENTS) return null;
  const segments2 = [];
  for (let cycle = 0; cycle < cycles; cycle++) {
    let cursor = firstOrigin + cycle * period;
    for (let index = 0; index < pattern.length; index++) {
      const next = cursor + pattern[index];
      if (index % 2 === 0) {
        const start = Math.max(head, cursor);
        const stop = Math.min(end, next);
        if (stop > start) {
          const previous = segments2[segments2.length - 1];
          if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], stop);
          else segments2.push([start, stop]);
        }
      }
      cursor = next;
    }
  }
  return segments2;
}
function encodeSegments(segments2, length, scale) {
  const dash = [0];
  let cursor = 0;
  for (const [start, end] of segments2) {
    dash.push(Math.max(0, start - cursor) / scale, (end - start) / scale);
    cursor = end;
  }
  dash.push((length + 1) / scale);
  return dash.join(" ");
}
function trimArrowShafts(svg) {
  const report = { trimmed: 0, skipped: [] };
  const edges = [...svg.querySelectorAll("[data-gptm-direction]")];
  const byId = new Map(edges.map((edge) => [edge.getAttribute("data-id"), edge]));
  for (const edge of edges) {
    const head = triangleDepth(svg, edge, "start");
    const sharedId = edge.getAttribute("data-gptm-shared-tip");
    const shared = sharedId ? byId.get(sharedId) : null;
    const tail = triangleDepth(svg, shared || edge, "end");
    if (!(head > 0 || tail > 0)) continue;
    const skip = (reason) => report.skipped.push({ id: edge.id || "", reason });
    if (edge.localName === "path" && ((edge.getAttribute("d") || "").match(/[Mm]/g)?.length || 0) > 1) {
      skip("multiple-subpaths");
      continue;
    }
    if (typeof edge.getTotalLength !== "function") {
      skip("geometry-unavailable");
      continue;
    }
    let length;
    try {
      length = edge.getTotalLength();
    } catch {
      skip("geometry-unavailable");
      continue;
    }
    if (!Number.isFinite(length) || length <= 0) {
      skip("invalid-length");
      continue;
    }
    const declared = Number(edge.getAttribute("pathLength"));
    const scale = declared > 0 && Number.isFinite(declared) ? length / declared : 1;
    if (!Number.isFinite(scale) || scale <= 0) {
      skip("invalid-path-calibration");
      continue;
    }
    const style = getComputedStyle(edge);
    if (style.vectorEffect && style.vectorEffect !== "none") {
      skip("non-scaling-stroke");
      continue;
    }
    const dash = readDash(style, normalizedViewportDiagonal(edge, svg), scale);
    if (!dash) {
      skip("unsupported-dash-length");
      continue;
    }
    const segments2 = clippedSegments(length, head, tail, dash.pattern, dash.offset);
    if (segments2 === null) {
      skip("dash-segment-budget");
      continue;
    }
    edge.style.setProperty("stroke-dasharray", encodeSegments(segments2, length, scale), "important");
    edge.style.setProperty("stroke-dashoffset", "0", "important");
    edge.style.setProperty("stroke-linecap", "butt", "important");
    report.trimmed++;
  }
  return report;
}
var SHAFT_MAX_SEGMENTS, SHAFT_LENGTH_RE, SHAFT_TRIANGLE_RE;
var init_svg_shaft = __esm({
  "src/svg-shaft.js"() {
    SHAFT_MAX_SEGMENTS = 16384;
    SHAFT_LENGTH_RE = /^([-+]?(?:\d*\.?\d+|\d+\.?\d*)(?:e[-+]?\d+)?)(px|%)?$/i;
    SHAFT_TRIANGLE_RE = /^\s*M\s*0[\s,]+0\s*L\s*10[\s,]+4\s*L\s*0[\s,]+8\s*Z\s*$/i;
  }
});

// src/svg-c4.js
function routeC4Edges(svg, graph, variables) {
  if (!graph?.c4Relations) return;
  const nodes = new Map(graph.c4Nodes.map((model) => {
    const element = svg.getElementById(`${svg.id}-${model.alias}`) || svg.getElementById(model.alias);
    const shape = element?.querySelector(".label-container");
    return [model.alias, element && shape ? { element, box: boundsInSvg(svg, shape) } : null];
  }).filter(([, node]) => node));
  const elements = [...svg.querySelectorAll("path[marker-end],line[marker-end]")].filter((p) => !p.closest("defs,marker"));
  if (elements.length !== graph.c4Relations.length) return;
  const boundaryTitles = [...svg.querySelectorAll("g > text")].filter(
    (text) => !text.closest(".node") && text.parentElement.querySelector(":scope > rect") && text.textContent.trim()
  ).map((text) => boundsInSvg(svg, text));
  let rerouted = 0;
  elements.forEach((original, index) => {
    const model = graph.c4Relations[index], source = nodes.get(model.from), target = nodes.get(model.to);
    if (!source || !target) return;
    const length = original.getTotalLength();
    const start = inSvg(svg, original, original.getPointAtLength(0)), end = inSvg(svg, original, original.getPointAtLength(length));
    const boundaryDistance2 = (p, b) => Math.min(Math.abs(p.x - b.x), Math.abs(p.x - b.right), Math.abs(p.y - b.y), Math.abs(p.y - b.bottom));
    if (boundaryDistance2(start, source.box) > 3 || boundaryDistance2(end, target.box) > 3) return;
    const obstacles = [...nodes.values()].filter((n) => n !== source && n !== target).map((n) => n.box).concat(boundaryTitles);
    const samples = Array.from({ length: 41 }, (_, i) => inSvg(svg, original, original.getPointAtLength(length * i / 40)));
    let points = [start, end];
    if (samples.slice(1).some((p, i) => segmentBlocked(samples[i], p, obstacles, 5))) {
      const center = (box2) => ({ x: box2.x + box2.width / 2, y: box2.y + box2.height / 2 });
      const a = center(source.box), b = center(target.box), horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
      const direction = horizontal ? Math.sign(b.x - a.x) : Math.sign(b.y - a.y);
      const port = (node, point, outward) => horizontal ? { x: outward > 0 ? node.box.right : node.box.x, y: point.y } : { x: point.x, y: outward > 0 ? node.box.bottom : node.box.y };
      const p = port(source, a, direction), q = port(target, b, -direction);
      const axis = horizontal ? "x" : "y";
      const lead = { ...p, [axis]: p[axis] + direction * 12 };
      const tail = { ...q, [axis]: q[axis] - direction * 12 };
      const route = orthogonalRoute(lead, tail, [...nodes.values()].map((n) => n.box).concat(boundaryTitles), 20);
      if (!route) return;
      points = [p, ...route, q];
      rerouted++;
    } else if (original.localName === "path") {
      points = null;
    }
    const text = original.nextElementSibling?.localName === "text" ? original.nextElementSibling : null;
    const edge = asPath(original), id = `c4-relation-${index}`;
    if (points) writePoints(svg, edge, points);
    else edge.setAttribute("data-points", btoa(JSON.stringify(samples.map((p) => {
      const local = fromSvg(svg, edge, p);
      return { x: local.x, y: local.y };
    }))));
    edge.id = `${svg.id}-${id}`;
    edge.dataset.id = id;
    edge.setAttribute("data-gptm-source", source.element.id);
    edge.setAttribute("data-gptm-target", target.element.id);
    edge.setAttribute("data-gptm-theme-stroke", "true");
    edge.style.setProperty("fill", "none");
    edge.style.setProperty("stroke-width", "1.6px");
    if (!text) return;
    const label = svg.ownerDocument.createElementNS(NS2, "g");
    label.setAttribute("class", "edgeLabel");
    label.dataset.id = id;
    const background = svg.ownerDocument.createElementNS(NS2, "rect");
    const box = text.getBBox();
    background.setAttribute("class", "labelBkg");
    for (const [key, value] of Object.entries({ x: box.x - 8, y: box.y - 4, width: box.width + 16, height: box.height + 8, rx: 13, ry: 13 })) {
      background.setAttribute(key, String(value));
    }
    background.style.fill = variables.flowchartEdgeLabelColor;
    text.before(label);
    label.append(background, text);
  });
  svg.setAttribute("data-gptm-c4-rerouted", String(rerouted));
}
var NS2;
var init_svg_c4 = __esm({
  "src/svg-c4.js"() {
    init_svg_routing();
    NS2 = "http://www.w3.org/2000/svg";
  }
});

// src/svg-adaptive.js
function optionsFor(options) {
  const input = options && typeof options === "object" ? options : {};
  const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
  return {
    enabled: options !== false && input.enabled !== false,
    maxWidth: positive(input.maxWidth, ADAPTIVE_LAYOUT_DEFAULTS.maxWidth),
    maxHeight: positive(input.maxHeight, ADAPTIVE_LAYOUT_DEFAULTS.maxHeight),
    gap: positive(input.gap, ADAPTIVE_LAYOUT_DEFAULTS.gap)
  };
}
function boxPoints(box) {
  return [{ x: box.x, y: box.y }, { x: box.x + box.width, y: box.y + box.height }];
}
function boundsOf(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
function validBox(box) {
  return box && [box.x, box.y, box.width, box.height].every(Number.isFinite) && box.width > 0 && box.height > 0;
}
function validPoints(points) {
  return Array.isArray(points) && points.length >= 2 && points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}
function midpointOfLongestSegment(points) {
  let best = { length: -1, point: points[0] };
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const length = Math.hypot(current.x - previous.x, current.y - previous.y);
    if (length > best.length) best = {
      length,
      point: { x: (current.x + previous.x) / 2, y: (current.y + previous.y) / 2 }
    };
  }
  return best.point;
}
function flowRanks(nodes, edges) {
  var _a;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (byId.size !== nodes.length) return { reason: "duplicate-node-id" };
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  const degree = new Map(nodes.map((node) => [node.id, 0]));
  const neighbors = new Map(nodes.map((node) => [node.id, []]));
  const edgeIds = /* @__PURE__ */ new Set();
  for (const edge of edges) {
    if (!byId.has(edge.start) || !byId.has(edge.end)) return { reason: "missing-edge-endpoint" };
    if (!edge.id || edgeIds.has(edge.id)) return { reason: "duplicate-edge-id" };
    edgeIds.add(edge.id);
    outgoing.get(edge.start).push(edge.end);
    degree.set(edge.end, degree.get(edge.end) + 1);
    neighbors.get(edge.start).push(edge.end);
    neighbors.get(edge.end).push(edge.start);
  }
  const visited = /* @__PURE__ */ new Set();
  const pending = [nodes[0].id];
  for (let index = 0; index < pending.length; index++) {
    const id = pending[index];
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...neighbors.get(id).filter((neighbor) => !visited.has(neighbor)));
  }
  if (visited.size !== nodes.length) return { reason: "disconnected-components" };
  const queue = nodes.filter((node) => degree.get(node.id) === 0).map((node) => node.id);
  const ranks = new Map(queue.map((id) => [id, 0]));
  let processed = 0;
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    processed++;
    for (const target of outgoing.get(id)) {
      ranks.set(target, Math.max(ranks.get(target) || 0, ranks.get(id) + 1));
      degree.set(target, degree.get(target) - 1);
      if (degree.get(target) === 0) queue.push(target);
    }
  }
  if (processed !== nodes.length) return { reason: "cycle-or-feedback" };
  if (edges.some((edge) => ranks.get(edge.end) !== ranks.get(edge.start) + 1)) {
    return { reason: "cross-layer-edge" };
  }
  const layers = [];
  for (const node of nodes) (layers[_a = ranks.get(node.id)] || (layers[_a] = [])).push(node);
  return { ranks, layers };
}
function planAdaptiveFlowLayout(graph, options) {
  const config = optionsFor(options);
  const report = { status: "unchanged", reason: "within-threshold", rows: 1, columns: 1 };
  const skip = (reason) => ({ ...report, status: "unsupported", reason });
  if (!config.enabled) return { ...report, reason: "disabled" };
  if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.edges)) return skip("missing-graph-metadata");
  const { nodes, edges } = graph;
  if (nodes.length < 2) return { ...report, reason: "too-few-nodes" };
  if (nodes.some((node) => node.isGroup || node.parentId != null)) return skip("subgraph-layout");
  if (nodes.some((node) => !node.id || !validBox(node.box)) || edges.some((edge) => !validPoints(edge.points) || edge.labelBox && !validBox(edge.labelBox))) {
    return skip("geometry-unavailable");
  }
  const direction = String(graph.direction || "").toUpperCase();
  if (!["LR", "RL", "TB", "TD", "BT"].includes(direction)) return skip("missing-direction");
  const horizontal = direction === "LR" || direction === "RL";
  const sign = direction === "RL" || direction === "BT" ? -1 : 1;
  const axis = horizontal ? "x" : "y";
  const cross2 = horizontal ? "y" : "x";
  const axisSize = horizontal ? "width" : "height";
  const crossSize = horizontal ? "height" : "width";
  const original = boundsOf([
    ...nodes.flatMap((node) => boxPoints(node.box)),
    ...edges.flatMap((edge) => [...edge.points, ...edge.labelBox ? boxPoints(edge.labelBox) : []])
  ]);
  report.before = { width: original.width, height: original.height };
  if (original[axisSize] + ADAPTIVE_PADDING * 2 <= (horizontal ? config.maxWidth : config.maxHeight)) {
    return { ...report, reason: original[crossSize] > (horizontal ? config.maxHeight : config.maxWidth) ? "cross-axis-overflow" : "within-threshold" };
  }
  const ranked = flowRanks(nodes, edges);
  if (ranked.reason) return skip(ranked.reason);
  const { ranks, layers } = ranked;
  const center = (box, key) => box[key] + box[key === "x" ? "width" : "height"] / 2;
  if (edges.some((edge) => sign * (center(nodes.find((node) => node.id === edge.end).box, axis) - center(nodes.find((node) => node.id === edge.start).box, axis)) <= 0)) {
    return skip("non-monotonic-layout");
  }
  const cuts = layers.slice(0, -1).map((layer, index) => ({
    index,
    safe: layer.length === 1 && layers[index + 1].length === 1 && edges.filter((edge) => ranks.get(edge.start) === index && ranks.get(edge.end) === index + 1).length === 1
  })).filter((cut) => cut.safe).map((cut) => cut.index);
  if (!cuts.length) return skip("no-safe-break");
  const labelTurnSpace = Math.max(0, ...edges.filter((edge) => edge.labelBox).map((edge) => edge.labelBox[axisSize] / 2 + 12));
  const clearance = Math.max(ADAPTIVE_TURN_CLEARANCE, labelTurnSpace);
  const limit = (horizontal ? config.maxWidth : config.maxHeight) - 2 * (ADAPTIVE_PADDING + clearance);
  const boundsFor = (start2, end) => {
    const members = nodes.filter((node) => ranks.get(node.id) >= start2 && ranks.get(node.id) <= end);
    const internal = edges.filter((edge) => ranks.get(edge.start) >= start2 && ranks.get(edge.end) <= end);
    return boundsOf([
      ...members.flatMap((node) => boxPoints(node.box)),
      ...internal.flatMap((edge) => [...edge.points, ...edge.labelBox ? boxPoints(edge.labelBox) : []])
    ]);
  };
  const bands = [];
  let start = 0;
  while (start < layers.length) {
    let selected = null;
    for (const end of [...cuts.filter((cut) => cut >= start), layers.length - 1]) {
      const box = boundsFor(start, end);
      if (box[axisSize] <= limit) selected = { start, end, box };
      else break;
    }
    if (!selected) return skip("block-exceeds-threshold");
    bands.push(selected);
    start = selected.end + 1;
  }
  if (bands.length === 1) return { ...report, reason: "within-threshold" };
  const penultimate = bands.at(-2), last = bands.at(-1);
  let balanced = null;
  for (const cut of cuts.filter((cut2) => cut2 >= penultimate.start && cut2 < last.end)) {
    const left = { start: penultimate.start, end: cut, box: boundsFor(penultimate.start, cut) };
    const right = { start: cut + 1, end: last.end, box: boundsFor(cut + 1, last.end) };
    if (left.box[axisSize] > limit || right.box[axisSize] > limit) continue;
    const count = (band) => layers.slice(band.start, band.end + 1).reduce((total, layer) => total + layer.length, 0);
    const lonely = Number(count(left) === 1) + Number(count(right) === 1) * 2;
    const difference = Math.abs(left.box[axisSize] - right.box[axisSize]);
    if (!balanced || lonely < balanced.lonely || lonely === balanced.lonely && difference < balanced.difference) {
      balanced = { left, right, lonely, difference };
    }
  }
  if (balanced) bands.splice(-2, 2, balanced.left, balanced.right);
  const span = Math.max(...bands.map((band) => band.box[axisSize]));
  const primaryMin = ADAPTIVE_PADDING + clearance;
  const primaryMax = primaryMin + span;
  let cursor = ADAPTIVE_PADDING;
  const nodeBands = /* @__PURE__ */ new Map();
  bands.forEach((band, index) => {
    band.index = index;
    band.forward = sign * (index % 2 ? -1 : 1);
    band.crossStart = cursor;
    band.map = (point) => {
      const distance2 = sign > 0 ? point[axis] - band.box[axis] : band.box[axis] + band.box[axisSize] - point[axis];
      return {
        [axis]: band.forward > 0 ? primaryMin + distance2 : primaryMax - distance2,
        [cross2]: band.crossStart + point[cross2] - band.box[cross2]
      };
    };
    for (let rank = band.start; rank <= band.end; rank++) {
      for (const node of layers[rank]) nodeBands.set(node.id, band);
    }
    const boundaryLabel = edges.find((edge) => ranks.get(edge.start) === band.end && ranks.get(edge.end) === band.end + 1)?.labelBox;
    cursor += band.box[crossSize] + Math.max(config.gap, (boundaryLabel?.[crossSize] || 0) + 24);
  });
  const positions = nodes.map((node) => {
    const point = nodeBands.get(node.id).map({ x: center(node.box, "x"), y: center(node.box, "y") });
    return {
      id: node.id,
      x: point.x,
      y: point.y,
      box: {
        x: point.x - node.box.width / 2,
        y: point.y - node.box.height / 2,
        width: node.box.width,
        height: node.box.height
      }
    };
  });
  const positionById = new Map(positions.map((position) => [position.id, position]));
  const routes = edges.map((edge) => {
    const fromBand = nodeBands.get(edge.start);
    const toBand = nodeBands.get(edge.end);
    let points;
    let label;
    if (fromBand === toBand) {
      points = edge.points.map(fromBand.map);
      if (edge.labelBox) label = fromBand.map({
        x: center(edge.labelBox, "x"),
        y: center(edge.labelBox, "y")
      });
    } else {
      const from = positionById.get(edge.start);
      const to = positionById.get(edge.end);
      const side = fromBand.forward;
      const outer = side > 0 ? primaryMax + clearance : primaryMin - clearance;
      const head = { [axis]: from[axis] + side * from.box[axisSize] / 2, [cross2]: from[cross2] };
      const tail = { [axis]: to[axis] + side * to.box[axisSize] / 2, [cross2]: to[cross2] };
      points = [
        head,
        { [axis]: outer, [cross2]: head[cross2] },
        { [axis]: outer, [cross2]: tail[cross2] },
        tail
      ];
      label = midpointOfLongestSegment(points);
    }
    return { id: edge.id, start: edge.start, end: edge.end, points, label };
  });
  const bounds = boundsOf([
    ...positions.flatMap((position) => boxPoints(position.box)),
    ...routes.flatMap((route) => route.points),
    ...routes.flatMap((route) => {
      const box = edges.find((edge) => edge.id === route.id).labelBox;
      return box && route.label ? boxPoints({
        x: route.label.x - box.width / 2,
        y: route.label.y - box.height / 2,
        width: box.width,
        height: box.height
      }) : [];
    })
  ]);
  return {
    ...report,
    status: "applied",
    reason: "safe-continuous-flow",
    direction,
    rows: horizontal ? bands.length : 1,
    columns: horizontal ? 1 : bands.length,
    groups: layers.filter((layer) => layer.length > 1).length,
    after: { width: bounds.width, height: bounds.height },
    bounds,
    positions,
    routes
  };
}
function rootMatrix(svg, element) {
  const root = svg.getScreenCTM();
  const current = element.getScreenCTM();
  if (!root || !current) throw new Error("geometry-unavailable");
  const matrix = root.inverse().multiply(current);
  if (Math.abs(matrix.a - 1) + Math.abs(matrix.d - 1) + Math.abs(matrix.b) + Math.abs(matrix.c) > ADAPTIVE_EPSILON) {
    throw new Error("transformed-layout");
  }
  return matrix;
}
function elementBox(svg, element) {
  const box = element.getBBox();
  const matrix = rootMatrix(svg, element);
  return { x: box.x + matrix.e, y: box.y + matrix.f, width: box.width, height: box.height };
}
function shiftElement(svg, element, dx, dy) {
  rootMatrix(svg, element.parentNode);
  return `translate(${dx}, ${dy}) ${element.getAttribute("transform") || ""}`.trim();
}
function polylinePath(points) {
  return points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
}
function publish(svg, report) {
  svg.setAttribute("data-gptm-adaptive", report.status);
  svg.setAttribute("data-gptm-adaptive-reason", report.reason);
  svg.setAttribute("data-gptm-adaptive-rows", String(report.rows || 1));
  svg.setAttribute("data-gptm-adaptive-columns", String(report.columns || 1));
  const { positions: _positions, routes: _routes, bounds: _bounds, ...summary } = report;
  return summary;
}
function applyAdaptiveFlowLayout(svg, graph, options) {
  const base = { status: "unchanged", reason: "disabled", rows: 1, columns: 1 };
  if (!optionsFor(options).enabled) return publish(svg, base);
  if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.edges)) {
    return publish(svg, { ...base, status: "unsupported", reason: "missing-graph-metadata" });
  }
  if (graph.nodes.some((node) => node.isGroup || node.parentId != null)) {
    return publish(svg, { ...base, status: "unsupported", reason: "subgraph-layout" });
  }
  try {
    const nodeElements = [...svg.querySelectorAll("g.node")];
    const edgeElements = [...svg.querySelectorAll("path[data-edge='true']")];
    const labels = [...svg.querySelectorAll("g.edgeLabel")];
    const nodeById = /* @__PURE__ */ new Map();
    const edgeById = /* @__PURE__ */ new Map();
    const labelById = /* @__PURE__ */ new Map();
    for (const label of labels) {
      const id = label.querySelector("g.label[data-id]")?.getAttribute("data-id");
      if (id) {
        if (labelById.has(id)) throw new Error("ambiguous-label-metadata");
        labelById.set(id, label);
      } else if (label.textContent.trim()) throw new Error("missing-label-metadata");
    }
    const nodes = graph.nodes.map((node) => {
      const matches = nodeElements.filter((element) => element.getAttribute("data-id") === node.id || node.domId && (element.id === node.domId || element.id === `${svg.id}-${node.domId}`));
      if (matches.length !== 1) throw new Error("missing-node-metadata");
      nodeById.set(node.id, matches[0]);
      return { ...node, box: elementBox(svg, matches[0]) };
    });
    const edges = graph.edges.map((edge) => {
      const matches = edgeElements.filter((element2) => element2.getAttribute("data-id") === edge.id);
      if (matches.length !== 1) throw new Error("missing-edge-metadata");
      const element = matches[0];
      const matrix = rootMatrix(svg, element);
      const points = JSON.parse(atob(element.getAttribute("data-points") || ""));
      if (!validPoints(points)) throw new Error("geometry-unavailable");
      edgeById.set(edge.id, element);
      const label = labelById.get(edge.id);
      return {
        ...edge,
        points: points.map((point) => ({ x: point.x + matrix.e, y: point.y + matrix.f })),
        labelBox: label ? elementBox(svg, label) : null
      };
    });
    if (nodeElements.length !== nodes.length || edgeElements.length !== edges.length) {
      throw new Error("unmapped-graph-elements");
    }
    const plan = planAdaptiveFlowLayout({ ...graph, nodes, edges }, options);
    if (plan.status !== "applied") return publish(svg, plan);
    const writes = [];
    for (const position of plan.positions) {
      const element = nodeById.get(position.id);
      const box = nodes.find((node) => node.id === position.id).box;
      writes.push([element, "transform", shiftElement(
        svg,
        element,
        position.x - (box.x + box.width / 2),
        position.y - (box.y + box.height / 2)
      )]);
    }
    for (const route of plan.routes) {
      const element = edgeById.get(route.id);
      const matrix = rootMatrix(svg, element);
      const points = route.points.map((point) => ({ x: point.x - matrix.e, y: point.y - matrix.f }));
      writes.push([element, "d", polylinePath(points)], [element, "data-points", btoa(JSON.stringify(points))]);
      const label = labelById.get(route.id);
      if (label && route.label) {
        const box = elementBox(svg, label);
        writes.push([label, "transform", shiftElement(
          svg,
          label,
          route.label.x - (box.x + box.width / 2),
          route.label.y - (box.y + box.height / 2)
        )]);
      }
    }
    for (const title of svg.querySelectorAll(".flowchartTitleText")) {
      const box = elementBox(svg, title);
      writes.push([title, "transform", shiftElement(
        svg,
        title,
        plan.bounds.x + plan.bounds.width / 2 - (box.x + box.width / 2),
        plan.bounds.y - ADAPTIVE_PADDING - (box.y + box.height)
      )]);
    }
    for (const [element, key, value] of writes) element.setAttribute(key, value);
    return publish(svg, plan);
  } catch (error) {
    return publish(svg, { ...base, status: "unsupported", reason: error.message || "geometry-unavailable" });
  }
}
var ADAPTIVE_LAYOUT_DEFAULTS, ADAPTIVE_PADDING, ADAPTIVE_TURN_CLEARANCE, ADAPTIVE_EPSILON;
var init_svg_adaptive = __esm({
  "src/svg-adaptive.js"() {
    ADAPTIVE_LAYOUT_DEFAULTS = Object.freeze({
      enabled: true,
      maxWidth: 1200,
      maxHeight: 1e3,
      gap: 80
    });
    ADAPTIVE_PADDING = 24;
    ADAPTIVE_TURN_CLEARANCE = 32;
    ADAPTIVE_EPSILON = 0.01;
  }
});

// src/svg-crossings.js
function flattenPath(element) {
  const data = element.getAttribute?.("d");
  if (!data || /[aAbBsStTzZ]/.test(data)) return null;
  const tokens = data.match(/[MLHVQCmlhvqc]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g) || [];
  let point = { x: 0, y: 0 }, command, i = 0;
  const result = [];
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const flatten = (controls, depth = 0) => {
    const a = controls[0], b = controls.at(-1), v = vector(a, b), length = norm(a, b);
    const error = Math.max(...controls.slice(1, -1).map((p) => {
      const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * v.x + (p.y - a.y) * v.y) / length ** 2)) : 0;
      return norm(p, { x: a.x + v.x * t, y: a.y + v.y * t });
    }));
    if (error < 0.1 || depth >= 12) {
      result.push(b);
      return;
    }
    const left = [a], right = [b];
    let row = controls;
    while (row.length > 1) {
      row = row.slice(1).map((p, i2) => midpoint(row[i2], p));
      left.push(row[0]);
      right.unshift(row.at(-1));
    }
    flatten(left, depth + 1);
    flatten(right, depth + 1);
  };
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    if (!command) return null;
    const type = command.toUpperCase(), count = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6 }[type];
    if (!count || i + count > tokens.length) return null;
    const values = tokens.slice(i, i + count).map(Number);
    if (values.some((v) => !Number.isFinite(v))) return null;
    i += count;
    const relative = command !== type;
    const next = (x, y) => ({ x: x + (relative ? point.x : 0), y: y + (relative ? point.y : 0) });
    if (type === "H") point = { x: values[0] + (relative ? point.x : 0), y: point.y };
    else if (type === "V") point = { x: point.x, y: values[0] + (relative ? point.y : 0) };
    else if (type === "Q" || type === "C") {
      const controls = [point];
      for (let j = 0; j < values.length; j += 2) controls.push(next(values[j], values[j + 1]));
      flatten(controls);
      point = controls.at(-1);
      continue;
    } else point = next(...values);
    result.push(type === "M" ? { ...point, move: true } : point);
    if (type === "M") command = relative ? "l" : "L";
  }
  return result.length >= 2 ? result : null;
}
function sampleEdge(svg, element) {
  const explicit = flattenPath(element);
  if (explicit) return explicit.map((point) => {
    const p = inSvg(svg, element, point);
    return { x: p.x, y: p.y, ...point.move ? { move: true } : {} };
  });
  const length = element.getTotalLength();
  if (!Number.isFinite(length) || length <= 0) return [];
  const steps = Math.min(16384, Math.max(2, Math.ceil(length / 0.5)));
  const input = Array.from({ length: steps + 1 }, (_, i) => {
    const p = inSvg(svg, element, element.getPointAtLength(length * i / steps));
    return { x: p.x, y: p.y };
  });
  const reduce = (lo, hi) => {
    const a = input[lo], b = input[hi], dx = b.x - a.x, dy = b.y - a.y, length2 = Math.hypot(dx, dy);
    let farthest = 0, at = -1;
    for (let i = lo + 1; i < hi; i++) {
      const p = input[i], t = length2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2 ** 2)) : 0;
      const distance2 = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
      if (distance2 > farthest) {
        farthest = distance2;
        at = i;
      }
    }
    return farthest > 0.2 ? [...reduce(lo, at).slice(0, -1), ...reduce(at, hi)] : [a, b];
  };
  return reduce(0, input.length - 1);
}
function collectEdges(svg) {
  const semanticNodes = new Map([...svg.querySelectorAll("g.node[data-id]")].map((node) => [node.dataset.id, node.id]));
  return [...svg.querySelectorAll(EDGE_SELECTOR)].filter((element) => !element.closest("defs,marker") && typeof element.getTotalLength === "function").map((element) => {
    const points = sampleEdge(svg, element);
    const source = element.dataset.gptmSource || semanticNodes.get(element.dataset.source);
    const target = element.dataset.gptmTarget || semanticNodes.get(element.dataset.target);
    if (source && target) {
      element.setAttribute("data-gptm-source", source);
      element.setAttribute("data-gptm-target", target);
    }
    return {
      element,
      id: element.dataset.id || element.id,
      points,
      controls: readPoints(element)?.map((p) => {
        const q = inSvg(svg, element, p);
        return { x: q.x, y: q.y };
      }),
      source,
      target,
      shared: element.dataset.gptmSharedTip,
      box: points.length ? boxOf(points) : null
    };
  }).filter((edge) => edge.points.length >= 2);
}
function allowedJunction(a, b, hit) {
  if (a.shared && a.shared === b.shared) {
    const commonSegments = [];
    let i = a.points.length - 1, j = b.points.length - 1, end = a.points[i];
    if (norm(end, b.points[j]) < 0.05) while (i > 0 && j > 0) {
      const p = a.points[i - 1], q = b.points[j - 1];
      const v = vector(end, p), w = vector(end, q), length = Math.hypot(v.x, v.y), otherLength = Math.hypot(w.x, w.y);
      if (Math.abs(v.x * w.y - v.y * w.x) > 1e-4 || v.x * w.x + v.y * w.y < 0) break;
      const next = length < otherLength ? p : q;
      commonSegments.push([next, end]);
      end = next;
      if (length <= otherLength + 0.05) i--;
      if (otherLength <= length + 0.05) j--;
    }
    for (const [p, q] of commonSegments) {
      const r = p, s = q;
      const common = segmentIntersection(p, q, r, s);
      if (common?.kind !== "overlap") continue;
      const v = vector(p, q), length2 = v.x ** 2 + v.y ** 2;
      const projection = (point) => ((point.x - p.x) * v.x + (point.y - p.y) * v.y) / length2;
      const lo = Math.max(0, Math.min(projection(r), projection(s)));
      const hi = Math.min(1, Math.max(projection(r), projection(s)));
      const t = Math.max(lo, Math.min(hi, projection(hit)));
      const gap = norm(hit, { x: p.x + t * v.x, y: p.y + t * v.y });
      if (gap < 0.05 && hit.kind !== "cross") return true;
    }
  }
  for (const [ownerA, p] of [[a.source, a.points[0]], [a.target, a.points.at(-1)]]) {
    for (const [ownerB, q] of [[b.source, b.points[0]], [b.target, b.points.at(-1)]]) {
      if (ownerA && ownerA === ownerB && norm(p, hit) < 2 && norm(q, hit) < 2) return true;
    }
  }
  return false;
}
function crossingPairs(edges) {
  const pairs = [];
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const a = edges[i], b = edges[j];
    if (!overlaps2(a.box, b.box)) continue;
    const hits = [];
    for (const [p, q] of segments(a.points)) for (const [r, s] of segments(b.points)) {
      if (!overlaps2(boxOf([p, q]), boxOf([r, s]))) continue;
      const hit = segmentIntersection(p, q, r, s);
      if (hit && !allowedJunction(a, b, hit) && !hits.some((h) => norm(h, hit) < 1)) hits.push(hit);
    }
    if (hits.length) pairs.push({ a: a.id, b: b.id, hits });
  }
  return pairs;
}
function triangleCompatible(element) {
  return ["marker-start", "marker-end"].every((attribute) => {
    const marker = element.getAttribute(attribute);
    return !marker || /(?:point(?:Start|End)|barbEnd|extension(?:Start|End)|dependency(?:Start|End)|arrowhead)\)/.test(marker);
  });
}
function endpointShield(edge, start) {
  if (!edge.element.hasAttribute(start ? "marker-start" : "marker-end")) return null;
  const points = start ? edge.points : edge.points.slice().reverse();
  const p = points[0], q = points.find((q2) => norm(q2, p) >= 12) || points.at(-1), length = norm(p, q);
  if (!length) return null;
  const depth = Math.min(20, Number(edge.element.dataset.gptmPortSpan) * 0.85 || 20);
  const v = { x: (q.x - p.x) / length, y: (q.y - p.y) / length }, half = depth / 1.25 / 2 + 1;
  return boxOf([
    p,
    { x: p.x + v.x * depth + v.y * half, y: p.y + v.y * depth - v.x * half },
    { x: p.x + v.x * depth - v.y * half, y: p.y + v.y * depth + v.x * half }
  ]);
}
function portsFor(node, anchor, adjacent, alternatives) {
  const b = node.box, v = vector(anchor, adjacent);
  const side = Math.abs(v.x) > Math.abs(v.y) ? v.x > 0 ? "right" : "left" : v.y > 0 ? "bottom" : "top";
  const make = (p, side2) => {
    const axis = side2 === "left" || side2 === "right" ? "x" : "y", sign = side2 === "left" || side2 === "top" ? -1 : 1;
    return { anchor: p, lead: { ...p, [axis]: p[axis] + sign * 24 }, penalty: norm(p, anchor) };
  };
  const ports = [make(anchor, side)];
  if (alternatives) for (const side2 of ["left", "right", "top", "bottom"]) {
    const p = side2 === "left" || side2 === "right" ? { x: side2 === "left" ? b.x : b.right, y: (b.y + b.bottom) / 2 } : { x: (b.x + b.right) / 2, y: side2 === "top" ? b.y : b.bottom };
    if (norm(p, anchor) > 2) ports.push(make(p, side2));
  }
  return ports;
}
function geometry(svg) {
  const nodes = [...svg.querySelectorAll("g.node")].map((element) => {
    const shape = nodeShape(element);
    return shape && { element, id: element.id, box: boundsInSvg(svg, shape) };
  }).filter(Boolean);
  const labels = [...svg.querySelectorAll("g.edgeLabel")].filter((l) => l.textContent.trim()).map((element) => ({
    element,
    id: element.querySelector("[data-id]")?.dataset.id || element.dataset.id,
    box: boundsInSvg(svg, element)
  }));
  return { nodes, labels };
}
function applyReservation(svg, edge, reservation) {
  if (!reservation) return;
  edge.element.setAttribute("data-gptm-label-x", String(reservation.x));
  edge.element.setAttribute("data-gptm-label-y", String(reservation.y));
  const label = geometry(svg).labels.find((label2) => label2.id === edge.id);
  if (label) translateInRoot(
    svg,
    label.element,
    reservation.x - (label.box.x + label.box.right) / 2,
    reservation.y - (label.box.y + label.box.bottom) / 2
  );
}
function planAvoidance(svg, edge, edges, model, alternatives = false) {
  const budget = ROUTING_BUDGETS.get(svg);
  if (budget && budget.remaining <= 0) return null;
  const source = model.nodes.find((n) => n.id === edge.source), target = model.nodes.find((n) => n.id === edge.target);
  if (!source || !target || source === target || edge.shared) return null;
  const compatible = triangleCompatible(edge.element);
  alternatives = alternatives && compatible;
  const others = edges.filter((e) => e !== edge);
  const walls = others.flatMap((e) => segments(e.points));
  const labels = model.labels.filter((l) => l.id !== edge.id);
  const shields = others.flatMap((e) => [endpointShield(e, true), endpointShield(e, false)]).filter(Boolean);
  const boxes = [...model.nodes.map((n) => n.box), ...labels.map((l) => l.box), ...shields];
  const foreignBoxes = [...model.nodes.filter((n) => n !== source && n !== target).map((n) => n.box), ...labels.map((l) => l.box), ...shields];
  const ownLabel = model.labels.find((l) => l.id === edge.id);
  const original = readPoints(edge.element)?.map((p) => inSvg(svg, edge.element, p));
  const points = compatible && original?.length ? original : edge.points;
  const starts = portsFor(source, points[0], points[1], alternatives);
  const ends = portsFor(target, points.at(-1), points.at(-2), alternatives);
  if (!compatible) {
    const preserveTangent = (port, adjacent) => {
      const v = vector(port.anchor, adjacent), length = norm(port.anchor, adjacent);
      if (length) port.lead = { x: port.anchor.x + v.x * 24 / length, y: port.anchor.y + v.y * 24 / length };
    };
    preserveTangent(starts[0], points[1]);
    preserveTangent(ends[0], points.at(-2));
  }
  const extraX = [], extraY = [];
  for (const other of others) {
    extraX.push(other.box.x - GAP, other.box.right + GAP);
    extraY.push(other.box.y - GAP, other.box.bottom + GAP);
  }
  const options = starts.flatMap((a) => ends.map((b) => ({ a, b, estimate: norm(a.lead, b.lead) + (a.penalty + b.penalty) * 0.2 }))).sort((a, b) => a.estimate - b.estimate);
  let best;
  let labelSearches = 0;
  for (const { a, b } of options.slice(0, 12)) {
    if (budget && budget.remaining <= 0) break;
    const blocked = (p, q) => segmentBlocked(p, q, foreignBoxes) || walls.some(([r, s]) => segmentIntersection(p, q, r, s));
    if (blocked(a.anchor, a.lead) || blocked(b.lead, b.anchor)) continue;
    const directions = {
      start: vector(a.anchor, a.lead),
      end: vector(b.lead, b.anchor),
      avoidSegments: walls,
      extraX,
      extraY,
      maxVisited: 5e3,
      budget
    };
    const route = orthogonalRoute(a.lead, b.lead, boxes, GAP, [], directions);
    if (!route) continue;
    const consider = (route2) => {
      const candidate = simplifyPoints([a.anchor, ...route2, b.anchor]), quality = routeQuality(candidate);
      if (!Number.isFinite(quality.score)) return false;
      const ownShields = [
        endpointShield({ ...edge, points: candidate }, true),
        endpointShield({ ...edge, points: candidate }, false)
      ].filter(Boolean);
      const reservation = ownLabel && labelOnRoute(svg, candidate, ownLabel.box, [...boxes, ...ownShields], walls);
      if (ownLabel && !reservation) return false;
      const score = quality.score + (a.penalty + b.penalty) * 0.2;
      if (!best || score < best.score) best = { points: candidate, reservation, score };
      return true;
    };
    if (consider(route) || !ownLabel || best || ++labelSearches > 1) continue;
    const label = ownLabel.box, center = { x: (label.x + label.right) / 2, y: (label.y + label.bottom) / 2 }, candidates = [];
    for (let row = -3; row <= 3; row++) for (let column = -3; column <= 3; column++) {
      const p = { x: center.x + column * (label.width / 2 + GAP), y: center.y + row * (label.height + GAP) };
      const box = {
        x: p.x - label.width / 2 - 7,
        right: p.x + label.width / 2 + 7,
        y: p.y - label.height / 2 - 7,
        bottom: p.y + label.height / 2 + 7
      };
      if (boxes.some((b2) => overlaps2(box, b2)) || walls.some(([p2, q]) => segmentBlocked(p2, q, [box], 2))) continue;
      candidates.push({ ...p, score: norm(a.lead, p) + norm(p, b.lead) });
    }
    candidates.sort((a2, b2) => a2.score - b2.score);
    for (const p of candidates.slice(0, 3)) for (const horizontal of [true, false]) {
      const from = horizontal ? { x: p.x - 8, y: p.y } : { x: p.x, y: p.y - 8 };
      const to = horizontal ? { x: p.x + 8, y: p.y } : { x: p.x, y: p.y + 8 };
      const forward = norm(a.lead, from) + norm(to, b.lead) <= norm(a.lead, to) + norm(from, b.lead);
      const enter = forward ? from : to, exit = forward ? to : from, v = vector(enter, exit);
      if (blocked(enter, exit)) continue;
      const before = orthogonalRoute(a.lead, enter, boxes, GAP, [], { ...directions, end: v });
      const after = orthogonalRoute(exit, b.lead, boxes, GAP, [], { ...directions, start: v });
      if (before && after) consider([...before, ...after]);
    }
  }
  return best;
}
function avoidEdgeCrossings(svg) {
  let edges = collectEdges(svg), pairs = crossingPairs(edges), changed = 0;
  const initial = pairs.length;
  for (let pass = 0; pass < 2 && pairs.length; pass++) {
    let progress = false;
    const count = /* @__PURE__ */ new Map();
    for (const pair of pairs) for (const id of [pair.a, pair.b]) count.set(id, (count.get(id) || 0) + 1);
    const order = [...count].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    for (const id of order) {
      if (!pairs.some((p) => p.a === id || p.b === id)) continue;
      const edge = edges.find((e) => e.id === id), model = geometry(svg);
      const plan = planAvoidance(svg, edge, edges, model, pass > 0);
      if (!plan) continue;
      const original = edge.element.getAttribute("d"), data = edge.element.getAttribute("data-points");
      writePoints(svg, edge.element, plan.points);
      const updated = collectEdges(svg), next = crossingPairs(updated);
      if (next.length >= pairs.length) {
        edge.element.setAttribute("d", original);
        if (data === null) edge.element.removeAttribute("data-points");
        else edge.element.setAttribute("data-points", data);
        continue;
      }
      applyReservation(svg, edge, plan.reservation);
      edge.element.setAttribute("data-gptm-crossing-rerouted", "true");
      edges = updated;
      pairs = next;
      changed++;
      progress = true;
    }
    if (!progress && pass > 0) break;
  }
  if (changed) {
    for (const id of edges.filter((edge) => edge.element.hasAttribute("data-gptm-native-rerouted") || edge.element.hasAttribute("data-gptm-crossing-rerouted")).map((edge) => edge.id)) {
      const edge = edges.find((e) => e.id === id), raw = readPoints(edge.element);
      if (!raw) continue;
      const oldScore = routeQuality(raw.map((p) => inSvg(svg, edge.element, p))).score;
      const plan = planAvoidance(svg, edge, edges, geometry(svg), true);
      if (!plan || plan.score >= oldScore - 1) continue;
      const original = edge.element.getAttribute("d"), data = edge.element.getAttribute("data-points");
      writePoints(svg, edge.element, plan.points);
      const updated = collectEdges(svg), next = crossingPairs(updated);
      if (next.length > pairs.length) {
        edge.element.setAttribute("d", original);
        edge.element.setAttribute("data-points", data);
        continue;
      }
      applyReservation(svg, edge, plan.reservation);
      edges = updated;
      pairs = next;
    }
  }
  svg.setAttribute("data-gptm-crossings-before", String(initial));
  svg.setAttribute("data-gptm-crossing-routes", String(changed));
  return { before: initial, remaining: pairs.length, changed };
}
function recordCrossings(svg) {
  const edges = collectEdges(svg), pairs = crossingPairs(edges);
  for (const edge of edges) edge.element.removeAttribute("data-gptm-crossing");
  for (const pair of pairs) for (const id of [pair.a, pair.b]) {
    edges.find((e) => e.id === id).element.setAttribute("data-gptm-crossing", "true");
  }
  svg.setAttribute("data-gptm-crossings", String(pairs.length));
  svg.setAttribute("data-gptm-checked-edges", String(edges.length));
  svg.setAttribute("data-gptm-routing-status", !edges.length ? "not-applicable" : pairs.length ? "unresolved" : "clear");
  svg.setAttribute("data-gptm-routing-reason", !pairs.length ? "" : exceedsPlanarEdgeBound(edges) ? "non-planar-edge-bound" : svg.getAttribute("data-gptm-routing-budget-exhausted") === "true" ? "search-budget" : "fixed-obstacles");
  return pairs;
}
function snapshotAttributes(element) {
  return [...element.attributes].map((attribute) => [attribute.name, attribute.value]);
}
function restoreAttributes(element, attributes) {
  for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
  for (const [key, value] of attributes) element.setAttribute(key, value);
}
function rerouteConflictGroup(svg) {
  const original = collectEdges(svg), pairs = crossingPairs(original);
  const ids = new Set(pairs.flatMap((pair) => [pair.a, pair.b]));
  if (!ids.size || ids.size > 40) return false;
  const movable = original.filter((e) => ids.has(e.id) && e.source && e.target && e.source !== e.target && !e.shared);
  const fixed = original.filter((e) => !movable.includes(e));
  const saved = [...movable.map((e) => e.element), ...geometry(svg).labels.map((l) => l.element)].map((element) => ({ element, attributes: snapshotAttributes(element) }));
  const restore = () => saved.forEach(({ element, attributes }) => restoreAttributes(element, attributes));
  let bestCount = pairs.length, bestState;
  const length = (edge) => edge.element.getTotalLength();
  const orders = [
    movable.slice().sort((a, b) => length(a) - length(b)),
    movable.slice().sort((a, b) => length(b) - length(a))
  ];
  for (const order of orders) {
    restore();
    const placed = fixed.slice(), pending = new Set(movable.map((e) => e.id));
    for (const edge of order) {
      const model = geometry(svg);
      model.labels = model.labels.filter((l) => l.id === edge.id || !pending.has(l.id));
      const plan = planAvoidance(svg, edge, [...placed, edge], model, true);
      if (plan) {
        writePoints(svg, edge.element, plan.points);
        applyReservation(svg, edge, plan.reservation);
        edge.element.setAttribute("data-gptm-crossing-rerouted", "true");
      }
      pending.delete(edge.id);
      placed.push(collectEdges(svg).find((e) => e.id === edge.id));
    }
    const next = crossingPairs(collectEdges(svg)).length;
    if (next < bestCount) {
      bestCount = next;
      bestState = saved.map(({ element }) => ({ element, attributes: snapshotAttributes(element) }));
    }
  }
  restore();
  if (!bestState) return false;
  bestState.forEach(({ element, attributes }) => restoreAttributes(element, attributes));
  return true;
}
function translateInRoot(svg, element, dx, dy) {
  const a = fromSvg(svg, element.parentElement, { x: 0, y: 0 });
  const b = fromSvg(svg, element.parentElement, { x: dx, y: dy });
  element.setAttribute("transform", `translate(${b.x - a.x},${b.y - a.y}) ${element.getAttribute("transform") || ""}`.trim());
}
function expandFlatSpacing(svg, factor) {
  const { nodes, labels } = geometry(svg), edges = collectEdges(svg);
  if (!nodes.length || svg.querySelector("g.cluster,g.note,.c4-boundary") || nodes.some((n) => n.element.parentElement.closest("g.node")) || edges.some((e) => !e.source || !e.target || !triangleCompatible(e.element))) return false;
  const origin = { x: Math.min(...nodes.map((n) => n.box.x)), y: Math.min(...nodes.map((n) => n.box.y)) };
  const map = (p) => ({ x: origin.x + (p.x - origin.x) * factor, y: origin.y + (p.y - origin.y) * factor });
  const shifts = new Map(nodes.map((node) => {
    const p = { x: (node.box.x + node.box.right) / 2, y: (node.box.y + node.box.bottom) / 2 }, q = map(p);
    return [node.id, { x: q.x - p.x, y: q.y - p.y }];
  }));
  for (const edge of edges) {
    if (!shifts.has(edge.source) || !shifts.has(edge.target)) return false;
    if (!edge.controls || edge.controls.length < 2) return false;
  }
  for (const node of nodes) {
    const shift2 = shifts.get(node.id);
    translateInRoot(svg, node.element, shift2.x, shift2.y);
  }
  for (const label of labels) {
    const p = { x: (label.box.x + label.box.right) / 2, y: (label.box.y + label.box.bottom) / 2 }, q = map(p);
    translateInRoot(svg, label.element, q.x - p.x, q.y - p.y);
  }
  for (const edge of edges) {
    const raw = edge.controls, points = raw.map(map);
    for (const start of [true, false]) {
      const i = start ? 0 : points.length - 1, j = start ? 1 : points.length - 2;
      const shift2 = shifts.get(start ? edge.source : edge.target);
      points[i] = { x: raw[i].x + shift2.x, y: raw[i].y + shift2.y };
      if (points.length > 2) {
        if (Math.abs(raw[i].x - raw[j].x) < 0.1) points[j].x = points[i].x;
        if (Math.abs(raw[i].y - raw[j].y) < 0.1) points[j].y = points[i].y;
      }
    }
    writePoints(svg, edge.element, points);
    edge.element.removeAttribute("data-gptm-label-x");
    edge.element.removeAttribute("data-gptm-label-y");
  }
  return true;
}
function resolveEdgeCrossings(svg, repairConnections) {
  ROUTING_BUDGETS.set(svg, { remaining: 3e4 });
  const first = avoidEdgeCrossings(svg);
  if (first.changed) {
    repairConnections(svg);
    placeEdgeLabels(svg);
  }
  let remaining = crossingPairs(collectEdges(svg)).length;
  if (remaining && !exceedsPlanarEdgeBound(collectEdges(svg)) && rerouteConflictGroup(svg)) {
    repairConnections(svg);
    placeEdgeLabels(svg);
    remaining = crossingPairs(collectEdges(svg)).length;
  }
  let expanded = 1;
  if (remaining > 0 && !exceedsPlanarEdgeBound(collectEdges(svg))) {
    const baseline = svg.cloneNode(true);
    const restore = () => {
      for (const attribute of [...svg.attributes]) svg.removeAttribute(attribute.name);
      for (const attribute of baseline.attributes) svg.setAttribute(attribute.name, attribute.value);
      svg.replaceChildren(...[...baseline.childNodes].map((node) => node.cloneNode(true)));
    };
    for (const factor of [1.45, 2]) {
      restore();
      if (!expandFlatSpacing(svg, factor)) break;
      repairConnections(svg);
      placeEdgeLabels(svg);
      avoidEdgeCrossings(svg);
      rerouteConflictGroup(svg);
      repairConnections(svg);
      placeEdgeLabels(svg);
      const count = crossingPairs(collectEdges(svg)).length;
      if (count < remaining) {
        remaining = count;
        expanded = factor;
        break;
      }
    }
    if (expanded === 1) restore();
  }
  svg.setAttribute("data-gptm-crossings-before", String(first.before));
  svg.setAttribute("data-gptm-spacing-factor", String(expanded));
  svg.setAttribute("data-gptm-routing-budget-exhausted", String(ROUTING_BUDGETS.get(svg).remaining <= 0));
  return { ...first, remaining, expanded };
}
function exceedsPlanarEdgeBound(edges) {
  const vertices = /* @__PURE__ */ new Set(), links = /* @__PURE__ */ new Set();
  for (const edge of edges) {
    if (!edge.source || !edge.target) return false;
    vertices.add(edge.source);
    vertices.add(edge.target);
    if (edge.source !== edge.target) links.add([edge.source, edge.target].sort().join("\0"));
  }
  return vertices.size >= 3 && links.size > 3 * vertices.size - 6;
}
var EDGE_SELECTOR, GAP, ROUTING_BUDGETS, norm, vector, segments, boxOf, overlaps2;
var init_svg_crossings = __esm({
  "src/svg-crossings.js"() {
    init_path_intersections();
    init_svg_routing();
    init_svg_labels();
    EDGE_SELECTOR = ".flowchart-link,.transition,.relation,.relationshipLine,[data-gptm-source]";
    GAP = 12;
    ROUTING_BUDGETS = /* @__PURE__ */ new WeakMap();
    norm = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    vector = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
    segments = (points) => points.slice(1).flatMap((p, i) => p.move ? [] : [[points[i], p]]);
    boxOf = (points) => ({
      x: Math.min(...points.map((p) => p.x)),
      y: Math.min(...points.map((p) => p.y)),
      right: Math.max(...points.map((p) => p.x)),
      bottom: Math.max(...points.map((p) => p.y))
    });
    overlaps2 = (a, b) => a.x <= b.right && a.right >= b.x && a.y <= b.bottom && a.bottom >= b.y;
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
function markerReferenceId(value) {
  return String(value || "").match(/^url\(#([^)]+)\)$/)?.[1] || "";
}
function edgeDirection(element, endpoint = "end") {
  let from = null;
  let to = null;
  if (element.localName === "line") {
    const start = {
      x: Number(element.getAttribute("x1")),
      y: Number(element.getAttribute("y1"))
    };
    const end = {
      x: Number(element.getAttribute("x2")),
      y: Number(element.getAttribute("y2"))
    };
    if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) return "";
    from = endpoint === "start" ? end : start;
    to = endpoint === "start" ? start : end;
  } else if (element.localName === "polyline" || element.localName === "polygon") {
    const values = (element.getAttribute("points") || "").match(new RegExp(PATH_NUMBER, "gi"))?.map(Number) || [];
    if (values.length < 4) return "";
    const start = { x: values[0], y: values[1] };
    const end = { x: values[values.length - 2], y: values[values.length - 1] };
    const beforeEnd = values.length >= 6 ? { x: values[values.length - 4], y: values[values.length - 3] } : start;
    const afterStart = values.length >= 6 ? { x: values[2], y: values[3] } : end;
    from = endpoint === "start" ? afterStart : beforeEnd;
    to = endpoint === "start" ? start : end;
  } else if (element.localName === "path" && typeof element.getTotalLength === "function") {
    try {
      const length = element.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) return "";
      const sample = Math.min(8, length / 2);
      from = element.getPointAtLength(endpoint === "start" ? sample : length - sample);
      to = element.getPointAtLength(endpoint === "start" ? 0 : length);
    } catch {
      return "";
    }
  }
  if (!from || !to) return "";
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  if (Math.abs(dx) + Math.abs(dy) < 0.01) return "";
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
function authoredStroke(element) {
  if (element.hasAttribute("data-gptm-theme-stroke")) return "";
  const inline = element.style?.getPropertyValue("stroke") || "";
  const attribute = element.getAttribute("stroke") || "";
  const value = inline || attribute;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "none") return "";
  if (!inline && ["black", "#000", "#000000", "rgb(0, 0, 0)"].includes(normalized)) return "";
  return value.trim();
}
function triangleRole(markerId, endpoint = "end") {
  const originalId = markerId.replace(/-gptm-\d+-(?:right|down|left|up)-(?:start|end)$/, "");
  if (!TRIANGLE_MARKER_RE.test(originalId)) return "";
  return /pointStart/.test(markerId) || endpoint === "start" ? "start" : "end";
}
function triangleSize(svg, edge) {
  const viewBox = (svg.getAttribute("viewBox") || "").trim().split(/[ ,]+/).map(Number);
  const width = Number.isFinite(viewBox[2]) && viewBox[2] > 0 ? viewBox[2] : Number(svg.getAttribute("width")) || 800;
  const height = Number.isFinite(viewBox[3]) && viewBox[3] > 0 ? viewBox[3] : Number(svg.getAttribute("height")) || 600;
  const strokeWidth = parseFloat(getComputedStyle(edge).strokeWidth) || 1.6;
  const markerCount = ["start", "end"].filter((endpoint) => triangleRole(
    markerReferenceId(edge.getAttribute(`marker-${endpoint}`)),
    endpoint
  )).length;
  const length = edge.getTotalLength?.() || Infinity;
  const portSpan = Number(edge.getAttribute("data-gptm-port-span")) || Infinity;
  return Math.min(18, portSpan * TRIANGLE_ASPECT * 0.7, length / (markerCount + 0.5), Math.max(11, Math.max(width, height) / 100, strokeWidth * 3.5));
}
function directionalMarker(svg, edge, sourceMarker, color, direction, endpoint, markerCache) {
  const markerId = sourceMarker.id;
  const depth = triangleSize(svg, edge);
  const key = `${markerId}|${color}|${endpoint}|${depth}`;
  if (markerCache.has(key)) return markerCache.get(key);
  const clone = sourceMarker.cloneNode(true);
  const cloneId = `${markerId}-gptm-${markerCache.size}-${direction}-${endpoint}`;
  clone.id = cloneId;
  clone.style.setProperty("stroke", color);
  const role = triangleRole(markerId, endpoint);
  if (role) {
    clone.setAttribute("viewBox", "0 0 10 8");
    clone.setAttribute("markerWidth", String(depth));
    clone.setAttribute("markerHeight", String(depth / TRIANGLE_ASPECT));
    clone.setAttribute("markerUnits", "userSpaceOnUse");
    clone.setAttribute("refX", "10");
    clone.setAttribute("refY", "4");
    clone.setAttribute("orient", role === "start" ? "auto-start-reverse" : "auto");
    for (const shape2 of clone.querySelectorAll("path, polygon")) shape2.remove();
    const shape = clone.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
    shape.setAttribute("d", "M 0 0 L 10 4 L 0 8 Z");
    shape.style.setProperty("fill", color);
    shape.style.setProperty("stroke", "none");
    shape.style.setProperty("stroke-width", "0");
    clone.append(shape);
  } else {
    for (const shape of clone.querySelectorAll("path, polygon, polyline, line, circle")) {
      shape.style.setProperty("stroke", color);
    }
  }
  sourceMarker.parentNode?.append(clone);
  markerCache.set(key, cloneId);
  return cloneId;
}
function colorDirectionalEdges(svg, variables) {
  const markerCache = /* @__PURE__ */ new Map();
  const connectors = new Set(svg.querySelectorAll(
    "path[marker-end], path[marker-start], line[marker-end], line[marker-start], polyline[marker-end], polyline[marker-start], .flowchart-link, .transition, .relationshipLine, .relation, .messageLine0, .messageLine1, .arrow"
  ));
  for (const edge of connectors) {
    const endDirection = edgeDirection(edge, "end");
    const startDirection = edgeDirection(edge, "start");
    const hasStartMarker = Boolean(markerReferenceId(edge.getAttribute("marker-start")));
    const hasEndMarker = Boolean(markerReferenceId(edge.getAttribute("marker-end")));
    const direction = hasEndMarker ? endDirection || startDirection : hasStartMarker ? startDirection || endDirection : endDirection || startDirection;
    if (!direction) continue;
    const authored = authoredStroke(edge);
    const color = authored || variables[DIRECTION_KEYS[direction]] || variables.lineColor;
    ensureCssClass(edge, `gptm-edge-${direction}`);
    edge.setAttribute("data-gptm-direction", direction);
    if (!authored) edge.style.setProperty("stroke", color);
    if (edge.hasAttribute("marker-start") || edge.hasAttribute("marker-end")) {
      edge.style.setProperty("stroke-linecap", "butt");
    }
    for (const attribute of ["marker-start", "marker-end"]) {
      const markerId = markerReferenceId(edge.getAttribute(attribute));
      if (!markerId) continue;
      const marker = svg.getElementById(markerId);
      if (!marker) continue;
      const markerDirection = attribute === "marker-start" ? startDirection || direction : endDirection || direction;
      const markerColor = authored || (triangleRole(markerId, attribute === "marker-start" ? "start" : "end") ? variables[DIRECTION_KEYS[markerDirection]] || color : color);
      const cloneId = directionalMarker(svg, edge, marker, markerColor, markerDirection, attribute === "marker-start" ? "start" : "end", markerCache);
      edge.setAttribute(attribute, `url(#${cloneId})`);
    }
  }
}
function localPoint(element, atStart) {
  if (element.localName === "line") {
    return {
      x: Number(element.getAttribute(atStart ? "x1" : "x2")),
      y: Number(element.getAttribute(atStart ? "y1" : "y2"))
    };
  }
  if (element.localName === "polyline") {
    const values = (element.getAttribute("points") || "").match(new RegExp(PATH_NUMBER, "gi"))?.map(Number) || [];
    if (values.length < 4) return null;
    return atStart ? { x: values[0], y: values[1] } : { x: values[values.length - 2], y: values[values.length - 1] };
  }
  if (element.localName === "path" && typeof element.getPointAtLength === "function") {
    try {
      const point = element.getPointAtLength(atStart ? 0 : element.getTotalLength());
      return Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : null;
    } catch {
      return null;
    }
  }
  return null;
}
function toScreen(element, pointValue) {
  const matrix = element.getScreenCTM?.();
  if (!matrix || !pointValue) return null;
  const point = new DOMPoint(pointValue.x, pointValue.y).matrixTransform(matrix);
  return { x: point.x, y: point.y };
}
function toLocal(element, pointValue) {
  const matrix = element.getScreenCTM?.();
  if (!matrix || !pointValue) return null;
  const point = new DOMPoint(pointValue.x, pointValue.y).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}
function layoutPoints(edge) {
  try {
    const points = JSON.parse(atob(edge.getAttribute("data-points") || ""));
    return Array.isArray(points) && points.length >= 2 && points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) ? points : null;
  } catch {
    return null;
  }
}
function nodeOutlines(svg) {
  return [...svg.querySelectorAll("g.node, g.cluster")].map((node) => {
    const container = nodeShape(node);
    if (!container) return null;
    const shape = container instanceof SVGGeometryElement ? container : container.querySelector("path,rect,polygon,circle,ellipse");
    if (!shape || typeof shape.isPointInFill !== "function") return null;
    const geometries = container instanceof SVGGeometryElement ? [container] : [...container.querySelectorAll("path,rect,polygon,circle,ellipse")];
    const box = shape.getBoundingClientRect();
    const painted = geometries.map((geometry2) => {
      const style = getComputedStyle(geometry2);
      return { geometry: geometry2, fill: style.fill !== "none", stroke: style.stroke !== "none" };
    });
    const contains = (point) => painted.some(({ geometry: geometry2, fill, stroke }) => {
      const local = toLocal(geometry2, point);
      if (!local) return false;
      const probe = new DOMPoint(local.x, local.y);
      return fill && geometry2.isPointInFill(probe) || stroke && geometry2.isPointInStroke(probe);
    });
    const area = (point) => geometries.some((geometry2) => {
      const local = toLocal(geometry2, point);
      return local && geometry2.isPointInFill(new DOMPoint(local.x, local.y));
    });
    const fullBox = container.getBoundingClientRect();
    return box.width > 0 && box.height > 0 ? { node, shape, box: fullBox, contains, area } : null;
  }).filter(Boolean);
}
function boundaryDistance(point, box) {
  const outside = Math.hypot(
    Math.max(box.left - point.x, 0, point.x - box.right),
    Math.max(box.top - point.y, 0, point.y - box.bottom)
  );
  return outside || Math.min(point.x - box.left, box.right - point.x, point.y - box.top, box.bottom - point.y);
}
function contourIntersection(anchor, adjacent, outlines, authoritative = false) {
  const magnitude = Math.hypot(anchor.x - adjacent.x, anchor.y - adjacent.y);
  if (!magnitude) return null;
  const vector2 = { x: (anchor.x - adjacent.x) / magnitude, y: (anchor.y - adjacent.y) / magnitude };
  const candidates = outlines.filter(({ box, contains }) => {
    if (authoritative) return true;
    if (boundaryDistance(anchor, box) < 1.5) return true;
    return !contains({ x: anchor.x - vector2.x * 2, y: anchor.y - vector2.y * 2 }) && contains({ x: anchor.x + vector2.x * 2, y: anchor.y + vector2.y * 2 });
  }).sort((a, b) => a.box.width * a.box.height - b.box.width * b.box.height);
  for (const { box, contains, area } of candidates) {
    const position = (distance2) => ({ x: anchor.x + vector2.x * distance2, y: anchor.y + vector2.y * distance2 });
    const inside = (distance2) => area(position(distance2));
    const reach = Math.max(4, Math.abs(vector2.x) * box.width + Math.abs(vector2.y) * box.height);
    let outside = -2;
    if (inside(outside)) continue;
    let hit = null;
    for (let step = 0; step <= 96; step++) {
      const distance2 = -2 + (reach + 2) * step / 96;
      if (inside(distance2)) {
        hit = distance2;
        break;
      }
      outside = distance2;
    }
    if (hit === null) continue;
    for (let iteration = 0; iteration < 20; iteration++) {
      const middle = (outside + hit) / 2;
      if (inside(middle)) hit = middle;
      else outside = middle;
    }
    const centerBoundary = hit;
    outside = -2;
    hit = centerBoundary;
    if (contains(position(centerBoundary))) {
      for (let iteration = 0; iteration < 24; iteration++) {
        const middle = (outside + hit) / 2;
        if (contains(position(middle))) hit = middle;
        else outside = middle;
      }
    }
    return position(hit);
  }
  return null;
}
function rewritePathEndpoint(path, atStart, local) {
  const data = path.getAttribute("d") || "";
  if (atStart) {
    const next2 = data.replace(
      new RegExp(`^(\\s*[Mm]\\s*)(${PATH_NUMBER})(?:\\s*,\\s*|\\s+)(${PATH_NUMBER})`),
      (_match, command, _x, _y) => `${command}${local.x} ${local.y}`
    );
    if (next2 !== data) path.setAttribute("d", next2);
    return;
  }
  const next = data.replace(
    new RegExp(`(${PATH_NUMBER})(\\s*,\\s*|\\s+)(${PATH_NUMBER})(\\s*)$`),
    (_match, _x, separator, _y, tail) => `${local.x}${separator}${local.y}${tail}`
  );
  if (next !== data) path.setAttribute("d", next);
}
function repairEdgeConnections(svg) {
  const outlines = nodeOutlines(svg);
  for (const edge of svg.querySelectorAll(`${CONNECTED_EDGE_SELECTOR}, [data-gptm-source]`)) {
    const points = layoutPoints(edge);
    if (!points) continue;
    for (const atStart of [true, false]) {
      const attribute = atStart ? "marker-start" : "marker-end";
      const markerId = markerReferenceId(edge.getAttribute(attribute));
      if (markerId && !triangleRole(markerId, atStart ? "start" : "end")) continue;
      const index = atStart ? 0 : points.length - 1;
      const other = atStart ? 1 : points.length - 2;
      const anchor = toScreen(edge, points[index]);
      const adjacent = toScreen(edge, points[other]);
      if (!anchor || !adjacent) continue;
      const ownerId = edge.getAttribute(atStart ? "data-gptm-source" : "data-gptm-target");
      const known = ownerId && outlines.filter((outline) => outline.node.id === ownerId);
      const target = contourIntersection(anchor, adjacent, known?.length ? known : outlines, Boolean(known?.length));
      if (!target) continue;
      const snappedLocal = toLocal(edge, target);
      if (!snappedLocal) continue;
      if (edge.localName === "line") {
        edge.setAttribute(atStart ? "x1" : "x2", String(snappedLocal.x));
        edge.setAttribute(atStart ? "y1" : "y2", String(snappedLocal.y));
      } else if (edge.localName === "polyline") {
        const values = (edge.getAttribute("points") || "").match(new RegExp(PATH_NUMBER, "gi"))?.map(Number) || [];
        if (values.length < 4) continue;
        if (atStart) {
          values[0] = snappedLocal.x;
          values[1] = snappedLocal.y;
        } else {
          values[values.length - 2] = snappedLocal.x;
          values[values.length - 1] = snappedLocal.y;
        }
        edge.setAttribute("points", values.join(","));
      } else {
        rewritePathEndpoint(edge, atStart, snappedLocal);
      }
    }
  }
}
function repairSequenceConnections(svg) {
  for (const edge of svg.querySelectorAll('[data-et="message"]')) {
    for (const atStart of [true, false]) {
      const point = localPoint(edge, atStart);
      if (!point) continue;
      let adjacent;
      if (edge.localName === "path") {
        const length = edge.getTotalLength();
        adjacent = edge.getPointAtLength(atStart ? Math.min(2, length) : Math.max(0, length - 2));
      } else {
        adjacent = localPoint(edge, !atStart);
      }
      if (!adjacent) continue;
      const anchor = sequenceAnchor(
        svg,
        edge.getAttribute(atStart ? "data-from" : "data-to"),
        point.y,
        point.x,
        adjacent.x
      );
      if (!anchor) continue;
      if (edge.localName === "line") {
        edge.setAttribute(atStart ? "x1" : "x2", String(anchor.border));
      } else if (edge.localName === "path") {
        rewritePathEndpoint(edge, atStart, { x: anchor.border, y: point.y });
      }
    }
  }
}
function attachForGeometry(svg, callback) {
  if (typeof document === "undefined" || !document.body) return null;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;left:-100000px;top:0;width:max-content;height:max-content;pointer-events:none;";
  const cleanDoc = new DOMParser().parseFromString(
    sanitizeSvgMarkup(new XMLSerializer().serializeToString(svg)),
    "image/svg+xml"
  );
  const live = document.importNode(cleanDoc.documentElement, true);
  host.append(live);
  document.body.append(host);
  try {
    return callback(live);
  } finally {
    host.remove();
  }
}
function postProcessSvg(svgMarkup, variables, graph, config = {}) {
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
  for (const marker of svg.querySelectorAll('marker[id$="-sequencenumber"] circle')) {
    marker.setAttribute("fill", variables.lineColor);
    marker.setAttribute("stroke", "#ffffff");
    marker.setAttribute("stroke-width", "1");
  }
  for (const element of svg.querySelectorAll("[filter]")) {
    if (/drop-shadow/i.test(element.getAttribute("filter") || "")) element.removeAttribute("filter");
  }
  for (const node of svg.querySelectorAll("g.node")) {
    if (node.classList.contains("mermaid-decision")) ensureCssClass(node, "mgpt-decision");
  }
  const measured = attachForGeometry(svg, (live) => {
    fixSvgLabels(live, variables);
    if (graph?.edges) {
      applyAdaptiveFlowLayout(live, graph, config.adaptiveLayout);
      routeFlowEdges(live, graph);
    }
    routeC4Edges(live, graph, variables);
    routeNativeEdges(live);
    repairEdgeConnections(live);
    repairSequenceConnections(live);
    placeEdgeLabels(live);
    resolveEdgeCrossings(live, repairEdgeConnections);
    if (graph || Number(live.getAttribute("data-gptm-native-routes")) > 0) fitSvgBounds(live);
    colorDirectionalEdges(live, variables);
    const shafts = trimArrowShafts(live);
    live.setAttribute("data-gptm-trimmed-shafts", String(shafts.trimmed));
    live.setAttribute("data-gptm-shaft-skips", String(shafts.skipped.length));
    recordCrossings(live);
    return new XMLSerializer().serializeToString(live);
  });
  return measured || new XMLSerializer().serializeToString(svg);
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
    const layout = flowchart ? "elk" : "dagre";
    const nextKey = JSON.stringify({ preset: config.preset, themeVariables: config.themeVariables, isDark: config.isDark, layout });
    if (initialized && configKey === nextKey) return;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "base",
      themeVariables: config.themeVariables,
      layout,
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
      let graph;
      if (mermaid.mermaidAPI?.getDiagramFromText && (flowchart || /^\s*C4\w+/m.test(source))) {
        const diagram = await mermaid.mermaidAPI.getDiagramFromText(source);
        if (flowchart && diagram.db.getData) graph = { ...diagram.db.getData(), direction: diagram.db.getDirection() };
        else if (diagram.db.getRels) graph = { c4Nodes: diagram.db.getC4ShapeArray(), c4Relations: diagram.db.getRels() };
      }
      const themeCSS = flowchart ? buildFlowchartThemeCSS(config.themeVariables) : buildGlobalThemeCSS(config.themeVariables);
      let svg = result.svg;
      if (!flowchart && themeCSS && !svg.includes("mgpt-global-theme")) {
        const style = `<style id="mgpt-global-theme">${themeCSS}</style>`;
        svg = svg.replace(/<svg\b[^>]*>/, (tag) => `${tag}${style}`);
      }
      const processed = postProcessSvg(svg, config.themeVariables, graph, config);
      const clean = sanitizeSvgMarkup(processed);
      const size = svgSize(clean);
      const root = new DOMParser().parseFromString(clean, "image/svg+xml").documentElement;
      return {
        svg: clean,
        width: size.width,
        height: size.height,
        source,
        routing: {
          status: root.getAttribute("data-gptm-routing-status") || "not-applicable",
          checkedEdges: Number(root.getAttribute("data-gptm-checked-edges")) || 0,
          crossings: Number(root.getAttribute("data-gptm-crossings")) || 0,
          crossingsBefore: Number(root.getAttribute("data-gptm-crossings-before")) || 0,
          spacingFactor: Number(root.getAttribute("data-gptm-spacing-factor")) || 1,
          reason: root.getAttribute("data-gptm-routing-reason") || ""
        }
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
var FLOWCHART_RE, DIRECTION_KEYS, TRIANGLE_MARKER_RE, TRIANGLE_ASPECT, CONNECTED_EDGE_SELECTOR, PATH_NUMBER;
var init_render = __esm({
  "src/render.js"() {
    init_defaults();
    init_sanitize();
    init_svg_labels();
    init_svg_shaft();
    init_svg_routing();
    init_svg_c4();
    init_svg_adaptive();
    init_svg_crossings();
    FLOWCHART_RE = /^\s*(?:flowchart|graph)\b/im;
    DIRECTION_KEYS = Object.freeze({
      right: "gptMermaidLineRight",
      down: "gptMermaidLineDown",
      left: "gptMermaidLineLeft",
      up: "gptMermaidLineUp"
    });
    TRIANGLE_MARKER_RE = /(?:flowchart-v2-point(?:End|Start)(?:-margin)?|stateDiagram-barbEnd|(?:^|-)arrowhead|filled-head|stick-arrowhead|solidTopArrowHead|solidBottomArrowHead|requirement_arrowEnd|classDiagram-(?:dependency|extension)(?:Start|End)(?:-margin)?)$/;
    TRIANGLE_ASPECT = 1.25;
    CONNECTED_EDGE_SELECTOR = ".flowchart-link, .relation, .relationshipLine, .transition";
    PATH_NUMBER = String.raw`[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?`;
  }
});

// src/ui.js
function icon(doc, name) {
  const shapes = ICONS[name];
  if (!shapes) return null;
  const svg = doc.createElementNS(NS3, "svg");
  svg.setAttribute("class", "mgpt-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const [tag, attrs] of shapes) {
    const node = doc.createElementNS(NS3, tag);
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
        if (!record.result) return;
        const inViewer = record.state.viewer?.dialog?.open && record.state.viewer.viewport.contains(record.stage);
        if (!inViewer && !event.ctrlKey) return;
        event.preventDefault();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? record.stage.clientHeight : 1;
        const delta2 = Math.min(600, Math.max(-600, event.deltaY * unit));
        zoom(record, record.zoom * Math.exp(-delta2 * 2e-3), false, { x: event.clientX, y: event.clientY });
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
    record.stage.setAttribute("aria-label", "\u6EDA\u8F6E\u7F29\u653E\uFF0C\u62D6\u52A8\u5E73\u79FB\uFF0CHome \u590D\u4F4D");
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
      record.stage.setAttribute("aria-label", "Ctrl + \u6EDA\u8F6E\u7F29\u653E\uFF0C\u62D6\u52A8\u5E73\u79FB\uFF0CHome \u590D\u4F4D");
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
        record.image.hidden = true;
        setStatus(record, "error", "\u56FE\u7247\u65E0\u6CD5\u663E\u793A\uFF0C\u53EF\u91CD\u8BD5\u6216\u68C0\u67E5\u6E90\u7801\u3002");
      };
      record.image.src = record.url;
      record.image.hidden = false;
    } catch (error) {
      record.loading = false;
      record.image.hidden = true;
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
    stage.setAttribute("aria-label", "Ctrl + \u6EDA\u8F6E\u7F29\u653E\uFF0C\u62D6\u52A8\u5E73\u79FB\uFF0CHome \u590D\u4F4D");
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
var NS3, ICONS;
var init_ui = __esm({
  "src/ui.js"() {
    NS3 = "http://www.w3.org/2000/svg";
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
    styles_default = '/* \u804C\u8D23\uFF1Agpt-mermaid \u7684 ChatGPT \u98CE\u683C\u5185\u8054\u56FE\u8868\u6837\u5F0F\u3002 */\n.mgpt-diagram {\n  position: relative;\n  display: block;\n  width: 100%;\n  min-width: 0;\n  max-width: 100%;\n  margin: 18px 0;\n  border: 0;\n  background: transparent;\n  color: #263244;\n  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;\n}\n.mgpt-diagram[data-wide="true"] {\n  width: min(calc(100% + 8rem), 96vw);\n  max-width: 96vw;\n  margin-left: 50%;\n  transform: translateX(-50%);\n}\n.mgpt-floatbar {\n  position: absolute;\n  top: 4px;\n  right: 4px;\n  z-index: 8;\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  padding: 2px;\n  border: 1px solid rgba(26, 28, 31, .06);\n  border-radius: 9999px;\n  background: rgba(255, 255, 255, .94);\n  box-shadow: 0 1px 4px rgba(24, 32, 48, .08);\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity .15s ease;\n}\n.mgpt-diagram:hover .mgpt-floatbar,\n.mgpt-diagram:focus-within .mgpt-floatbar,\n.mgpt-diagram[data-menu-open="true"] .mgpt-floatbar,\n.mgpt-diagram[data-state="error"] .mgpt-floatbar {\n  opacity: 1;\n  pointer-events: auto;\n}\n@media (hover: none), (pointer: coarse) {\n  .mgpt-floatbar { opacity: 1; pointer-events: auto; }\n}\n.mgpt-icon-button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 32px;\n  height: 32px;\n  padding: 0;\n  border: 0;\n  border-radius: 9999px;\n  background: transparent;\n  color: #626f82;\n  cursor: pointer;\n}\n.mgpt-icon-button:hover:not(:disabled),\n.mgpt-diagram[data-menu-open="true"] .mgpt-floatbar [data-mgpt-action="menu"] {\n  background: #ebf0f7;\n  color: #263244;\n}\n.mgpt-icon-button:focus-visible,\n.mgpt-menuitem:focus-visible {\n  outline: 2px solid #2563c9;\n  outline-offset: 1px;\n}\n.mgpt-icon {\n  width: 16px;\n  height: 16px;\n  flex-shrink: 0;\n}\n.mgpt-menu {\n  position: absolute;\n  top: calc(100% + 6px);\n  right: 0;\n  z-index: 20;\n  display: flex;\n  flex-direction: column;\n  min-width: 148px;\n  padding: 6px;\n  border: 1px solid #e1e7ef;\n  border-radius: 12px;\n  background: #fff;\n  box-shadow: 0 8px 32px #1b2b4212, 0 1px 4px #1b2b4208;\n}\n.mgpt-menu[hidden] { display: none; }\n.mgpt-menuitem {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  padding: 7px 10px;\n  border: 0;\n  border-radius: 8px;\n  background: transparent;\n  color: #263244;\n  font: inherit;\n  font-size: 12.5px;\n  line-height: 1.5;\n  text-align: left;\n  cursor: pointer;\n}\n.mgpt-menuitem:hover:not(:disabled) { background: #f2f5f9; }\n.mgpt-menuitem:disabled,\n.mgpt-icon-button:disabled { opacity: .42; cursor: default; }\n.mgpt-status {\n  padding: 12px 16px;\n  color: #626f82;\n  font-size: 12px;\n  line-height: 1.6;\n}\n.mgpt-diagram[data-state="error"] .mgpt-status { color: #a44c32; }\n.mgpt-retry {\n  margin: 0 16px 12px;\n  padding: 5px 9px;\n  border: 1px solid #e1e7ef;\n  border-radius: 7px;\n  background: #fff;\n  color: #263244;\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n}\n.mgpt-retry[hidden] { display: none; }\n.mgpt-viewport {\n  box-sizing: border-box;\n  width: 100%;\n  min-width: 0;\n  max-width: 100%;\n  padding: 8px 0;\n  overflow: visible;\n  background: transparent;\n}\n.mgpt-stage {\n  position: relative;\n  width: 100%;\n  min-height: 112px;\n  overflow: hidden;\n  cursor: grab;\n  touch-action: pan-y;\n  user-select: none;\n}\n.mgpt-stage[data-dragging="true"] { cursor: grabbing; }\n.mgpt-stage:focus-visible { outline: 2px solid #2563c9; outline-offset: -2px; }\n.mgpt-image {\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  display: block;\n  width: 100%;\n  height: auto;\n  max-width: none;\n  margin: 0;\n  border: 0;\n  object-fit: contain;\n  pointer-events: none;\n  transform-origin: center;\n}\n.mgpt-image[hidden] { display: none; }\n.mgpt-diagram > pre {\n  max-height: 420px;\n  margin: 0;\n  overflow: auto;\n}\n.mgpt-dialog {\n  box-sizing: border-box;\n  width: min(1440px, calc(100vw - 32px));\n  height: min(900px, calc(100dvh - 32px));\n  max-width: none;\n  padding: 0;\n  border: 1px solid #e1e7ef;\n  border-radius: 16px;\n  background: #fff;\n  color: #263244;\n  box-shadow: 0 8px 32px #1b2b4212;\n  overflow: hidden;\n}\n.mgpt-dialog::backdrop { background: #0006; }\n.mgpt-dialog[open] { display: flex; flex-direction: column; }\n.mgpt-dialog-bar {\n  display: flex;\n  align-items: center;\n  flex: 0 0 auto;\n  min-height: 42px;\n  padding: 5px 8px;\n  border-bottom: 1px solid #f1f4f8;\n  background: #fafbfd;\n}\n.mgpt-dialog-actions { display: flex; align-items: center; gap: 2px; }\n.mgpt-dialog-bar > [data-mgpt-action="close"] { margin-left: auto; }\n.mgpt-dialog-viewport { flex: 1; min-height: 0; }\n.mgpt-dialog-viewport .mgpt-stage { height: 100%; min-height: 100%; }\n@media (max-width: 900px) {\n  .mgpt-diagram[data-wide="true"] {\n    width: 100%;\n    max-width: 100%;\n    margin-left: 0;\n    transform: none;\n  }\n}\n@media (max-width: 640px) {\n  .mgpt-diagram { margin: 14px 0; }\n  .mgpt-viewport { padding: 4px 0; }\n  .mgpt-dialog { width: calc(100vw - 12px); height: calc(100dvh - 12px); }\n}\n';
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

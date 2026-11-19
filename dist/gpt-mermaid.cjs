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
  const explicitVariables = {
    ...EXPLICIT_THEME_OVERRIDES.get(previous.themeVariables) || previous.themeVariables || {},
    ...EXPLICIT_THEME_OVERRIDES.get(input.themeVariables) || input.themeVariables || {}
  };
  const themeVariables = { ...variables, ...explicitVariables };
  EXPLICIT_THEME_OVERRIDES.set(themeVariables, explicitVariables);
  return {
    ...DEFAULT_CONFIG,
    ...previous,
    ...input,
    preset: presetName,
    fontFamily,
    adaptiveLayout: input.adaptiveLayout === false || input.adaptiveLayout === void 0 && previous.adaptiveLayout === false ? false : { ...DEFAULT_CONFIG.adaptiveLayout, ...previous.adaptiveLayout || {}, ...input.adaptiveLayout || {} },
    themeVariables,
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
var VERSION, PRESETS, DEFAULT_CONFIG, SERIES, EXPLICIT_THEME_OVERRIDES;
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
    EXPLICIT_THEME_OVERRIDES = /* @__PURE__ */ new WeakMap();
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
function frontmatterKey(line, indent) {
  const text = line.slice(indent);
  let quote = "";
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ":") return text.slice(0, index).trim();
  }
  return "";
}
function allowedFrontmatterKey(key) {
  return FRONTMATTER_KEYS.has(key) || /^"(?:title|displayMode)"$/.test(key) || /^'(?:title|displayMode)'$/.test(key);
}
function sanitizeFrontmatterContent(content) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      const kept2 = [];
      if (typeof parsed.title === "string" || typeof parsed.title === "number") {
        kept2.push(`title: ${JSON.stringify(String(parsed.title))}`);
      }
      if (typeof parsed.displayMode === "string" || typeof parsed.displayMode === "number") {
        kept2.push(`displayMode: ${JSON.stringify(String(parsed.displayMode))}`);
      }
      return kept2.length ? `---${eol}${kept2.join(eol)}${eol}---` : "";
    } catch {
    }
  }
  const lines = content.replace(/\r?\n$/, "").split(/\r?\n/);
  const rootIndent = Math.min(...lines.filter((line) => line.trim() && !line.trimStart().startsWith("#")).map((line) => line.match(/^\s*/)[0].length));
  if (!Number.isFinite(rootIndent)) return "";
  const kept = [];
  let keepBlock = false;
  for (const line of lines) {
    const trimmed2 = line.trim();
    if (!trimmed2) {
      if (keepBlock) kept.push(line);
      continue;
    }
    if (trimmed2.startsWith("#")) {
      if (keepBlock) kept.push(line);
      continue;
    }
    const indent = line.match(/^\s*/)[0].length;
    if (indent <= rootIndent) {
      keepBlock = allowedFrontmatterKey(frontmatterKey(line, indent));
    }
    if (keepBlock) kept.push(line);
  }
  while (kept.length && !kept.at(-1).trim()) kept.pop();
  return kept.length ? `---${eol}${kept.join(eol)}${eol}---` : "";
}
function splitFrontmatter(source) {
  const bom = source.startsWith("\uFEFF") ? "\uFEFF" : "";
  const text = bom ? source.slice(1) : source;
  const match = text.match(FRONTMATTER_RE);
  if (!match || match.index !== 0) return { bom, frontmatter: "", body: text };
  const frontmatter = sanitizeFrontmatterContent(match[1] || "");
  return { bom, frontmatter, body: text.slice(match[0].length) };
}
function splitMermaidStatements(line) {
  const statements = [];
  let start = 0;
  let quote = "";
  let escaped = false;
  let parentheses = 0;
  let brackets = 0;
  let braces = 0;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") parentheses++;
    else if (char === ")") parentheses = Math.max(0, parentheses - 1);
    else if (char === "[") brackets++;
    else if (char === "]") brackets = Math.max(0, brackets - 1);
    else if (char === "{") braces++;
    else if (char === "}") braces = Math.max(0, braces - 1);
    else if (char === "%" && line[index + 1] === "%" && !parentheses && !brackets && !braces) break;
    else if (char === ";" && !parentheses && !brackets && !braces) {
      statements.push(line.slice(start, index));
      start = index + 1;
    }
  }
  statements.push(line.slice(start));
  return statements;
}
function stripClickStatements(source) {
  return source.split(/(\r\n|\n|\r)/).map((part) => {
    if (!part || part === "\n" || part === "\r\n" || part === "\r" || part.trimStart().startsWith("%%")) return part;
    const statements = splitMermaidStatements(part);
    if (!statements.some((statement) => /^\s*click\b/i.test(statement))) return part;
    return statements.filter((statement) => !/^\s*click\b/i.test(statement)).join(";");
  }).join("");
}
function removeAttribute(node, attribute) {
  if (attribute.namespaceURI && typeof node.removeAttributeNS === "function") {
    node.removeAttributeNS(attribute.namespaceURI, attribute.localName);
  } else {
    node.removeAttribute(attribute.name);
  }
}
function splitSelectorList(selectors) {
  const result = [];
  let start = 0;
  let quote = "";
  let escaped = false;
  let parentheses = 0;
  let brackets = 0;
  for (let index = 0; index < selectors.length; index++) {
    const char = selectors[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") parentheses++;
    else if (char === ")") parentheses = Math.max(0, parentheses - 1);
    else if (char === "[") brackets++;
    else if (char === "]") brackets = Math.max(0, brackets - 1);
    else if (char === "," && !parentheses && !brackets) {
      result.push(selectors.slice(start, index));
      start = index + 1;
    }
  }
  result.push(selectors.slice(start));
  return result;
}
function matchingBrace(css, open) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = open; index < css.length; index++) {
    const char = css[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return index;
  }
  return -1;
}
function nextRuleBoundary(css, start) {
  let quote = "";
  let escaped = false;
  let parentheses = 0;
  let brackets = 0;
  for (let index = start; index < css.length; index++) {
    const char = css[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") parentheses++;
    else if (char === ")") parentheses = Math.max(0, parentheses - 1);
    else if (char === "[") brackets++;
    else if (char === "]") brackets = Math.max(0, brackets - 1);
    else if (!parentheses && !brackets && (char === "{" || char === ";")) return { index, char };
  }
  return null;
}
function hasDeclarationsBlock(body) {
  let quote = "";
  let escaped = false;
  for (const char of body) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "{") return true;
  }
  return false;
}
function scopedSelector(selector, scopeId) {
  const value = selector.trim();
  if (!value) return "";
  const prefix = `#${scopeId}`;
  if (value.startsWith(prefix) && !/^[\w-]/.test(value.slice(prefix.length))) return value;
  return `${prefix} ${value}`;
}
function scopeStyleCSS(css, scopeId) {
  let output = "";
  let index = 0;
  while (index < css.length) {
    while (index < css.length && /[\s;]/.test(css[index])) index++;
    if (index >= css.length || css[index] === "}") break;
    if (css[index] === "@") {
      const boundary2 = nextRuleBoundary(css, index);
      if (!boundary2) break;
      if (boundary2.char === ";") {
        index = boundary2.index + 1;
        continue;
      }
      const close2 = matchingBrace(css, boundary2.index);
      if (close2 < 0) break;
      const prelude = css.slice(index, boundary2.index).trim();
      const name = prelude.match(/^@([\w-]+)/)?.[1]?.toLowerCase() || "";
      if (STYLE_GROUP_RULES.has(name)) {
        const inner = scopeStyleCSS(css.slice(boundary2.index + 1, close2), scopeId);
        if (inner) output += `${prelude}{${inner}}`;
      }
      index = close2 + 1;
      continue;
    }
    const boundary = nextRuleBoundary(css, index);
    if (!boundary || boundary.char !== "{") break;
    const close = matchingBrace(css, boundary.index);
    if (close < 0) break;
    const body = css.slice(boundary.index + 1, close);
    if (!hasDeclarationsBlock(body)) {
      const selectors = splitSelectorList(css.slice(index, boundary.index)).map((selector) => scopedSelector(selector, scopeId)).filter(Boolean);
      if (selectors.length) output += `${selectors.join(",")}{${body}}`;
    }
    index = close + 1;
  }
  return output;
}
function safeStyleScopeId(value) {
  const id = String(value || "");
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(id) ? id : "";
}
function sanitizeMermaidSource(source) {
  const { bom, frontmatter, body } = splitFrontmatter(String(source || ""));
  let blocked2 = false;
  const stripped = body.replace(DIRECTIVE_RE, (directive) => {
    if (SECURITY_RE.test(directive)) {
      blocked2 = true;
      return "";
    }
    return safeInitDirective(directive);
  });
  if (blocked2) return null;
  const cleaned = `${bom}${frontmatter}${stripClickStatements(stripped)}`.trim();
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
  const styleScopeId = safeStyleScopeId(root.getAttribute("id"));
  for (const node of [root, ...root.querySelectorAll("*")]) {
    if (node.namespaceURI !== SVG_NS || DENY_TAGS.has(node.localName) || !SVG_TAGS.has(node.localName)) {
      node.remove();
      continue;
    }
    for (const attribute of [...node.attributes]) {
      const name = attribute.name;
      const localName = attribute.localName || name.split(":").pop();
      const value = attribute.value;
      if (/^on/i.test(localName) || localName === "srcset" || localName === "ping" || localName === "base" && attribute.namespaceURI === XML_NS) {
        removeAttribute(node, attribute);
        continue;
      }
      if (localName === "href" || name.endsWith(":href")) {
        if (attribute.namespaceURI && attribute.namespaceURI !== XLINK_NS || !safeURL(value)) {
          removeAttribute(node, attribute);
        }
        continue;
      }
      if (localName === "src" && (attribute.namespaceURI || !safeURL(value))) {
        removeAttribute(node, attribute);
        continue;
      }
      if (localName === "style") {
        if (attribute.namespaceURI) {
          removeAttribute(node, attribute);
          continue;
        }
        const safe = safeCSS(value);
        if (safe) node.setAttribute("style", safe);
        else removeAttribute(node, attribute);
        continue;
      }
      if (/url\s*\(/i.test(value) && !safeCSS(value)) removeAttribute(node, attribute);
    }
    if (node.localName === "style") {
      const safe = safeCSS(node.textContent);
      const scoped = safe && styleScopeId ? scopeStyleCSS(safe, styleScopeId) : "";
      if (scoped) node.textContent = scoped;
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
var DIRECTIVE_RE, INIT_RE, SECURITY_RE, SVG_NS, XLINK_NS, XML_NS, FRONTMATTER_RE, FRONTMATTER_KEYS, STYLE_GROUP_RULES, SVG_TAGS, DENY_TAGS;
var init_sanitize = __esm({
  "src/sanitize.js"() {
    DIRECTIVE_RE = /%%\{[\s\S]*?\}%%/g;
    INIT_RE = /^%%\{\s*(?:init|initialize)\s*:\s*(\{[\s\S]*\})\s*\}%%$/i;
    SECURITY_RE = /["']?securityLevel["']?\s*:/i;
    SVG_NS = "http://www.w3.org/2000/svg";
    XLINK_NS = "http://www.w3.org/1999/xlink";
    XML_NS = "http://www.w3.org/XML/1998/namespace";
    FRONTMATTER_RE = /^---[^\S\r\n]*(?:#[^\r\n]*)?\r?\n([\s\S]*?)^---[^\S\r\n]*(?:#[^\r\n]*)?(?=\r?\n|$)/m;
    FRONTMATTER_KEYS = /* @__PURE__ */ new Set(["title", "displayMode"]);
    STYLE_GROUP_RULES = /* @__PURE__ */ new Set(["media", "supports", "container", "layer", "scope", "starting-style"]);
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
    const leg = distance(a, b);
    length += leg;
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
      if (!visibility.has(segmentKey)) visibility.set(segmentKey, !segmentBlocked(a, b, boxes) && !(directions.avoidSegments || []).some((segment) => {
        const hit = segmentIntersection(a, b, segment[0], segment[1]);
        return hit && !directions.allowJunction?.(hit, segment);
      }));
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
function loopRoute(box, side, size, reach = 0, lane = 0, laneCount = 1) {
  const horizontal = horizontalSide(side), center = horizontal ? box.y + box.height / 2 : box.x + box.width / 2;
  const span = Math.min(32, (horizontal ? box.height : box.width) * 0.7);
  const count = Math.max(1, Math.floor(laneCount) || 1);
  const slotSpan = span / count;
  const laneCenter = center + (Math.max(0, lane) - (count - 1) / 2) * slotSpan;
  const laneSpan = count === 1 ? span : Math.max(2, Math.min(span, slotSpan * 0.65));
  const offset = Math.max(reach, 42, (horizontal ? size.width : size.height) + 24);
  const a = onSide(box, side, laneCenter - laneSpan / 2), b = onSide(box, side, laneCenter + laneSpan / 2);
  const axis = horizontal ? "x" : "y";
  return [
    a,
    { ...a, [axis]: a[axis] + signOf(side) * offset },
    { ...b, [axis]: b[axis] + signOf(side) * offset },
    b
  ];
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
      const compatible = !start && edge.source !== edge.target && edge.model.arrowTypeStart === "none" && edge.model.arrowTypeEnd === "arrow_point" && edge.model.pattern === "normal" && !edge.model.animate && !ports.some((other) => other.start);
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
  const loopCounts = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    if (edge.source !== edge.target) continue;
    const side = sideOf(edge.points[0], edge.points[1]);
    const laneKey = `${edge.source.element.id}\0${side}`;
    loopCounts.set(laneKey, (loopCounts.get(laneKey) || 0) + 1);
  }
  const loopLanes = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    if (edge.source === edge.target) {
      const box = edge.source.box, side = sideOf(edge.points[0], edge.points[1]);
      const label = [...svg.querySelectorAll("g.edgeLabel .label[data-id]")].find((l) => l.dataset.id === edge.model.id);
      const size = label ? boundsInSvg(svg, label) : { width: 0, height: 0 };
      const laneKey = `${edge.source.element.id}\0${side}`;
      const lane = loopLanes.get(laneKey) || 0;
      loopLanes.set(laneKey, lane + 1);
      edge.points = loopRoute(box, side, size, 0, lane, loopCounts.get(laneKey) || 1);
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
function routeNativeEdges(svg, options2 = {}) {
  const nodes = new Map([...svg.querySelectorAll("g.node[data-id],g.statediagram-cluster[data-id]")].map((element) => {
    const shape = nodeShape(element);
    return [element.dataset.id, shape && { element, shape, box: boundsInSvg(svg, shape) }];
  }).filter(([, node]) => node));
  const native = [...svg.querySelectorAll("path.transition[data-source],path.relation[data-source]")];
  const edges = native.map((element) => {
    const source = nodes.get(element.dataset.source), target = nodes.get(element.dataset.target), raw = readPoints(element);
    if (!source || !target || !raw) return null;
    if (element.classList?.contains("transition")) {
      element.removeAttribute("data-gptm-label-x");
      element.removeAttribute("data-gptm-label-y");
    }
    element.setAttribute("data-gptm-source", source.element.id);
    element.setAttribute("data-gptm-target", target.element.id);
    const compatible = ["marker-start", "marker-end"].every((attribute) => {
      const value = element.getAttribute(attribute);
      return !value || /(?:barbEnd|extension(?:Start|End)|dependency(?:Start|End))\)/.test(value);
    });
    return {
      element,
      source,
      target,
      compatible,
      state: element.classList?.contains("transition") === true,
      points: raw.map((p) => inSvg(svg, element, p))
    };
  }).filter(Boolean);
  const loopLabels = new Map([...svg.querySelectorAll("g.edgeLabel")].map((label) => [
    label.querySelector("[data-id]")?.dataset.id || label.dataset.id,
    label
  ]));
  const loopCounts = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    if (edge.source !== edge.target || !edge.compatible) continue;
    const laneKey = edge.source.element.id;
    loopCounts.set(laneKey, (loopCounts.get(laneKey) || 0) + 1);
  }
  const loopLanes = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    if (edge.source !== edge.target || !edge.compatible) continue;
    const label = loopLabels.get(edge.element.dataset.id), size = label ? boundsInSvg(svg, label) : { width: 0, height: 0 };
    const initial = sideOf(edge.points[0], edge.points[1]);
    const obstacles = [...nodes.values()].filter((node) => node !== edge.source && !node.element.contains(edge.source.element)).map((node) => node.box);
    for (const side of [initial, ...["right", "left", "bottom", "top"].filter((s) => s !== initial)]) {
      const laneKey = edge.source.element.id;
      const lane = loopLanes.get(laneKey) || 0;
      let points = loopRoute(
        edge.source.box,
        side,
        size,
        0,
        lane,
        loopCounts.get(laneKey) || 1
      );
      if (edge.state) {
        const box = edge.source.box, adjacent = { right: "top", top: "left", left: "bottom", bottom: "right" }[side];
        const centerPort = (direction) => onSide(box, direction, horizontalSide(direction) ? (box.y + box.bottom) / 2 : (box.x + box.right) / 2);
        const a = centerPort(side), b = centerPort(adjacent);
        const reach = Math.max(STATE_PORT_LEAD, size.width + 24) + lane * STATE_PORT_LEAD;
        const first = { ...a }, last = { ...b };
        first[horizontalSide(side) ? "x" : "y"] += signOf(side) * reach;
        last[horizontalSide(adjacent) ? "x" : "y"] += signOf(adjacent) * STATE_PORT_LEAD;
        const corner = horizontalSide(side) ? { x: first.x, y: last.y } : { x: last.x, y: first.y };
        points = [a, first, corner, last, b];
      }
      if (!clearRoute(points, obstacles, 4)) continue;
      const center = { x: (points[1].x + points[2].x) / 2, y: (points[1].y + points[2].y) / 2 };
      const reservation = nativeLabelBox(center, size);
      if (label && [...nodes.values()].some((node) => boxesOverlap(reservation, node.box))) continue;
      edge.points = points;
      writePoints(svg, edge.element, points);
      if (label) {
        edge.element.setAttribute("data-gptm-label-x", String(center.x));
        edge.element.setAttribute("data-gptm-label-y", String(center.y));
      }
      edge.element.setAttribute("data-gptm-native-rerouted", "true");
      edge.element.setAttribute("data-gptm-self-loop", "true");
      loopLanes.set(laneKey, lane + 1);
      break;
    }
  }
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
    if (group.length < 2 || group.some((port) => port.edge.state || !port.edge.compatible)) continue;
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
  const reservedLabels = edges.filter((edge) => edge.source === edge.target && edge.element.hasAttribute("data-gptm-label-x")).map((edge) => nativeLabelBox({
    x: Number(edge.element.getAttribute("data-gptm-label-x")),
    y: Number(edge.element.getAttribute("data-gptm-label-y"))
  }, boundsInSvg(svg, loopLabels.get(edge.element.dataset.id))));
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
  for (const node of nodes.values()) {
    const statePorts = [...ports.values()].filter((p) => p.node === node && p.edge.state && p.edge.compatible && p.edge.source !== p.edge.target);
    const incoming = new Set(statePorts.filter((p) => !p.start).map((p) => p.side));
    for (const port of statePorts.filter((p) => p.start && incoming.has(p.side))) {
      const other = port.edge.target.box;
      const choices = ["top", "bottom", "left", "right"].filter((side) => !incoming.has(side));
      const cost = (side) => {
        const anchor = onSide(node.box, side, horizontalSide(side) ? (node.box.y + node.box.bottom) / 2 : (node.box.x + node.box.right) / 2);
        const axis = horizontalSide(side) ? "x" : "y";
        anchor[axis] += signOf(side) * STATE_PORT_LEAD;
        return Math.abs(anchor.x - (other.x + other.right) / 2) + Math.abs(anchor.y - (other.y + other.bottom) / 2);
      };
      choices.sort((a, b) => cost(a) - cost(b));
      if (choices.length) port.side = choices[0];
    }
    for (const port of statePorts) {
      port.anchor = onSide(node.box, port.side, horizontalSide(port.side) ? (node.box.y + node.box.bottom) / 2 : (node.box.x + node.box.right) / 2);
      port.value = port.anchor[horizontalSide(port.side) ? "y" : "x"];
    }
  }
  const stateApproaches = [...ports.values()].filter((port) => port.edge.state && port.edge.source !== port.edge.target).map((port) => {
    const horizontal = horizontalSide(port.side), p = port.anchor, out = signOf(port.side) * STATE_PORT_LEAD;
    return {
      x: horizontal ? Math.min(p.x, p.x + out) : p.x - 3,
      right: horizontal ? Math.max(p.x, p.x + out) : p.x + 3,
      y: horizontal ? p.y - 3 : Math.min(p.y, p.y + out),
      bottom: horizontal ? p.y + 3 : Math.max(p.y, p.y + out)
    };
  });
  const routingOrder = edges.filter((edge) => edge.compatible).sort((a, b) => {
    if (a.state !== b.state) return a.state ? -1 : 1;
    if (a.state) {
      return 0;
    }
    return (labelSizes.get(b)?.width || 0) - (labelSizes.get(a)?.width || 0);
  });
  for (const edge of routingOrder) {
    if (edge.source === edge.target) continue;
    const scopedNodes = [...nodes.values()].filter((node) => node === edge.source || node === edge.target || !node.element.contains(edge.source.element) && !node.element.contains(edge.target.element));
    const foreign = scopedNodes.filter((node) => node !== edge.source && node !== edge.target).map((node) => node.box);
    const a = ports.get(`${edge.element.id}:true`), b = ports.get(`${edge.element.id}:false`);
    const lead = (port) => {
      const point = { ...port.anchor }, axis = horizontalSide(port.side) ? "x" : "y";
      point[axis] += signOf(port.side) * (edge.state ? STATE_PORT_LEAD : 24);
      return point;
    };
    const start = lead(a), end = lead(b);
    const vector2 = (a2, b2) => ({ x: b2.x - a2.x, y: b2.y - a2.y });
    const directions = { start: vector2(a.anchor, start), end: vector2(end, b.anchor) };
    if (edge.state) {
      const size2 = labelSizes.get(edge);
      const barriers2 = [...scopedNodes.map((node) => node.box), ...reservedLabels];
      const labelBarriers2 = [...scopedNodes.map((node) => node.box), ...stateApproaches, ...reservedLabels];
      const candidates = [];
      const considerStateRoute = (route) => {
        const raw = route && [a.anchor, ...route, b.anchor];
        if (!raw) return;
        for (const points2 of [simplifyPoints(raw)]) {
          const quality = routeQuality(points2);
          const crossesEndpoint = (node, skip) => points2.slice(1).some((point, index) => index !== skip && segmentBlocked(points2[index], point, [node.box], -1));
          const outsidePort = (anchor, point, side) => {
            if (horizontalSide(side)) return side === "right" ? point.x > anchor.x + EPS2 : point.x < anchor.x - EPS2;
            return side === "bottom" ? point.y > anchor.y + EPS2 : point.y < anchor.y - EPS2;
          };
          if (points2.length > 10 || !Number.isFinite(quality.score) || !clearRoute(points2, foreign)) continue;
          if (!points2.slice(1).every((point, index) => near(point.x, points2[index].x) || near(point.y, points2[index].y))) continue;
          if (!outsidePort(a.anchor, points2[1], a.side) || !outsidePort(b.anchor, points2.at(-2), b.side)) continue;
          if (crossesEndpoint(edge.source, 0) || crossesEndpoint(edge.target, points2.length - 2)) continue;
          if (distance(points2[0], points2[1]) < STATE_PORT_LEAD - EPS2 || distance(points2.at(-1), points2.at(-2)) < STATE_PORT_LEAD - EPS2) continue;
          if (points2.slice(1).some((point, index) => distance(points2[index], point) < 12 - EPS2)) continue;
          const committedHits = points2.slice(1).flatMap((point, index) => occupied.map((segment) => {
            const [from, to] = segment;
            const hit = segmentIntersection(points2[index], point, from, to);
            return hit && hit.kind !== "touch" && !sharedTerminal(segment.edge, points2, hit) ? hit : null;
          }).filter(Boolean));
          if (committedHits.length) continue;
          const reservation2 = size2 && labelOnRoute(svg, points2, size2, labelBarriers2, occupied);
          const reservationPenalty = size2 && !reservation2 ? 1e6 : 0;
          candidates.push({
            points: points2,
            reservation: reservation2,
            score: quality.score + (reservation2?.score || 0) * 0.02 + reservationPenalty
          });
          break;
        }
      };
      const sharedTerminal = (other, points2, hit) => {
        if (!other) return false;
        return [true, false].some((start2) => {
          if ((start2 ? edge.source : edge.target) !== (start2 ? other.source : other.target)) return false;
          const own = start2 ? points2 : points2.slice().reverse();
          const theirs = start2 ? other.points : other.points.slice().reverse();
          if (distance(own[0], theirs[0]) > EPS2) return false;
          const shared = segmentIntersection(own[0], own[1], theirs[0], theirs[1]);
          if (shared?.kind !== "overlap") return false;
          const axis = Math.abs(own[1].x - own[0].x) > EPS2 ? "x" : "y", cross2 = axis === "x" ? "y" : "x";
          return Math.abs(hit[cross2] - own[0][cross2]) < EPS2 && hit[axis] >= Math.max(Math.min(own[0][axis], own[1][axis]), Math.min(theirs[0][axis], theirs[1][axis])) - EPS2 && hit[axis] <= Math.min(Math.max(own[0][axis], own[1][axis]), Math.max(theirs[0][axis], theirs[1][axis])) + EPS2;
        });
      };
      const stateWalls = () => occupied.filter((segment) => {
        const other = segment.edge;
        if (!other) return true;
        return ![true, false].some((first) => {
          if ((first ? edge.source : edge.target) !== (first ? other.source : other.target)) return false;
          const port = first ? a : b, q = first ? other.points : other.points.slice().reverse();
          return distance(port.anchor, q[0]) < EPS2 && segmentIntersection(segment[0], segment[1], q[0], q[1])?.kind === "overlap";
        });
      });
      const search = (from, to, obstacles, clearance, congestion, dir) => {
        const walls = stateWalls(), result = orthogonalRoute(from, to, obstacles, clearance, congestion, {
          ...dir,
          avoidSegments: walls,
          allowJunction: (hit, segment) => hit.kind === "touch" && sharedTerminal(segment.edge, [a.anchor, start, end, b.anchor], hit)
        });
        return result;
      };
      if (size2) {
        const center = { x: size2.x + size2.width / 2, y: size2.y + size2.height / 2 };
        for (const horizontal of [true, false]) {
          const enter = horizontal ? { x: center.x - 8, y: center.y } : { x: center.x, y: center.y - 8 };
          const exit = horizontal ? { x: center.x + 8, y: center.y } : { x: center.x, y: center.y + 8 };
          const through = vector2(enter, exit);
          const before = search(
            start,
            enter,
            barriers2,
            CLEARANCE,
            occupied,
            { ...directions, end: through }
          );
          const after = search(
            exit,
            end,
            barriers2,
            CLEARANCE,
            occupied,
            { start: through, end: directions.end }
          );
          if (before && after) considerStateRoute([...before, ...after]);
        }
      }
      considerStateRoute(search(start, end, barriers2, CLEARANCE, occupied, directions));
      if (size2 && !candidates.some((candidate) => candidate.reservation)) {
        const gapX = Math.max(30, size2.width / 2 + 12), gapY = Math.max(30, size2.height / 2 + 12);
        const extra = {
          ...directions,
          extraX: [a.anchor.x - gapX, a.anchor.x + gapX, b.anchor.x - gapX, b.anchor.x + gapX],
          extraY: [a.anchor.y - gapY, a.anchor.y + gapY, b.anchor.y - gapY, b.anchor.y + gapY]
        };
        considerStateRoute(search(start, end, barriers2, CLEARANCE, occupied, extra));
      }
      considerStateRoute([start, { x: end.x, y: start.y }, end]);
      considerStateRoute([start, { x: start.x, y: end.y }, end]);
      const lanes = (low, high) => [
        (low + high) / 2,
        Math.min(low, high) - STATE_PORT_LEAD,
        Math.max(low, high) + STATE_PORT_LEAD
      ];
      for (const x of lanes(start.x, end.x)) {
        considerStateRoute([start, { x, y: start.y }, { x, y: end.y }, end]);
      }
      for (const y of lanes(start.y, end.y)) {
        considerStateRoute([start, { x: start.x, y }, { x: end.x, y }, end]);
      }
      if (!candidates.length) {
        const lane = 24;
        const extraX = [a.anchor.x - lane, a.anchor.x + lane, b.anchor.x - lane, b.anchor.x + lane];
        const extraY = [a.anchor.y - lane, a.anchor.y + lane, b.anchor.y - lane, b.anchor.y + lane];
        for (const box of foreign) {
          extraX.push(box.x - lane, box.right + lane);
          extraY.push(box.y - lane, box.bottom + lane);
        }
        for (const point of occupied.flatMap((segment) => segment)) {
          extraX.push(point.x - lane, point.x + lane);
          extraY.push(point.y - lane, point.y + lane);
        }
        considerStateRoute(search(
          start,
          end,
          barriers2,
          CLEARANCE,
          occupied,
          { ...directions, extraX, extraY }
        ));
      }
      if (!candidates.length) {
        const originalSides = [a.side, b.side];
        const centered = (port, side) => onSide(port.node.box, side, horizontalSide(side) ? (port.node.box.y + port.node.box.bottom) / 2 : (port.node.box.x + port.node.box.right) / 2);
        const sides = ["top", "right", "bottom", "left"];
        const choices = sides.flatMap((sourceSide) => sides.map((targetSide) => {
          const p = centered(a, sourceSide), q = centered(b, targetSide);
          return { sourceSide, targetSide, p, q, cost: distance(p, q) + (sourceSide === originalSides[0] ? 0 : 80) + (targetSide === originalSides[1] ? 0 : 80) };
        })).sort((left, right) => left.cost - right.cost);
        for (const choice of choices) {
          if (candidates.length) break;
          const opposing = [...ports.values()].some((port) => port.edge !== edge && (!port.start && port.node === edge.source && port.side === choice.sourceSide || port.start && port.node === edge.target && port.side === choice.targetSide));
          if (opposing) continue;
          a.side = choice.sourceSide;
          a.anchor = choice.p;
          b.side = choice.targetSide;
          b.anchor = choice.q;
          Object.assign(start, lead(a));
          Object.assign(end, lead(b));
          const extraX = occupied.flatMap(([p, q]) => [
            p.x - STATE_PORT_LEAD,
            p.x + STATE_PORT_LEAD,
            q.x - STATE_PORT_LEAD,
            q.x + STATE_PORT_LEAD
          ]);
          const extraY = occupied.flatMap(([p, q]) => [
            p.y - STATE_PORT_LEAD,
            p.y + STATE_PORT_LEAD,
            q.y - STATE_PORT_LEAD,
            q.y + STATE_PORT_LEAD
          ]);
          considerStateRoute(search(start, end, barriers2, CLEARANCE, occupied, {
            start: vector2(a.anchor, start),
            end: vector2(end, b.anchor),
            extraX,
            extraY,
            maxVisited: 5e3
          }));
        }
      }
      candidates.sort((left, right) => left.score - right.score);
      const bestState = candidates[0];
      if (bestState) {
        writePoints(svg, edge.element, bestState.points);
        edge.element.setAttribute("data-gptm-native-rerouted", "true");
        if (bestState.reservation) {
          reservedLabels.push(bestState.reservation.box);
          edge.element.setAttribute("data-gptm-label-x", String(bestState.reservation.x));
          edge.element.setAttribute("data-gptm-label-y", String(bestState.reservation.y));
        }
      }
      const chosen = bestState ? readPoints(edge.element) : null;
      const retained = chosen?.map((p) => inSvg(svg, edge.element, p)) || edge.points;
      edge.points = retained;
      for (let i = 1; i < retained.length; i++) {
        const segment = [retained[i - 1], retained[i]];
        segment.edge = edge;
        occupied.push(segment);
      }
      continue;
    }
    const foreignShields = shields.filter((shield) => shield.edge !== edge);
    const barriers = [...boxes, ...foreignShields, ...reservedLabels];
    const labelBarriers = [...boxes, ...shields, ...approaches.filter((item) => item.edge !== edge), ...reservedLabels];
    const completeBarriers = [...foreign, ...foreignShields, ...reservedLabels];
    const size = labelSizes.get(edge);
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
  const stateGroups = /* @__PURE__ */ new Map();
  for (const edge of edges.filter((e) => e.state)) {
    const storedMarker = edge.element.getAttribute("data-gptm-state-marker");
    if (storedMarker) edge.element.setAttribute("marker-end", storedMarker);
    else if (edge.element.hasAttribute("marker-end")) {
      edge.element.setAttribute("data-gptm-state-marker", edge.element.getAttribute("marker-end"));
    }
    edge.element.removeAttribute("data-gptm-shared-tip");
    edge.element.removeAttribute("data-gptm-shared-start");
    for (const first of [true, false]) {
      const p = first ? edge.points[0] : edge.points.at(-1);
      const key = `${first}:${(first ? edge.source : edge.target).element.id}:${p.x.toFixed(3)},${p.y.toFixed(3)}`;
      if (!stateGroups.has(key)) stateGroups.set(key, []);
      stateGroups.get(key).push({ edge, first });
    }
  }
  for (const group of stateGroups.values()) {
    if (group.length < 2) continue;
    const owner = group[0].edge.element.dataset.id;
    for (const { edge, first } of group) {
      edge.element.setAttribute(first ? "data-gptm-shared-start" : "data-gptm-shared-tip", owner);
      if (!first && edge !== group[0].edge) edge.element.removeAttribute("marker-end");
    }
  }
  svg.setAttribute("data-gptm-native-routes", String(edges.filter((e) => e.element.hasAttribute("data-gptm-native-rerouted")).length));
  const failedStateEdges = edges.filter((edge) => edge.state && edge.compatible && edge.source !== edge.target && !edge.element.hasAttribute("data-gptm-native-rerouted"));
  if (!options2.retry && failedStateEdges.length) {
    return routeNativeEdges(svg, { retry: true });
  }
}
var NS, EPS2, PORT_GAP, CLEARANCE, BEND_COST, STATE_PORT_LEAD, near, distance, horizontalSide, signOf, boxesOverlap;
var init_svg_routing = __esm({
  "src/svg-routing.js"() {
    init_path_intersections();
    NS = "http://www.w3.org/2000/svg";
    EPS2 = 0.05;
    PORT_GAP = 18;
    CLEARANCE = 10;
    BEND_COST = 22;
    STATE_PORT_LEAD = 40;
    near = (a, b) => Math.abs(a - b) < EPS2;
    distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    horizontalSide = (side) => side === "left" || side === "right";
    signOf = (side) => side === "left" || side === "top" ? -1 : 1;
    boxesOverlap = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
  }
});

// src/svg-labels.js
function isTriangleMarkerReference(value) {
  return TRIANGLE_MARKER_FAMILY_RE.test(String(value || ""));
}
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
function journeyTextMeasurer(text) {
  const style = getComputedStyle(text);
  const fallback = (value) => Math.max(1, Array.from(String(value)).length * (parseFloat(style.fontSize) || 14) * 0.58);
  if (typeof document === "undefined") return fallback;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return fallback;
    context.font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].filter(Boolean).join(" ");
    return (value) => {
      try {
        const width = context.measureText(String(value)).width;
        return Number.isFinite(width) ? width : fallback(value);
      } catch {
        return fallback(value);
      }
    };
  } catch {
    return fallback;
  }
}
function wrapJourneyText(input, maxWidth, measure, maxLines = 4) {
  const text = String(input ?? "").trim().replace(/\s+/g, " ");
  if (!text) return [];
  const width = Number(maxWidth);
  if (!(width > 0) || typeof measure !== "function") return [text];
  const fits = (value) => {
    try {
      return measure(value) <= width;
    } catch {
      return false;
    }
  };
  const splitWord = (word) => {
    const chunks = [];
    let chunk = "";
    for (const character of Array.from(word)) {
      const next = chunk + character;
      if (chunk && !fits(next)) {
        chunks.push(chunk);
        chunk = character;
      } else {
        chunk = next;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  };
  const lines = [];
  let current = "";
  let currentBreak = "";
  const flush = () => {
    if (current) lines.push({ text: current, breakBefore: currentBreak });
    current = "";
    currentBreak = "";
  };
  for (const word of text.split(" ")) {
    if (!word) continue;
    if (fits(word)) {
      if (!current) {
        current = word;
        currentBreak = lines.length ? " " : "";
        continue;
      }
      const candidate = `${current} ${word}`;
      if (fits(candidate)) {
        current = candidate;
        continue;
      }
      flush();
      current = word;
      currentBreak = " ";
      continue;
    }
    flush();
    const chunks = splitWord(word);
    const wordBreak = lines.length ? " " : "";
    for (let index = 0; index < chunks.length; index++) {
      if (index === chunks.length - 1) {
        current = chunks[index];
        currentBreak = index === 0 ? wordBreak : "";
      } else {
        lines.push({ text: chunks[index], breakBefore: index === 0 ? wordBreak : "" });
      }
    }
  }
  flush();
  const limit = Number(maxLines);
  if (Number.isFinite(limit) && limit > 0 && lines.length > limit) {
    const tailLines = lines.slice(limit - 1);
    const tail = tailLines.map((line, index) => `${index ? line.breakBefore : ""}${line.text}`).join("");
    lines.length = limit - 1;
    lines.push({ text: tail, breakBefore: tailLines[0].breakBefore });
  }
  return lines.map((line) => line.text);
}
function fitJourneyTask(text, variables) {
  if (!text.classList.contains("task")) return;
  const group = text.closest("switch")?.parentElement;
  const rect = group?.querySelector(":scope > rect");
  if (!rect) return;
  const rectBox = rect.getBBox();
  const textBox = text.getBBox();
  if (!(rectBox.width > 0 && rectBox.height > 0)) return;
  if (textBox.x >= rectBox.x - 1 && textBox.x + textBox.width <= rectBox.x + rectBox.width + 1 && textBox.y >= rectBox.y - 1 && textBox.y + textBox.height <= rectBox.y + rectBox.height + 1) return;
  const style = getComputedStyle(text);
  const originalFontSize = parseFloat(style.fontSize) || 14;
  const maxWidth = Math.max(1, rectBox.width - 10);
  const maxHeight = Math.max(1, rectBox.height - 8);
  const measure = journeyTextMeasurer(text);
  const lines = wrapJourneyText(text.textContent, maxWidth, measure, 4);
  if (!lines.length) return;
  const lineHeight = Math.max(1, Math.min(originalFontSize * 1.25, maxHeight / lines.length));
  const fontSize = Math.max(5, Math.min(originalFontSize, lineHeight / 1.25));
  text.style.setProperty("font-size", `${fontSize}px`, "important");
  const measureFitted = journeyTextMeasurer(text);
  const centerX = rectBox.x + rectBox.width / 2;
  const centerY = rectBox.y + rectBox.height / 2;
  const firstY = centerY - (lines.length - 1) * lineHeight / 2;
  text.setAttribute("x", String(centerX));
  text.setAttribute("y", String(centerY));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  while (text.firstChild) text.removeChild(text.firstChild);
  for (let index = 0; index < lines.length; index++) {
    const span = document.createElementNS(text.namespaceURI, "tspan");
    span.setAttribute("x", String(centerX));
    span.setAttribute("y", String(firstY + index * lineHeight));
    span.textContent = lines[index];
    const measured = Math.min(maxWidth, Math.max(1, measureFitted(lines[index])));
    span.setAttribute("textLength", String(measured));
    span.setAttribute("lengthAdjust", "spacingAndGlyphs");
    span.style.setProperty("fill", variables.textColor, "important");
    text.append(span);
  }
}
function journeyLabels(svg, variables) {
  for (const text of svg.querySelectorAll("text.journey-section, text.task")) {
    text.style.setProperty("fill", variables.textColor, "important");
    text.style.setProperty("font-family", variables.fontFamily);
    text.style.setProperty("font-weight", "600");
    for (const span of text.querySelectorAll("tspan")) span.style.setProperty("fill", variables.textColor, "important");
    fitJourneyTask(text, variables);
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
function arrowRegions(svg, edges) {
  const regions = [];
  const view = svg.viewBox.baseVal, canvas = Math.max(view.width, view.height);
  for (const edge of edges) for (const start of [true, false]) {
    const ref = edge.getAttribute(start ? "marker-start" : "marker-end");
    if (!ref || !isTriangleMarkerReference(ref)) continue;
    const length = edge.getTotalLength();
    if (!length) continue;
    const p = inSvg(svg, edge, edge.getPointAtLength(start ? 0 : length));
    const q = inSvg(svg, edge, edge.getPointAtLength(start ? Math.min(0.02, length) : Math.max(0, length - 0.02)));
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (!d) continue;
    const port = Number(edge.getAttribute("data-gptm-port-span")) || Infinity;
    const depth = Math.min(18, port * 1.25 * 0.7, Math.max(11, canvas / 100)) + 2;
    const vx = (q.x - p.x) / d, vy = (q.y - p.y) / d, half = depth / 2.5;
    const points = [
      p,
      { x: p.x + vx * depth + vy * half, y: p.y + vy * depth - vx * half },
      { x: p.x + vx * depth - vy * half, y: p.y + vy * depth + vx * half }
    ];
    regions.push({
      x: Math.min(...points.map((p2) => p2.x)),
      y: Math.min(...points.map((p2) => p2.y)),
      right: Math.max(...points.map((p2) => p2.x)),
      bottom: Math.max(...points.map((p2) => p2.y))
    });
  }
  return regions;
}
function placeEdgeLabels(svg) {
  const stateDiagram = Boolean(svg.querySelector("path.transition"));
  const paths = new Map([...svg.querySelectorAll("[data-id]")].filter((p) => p instanceof SVGGeometryElement).map((p) => [p.dataset.id, p]));
  const nodes = [...svg.querySelectorAll("g.node > .label-container, g.node > .outer-path")].map((n) => boundsInSvg(svg, n));
  const lines = [...paths.values()].map((edge) => {
    const length = edge.getTotalLength(), steps = Math.min(2e3, Math.max(2, Math.ceil(length / 3)));
    const points = Array.from({ length: steps + 1 }, (_, i) => inSvg(svg, edge, edge.getPointAtLength(length * i / steps)));
    return { edge, points };
  });
  const arrows = arrowRegions(svg, [...paths.values()]);
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
  const labelBoxes = new Map(labels.map((label) => [label, boundsInSvg(svg, label)]));
  labels.sort((a, b) => stateDiagram ? labelBoxes.get(b).width - labelBoxes.get(a).width || space.get(a) - space.get(b) : space.get(a) - space.get(b));
  for (const label of labels) {
    const id = label.querySelector("[data-id]")?.dataset.id || label.dataset.id;
    const edge = paths.get(id);
    if (!edge) continue;
    const box = labelBoxes.get(label), old = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (box.width === 0 || box.height === 0) continue;
    if (edge.hasAttribute("data-gptm-label-x") && edge.hasAttribute("data-gptm-label-y")) {
      const target2 = { x: Number(edge.getAttribute("data-gptm-label-x")), y: Number(edge.getAttribute("data-gptm-label-y")) };
      const proposed = { x: target2.x - box.width / 2, y: target2.y - box.height / 2, right: target2.x + box.width / 2, bottom: target2.y + box.height / 2 };
      if (![...arrows, ...nodes, ...occupied].some((region) => overlaps(proposed, region, 2))) {
        const before2 = fromSvg(svg, label.parentElement, old), after2 = fromSvg(svg, label.parentElement, target2);
        shift(label, after2.x - before2.x, after2.y - before2.y);
        label.setAttribute("data-gptm-label-edge", edge.id);
        occupied.push({ ...proposed, label: true });
        continue;
      }
      edge.removeAttribute("data-gptm-label-x");
      edge.removeAttribute("data-gptm-label-y");
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
      const collision = nodes.filter((n) => overlaps(proposed, n)).length + occupied.filter((n) => overlaps(proposed, n, stateDiagram ? 1 : 5)).length;
      const arrowCollision = arrows.filter((n) => overlaps(proposed, n, 2)).length;
      const foreign = lines.filter((line) => line.edge !== edge && line.points.some((p) => stateDiagram ? p.x > proposed.x + 0.5 && p.x < proposed.right - 0.5 && p.y > proposed.y + 0.5 && p.y < proposed.bottom - 0.5 : p.x > proposed.x - 2 && p.x < proposed.right + 2 && p.y > proposed.y - 2 && p.y < proposed.bottom + 2)).length;
      const nearEnd = Math.min(offset, length - offset) < Math.max(box.width, box.height) / 2 + 16;
      candidates.push({ point, proposed, score: collision * 1e6 + arrowCollision * 1e6 + foreign * 1e5 + (nearEnd ? 1e4 : 0) + diagonal * 20 + Math.hypot(point.x - old.x, point.y - old.y) });
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
    occupied.push({ ...target.proposed, label: true });
  }
  const placed = (stateDiagram ? labels : []).map((label) => {
    const id = label.querySelector("[data-id]")?.dataset.id || label.dataset.id;
    return { label, edge: paths.get(id), box: boundsInSvg(svg, label) };
  }).filter((item) => item.edge && item.label.textContent.trim());
  const boxConflict = (a, b) => a.x < b.right + 1 && a.right > b.x - 1 && a.y < b.bottom + 1 && a.bottom > b.y - 1;
  for (let pass = 0; pass < 2; pass++) {
    let changed = false;
    for (const item of placed) {
      const conflicts = placed.filter((other) => other !== item && boxConflict(item.box, other.box)).length;
      if (!conflicts) continue;
      const length = item.edge.getTotalLength(), steps = Math.min(1200, Math.max(20, Math.ceil(length / 4)));
      const old = { x: (item.box.x + item.box.right) / 2, y: (item.box.y + item.box.bottom) / 2 };
      let best = null;
      for (let index = 1; index < steps; index++) {
        const point = inSvg(svg, item.edge, item.edge.getPointAtLength(length * index / steps));
        const proposed = {
          x: point.x - item.box.width / 2,
          y: point.y - item.box.height / 2,
          right: point.x + item.box.width / 2,
          bottom: point.y + item.box.height / 2
        };
        if (nodes.some((box) => overlaps(proposed, box)) || arrows.some((box) => overlaps(proposed, box, 2))) continue;
        const nextConflicts = placed.filter((other) => other !== item && boxConflict(proposed, other.box)).length;
        if (nextConflicts >= conflicts) continue;
        const foreign = lines.filter((line) => line.edge !== item.edge && line.points.some((p) => p.x > proposed.x + 0.5 && p.x < proposed.right - 0.5 && p.y > proposed.y + 0.5 && p.y < proposed.bottom - 0.5)).length;
        const score = nextConflicts * 1e6 + foreign * 1e5 + Math.hypot(point.x - old.x, point.y - old.y);
        if (!best || score < best.score) best = { point, proposed, score };
      }
      if (!best) continue;
      const before = fromSvg(svg, item.label.parentElement, old);
      const after = fromSvg(svg, item.label.parentElement, best.point);
      shift(item.label, after.x - before.x, after.y - before.y);
      item.box = best.proposed;
      item.label.setAttribute("data-gptm-label-edge", item.edge.id);
      changed = true;
    }
    if (!changed) break;
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
var TRIANGLE_MARKER_FAMILY_RE;
var init_svg_labels = __esm({
  "src/svg-labels.js"() {
    init_svg_routing();
    TRIANGLE_MARKER_FAMILY_RE = /(?:point(?:Start|End)(?:-margin)?|barbEnd|(?:^|-)arrowhead|filled-head|stick-arrowhead|solidTopArrowHead|solidBottomArrowHead|requirement_arrowEnd|classDiagram-(?:dependency|extension)(?:Start|End)(?:-margin)?)/;
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
function arrowCoveredLength(edge, length, depth, start) {
  if (!depth || typeof edge.getPointAtLength !== "function") return depth;
  const point = (distance2) => {
    const p = edge.getPointAtLength(start ? distance2 : length - distance2);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error("invalid SVG point");
    return p;
  };
  const tip = point(0), adjacent = point(Math.min(0.02, length));
  const magnitude = Math.hypot(adjacent.x - tip.x, adjacent.y - tip.y);
  if (!magnitude) return depth;
  const v = { x: (adjacent.x - tip.x) / magnitude, y: (adjacent.y - tip.y) / magnitude };
  const inside = (distance2) => {
    const p = point(distance2), dx = p.x - tip.x, dy = p.y - tip.y;
    const along = dx * v.x + dy * v.y, across = dx * v.y - dy * v.x;
    return along >= -1e-5 && along <= depth && Math.abs(across) <= along * 0.4 + 1e-4;
  };
  const limit = length, steps = Math.min(16384, Math.max(16, Math.ceil(limit / 0.25)));
  let lo = 0;
  for (let i = 1; i <= steps; i++) {
    let hi = limit * i / steps;
    if (inside(hi)) {
      lo = hi;
      continue;
    }
    for (let j = 0; j < 22; j++) {
      const mid = (lo + hi) / 2;
      if (inside(mid)) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }
  return length;
}
function connectTerminalSegments(segments2, length, head, tail, contact) {
  const end = length - tail;
  if (head >= end) return segments2;
  const all = segments2.slice();
  if (head > 0) all.push([head, Math.min(end, head + contact)]);
  if (tail > 0) all.push([Math.max(head, end - contact), end]);
  all.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const segment of all) {
    if (merged.length && segment[0] <= merged.at(-1)[1]) merged.at(-1)[1] = Math.max(merged.at(-1)[1], segment[1]);
    else merged.push(segment.slice());
  }
  return merged;
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
    const headDepth = triangleDepth(svg, edge, "start");
    const sharedId = edge.getAttribute("data-gptm-shared-tip");
    const shared = sharedId ? byId.get(sharedId) : null;
    const tailDepth = triangleDepth(svg, shared || edge, "end");
    if (!(headDepth > 0 || tailDepth > 0)) continue;
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
    let head, tail;
    try {
      head = arrowCoveredLength(edge, length, headDepth, true);
      tail = arrowCoveredLength(edge, length, tailDepth, false);
      if (head > 0 && head < length) head = Math.max(0, head - Math.min(SHAFT_BASE_OVERLAP, head * 0.08));
      if (tail > 0 && tail < length) tail = Math.max(0, tail - Math.min(SHAFT_BASE_OVERLAP, tail * 0.08));
    } catch {
      skip("geometry-unavailable");
      continue;
    }
    let segments2 = clippedSegments(length, head, tail, dash.pattern, dash.offset);
    if (segments2 === null) {
      skip("dash-segment-budget");
      continue;
    }
    const contact = Math.max(SHAFT_TERMINAL_CONTACT, (parseFloat(style.strokeWidth) || 1.6) * 1.5);
    segments2 = connectTerminalSegments(segments2, length, head, tail, contact);
    edge.style.setProperty("stroke-dasharray", encodeSegments(segments2, length, scale), "important");
    edge.style.setProperty("stroke-dashoffset", "0", "important");
    edge.style.setProperty("stroke-linecap", "butt", "important");
    report.trimmed++;
  }
  return report;
}
var SHAFT_MAX_SEGMENTS, SHAFT_LENGTH_RE, SHAFT_TRIANGLE_RE, SHAFT_TERMINAL_CONTACT, SHAFT_BASE_OVERLAP;
var init_svg_shaft = __esm({
  "src/svg-shaft.js"() {
    SHAFT_MAX_SEGMENTS = 16384;
    SHAFT_LENGTH_RE = /^([-+]?(?:\d*\.?\d+|\d+\.?\d*)(?:e[-+]?\d+)?)(px|%)?$/i;
    SHAFT_TRIANGLE_RE = /^\s*M\s*0[\s,]+0\s*L\s*10[\s,]+4\s*L\s*0[\s,]+8\s*Z\s*$/i;
    SHAFT_TERMINAL_CONTACT = 3;
    SHAFT_BASE_OVERLAP = 0.4;
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
  const boundaryTitles = [...svg.querySelectorAll("g > text")].filter(
    (text) => !text.closest(".node") && text.parentElement.querySelector(":scope > rect") && text.textContent.trim()
  ).map((text) => boundsInSvg(svg, text));
  for (const group of new Set([...svg.querySelectorAll("g > text")].filter(
    (text) => !text.closest(".node") && text.parentElement.querySelector(":scope > rect") && text.textContent.trim()
  ).map((text) => text.parentElement))) {
    group.setAttribute("data-gptm-c4-boundary", "true");
    const classes = (group.getAttribute("class") || "").split(/\s+/).filter(Boolean);
    if (!classes.includes("c4-boundary")) group.setAttribute("class", [...classes, "c4-boundary"].join(" "));
  }
  const records = graph.c4Relations.map((model, index) => ({
    model,
    index,
    source: nodes.get(model.from),
    target: nodes.get(model.to)
  }));
  const boundaryDistance2 = (p, b) => Math.min(
    Math.abs(p.x - b.x),
    Math.abs(p.x - b.right),
    Math.abs(p.y - b.y),
    Math.abs(p.y - b.bottom)
  );
  const used = /* @__PURE__ */ new Set(), matched = [], skipped = [];
  const candidates = [];
  for (const record of records) {
    if (!record.source || !record.target) continue;
    const cap = Math.hypot(record.source.box.width, record.source.box.height) + Math.hypot(record.target.box.width, record.target.box.height) + 24;
    for (let index = 0; index < elements.length; index++) {
      const original = elements[index];
      let length;
      try {
        length = original.getTotalLength();
      } catch {
        continue;
      }
      if (!Number.isFinite(length)) continue;
      const start = inSvg(svg, original, original.getPointAtLength(0));
      const end = inSvg(svg, original, original.getPointAtLength(length));
      const startGap = boundaryDistance2(start, record.source.box);
      const endGap = boundaryDistance2(end, record.target.box);
      const score = startGap + endGap;
      if (!Number.isFinite(score) || score > cap) continue;
      candidates.push({ record, index, original, score, length, start, end });
    }
  }
  candidates.sort((a, b) => a.score - b.score || a.record.index - b.record.index || a.index - b.index);
  const matchedRecords = /* @__PURE__ */ new Set();
  for (const candidate of candidates) {
    if (matchedRecords.has(candidate.record.index) || used.has(candidate.index)) continue;
    used.add(candidate.index);
    matchedRecords.add(candidate.record.index);
    matched.push({ ...candidate.record, ...candidate });
  }
  for (const record of records) if (!matchedRecords.has(record.index)) skipped.push(record);
  svg.setAttribute("data-gptm-c4-expected", String(records.length));
  svg.setAttribute("data-gptm-expected-edges", String(records.length));
  svg.setAttribute("data-gptm-skipped-edges", String(skipped.length));
  svg.setAttribute("data-gptm-c4-skipped-relations", skipped.map((record) => record.index).join(","));
  let rerouted = 0;
  for (const { original, model, index, source, target, length, start, end } of matched) {
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
      if (!route) continue;
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
    edge.setAttribute("data-gptm-c4-relation", "true");
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
  }
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
function optionsFor(options2) {
  const input = options2 && typeof options2 === "object" ? options2 : {};
  const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
  return {
    enabled: options2 !== false && input.enabled !== false,
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
function planAdaptiveFlowLayout(graph, options2) {
  const config = optionsFor(options2);
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
function applyAdaptiveFlowLayout(svg, graph, options2) {
  const base = { status: "unchanged", reason: "disabled", rows: 1, columns: 1 };
  if (!optionsFor(options2).enabled) return publish(svg, base);
  if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.edges)) {
    return publish(svg, { ...base, status: "unsupported", reason: "missing-graph-metadata" });
  }
  if (graph.nodes.some((node) => node.isGroup || node.parentId != null)) {
    return publish(svg, { ...base, status: "unsupported", reason: "subgraph-layout" });
  }
  try {
    const nodeElements = [...svg.querySelectorAll("g.node")];
    const edgeElements2 = [...svg.querySelectorAll("path[data-edge='true']")];
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
      const matches = edgeElements2.filter((element2) => element2.getAttribute("data-id") === edge.id);
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
    if (nodeElements.length !== nodes.length || edgeElements2.length !== edges.length) {
      throw new Error("unmapped-graph-elements");
    }
    const plan = planAdaptiveFlowLayout({ ...graph, nodes, edges }, options2);
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

// src/planar-layout.js
function solve(matrix, values) {
  const rows = matrix.map((row, i) => [...row, values[i]]);
  for (let k = 0; k < rows.length; k++) {
    let pivot = k;
    for (let i = k + 1; i < rows.length; i++) if (Math.abs(rows[i][k]) > Math.abs(rows[pivot][k])) pivot = i;
    if (Math.abs(rows[pivot][k]) < 1e-9) return null;
    [rows[k], rows[pivot]] = [rows[pivot], rows[k]];
    const value = rows[k][k];
    for (let j = k; j <= rows.length; j++) rows[k][j] /= value;
    for (let i = 0; i < rows.length; i++) if (i !== k) {
      const multiple = rows[i][k];
      for (let j = k; j <= rows.length; j++) rows[i][j] -= rows[k][j] * multiple;
    }
  }
  return rows.map((row) => row.at(-1));
}
function simpleCycles(ids, neighbors) {
  const index = new Map(ids.map((id, i) => [id, i])), cycles = [], seen = /* @__PURE__ */ new Set();
  let budget = 12e3;
  for (const start of ids) {
    const visit = (path, used) => {
      if (--budget < 0 || cycles.length >= 256) return;
      const last = path.at(-1);
      for (const next of neighbors.get(last)) {
        if (next === start && path.length >= 3) {
          const forward = path.map((id) => index.get(id)), backward = [forward[0], ...forward.slice(1).reverse()];
          const key = [forward.join(","), backward.join(",")].sort()[0];
          if (!seen.has(key)) {
            seen.add(key);
            cycles.push(path.slice());
          }
        } else if (!used.has(next) && index.get(next) > index.get(start)) {
          used.add(next);
          path.push(next);
          visit(path, used);
          path.pop();
          used.delete(next);
        }
      }
    };
    visit([start], /* @__PURE__ */ new Set([start]));
  }
  return cycles.sort((a, b) => b.length - a.length);
}
function planarPositions(positions, links) {
  if ([...positions.values()].some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false;
  for (const [id, p] of positions) for (const [other, q] of positions) {
    if (id !== other && Math.hypot(p.x - q.x, p.y - q.y) < 1e-5) return false;
  }
  for (let i = 0; i < links.length; i++) {
    const [a, b] = links[i], p = positions.get(a), q = positions.get(b);
    for (const [id, r] of positions) {
      if (id === a || id === b) continue;
      const dx = q.x - p.x, dy = q.y - p.y, dot = (r.x - p.x) * dx + (r.y - p.y) * dy;
      if (Math.abs(dx * (r.y - p.y) - dy * (r.x - p.x)) < 1e-7 && dot > 0 && dot < dx * dx + dy * dy) return false;
    }
    for (let j = i + 1; j < links.length; j++) {
      const [c, d] = links[j], hit = segmentIntersection(p, q, positions.get(c), positions.get(d));
      if (!hit) continue;
      if (![a, b].some((id) => id === c || id === d) || hit.kind !== "touch") return false;
    }
  }
  return true;
}
function connectedComponents(ids, neighbors) {
  const seen = /* @__PURE__ */ new Set(), components = [];
  for (const start of ids) {
    if (seen.has(start)) continue;
    const component = [], queue = [start];
    seen.add(start);
    for (let index = 0; index < queue.length; index++) {
      const id = queue[index];
      component.push(id);
      for (const next of neighbors.get(id)) if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
    components.push(component);
  }
  return components;
}
function addCycleEdges(target, cycle) {
  for (let index = 0; index < cycle.length; index++) {
    const a = cycle[index], b = cycle[(index + 1) % cycle.length];
    target.add([a, b].sort().join("\0"));
  }
}
function cycleTreePositions(component, neighbors, links, cycles) {
  for (const cycle of cycles) {
    if (!cycle.every((id) => component.includes(id))) continue;
    const boundary = new Set(cycle);
    const external = component.filter((id) => !boundary.has(id));
    if (links.length !== cycle.length + external.length) continue;
    const parent = /* @__PURE__ */ new Map(), visited = new Set(cycle), queue = cycle.slice();
    for (let index = 0; index < queue.length; index++) {
      const id = queue[index];
      for (const next of neighbors.get(id)) {
        if (visited.has(next)) continue;
        visited.add(next);
        parent.set(next, id);
        queue.push(next);
      }
    }
    if (visited.size !== component.length) continue;
    const children = new Map(component.map((id) => [id, []]));
    for (const [id, owner] of parent) children.get(owner).push(id);
    const position = new Map(cycle.map((id, index) => {
      const angle = Math.PI * 2 * index / cycle.length - Math.PI / 2;
      return [id, { x: Math.cos(angle), y: Math.sin(angle) }];
    }));
    const placeChildren = (owner, direction) => {
      const list = children.get(owner) || [];
      for (let index = 0; index < list.length; index++) {
        const id = list[index], spread = list.length > 1 ? 0.35 : 0;
        const baseAngle = Math.atan2(direction.y, direction.x) + (index - (list.length - 1) / 2) * spread;
        const point = {
          x: position.get(owner).x + Math.cos(baseAngle) * 1.15,
          y: position.get(owner).y + Math.sin(baseAngle) * 1.15
        };
        position.set(id, point);
        const length = Math.hypot(point.x - position.get(owner).x, point.y - position.get(owner).y) || 1;
        placeChildren(id, {
          x: (point.x - position.get(owner).x) / length,
          y: (point.y - position.get(owner).y) / length
        });
      }
    };
    for (const id of cycle) {
      const point = position.get(id), length = Math.hypot(point.x, point.y) || 1;
      placeChildren(id, { x: point.x / length, y: point.y / length });
    }
    if (planarPositions(position, links)) return position;
  }
  return null;
}
function cyclePairPositions(component, links, cycles) {
  for (let i = 0; i < cycles.length; i++) for (let j = i + 1; j < cycles.length; j++) {
    const a = cycles[i], b = cycles[j];
    if (!a.every((id) => component.includes(id)) || !b.every((id) => component.includes(id))) continue;
    const shared = a.filter((id) => b.includes(id));
    if (shared.length !== 1) continue;
    const cycleEdges = /* @__PURE__ */ new Set();
    addCycleEdges(cycleEdges, a);
    addCycleEdges(cycleEdges, b);
    if (cycleEdges.size !== links.length) continue;
    const joint = shared[0], position = /* @__PURE__ */ new Map([[joint, { x: 0, y: 0 }]]);
    const placeCycle = (cycle, direction) => {
      const order = [joint, ...cycle.filter((id) => id !== joint)];
      const others = order.slice(1);
      for (let index = 0; index < others.length; index++) {
        const angle = Math.PI / 2 - Math.PI * index / Math.max(1, others.length - 1);
        position.set(others[index], {
          x: direction * 1.5 + Math.cos(angle),
          y: Math.sin(angle)
        });
      }
    };
    placeCycle(a, -1);
    placeCycle(b, 1);
    if (planarPositions(position, links)) return position;
  }
  return null;
}
function structuralCandidates(ids, neighbors, links, cycles) {
  if (!Number.isFinite(Math.sin(0.37)) || !Number.isFinite(Math.cos(0.37))) return [];
  const components = connectedComponents(ids, neighbors);
  const nonTrivial = components.filter((component) => component.length > 1);
  if (nonTrivial.length > 1) return [];
  let position = /* @__PURE__ */ new Map();
  if (nonTrivial.length) {
    const component = nonTrivial[0];
    position = cycleTreePositions(component, neighbors, links, cycles) || cyclePairPositions(component, links, cycles);
    if (!position) return [];
  }
  const isolated = ids.filter((id) => !nonTrivial.some((component) => component.includes(id)));
  isolated.forEach((id, index) => position.set(id, { x: -4 - index * 2, y: -4 }));
  return position.size && planarPositions(position, links) ? [position] : [];
}
function planarLayoutCandidates(nodes, edges) {
  if (!Array.isArray(nodes) || !Array.isArray(edges) || nodes.some((node) => !node || typeof node.id !== "string" || !node.id) || new Set(nodes.map((node) => node.id)).size !== nodes.length || edges.some((edge) => !edge || typeof edge.source !== "string" || typeof edge.target !== "string")) return [];
  if (nodes.length < 3 || nodes.length > 32 || edges.length > 48) return [];
  const ids = nodes.map((node) => node.id), known = new Set(ids), keys = /* @__PURE__ */ new Set(), links = [];
  const neighbors = new Map(ids.map((id) => [id, /* @__PURE__ */ new Set()]));
  for (const edge of edges) {
    if (!known.has(edge.source) || !known.has(edge.target) || edge.source === edge.target) return [];
    const key = [edge.source, edge.target].sort().join("\0");
    if (keys.has(key)) return [];
    keys.add(key);
    links.push([edge.source, edge.target]);
    neighbors.get(edge.source).add(edge.target);
    neighbors.get(edge.target).add(edge.source);
  }
  const candidates = [];
  const cycles = simpleCycles(ids, neighbors);
  for (const cycle of cycles) {
    const boundary = new Set(cycle), internal = ids.filter((id) => !boundary.has(id));
    const position = new Map(cycle.map((id, index) => {
      const angle = Math.PI * 2 * index / cycle.length - Math.PI / 2;
      return [id, { x: Math.cos(angle), y: Math.sin(angle) }];
    }));
    const matrix = internal.map((id, i) => internal.map((other, j) => i === j ? neighbors.get(id).size : neighbors.get(id).has(other) ? -1 : 0));
    const coordinates = ["x", "y"].map((axis) => solve(matrix, internal.map((id) => [...neighbors.get(id)].filter((next) => boundary.has(next)).reduce((sum, next) => sum + position.get(next)[axis], 0))));
    if (coordinates.some((value) => value === null)) continue;
    internal.forEach((id, index) => position.set(id, { x: coordinates[0][index], y: coordinates[1][index] }));
    if (!planarPositions(position, links)) continue;
    candidates.push(position);
    if (candidates.length >= 6) break;
  }
  const seen = new Set(candidates.map((positions) => JSON.stringify([...positions])));
  for (const position of structuralCandidates(ids, neighbors, links, cycles)) {
    const key = JSON.stringify([...position]);
    if (seen.has(key)) continue;
    candidates.push(position);
    seen.add(key);
    if (candidates.length >= 6) break;
  }
  return candidates;
}
var init_planar_layout = __esm({
  "src/planar-layout.js"() {
    init_path_intersections();
  }
});

// src/svg-crossings.js
function segmentData(edge) {
  const cached = SEGMENT_DATA.get(edge);
  if (cached?.points === edge.points) return cached;
  const list = segments(edge.points);
  const data = {
    points: edge.points,
    list,
    boxes: list.map(([p, q]) => boxOf([p, q]))
  };
  SEGMENT_DATA.set(edge, data);
  return data;
}
function pointMapper(svg, element) {
  try {
    const elementMatrix = element.getScreenCTM?.();
    const svgInverse = svg.getScreenCTM?.()?.inverse?.();
    if (elementMatrix && svgInverse && typeof DOMPoint === "function") {
      return (point) => new DOMPoint(point.x, point.y).matrixTransform(elementMatrix).matrixTransform(svgInverse);
    }
  } catch {
  }
  return (point) => inSvg(svg, element, point);
}
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
function pathCommandHints(element) {
  const data = element.getAttribute?.("d") || "";
  const tokens = data.match(/[MLHVCSQTAZmlhvcsqtaz]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g) || [];
  const counts = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6, S: 4, T: 2, A: 7, Z: 0 };
  let x = 0, y = 0, startX = 0, startY = 0, total = 0, command = null, i = 0, started = false;
  const hints = [];
  const endpoint = (values, relative) => ({
    x: values[0] + (relative ? x : 0),
    y: values[1] + (relative ? y : 0)
  });
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    if (!command) return [];
    const type = command.toUpperCase(), relative = command !== type;
    if (type === "Z") {
      total += Math.hypot(startX - x, startY - y);
      x = startX;
      y = startY;
      command = null;
      hints.push({ position: total, move: false });
      continue;
    }
    const count = counts[type];
    if (!count || i + count > tokens.length) break;
    const values = tokens.slice(i, i + count).map(Number);
    if (values.some((value) => !Number.isFinite(value))) return [];
    i += count;
    let nx = x, ny = y;
    if (type === "M" || type === "L") {
      const point = endpoint(values, relative);
      nx = point.x;
      ny = point.y;
      if (type === "M") {
        startX = nx;
        startY = ny;
        if (started) hints.push({ position: total, move: true });
        started = true;
        command = relative ? "l" : "L";
        x = nx;
        y = ny;
        continue;
      }
    } else if (type === "H") {
      nx = values[0] + (relative ? x : 0);
    } else if (type === "V") {
      ny = values[0] + (relative ? y : 0);
    } else {
      const point = endpoint(values.slice(-2), relative);
      nx = point.x;
      ny = point.y;
    }
    total += Math.hypot(nx - x, ny - y);
    hints.push({ position: total, move: false });
    x = nx;
    y = ny;
  }
  return hints.filter((hint) => Number.isFinite(hint.position) && hint.position >= 0);
}
function sampleEdge(svg, element) {
  const mapPoint = pointMapper(svg, element);
  const explicit = flattenPath(element);
  if (explicit) return explicit.map((point) => {
    const p = mapPoint(point);
    return { x: p.x, y: p.y, ...point.move ? { move: true } : {} };
  });
  const length = element.getTotalLength();
  if (!Number.isFinite(length) || length <= 0) return [];
  const MAX_SAMPLE_POINTS = 32768;
  const hints = pathCommandHints(element);
  const hintPositions = [...new Set(hints.map((hint) => hint.position).filter((position) => Number.isFinite(position) && position >= 0 && position <= length))];
  const positions = /* @__PURE__ */ new Set([0, length]);
  const addPosition = (value) => {
    if (positions.size >= MAX_SAMPLE_POINTS) return;
    const position = Math.max(0, Math.min(length, Number(value)));
    if (Number.isFinite(position)) positions.add(position);
  };
  const baseSteps = Math.min(
    4096,
    Math.max(32, Math.ceil(length / 64)),
    Math.max(8, MAX_SAMPLE_POINTS - hintPositions.length)
  );
  for (let i = 0; i <= baseSteps; i++) addPosition(length * i / baseSteps);
  for (const position of hintPositions) addPosition(position);
  const seed = [...positions].sort((a, b) => a - b);
  for (let i = 1; i < seed.length && positions.size < MAX_SAMPLE_POINTS; i++) {
    const from = seed[i - 1], to = seed[i];
    for (const fraction of [0.25, 0.5, 0.75]) addPosition(from + (to - from) * fraction);
  }
  const ordered = [...positions].sort((a, b) => a - b);
  const movePositions = new Set(hints.filter((hint) => hint.move).map((hint) => hint.position));
  const input = ordered.map((position) => {
    const p = mapPoint(element.getPointAtLength(position));
    return { x: p.x, y: p.y, ...movePositions.has(position) ? { move: true } : {} };
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
  const jumpLimit = Math.max(4, length / 4096);
  const ranges = [];
  let rangeStart = 0;
  for (let i = 1; i < input.length; i++) {
    if (input[i].move || norm(input[i - 1], input[i]) > jumpLimit) {
      ranges.push([rangeStart, i - 1]);
      rangeStart = i;
    }
  }
  ranges.push([rangeStart, input.length - 1]);
  const result = [];
  for (const [lo, hi] of ranges) {
    const part = reduce(lo, hi);
    if (result.length && part.length) part[0] = { ...part[0], move: true };
    result.push(...part);
  }
  return result;
}
function edgeElements(svg) {
  const c4Expected = Number(svg.getAttribute?.("data-gptm-c4-expected")) || 0;
  return [...svg.querySelectorAll(EDGE_SELECTOR)].filter((element) => !element.closest("defs,marker") && typeof element.getTotalLength === "function" && (!c4Expected || element.getAttribute("data-gptm-c4-relation") === "true"));
}
function edgeSnapshot(svg, element, semanticNodes2) {
  const points = sampleEdge(svg, element);
  if (points.length < 2) return null;
  const mapPoint = pointMapper(svg, element);
  const source = element.dataset.gptmSource || semanticNodes2.get(element.dataset.source);
  const target = element.dataset.gptmTarget || semanticNodes2.get(element.dataset.target);
  if (source && target) {
    element.setAttribute("data-gptm-source", source);
    element.setAttribute("data-gptm-target", target);
  }
  return {
    element,
    id: element.dataset.id || element.id,
    points,
    controls: readPoints(element)?.map((p) => {
      const q = mapPoint(p);
      return { x: q.x, y: q.y };
    }),
    source,
    target,
    shared: element.dataset.gptmSharedTip,
    sharedStart: element.dataset.gptmSharedStart,
    box: boxOf(points)
  };
}
function semanticNodes(svg) {
  return new Map([...svg.querySelectorAll("g.node[data-id]")].map((node) => [node.dataset.id, node.id]));
}
function collectEdges(svg) {
  const nodes = semanticNodes(svg);
  return edgeElements(svg).map((element) => edgeSnapshot(svg, element, nodes)).filter(Boolean);
}
function createRoutingContext(svg) {
  const nodes = semanticNodes(svg);
  let edges = null;
  let model = null;
  let edgeById = /* @__PURE__ */ new Map();
  let labelById = /* @__PURE__ */ new Map();
  const getEdges = () => {
    if (edges) return edges;
    edges = edgeElements(svg).map((element) => edgeSnapshot(svg, element, nodes)).filter(Boolean);
    edgeById = new Map(edges.map((edge) => [edge.id, edge]));
    return edges;
  };
  const getModel = () => {
    if (model) return model;
    model = geometry(svg);
    labelById = new Map(model.labels.map((label) => [label.id, label]));
    return model;
  };
  return {
    edges: getEdges,
    model: getModel,
    findEdge(id) {
      getEdges();
      return edgeById.get(id);
    },
    labelFor(id) {
      getModel();
      return labelById.get(id);
    },
    refreshEdge(id) {
      if (!edges) return null;
      const index = edges.findIndex((edge) => edge.id === id);
      if (index < 0) return null;
      const fresh = edgeSnapshot(svg, edges[index].element, nodes);
      if (fresh) {
        edges[index] = fresh;
        edgeById.set(id, fresh);
      } else {
        edges.splice(index, 1);
        edgeById.delete(id);
      }
      return fresh;
    },
    invalidateModel() {
      model = null;
      labelById = /* @__PURE__ */ new Map();
    },
    invalidateAll() {
      edges = null;
      model = null;
      edgeById = /* @__PURE__ */ new Map();
      labelById = /* @__PURE__ */ new Map();
    }
  };
}
function allowedJunction(a, b, hit) {
  if (a.sharedStart && a.sharedStart === b.sharedStart && a.source && a.source === b.source) {
    const reversed = (edge) => ({
      ...edge,
      source: edge.target,
      target: edge.source,
      points: edge.points.slice().reverse(),
      shared: edge.sharedStart,
      sharedStart: null
    });
    if (allowedJunction(reversed(a), reversed(b), hit)) return true;
  }
  if (a.shared && a.shared === b.shared && a.target && b.target && a.target === b.target) {
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
      if (ownerA && ownerA === ownerB && hit.kind === "touch" && norm(p, hit) < 0.05 && norm(q, hit) < 0.05) return true;
    }
  }
  return false;
}
function selfIntersectionHits(points) {
  const list = segments(points), hits = [];
  const start = points[0], end = points.at(-1);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const [p, q] = list[i], [r, s] = list[j];
    if (!overlaps2(boxOf([p, q]), boxOf([r, s]))) continue;
    const hit = segmentIntersection(p, q, r, s);
    if (!hit) continue;
    if (j === i + 1 && hit.kind === "touch") continue;
    if (hit.kind === "touch" && norm(start, end) < 0.05 && norm(start, hit) < 0.05) continue;
    if (!hits.some((other) => norm(other, hit) < 1)) hits.push(hit);
  }
  return hits;
}
function crossingPairs(edges) {
  const pairs = [];
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const a = edges[i], b = edges[j];
    if (!overlaps2(a.box, b.box)) continue;
    const hits = [];
    const dataA = segmentData(a), dataB = segmentData(b);
    for (let ai = 0; ai < dataA.list.length; ai++) for (let bi = 0; bi < dataB.list.length; bi++) {
      const [p, q] = dataA.list[ai], [r, s] = dataB.list[bi];
      if (!overlaps2(dataA.boxes[ai], dataB.boxes[bi])) continue;
      const hit = segmentIntersection(p, q, r, s);
      if (hit && !allowedJunction(a, b, hit) && !hits.some((h) => norm(h, hit) < 1)) hits.push(hit);
    }
    if (hits.length) pairs.push({ a: a.id, b: b.id, hits });
  }
  for (const edge of edges) {
    const hits = selfIntersectionHits(edge.points);
    if (hits.length) pairs.push({ a: edge.id, b: edge.id, hits, self: true });
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
function coveredArrow(svg, edge, model) {
  if (!triangleCompatible(edge.element)) return false;
  for (const start of [true, false]) {
    if (!edge.element.hasAttribute(start ? "marker-start" : "marker-end")) continue;
    const owner = model.nodes.find((n) => n.id === (start ? edge.source : edge.target));
    if (!owner) continue;
    const shape = nodeShape(owner.element);
    const shapes = shape instanceof SVGGeometryElement ? [shape] : [...shape.querySelectorAll("path,rect,circle,ellipse,polygon")];
    const pathLength = edge.element.getTotalLength();
    const tip = inSvg(svg, edge.element, edge.element.getPointAtLength(start ? 0 : pathLength));
    const q = inSvg(svg, edge.element, edge.element.getPointAtLength(start ? Math.min(0.02, pathLength) : Math.max(0, pathLength - 0.02)));
    const magnitude = norm(tip, q);
    if (!magnitude) continue;
    const v = { x: (q.x - tip.x) / magnitude, y: (q.y - tip.y) / magnitude };
    const depth = Math.min(
      18,
      (Number(edge.element.dataset.gptmPortSpan) || Infinity) * 0.875,
      Math.max(11, Math.max(svg.viewBox.baseVal.width, svg.viewBox.baseVal.height) / 100)
    );
    for (const t of [0.15, 0.4, 0.8]) for (const across of [-0.8, 0, 0.8]) {
      const p = {
        x: tip.x + v.x * depth * t - v.y * depth * 0.4 * t * across,
        y: tip.y + v.y * depth * t + v.x * depth * 0.4 * t * across
      };
      if (shapes.some((shape2) => {
        const q2 = fromSvg(svg, shape2, p), style = getComputedStyle(shape2);
        return style.fill !== "none" && shape2.isPointInFill(q2) || style.stroke !== "none" && shape2.isPointInStroke(q2);
      })) return true;
    }
  }
  return false;
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
  const labels = [
    ...svg.querySelectorAll("g.edgeLabel"),
    ...svg.querySelectorAll("[data-gptm-c4-boundary] > text")
  ].filter((l) => String(l.textContent || "").trim()).map((element) => ({
    element,
    id: element.querySelector("[data-id]")?.dataset.id || element.dataset.id,
    box: boundsInSvg(svg, element)
  }));
  return { nodes, labels };
}
function applyReservation(svg, edge, reservation, context = null) {
  if (!reservation) return;
  edge.element.setAttribute("data-gptm-label-x", String(reservation.x));
  edge.element.setAttribute("data-gptm-label-y", String(reservation.y));
  const label = context ? context.labelFor(edge.id) : geometry(svg).labels.find((item) => item.id === edge.id);
  if (!label) return;
  translateInRoot(
    svg,
    label.element,
    reservation.x - (label.box.x + label.box.right) / 2,
    reservation.y - (label.box.y + label.box.bottom) / 2
  );
  label.box = boundsInSvg(svg, label.element);
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
  const options2 = starts.flatMap((a) => ends.map((b) => ({ a, b, estimate: norm(a.lead, b.lead) + (a.penalty + b.penalty) * 0.2 }))).sort((a, b) => a.estimate - b.estimate);
  let best;
  let labelSearches = 0;
  for (const { a, b } of options2.slice(0, 12)) {
    if (budget && budget.remaining <= 0) break;
    const blocked2 = (p, q) => segmentBlocked(p, q, foreignBoxes) || walls.some(([r, s]) => segmentIntersection(p, q, r, s));
    if (blocked2(a.anchor, a.lead) || blocked2(b.lead, b.anchor)) continue;
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
      if (blocked2(enter, exit)) continue;
      const before = orthogonalRoute(a.lead, enter, boxes, GAP, [], { ...directions, end: v });
      const after = orthogonalRoute(exit, b.lead, boxes, GAP, [], { ...directions, start: v });
      if (before && after) consider([...before, ...after]);
    }
  }
  return best;
}
function avoidEdgeCrossings(svg, context = createRoutingContext(svg)) {
  let edges = context.edges(), pairs = crossingPairs(edges), changed = 0;
  const initial = pairs.length;
  for (let pass = 0; pass < 2 && pairs.length; pass++) {
    let progress = false;
    const count = /* @__PURE__ */ new Map();
    for (const pair of pairs) for (const id of [pair.a, pair.b]) count.set(id, (count.get(id) || 0) + 1);
    const order = [...count].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    for (const id of order) {
      if (!pairs.some((p) => p.a === id || p.b === id)) continue;
      const edge = context.findEdge(id), model = context.model();
      if (!edge) continue;
      const plan = planAvoidance(svg, edge, edges, model, pass > 0);
      if (!plan) continue;
      const original = edge.element.getAttribute("d"), data = edge.element.getAttribute("data-points");
      writePoints(svg, edge.element, plan.points);
      context.refreshEdge(id);
      const updated = context.edges(), next = crossingPairs(updated);
      if (next.length >= pairs.length) {
        edge.element.setAttribute("d", original);
        if (data === null) edge.element.removeAttribute("data-points");
        else edge.element.setAttribute("data-points", data);
        context.refreshEdge(id);
        continue;
      }
      applyReservation(svg, edge, plan.reservation, context);
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
      const edge = context.findEdge(id);
      if (!edge) continue;
      const raw = readPoints(edge.element);
      if (!raw) continue;
      const oldScore = routeQuality(raw.map((p) => inSvg(svg, edge.element, p))).score;
      const plan = planAvoidance(svg, edge, edges, context.model(), true);
      if (!plan || plan.score >= oldScore - 1) continue;
      const original = edge.element.getAttribute("d"), data = edge.element.getAttribute("data-points");
      writePoints(svg, edge.element, plan.points);
      context.refreshEdge(id);
      const updated = context.edges(), next = crossingPairs(updated);
      if (next.length > pairs.length) {
        if (original === null) edge.element.removeAttribute("d");
        else edge.element.setAttribute("d", original);
        if (data === null) edge.element.removeAttribute("data-points");
        else edge.element.setAttribute("data-points", data);
        context.refreshEdge(id);
        continue;
      }
      applyReservation(svg, edge, plan.reservation, context);
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
    edges.find((e) => e.id === id)?.element.setAttribute("data-gptm-crossing", "true");
  }
  const c4Expected = Number(svg.getAttribute?.("data-gptm-c4-expected")) || 0;
  const storedSkipped = Number(svg.getAttribute?.("data-gptm-skipped-edges")) || 0;
  const expected = c4Expected || edges.length;
  const skipped = c4Expected ? Math.max(storedSkipped, c4Expected - edges.length) : 0;
  svg.setAttribute("data-gptm-crossings", String(pairs.length));
  svg.setAttribute("data-gptm-checked-edges", String(edges.length));
  svg.setAttribute("data-gptm-expected-edges", String(expected));
  svg.setAttribute("data-gptm-skipped-edges", String(skipped));
  const incomplete = skipped > 0;
  svg.setAttribute("data-gptm-routing-status", incomplete ? "unresolved" : !edges.length ? "not-applicable" : pairs.length ? "unresolved" : "clear");
  svg.setAttribute("data-gptm-routing-reason", incomplete ? "incomplete-relations" : !pairs.length ? "" : pairs.some((pair) => pair.self) ? "self-intersection" : exceedsPlanarEdgeBound(edges) ? "non-planar-edge-bound" : svg.getAttribute("data-gptm-routing-budget-exhausted") === "true" ? "search-budget" : svg.getAttribute("data-gptm-routing-limited") === "true" ? "complexity-cap" : "fixed-obstacles");
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
function tryPlanarLayout(svg, repairConnections) {
  const model = geometry(svg), edges = collectEdges(svg);
  if (svg.querySelector("g.cluster,g.note,.c4-boundary") || model.nodes.some((n) => n.element.parentElement.closest("g.node")) || edges.some((e) => e.shared || !e.source || !e.target)) return false;
  const candidates = planarLayoutCandidates(model.nodes, edges);
  if (!candidates.length) {
    svg.setAttribute("data-gptm-planar-layout-support", "unsupported");
    return false;
  }
  const baseline = svg.cloneNode(true);
  const restore = () => svg.replaceChildren(...[...baseline.childNodes].map((n) => n.cloneNode(true)));
  const layouts = [];
  for (const sourcePositions of candidates) for (const ratio of [0.8, 1, 1.25]) for (let turn = 0; turn < 6; turn++) {
    const angle = turn * Math.PI / 6, positions = new Map([...sourcePositions].map(([id, p]) => [
      id,
      {
        x: (p.x * Math.cos(angle) - p.y * Math.sin(angle)) * ratio,
        y: p.x * Math.sin(angle) + p.y * Math.cos(angle)
      }
    ]));
    let scale = 180;
    const labelSpan = Math.max(60, ...model.labels.map((l) => Math.hypot(l.box.width, l.box.height)));
    for (let i = 0; i < model.nodes.length; i++) for (let j = i + 1; j < model.nodes.length; j++) {
      const a = model.nodes[i], b = model.nodes[j], p = positions.get(a.id), q = positions.get(b.id);
      scale = Math.max(scale, Math.min(
        ((a.box.width + b.box.width) / 2 + labelSpan + 36) / Math.abs(p.x - q.x),
        ((a.box.height + b.box.height) / 2 + labelSpan + 36) / Math.abs(p.y - q.y)
      ));
    }
    for (const edge of edges) {
      const a = positions.get(edge.source), b = positions.get(edge.target), v = vector(a, b), length2 = v.x * v.x + v.y * v.y;
      for (const node of model.nodes) {
        if (node.id === edge.source || node.id === edge.target) continue;
        const p = positions.get(node.id), t = Math.max(0, Math.min(1, ((p.x - a.x) * v.x + (p.y - a.y) * v.y) / length2));
        const distance2 = norm(p, { x: a.x + t * v.x, y: a.y + t * v.y });
        scale = Math.max(scale, (Math.hypot(node.box.width, node.box.height) / 2 + 20) / distance2);
      }
    }
    const bounds = boxOf([...positions.values()]);
    layouts.push({ positions, scale, area: (bounds.right - bounds.x) * (bounds.bottom - bounds.y) * scale ** 2 });
  }
  layouts.sort((a, b) => a.area - b.area);
  for (const { positions, scale } of layouts.slice(0, 8)) {
    if (!Number.isFinite(scale) || scale > 5e3) continue;
    restore();
    const current = geometry(svg), liveEdges = collectEdges(svg), boxes = /* @__PURE__ */ new Map();
    const point = (id) => ({ x: (positions.get(id).x + 1) * scale + 24, y: (positions.get(id).y + 1) * scale + 24 });
    for (const node of current.nodes) {
      const p = point(node.id), dx = p.x - (node.box.x + node.box.right) / 2, dy = p.y - (node.box.y + node.box.bottom) / 2;
      translateInRoot(svg, node.element, dx, dy);
      boxes.set(node.id, {
        x: p.x - node.box.width / 2,
        y: p.y - node.box.height / 2,
        right: p.x + node.box.width / 2,
        bottom: p.y + node.box.height / 2,
        width: node.box.width,
        height: node.box.height
      });
    }
    for (const edge of liveEdges) {
      const a = point(edge.source), b = point(edge.target), v = vector(a, b), length = norm(a, b);
      const port = (center, box, sign, start) => {
        const t = Math.min(Math.abs(box.width / 2 / v.x), Math.abs(box.height / 2 / v.y));
        const oldAnchor = start ? edge.controls?.[0] : edge.controls?.at(-1), oldTip = start ? edge.points[0] : edge.points.at(-1);
        const offset = !triangleCompatible(edge.element) && oldAnchor ? norm(oldAnchor, oldTip) : 0;
        return { x: center.x + sign * v.x * (t + offset / length), y: center.y + sign * v.y * (t + offset / length) };
      };
      writePoints(svg, edge.element, [port(a, boxes.get(edge.source), 1, true), port(b, boxes.get(edge.target), -1, false)]);
      edge.element.removeAttribute("data-gptm-label-x");
      edge.element.removeAttribute("data-gptm-label-y");
    }
    repairConnections(svg);
    const plannedEdges = collectEdges(svg), plannedModel = geometry(svg), reserved = [];
    let valid = true;
    for (const label of plannedModel.labels.sort((a, b) => b.box.width - a.box.width)) {
      const edge = plannedEdges.find((e) => e.id === label.id);
      if (!edge) {
        valid = false;
        break;
      }
      const size = {
        ...label.box,
        x: (edge.points[0].x + edge.points.at(-1).x) / 2 - label.box.width / 2,
        y: (edge.points[0].y + edge.points.at(-1).y) / 2 - label.box.height / 2
      };
      const walls = plannedEdges.filter((e) => e !== edge).flatMap((e) => segments(e.points));
      const barriers = [
        ...boxes.values(),
        ...reserved,
        ...plannedEdges.flatMap((e) => [endpointShield(e, true), endpointShield(e, false)]).filter(Boolean)
      ];
      const position = labelOnRoute(svg, edge.points, size, barriers, walls);
      if (!position) {
        valid = false;
        break;
      }
      applyReservation(svg, edge, position);
      reserved.push(position.box);
    }
    if (valid && crossingPairs(collectEdges(svg)).length === 0) {
      svg.setAttribute("data-gptm-planar-layout", "structured-candidate");
      svg.setAttribute("data-gptm-planar-layout-support", "candidate");
      return true;
    }
  }
  restore();
  svg.setAttribute("data-gptm-planar-layout-support", "unsupported");
  return false;
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
  const budget = { remaining: ROUTING_VISIT_BUDGET };
  ROUTING_BUDGETS.set(svg, budget);
  const context = createRoutingContext(svg);
  const initialEdges = context.edges();
  let limited = initialEdges.length > MAX_ARROW_REPAIR_EDGES;
  let arrowRepairs = 0;
  const arrowEdges = [...initialEdges].sort((a, b) => Number(b.element.hasAttribute("marker-end")) - Number(a.element.hasAttribute("marker-end"))).slice(0, MAX_ARROW_REPAIR_EDGES);
  for (const edge of arrowEdges) {
    if (budget.remaining <= 0) break;
    const model = context.model();
    if (!coveredArrow(svg, edge, model)) continue;
    const plan = planAvoidance(svg, edge, context.edges(), model, true);
    if (!plan) continue;
    const attributes = snapshotAttributes(edge.element);
    writePoints(svg, edge.element, plan.points);
    repairConnections(svg, edge.element);
    const updated = context.refreshEdge(edge.id);
    if (!updated || coveredArrow(svg, updated, model)) {
      restoreAttributes(edge.element, attributes);
      context.refreshEdge(edge.id);
      continue;
    }
    applyReservation(svg, edge, plan.reservation, context);
    edge.element.setAttribute("data-gptm-arrow-approach-repaired", "true");
    arrowRepairs++;
  }
  if (arrowRepairs) {
    placeEdgeLabels(svg);
    context.invalidateModel();
  }
  const first = avoidEdgeCrossings(svg, context);
  if (first.changed) {
    repairConnections(svg);
    context.invalidateAll();
    placeEdgeLabels(svg);
    context.invalidateModel();
  }
  let currentEdges = context.edges();
  let remaining = crossingPairs(currentEdges).length;
  if (remaining && currentEdges.length <= MAX_GROUP_REROUTE_EDGES && !exceedsPlanarEdgeBound(currentEdges) && rerouteConflictGroup(svg)) {
    repairConnections(svg);
    placeEdgeLabels(svg);
    context.invalidateAll();
    currentEdges = context.edges();
    remaining = crossingPairs(currentEdges).length;
  } else if (remaining && currentEdges.length > MAX_GROUP_REROUTE_EDGES) {
    limited = true;
  }
  let expanded = 1;
  if (remaining > 0 && currentEdges.length <= MAX_SPACING_EXPANSION_EDGES && !exceedsPlanarEdgeBound(currentEdges)) {
    const baseline = svg.cloneNode(true);
    const restore = () => {
      for (const attribute of [...svg.attributes]) svg.removeAttribute(attribute.name);
      for (const attribute of baseline.attributes) svg.setAttribute(attribute.name, attribute.value);
      svg.replaceChildren(...[...baseline.childNodes].map((node) => node.cloneNode(true)));
      context.invalidateAll();
    };
    for (const factor of [1.45, 2]) {
      restore();
      if (!expandFlatSpacing(svg, factor)) break;
      context.invalidateAll();
      repairConnections(svg);
      placeEdgeLabels(svg);
      context.invalidateAll();
      avoidEdgeCrossings(svg, context);
      rerouteConflictGroup(svg);
      repairConnections(svg);
      placeEdgeLabels(svg);
      context.invalidateAll();
      const count = crossingPairs(context.edges()).length;
      if (count < remaining) {
        remaining = count;
        expanded = factor;
        break;
      }
    }
    if (expanded === 1) restore();
  } else if (remaining > 0 && currentEdges.length > MAX_SPACING_EXPANSION_EDGES) {
    limited = true;
  }
  currentEdges = context.edges();
  if (remaining > 0 && currentEdges.length <= MAX_PLANAR_LAYOUT_EDGES && !exceedsPlanarEdgeBound(currentEdges) && tryPlanarLayout(svg, repairConnections)) {
    context.invalidateAll();
    placeEdgeLabels(svg);
    context.invalidateModel();
    remaining = crossingPairs(context.edges()).length;
  } else if (remaining > 0 && currentEdges.length > MAX_PLANAR_LAYOUT_EDGES) {
    limited = true;
  }
  svg.setAttribute("data-gptm-crossings-before", String(first.before));
  svg.setAttribute("data-gptm-spacing-factor", String(expanded));
  svg.setAttribute("data-gptm-arrow-approach-repairs", String(arrowRepairs));
  svg.setAttribute("data-gptm-routing-budget-exhausted", String(budget.remaining <= 0));
  svg.setAttribute("data-gptm-routing-limited", String(limited));
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
var EDGE_SELECTOR, GAP, ROUTING_BUDGETS, SEGMENT_DATA, ROUTING_VISIT_BUDGET, MAX_ARROW_REPAIR_EDGES, MAX_GROUP_REROUTE_EDGES, MAX_SPACING_EXPANSION_EDGES, MAX_PLANAR_LAYOUT_EDGES, norm, vector, segments, boxOf, overlaps2;
var init_svg_crossings = __esm({
  "src/svg-crossings.js"() {
    init_path_intersections();
    init_svg_routing();
    init_svg_labels();
    init_planar_layout();
    EDGE_SELECTOR = ".flowchart-link,.transition,.relation,.relationshipLine,[data-gptm-source]";
    GAP = 12;
    ROUTING_BUDGETS = /* @__PURE__ */ new WeakMap();
    SEGMENT_DATA = /* @__PURE__ */ new WeakMap();
    ROUTING_VISIT_BUDGET = 18e3;
    MAX_ARROW_REPAIR_EDGES = 36;
    MAX_GROUP_REROUTE_EDGES = 24;
    MAX_SPACING_EXPANSION_EDGES = 24;
    MAX_PLANAR_LAYOUT_EDGES = 24;
    norm = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    vector = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
    segments = (points) => points.slice(1).flatMap((p, i) => p.move || norm(points[i], p) < 1e-7 ? [] : [[points[i], p]]);
    boxOf = (points) => ({
      x: Math.min(...points.map((p) => p.x)),
      y: Math.min(...points.map((p) => p.y)),
      right: Math.max(...points.map((p) => p.x)),
      bottom: Math.max(...points.map((p) => p.y))
    });
    overlaps2 = (a, b) => a.x <= b.right && a.right >= b.x && a.y <= b.bottom && a.bottom >= b.y;
  }
});

// src/runtime-guard.js
function namedError(name, message, cause) {
  const error = new Error(message);
  error.name = name;
  if (cause !== void 0) error.cause = cause;
  return error;
}
function abortError(message = "gpt-mermaid: render aborted", cause) {
  return namedError("AbortError", message, cause);
}
function timeoutError(message = "gpt-mermaid: render timed out", cause) {
  return namedError("TimeoutError", message, cause);
}
function positiveTimeout(value, fallback = DEFAULT_RENDER_TIMEOUT_MS) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error ? signal.reason : abortError(void 0, signal.reason);
}
function withAbortTimeout(value, {
  signal,
  timeoutMs = DEFAULT_RENDER_TIMEOUT_MS,
  timeoutMessage
} = {}) {
  throwIfAborted(signal);
  let timer = 0;
  let cleaned = false;
  const promise = Promise.resolve(value);
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (timer) clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    };
    const finish = (callback, result) => {
      cleanup();
      callback(result);
    };
    const onAbort = () => finish(
      reject,
      signal?.reason instanceof Error ? signal.reason : abortError(void 0, signal?.reason)
    );
    const ms = Number(timeoutMs);
    if (Number.isFinite(ms) && ms > 0) {
      timer = setTimeout(() => finish(reject, timeoutError(timeoutMessage)), ms);
    }
    signal?.addEventListener?.("abort", onAbort, { once: true });
    promise.then(
      (result) => finish(resolve, result),
      (error) => finish(reject, error)
    );
  });
}
function createSerialScheduler() {
  const queue = [];
  let active = null;
  function schedule(run, {
    signal,
    timeoutMs = DEFAULT_RENDER_TIMEOUT_MS,
    timeoutMessage,
    queueTimeoutMs = timeoutMs
  } = {}) {
    return new Promise((resolve, reject) => {
      const item = {
        run,
        signal,
        timeoutMs,
        timeoutMessage,
        resolve,
        reject,
        controller: new AbortController(),
        started: false,
        queueTimer: null,
        onExternalAbort: null
      };
      const cancelQueued = (reason) => {
        const index = queue.indexOf(item);
        if (index !== -1) queue.splice(index, 1);
        clearTimeout(item.queueTimer);
        item.signal?.removeEventListener?.("abort", item.onExternalAbort);
        reject(reason instanceof Error ? reason : abortError(void 0, reason));
      };
      item.onExternalAbort = () => {
        const reason = signal?.reason instanceof Error ? signal.reason : abortError(void 0, signal?.reason);
        if (item.started) item.controller.abort(reason);
        else cancelQueued(reason);
      };
      if (signal?.aborted) {
        cancelQueued(signal.reason);
        return;
      }
      signal?.addEventListener?.("abort", item.onExternalAbort, { once: true });
      queue.push(item);
      item.queueTimer = setTimeout(
        () => cancelQueued(timeoutError("gpt-mermaid: render queue timed out")),
        positiveTimeout(queueTimeoutMs)
      );
      drain();
    });
  }
  function drain() {
    if (active || !queue.length) return;
    const item = queue.shift();
    clearTimeout(item.queueTimer);
    item.started = true;
    active = item;
    const execution = Promise.resolve().then(() => {
      throwIfAborted(item.controller.signal);
      return item.run(item.controller.signal);
    });
    const release = () => {
      active = null;
      drain();
    };
    execution.then(release, release);
    withAbortTimeout(execution, {
      signal: item.controller.signal,
      timeoutMs: positiveTimeout(item.timeoutMs),
      timeoutMessage: item.timeoutMessage
    }).then(item.resolve, (error) => {
      item.controller.abort(error);
      item.reject(error);
    }).finally(() => item.signal?.removeEventListener?.("abort", item.onExternalAbort));
  }
  return {
    schedule,
    pending: () => queue.length,
    active: () => active
  };
}
var DEFAULT_RENDER_TIMEOUT_MS, DEFAULT_RUNTIME_TIMEOUT_MS;
var init_runtime_guard = __esm({
  "src/runtime-guard.js"() {
    DEFAULT_RENDER_TIMEOUT_MS = 12e3;
    DEFAULT_RUNTIME_TIMEOUT_MS = 15e3;
  }
});

// src/runtime-loader.js
function validateRuntime(runtime) {
  if (typeof runtime?.render !== "function" || typeof runtime?.initialize !== "function") {
    throw new Error("gpt-mermaid: runtime must expose initialize and render");
  }
  return runtime;
}
function captureRuntime(globalObject, doc, script, receive) {
  let capture = captures.get(globalObject);
  if (!capture) {
    const descriptor = Object.getOwnPropertyDescriptor(globalObject, "mermaid");
    if (descriptor && (!descriptor.configurable || !("value" in descriptor) || !descriptor.writable)) {
      throw new Error("gpt-mermaid: cannot track runtime export; pass an explicit runtime");
    }
    let value = descriptor?.value;
    const owners = /* @__PURE__ */ new Map();
    const get = () => value;
    const set = (next) => {
      value = next;
      owners.get(doc.currentScript)?.(next);
    };
    Object.defineProperty(globalObject, "mermaid", {
      configurable: true,
      enumerable: descriptor?.enumerable ?? true,
      get,
      set
    });
    capture = {
      owners,
      release() {
        if (owners.size) return;
        const current = Object.getOwnPropertyDescriptor(globalObject, "mermaid");
        if (current?.get === get && current?.set === set) {
          if (!descriptor && value === void 0) delete globalObject.mermaid;
          else Object.defineProperty(globalObject, "mermaid", {
            configurable: true,
            enumerable: true,
            writable: true,
            ...descriptor,
            value
          });
        }
        captures.delete(globalObject);
      }
    };
    captures.set(globalObject, capture);
  }
  capture.owners.set(script, receive);
  return () => {
    capture.owners.delete(script);
    capture.release();
  };
}
function startDownload(doc, url, registry) {
  const globalObject = doc.defaultView || globalThis;
  const script = doc.createElement("script");
  const record = { state: "loading", script, waiters: 0, runtime: null, promise: null, fail: null };
  let resolve;
  let reject;
  record.promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  record.promise.catch(() => {
  });
  registry.set(url, record);
  let releaseCapture = () => {
  };
  let exported;
  let timer;
  function finish(error, runtime) {
    if (record.state !== "loading") return;
    record.state = error ? "failed" : "ready";
    clearTimeout(timer);
    script.removeEventListener("load", onLoad);
    script.removeEventListener("error", onError);
    releaseCapture();
    if (error) {
      script.remove();
      if (registry.get(url) === record) registry.delete(url);
      reject(error);
    } else {
      record.runtime = runtime;
      resolve(runtime);
    }
  }
  function onLoad() {
    try {
      finish(null, validateRuntime(exported));
    } catch (error) {
      finish(error);
    }
  }
  function onError() {
    finish(new Error(`gpt-mermaid: failed to load ${url}`));
  }
  record.fail = finish;
  try {
    releaseCapture = captureRuntime(globalObject, doc, script, (runtime) => {
      exported = runtime;
    });
    script.src = url;
    script.async = true;
    script.dataset.gptMermaidRuntime = url;
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    timer = setTimeout(
      () => finish(timeoutError("gpt-mermaid: runtime download timed out")),
      DEFAULT_RUNTIME_TIMEOUT_MS
    );
    doc.head.append(script);
  } catch (error) {
    finish(error);
  }
  return record;
}
async function loadRuntime(config = {}, baseUrl2, signal = config.signal) {
  throwIfAborted(signal);
  if (config.runtime != null) return validateRuntime(config.runtime);
  const doc = globalThis.document;
  if (!doc?.head) throw new Error("gpt-mermaid: runtime loading requires a document or explicit runtime");
  const url = new URL(
    config.runtimeUrl || "gpt-mermaid.runtime.min.js",
    config.baseUrl || baseUrl2 || doc.baseURI
  ).href;
  let registry = downloads.get(doc);
  if (!registry) {
    registry = /* @__PURE__ */ new Map();
    downloads.set(doc, registry);
  }
  const record = registry.get(url) || startDownload(doc, url, registry);
  record.waiters++;
  try {
    return await withAbortTimeout(record.promise, {
      signal,
      timeoutMs: positiveTimeout(config.runtimeTimeoutMs, DEFAULT_RUNTIME_TIMEOUT_MS),
      timeoutMessage: "gpt-mermaid: runtime load timed out"
    });
  } finally {
    record.waiters--;
    if (!record.waiters && record.state === "loading") {
      record.fail(abortError("gpt-mermaid: runtime download has no waiters"));
    }
  }
}
var downloads, captures;
var init_runtime_loader = __esm({
  "src/runtime-loader.js"() {
    init_runtime_guard();
    downloads = /* @__PURE__ */ new WeakMap();
    captures = /* @__PURE__ */ new WeakMap();
  }
});

// src/layout-style.js
function runtimeLayoutOptions(flowchart, stateDiagram) {
  return {
    // 流程关系采用均衡分支。时间轴、类成员、ER基数、统计坐标使用原图种的结构规则。
    ...flowchart ? { elk: {
      nodePlacementStrategy: READING_LAYOUT.placement,
      nodePlacementAlignment: READING_LAYOUT.alignment,
      mergeEdges: false
    } } : {},
    state: {
      useMaxWidth: false,
      wrappingWidth: 360,
      ...stateDiagram ? { nodeSpacing: READING_LAYOUT.nodeGap, rankSpacing: 50 } : {}
    }
  };
}
function stateReadingMetrics(model, direction) {
  const vertical = !["LEFT", "RIGHT"].includes(direction);
  const cross2 = (n) => vertical ? n.x + n.width / 2 : n.y + n.height / 2;
  const nodes = new Map(model.nodes.filter((n) => n.kind === "state").map((n) => [n.id, n]));
  const feedback = new Set(model.segments.filter((e) => e.feedback || e.loop).map((e) => e.owner));
  const edges = model.edges.filter((e) => !feedback.has(e.id) && nodes.has(e.source) && nodes.has(e.target));
  const units = [...nodes.values()].map((n) => vertical ? n.width : n.height).sort((a, b) => a - b);
  const unit = Math.max(1, units[Math.floor(units.length / 2)] || 1);
  const outgoing = new Map([...nodes.keys()].map((id) => [id, edges.filter((e) => e.source === id)]));
  const incoming = new Map([...nodes.keys()].map((id) => [id, edges.filter((e) => e.target === id)]));
  const mean = (list) => list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);
  const branchImbalance = mean([...nodes.keys()].flatMap((id) => {
    const next = outgoing.get(id);
    return next.length > 1 ? [Math.abs(cross2(nodes.get(id)) - mean(next.map((e) => cross2(nodes.get(e.target))))) / unit] : [];
  }));
  const memo = /* @__PURE__ */ new Map(), active = /* @__PURE__ */ new Set();
  const depth = (id) => {
    if (memo.has(id)) return memo.get(id);
    if (active.has(id)) return 0;
    active.add(id);
    const value = 1 + Math.max(0, ...outgoing.get(id).map((e) => depth(e.target)));
    active.delete(id);
    memo.set(id, value);
    return value;
  };
  const longest = edges.filter((e) => depth(e.source) === depth(e.target) + 1);
  const lateralTravel = mean(longest.map((e) => Math.abs(cross2(nodes.get(e.source)) - cross2(nodes.get(e.target))) / unit));
  const terminals = [...nodes.keys()].filter((id) => outgoing.get(id).length === 0 && incoming.get(id).length);
  const terminalDrift = mean(terminals.map((id) => Math.abs(cross2(nodes.get(id)) - mean(incoming.get(id).map((e) => cross2(nodes.get(e.source))))) / unit));
  return {
    lateralTravel,
    branchImbalance,
    terminalDrift,
    readingCost: lateralTravel + branchImbalance * READING_LAYOUT.readingWeights.branchBalance + terminalDrift * READING_LAYOUT.readingWeights.terminalProximity
  };
}
var READING_LAYOUT;
var init_layout_style = __esm({
  "src/layout-style.js"() {
    READING_LAYOUT = Object.freeze({
      id: "balanced-reading-v1",
      nodeGap: 20,
      stateLayerGap: 3,
      edgeClearance: 10,
      laneGap: 16,
      visibleLead: 16,
      cornerRadius: 4,
      placement: "BRANDES_KOEPF",
      alignment: "BALANCED",
      readingWeights: Object.freeze({ branchBalance: 0.6, terminalProximity: 0.8 })
    });
  }
});

// src/state-ports.js
function stateSidePoint(n, side, offset = 0) {
  return {
    x: side === "WEST" ? 0 : side === "EAST" ? n.width : n.width / 2 + offset,
    y: side === "NORTH" ? 0 : side === "SOUTH" ? n.height : n.height / 2 + offset
  };
}
function allocateStatePorts(model, selected, hints = /* @__PURE__ */ new Map()) {
  const nodes = new Map(model.nodes.map((n) => [n.id, {
    ...n,
    arrowDepth: model.arrowDepth || 11,
    ports: [],
    padding: Object.fromEntries(STATE_PORT_SIDES.map((s) => [s, 0]))
  }]));
  const ends = /* @__PURE__ */ new Map();
  for (const e of model.segments) for (const end of ["source", "target"]) {
    const n = nodes.get(e[end]), side = selected[e.id][end], id = `${e.id}:${end}`;
    const entry = {
      id,
      segment: e.id,
      owner: e.owner,
      end,
      side,
      lead: statePortLead(end === "target" && e.arrow, n.arrowDepth),
      hint: hints.get(id) ?? 0
    };
    n.ports.push(entry);
    ends.set(id, entry);
  }
  for (const n of nodes.values()) {
    for (const side of STATE_PORT_SIDES) {
      const ports = n.ports.filter((p) => p.side === side).sort((a, b) => a.hint - b.hint || a.id.localeCompare(b.id));
      if (!ports.length) continue;
      if (stateCardinalOnly(n) && ports.length > 1) throw new Error(`unsupported: state-port-capacity:${n.id}:${side}`);
      const dim = side === "NORTH" || side === "SOUTH" ? "width" : "height";
      if (!stateCardinalOnly(n)) {
        const radius = n.cornerRadius ?? (n.kind === "label" ? 13 : 12);
        const footprint = ports.some((p) => p.end === "target" && model.segments.find((e) => e.id === p.segment).arrow) ? n.arrowDepth * 0.4 + 1 : 1;
        n[dim] = Math.max(n[dim], 2 * (radius + footprint) + (ports.length - 1) * STATE_PORT_GAP);
      }
      ports.forEach((p, index) => {
        p.offset = (index - (ports.length - 1) / 2) * STATE_PORT_GAP;
      });
      n.padding[side] = Math.max(...ports.map((p) => p.lead));
    }
    if (n.envelope) {
      n.envelope = {
        ...n.envelope,
        width: n.envelope.width + n.width - model.nodes.find((m) => m.id === n.id).width,
        height: n.envelope.height + n.height - model.nodes.find((m) => m.id === n.id).height
      };
    }
    for (const p of n.ports) Object.assign(p, stateSidePoint(n, p.side, p.offset));
  }
  return { nodes, ends };
}
var STATE_PORT_SIDES, STATE_PORT_GAP, STATE_CORNER_RADIUS, STATE_VISIBLE_LEAD, statePortLead, stateCardinalOnly;
var init_state_ports = __esm({
  "src/state-ports.js"() {
    init_layout_style();
    STATE_PORT_SIDES = ["NORTH", "EAST", "SOUTH", "WEST"];
    STATE_PORT_GAP = 18;
    STATE_CORNER_RADIUS = READING_LAYOUT.cornerRadius;
    STATE_VISIBLE_LEAD = READING_LAYOUT.visibleLead;
    statePortLead = (arrow, depth = 11) => STATE_VISIBLE_LEAD + STATE_CORNER_RADIUS + 1 + (arrow ? depth : 0);
    stateCardinalOnly = (n) => /^(stateStart|stateEnd|choice|choiceState)$/.test(n.shape);
  }
});

// src/state-constraints.js
function simplify(points) {
  const out = [];
  for (const p of points) {
    if (out.length && dist(out.at(-1), p) < EPS3) continue;
    while (out.length > 1) {
      const a = out.at(-2), b = out.at(-1);
      if (Math.abs((b.x - a.x) * (p.y - b.y) - (b.y - a.y) * (p.x - b.x)) > EPS3 || (b.x - a.x) * (p.x - b.x) + (b.y - a.y) * (p.y - b.y) < 0) break;
      out.pop();
    }
    out.push(p);
  }
  return out;
}
function blocked(a, b, n, pad = GAP2) {
  const inside = (p) => p.x > n.x - pad + EPS3 && p.x < n.x + n.width + pad - EPS3 && p.y > n.y - pad + EPS3 && p.y < n.y + n.height + pad - EPS3;
  if (inside(a) || inside(b)) return true;
  const corners = [
    { x: n.x - pad, y: n.y - pad },
    { x: n.x + n.width + pad, y: n.y - pad },
    { x: n.x + n.width + pad, y: n.y + n.height + pad },
    { x: n.x - pad, y: n.y + n.height + pad }
  ];
  return corners.some((p, i) => segmentIntersection(a, b, p, corners[(i + 1) % 4])?.kind === "cross");
}
function validateStateLayout(model) {
  if (model.status === "unsupported") return { accepted: false, unsupported: model.reason, unmatched: model.unmatched };
  const issues = [], nodes = new Map(model.nodes.map((n) => [n.id, n]));
  const issue = (constraint, subject, detail) => issues.push({ constraint, subject, detail });
  const validPoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  for (const n of model.nodes) if (![n.x, n.y, n.width, n.height].every(Number.isFinite) || n.width <= 0 || n.height <= 0) issue("G02", n.id, "\u8282\u70B9\u5C3A\u5BF8\u6216\u5750\u6807\u65E0\u6548");
  if (nodes.size !== model.nodes.length) issue("G01", "nodes", "\u8282\u70B9ID\u91CD\u590D");
  const ancestor = (parent, child) => {
    let node = nodes.get(child);
    const seen = /* @__PURE__ */ new Set();
    while (node?.parentId) {
      if (seen.has(node.id)) {
        issue("G01", node.id, "\u5BB9\u5668\u5305\u542B\u73AF");
        return false;
      }
      seen.add(node.id);
      if (node.parentId === parent) return true;
      node = nodes.get(node.parentId);
    }
    return false;
  };
  const segments2 = model.segments.filter((e) => {
    if (!Array.isArray(e.points) || e.points.length < 2 || !e.points.every(validPoint) || !nodes.has(e.source) || !nodes.has(e.target)) {
      issue("G02", e.id, "\u8DEF\u5F84\u6216\u5F52\u5C5E\u65E0\u6548");
      return false;
    }
    if (!model.edges.some((r) => r.id === e.owner)) issue("G01", e.id, "\u672A\u58F0\u660E\u7684\u5173\u7CFB");
    return true;
  }).map((e) => ({ ...e, points: simplify(e.points) }));
  for (const edge of model.edges) {
    const pieces = segments2.filter((s) => s.owner === edge.id);
    if (pieces.length !== (edge.label ? 2 : 1)) issue("G01", edge.id, "\u663E\u793A\u6BB5\u6570\u91CF\u4E0D\u4E00\u81F4");
    if (pieces[0]?.source !== edge.source || pieces.at(-1)?.target !== edge.target) issue("G01", edge.id, "\u5173\u7CFB\u7AEF\u70B9\u4E0D\u4E00\u81F4");
    if (edge.label) {
      if (!pieces[0] || !pieces[1] || pieces[0].target !== pieces[1].source) issue("G01", edge.id, "\u6761\u4EF6\u6846\u65AD\u5F00");
      const label = pieces[0] && nodes.get(pieces[0].target);
      if (!label || label.kind !== "label" || label.owner !== edge.id || label.label !== edge.label) {
        issue("G04", edge.id, "\u6761\u4EF6\u6846\u8BED\u4E49\u4E0D\u4E00\u81F4");
      }
      if (pieces[0]?.arrow !== false) issue("G04", edge.id, "\u6761\u4EF6\u5165\u53E3\u4E0D\u80FD\u8865\u9020\u7BAD\u5934");
    }
    if (pieces.at(-1) && pieces.at(-1).arrow !== (edge.arrow ?? true)) issue("G04", edge.id, "\u4E1A\u52A1\u7BAD\u5934\u4E22\u5931\u6216\u8865\u9020");
  }
  const ports = [];
  for (const e of segments2) {
    if (e.points.length < 2) {
      issue("G06", e.id, "\u9000\u5316\u8DEF\u5F84");
      continue;
    }
    for (const start of [true, false]) {
      const n = nodes.get(start ? e.source : e.target), p = start ? e.points[0] : e.points.at(-1);
      const q = start ? e.points[1] : e.points.at(-2);
      const centers = [
        { side: "NORTH", x: n.x + n.width / 2, y: n.y, vx: 0, vy: -1 },
        { side: "SOUTH", x: n.x + n.width / 2, y: n.y + n.height, vx: 0, vy: 1 },
        { side: "WEST", x: n.x, y: n.y + n.height / 2, vx: -1, vy: 0 },
        { side: "EAST", x: n.x + n.width, y: n.y + n.height / 2, vx: 1, vy: 0 }
      ].sort((a, b) => Math.abs(a.vx ? a.x - p.x : a.y - p.y) - Math.abs(b.vx ? b.x - p.x : b.y - p.y));
      const port = centers[0], lead = (q.x - p.x) * port.vx + (q.y - p.y) * port.vy;
      const normalError = Math.abs((q.x - p.x) * port.vy - (q.y - p.y) * port.vx);
      const offset = port.vx ? p.y - port.y : p.x - port.x;
      const contourGap = Math.abs(port.vx ? p.x - port.x : p.y - port.y);
      ports.push({
        segment: e.id,
        node: n.id,
        side: port.side,
        middleError: Math.abs(offset),
        offset,
        contourGap,
        lead,
        normalError,
        arrow: !start && e.arrow
      });
      if (contourGap > EPS3 || normalError > EPS3 || stateCardinalOnly(n) && Math.abs(offset) > EPS3)
        issue("G02", e.id, ports.at(-1));
      if (lead < statePortLead(!start && e.arrow, n.arrowDepth) - EPS3) issue("G03", e.id, ports.at(-1));
    }
    for (let i = 1; i < e.points.length; i++) {
      const a = e.points[i - 1], b = e.points[i];
      if (Math.abs(a.x - b.x) > EPS3 && Math.abs(a.y - b.y) > EPS3) issue("G06", e.id, "\u659C\u6BB5");
      if (i > 1) {
        const previous = e.points[i - 2];
        if ((a.x - previous.x) * (b.x - a.x) + (a.y - previous.y) * (b.y - a.y) < -EPS3) {
          issue("G06", e.id, "\u76F8\u90BB\u53CD\u5411\u91CD\u8D70");
        }
      }
      for (const n of nodes.values()) {
        if (ancestor(n.id, e.source) || ancestor(n.id, e.target)) continue;
        if (n.id === e.source && i === 1 || n.id === e.target && i === e.points.length - 1) continue;
        if (blocked(a, b, n, n.id === e.source || n.id === e.target ? -1 : GAP2)) issue("G05", e.id, n.id);
      }
      for (let j = i + 2; j < e.points.length; j++) {
        if (segmentIntersection(a, b, e.points[j - 1], e.points[j])) issue("G06", e.id, "\u81EA\u4EA4\u6216\u6298\u8FD4");
      }
    }
  }
  for (const n of nodes.values()) for (const side of ["NORTH", "EAST", "SOUTH", "WEST"]) {
    const assigned = ports.filter((p) => p.node === n.id && p.side === side).sort((a, b) => a.offset - b.offset);
    if (!assigned.length) continue;
    const span = side === "NORTH" || side === "SOUTH" ? n.width : n.height;
    const radius = n.cornerRadius ?? (n.kind === "label" ? 13 : 12);
    const footprint = assigned.some((p) => p.arrow) ? (n.arrowDepth || 11) * 0.4 + 1 : 1;
    const usable = span / 2 - (stateCardinalOnly(n) ? span / 2 : radius + footprint);
    if (Math.abs(assigned[0].offset + assigned.at(-1).offset) > EPS3 || assigned.some((p) => Math.abs(p.offset) > usable + EPS3)) issue("G02", n.id, `\u7AEF\u53E3\u7EC4\u672A\u5C45\u4E2D\u6216\u8D8A\u8FC7\u5B89\u5168\u76F4\u8FB9:${side}`);
    for (let i = 1; i < assigned.length; i++) if (assigned[i].offset - assigned[i - 1].offset < STATE_PORT_GAP - EPS3)
      issue("G08", n.id, `\u7AEF\u53E3\u5171\u7528\u6216\u95F4\u8DDD\u4E0D\u8DB3:${side}`);
  }
  const opposite = { NORTH: "SOUTH", SOUTH: "NORTH", EAST: "WEST", WEST: "EAST" };
  for (const n of nodes.values()) if (n.kind === "label") {
    const ends = ports.filter((p) => p.node === n.id);
    if (ends.length !== 2 || opposite[ends[0].side] !== ends[1].side) issue("G04", n.id, "\u6761\u4EF6\u6846\u987B\u4ECE\u76F8\u5BF9\u4E24\u4FA7\u8FDE\u63A5");
  }
  const boxes = [...nodes.values()];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (ancestor(a.id, b.id) || ancestor(b.id, a.id)) continue;
    if (a.x < b.x + b.width + GAP2 && a.x + a.width + GAP2 > b.x && a.y < b.y + b.height + GAP2 && a.y + a.height + GAP2 > b.y) issue("G05", a.id, `\u6846\u4E0E\u6846\u8DDD\u79BB\u4E0D\u8DB3:${b.id}`);
  }
  for (const n of boxes) if (n.parentId && nodes.has(n.parentId)) {
    const parent = nodes.get(n.parentId);
    if (n.x < parent.x - EPS3 || n.y < parent.y - EPS3 || n.x + n.width > parent.x + parent.width + EPS3 || n.y + n.height > parent.y + parent.height + EPS3) issue("G05", n.id, "\u5B50\u5BF9\u8C61\u8D85\u51FA\u6240\u5C5E\u5BB9\u5668");
  }
  for (const e of segments2) {
    const a = nodes.get(e.source), b = nodes.get(e.target);
    if (!a.parentId || a.parentId !== b.parentId) continue;
    const parent = nodes.get(a.parentId);
    if (parent && e.points.some((p) => p.x < parent.x - EPS3 || p.y < parent.y - EPS3 || p.x > parent.x + parent.width + EPS3 || p.y > parent.y + parent.height + EPS3))
      issue("G05", e.id, "\u5185\u90E8\u5173\u7CFB\u8D85\u51FA\u6240\u5C5E\u5BB9\u5668");
  }
  const intersections = [];
  for (let i = 0; i < segments2.length; i++) for (let j = i + 1; j < segments2.length; j++) {
    const a = segments2[i], b = segments2[j];
    for (let p = 1; p < a.points.length; p++) for (let q = 1; q < b.points.length; q++) {
      const hit = segmentIntersection(a.points[p - 1], a.points[p], b.points[q - 1], b.points[q]);
      if (!hit) continue;
      intersections.push({ a: a.id, b: b.id, ...hit });
      if (hit.kind === "overlap" || hit.kind === "touch") issue("G08", a.id, `\u5173\u7CFB\u4E0E${b.id}\u91CD\u53E0\u6216\u63A5\u89E6`);
    }
  }
  return {
    logicalNodes: model.nodes.filter((n) => n.kind === "state").length,
    logicalEdges: model.edges.length,
    labels: model.nodes.filter((n) => n.kind === "label").length,
    displaySegments: segments2.length,
    ports,
    issues,
    intersections,
    accepted: issues.length === 0 && intersections.length === 0
  };
}
var EPS3, GAP2, dist;
var init_state_constraints = __esm({
  "src/state-constraints.js"() {
    init_path_intersections();
    init_state_ports();
    EPS3 = 0.01;
    GAP2 = 10;
    dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  }
});

// src/state-spacing.js
function compactStateSpacing(model, direction) {
  const axis = ["LEFT", "RIGHT"].includes(direction) ? "x" : "y", other = axis === "x" ? "y" : "x";
  const dimension = axis === "x" ? "width" : "height", breadth = axis === "x" ? "height" : "width";
  const segments2 = model.segments.map((e) => ({ ...e, points: simplifyPoints(e.points) }));
  const boxes = model.nodes.map((n) => ({
    node: n,
    start: n[axis] - (n.envelope?.[axis === "x" ? "dx" : "dy"] || 0),
    size: n.envelope?.[dimension] || n[dimension],
    cross: n[other] - (n.envelope?.[axis === "x" ? "dy" : "dx"] || 0),
    breadth: n.envelope?.[breadth] || n[breadth]
  }));
  const key = (v) => Math.round(v * 1e6) / 1e6;
  const stations = [...new Set([
    0,
    model[dimension],
    ...boxes.flatMap((b) => [b.start, b.start + b.size]),
    ...model.nodes.flatMap((n) => [n[axis], n[axis] + n[dimension]]),
    ...segments2.flatMap((e) => e.points.map((p) => p[axis]))
  ].map(key))].sort((a, b) => a - b);
  const indices = new Map(stations.map((v, i) => [v, i])), requirements = stations.map(() => []);
  const requireGap = (a, b, gap) => {
    if (b < a) [a, b] = [b, a];
    const i = indices.get(key(a)), j = indices.get(key(b));
    if (i !== void 0 && j > i) requirements[j].push([i, Math.min(gap, stations[j] - stations[i])]);
  };
  const groupOf = [0], groupStarts = [stations[0]], offsets = [0];
  for (let i = 1; i < stations.length; i++) {
    const a = stations[i - 1], b = stations[i];
    const locked = boxes.some((n) => a < n.start + n.size - 1e-5 && b > n.start + 1e-5);
    if (!locked) groupStarts.push(b);
    groupOf[i] = groupStarts.length - 1;
    offsets[i] = b - groupStarts.at(-1);
    requirements[i].push([i - 1, locked ? b - a : Math.min(0.01, b - a)]);
  }
  const byId = new Map(model.nodes.map((n) => [n.id, n])), transverse = [];
  for (const edge of segments2) {
    for (let i = 1; i < edge.points.length; i++) {
      const a = edge.points[i - 1], b = edge.points[i];
      if (Math.abs(a[axis] - b[axis]) > 1e-3) {
        let gap = READING_LAYOUT.edgeClearance + 2 * READING_LAYOUT.cornerRadius;
        if (i === 1) gap = Math.max(gap, statePortLead(false, byId.get(edge.source).arrowDepth));
        if (i === edge.points.length - 1) gap = Math.max(gap, statePortLead(edge.arrow, byId.get(edge.target).arrowDepth));
        requireGap(a[axis], b[axis], gap);
      } else transverse.push({ at: a[axis], lo: Math.min(a[other], b[other]), hi: Math.max(a[other], b[other]), owner: edge.owner });
    }
  }
  for (const a of boxes) for (const b of boxes) {
    if (a.start + a.size <= b.start + 1e-3 && a.cross < b.cross + b.breadth && b.cross < a.cross + a.breadth)
      requireGap(a.start + a.size, b.start, READING_LAYOUT.edgeClearance);
  }
  for (const line of transverse) {
    for (const b of boxes) if (line.lo < b.cross + b.breadth && line.hi > b.cross) {
      if (line.at < b.start) requireGap(line.at, b.start, READING_LAYOUT.edgeClearance);
      else if (line.at > b.start + b.size) requireGap(b.start + b.size, line.at, READING_LAYOUT.edgeClearance);
    }
    for (const otherLine of transverse) if (line.owner !== otherLine.owner && line.at < otherLine.at && line.lo < otherLine.hi && otherLine.lo < line.hi) requireGap(line.at, otherLine.at, READING_LAYOUT.laneGap);
  }
  const groupRequirements = groupStarts.map(() => []);
  for (let j = 1; j < stations.length; j++) for (const [i, gap] of requirements[j])
    if (groupOf[i] !== groupOf[j]) groupRequirements[groupOf[j]].push([groupOf[i], gap + offsets[i] - offsets[j]]);
  const bases = [stations[0]];
  for (let j = 1; j < groupStarts.length; j++) bases[j] = Math.max(...groupRequirements[j].map(([i, gap]) => bases[i] + gap));
  const positions = stations.map((_, i) => key(bases[groupOf[i]] + offsets[i]));
  const mapped = (value) => {
    const exact = indices.get(key(value));
    if (exact !== void 0) return positions[exact];
    const upper = stations.findIndex((v) => v > value);
    if (upper < 1) return value + (positions.at(-1) - stations.at(-1));
    const low = upper - 1, t = (value - stations[low]) / (stations[upper] - stations[low]);
    return positions[low] + t * (positions[upper] - positions[low]);
  };
  return {
    ...model,
    [dimension]: mapped(model[dimension]),
    nodes: model.nodes.map((n) => ({ ...n, [axis]: mapped(n[axis]) })),
    segments: segments2.map((e) => ({ ...e, points: e.points.map((p) => ({ ...p, [axis]: mapped(p[axis]) })) })),
    spacing: { axis, before: model[dimension], after: mapped(model[dimension]) }
  };
}
var init_state_spacing = __esm({
  "src/state-spacing.js"() {
    init_svg_routing();
    init_state_ports();
    init_layout_style();
  }
});

// src/state-model.js
function expandModel(input) {
  const order = [], visited = /* @__PURE__ */ new Set(), active = /* @__PURE__ */ new Set(), feedbackEdges = /* @__PURE__ */ new Set();
  const visit = (id) => {
    if (visited.has(id)) return;
    visited.add(id);
    active.add(id);
    for (const edge of input.edges.filter((e) => e.source === id)) {
      if (active.has(edge.target)) feedbackEdges.add(edge.id);
      else visit(edge.target);
    }
    active.delete(id);
    order.unshift(id);
  };
  for (const n of input.nodes.filter((n2) => n2.shape === "stateStart")) visit(n.id);
  for (const n of input.nodes) visit(n.id);
  const rank = new Map(order.map((id, i) => [id, i]));
  const nodes = input.nodes.map((n) => ({ ...n, kind: "state" }));
  const segments2 = [];
  for (const edge of input.edges) {
    const feedback = feedbackEdges.has(edge.id), loop = edge.source === edge.target;
    if (edge.label) {
      const id = `${edge.id}:label`;
      nodes.push({ id, kind: "label", owner: edge.id, label: edge.label, width: edge.width, height: edge.height });
      segments2.push({ id: `${edge.id}:in`, owner: edge.id, source: edge.source, target: id, arrow: false, feedback: loop ? false : feedback, loop });
      segments2.push({ id: `${edge.id}:out`, owner: edge.id, source: id, target: edge.target, arrow: edge.arrow ?? true, feedback, loop });
    } else segments2.push({ ...edge, owner: edge.id, arrow: edge.arrow ?? true, feedback, loop });
  }
  const sortRank = (n) => n.kind === "state" ? rank.get(n.id) * 2 : (() => {
    const e = input.edges.find((e2) => e2.id === n.owner);
    return rank.get(e.source) + rank.get(e.target);
  })();
  nodes.sort((a, b) => sortRank(a) - sortRank(b));
  return { nodes, segments: segments2, edges: input.edges, arrowDepth: input.arrowDepth || 11 };
}
function graphFor(model, allocation, direction) {
  return {
    id: "root",
    layoutOptions: { ...options, "elk.direction": direction || "DOWN" },
    children: model.nodes.map((original) => {
      const n = allocation?.nodes.get(original.id) || original;
      const pad = n.padding || { NORTH: 21, SOUTH: 21, EAST: 0, WEST: 0 };
      const node = {
        id: n.id,
        width: (n.envelope?.width || n.width) + pad.WEST + pad.EAST,
        height: (n.envelope?.height || n.height) + pad.NORTH + pad.SOUTH
      };
      if (allocation) {
        node.layoutOptions = { "elk.portConstraints": "FIXED_POS" };
        node.ports = n.ports.map((p) => {
          const horizontal = p.side === "NORTH" || p.side === "SOUTH";
          const x = horizontal ? pad.WEST + (n.envelope?.dx || 0) + p.x : p.side === "WEST" ? 0 : node.width;
          const y = horizontal ? p.side === "NORTH" ? 0 : node.height : pad.NORTH + (n.envelope?.dy || 0) + p.y;
          return { id: p.id, x, y, width: 0, height: 0, layoutOptions: { "elk.port.side": p.side } };
        });
      }
      return node;
    }),
    edges: model.segments.map((e) => {
      const from = allocation ? `${e.id}:source` : e.source;
      const to = allocation ? `${e.id}:target` : e.target;
      return { id: e.id, sources: [e.feedback ? to : from], targets: [e.feedback ? from : to] };
    })
  };
}
function sideOf2(node, p) {
  return STATE_PORT_SIDES.slice().sort((a, b) => {
    const point = (side) => ({ x: node.x + stateSidePoint(node, side).x, y: node.y + stateSidePoint(node, side).y });
    const q = point(a), r = point(b);
    const gap = (side, x) => side === "EAST" || side === "WEST" ? Math.abs(x.x - p.x) : Math.abs(x.y - p.y);
    return gap(a, q) - gap(b, r);
  })[0];
}
async function solveStateScope(input, direction, layout) {
  const model = expandModel(input);
  const free = await layout(graphFor(model, null, direction));
  const freeNodes = new Map(free.children.map((n) => [n.id, n]));
  const bySegment = new Map(model.segments.map((e) => [e.id, e]));
  const vertical = !["LEFT", "RIGHT"].includes(direction), axis = vertical ? "y" : "x";
  const feedback = model.edges.filter((e) => model.segments.some((s) => s.owner === e.id && s.feedback && !s.loop)).map((e) => ({ ...e, span: Math.abs(freeNodes.get(e.source)[axis] - freeNodes.get(e.target)[axis]) })).sort((a, b) => b.span - a.span || a.id.localeCompare(b.id));
  const channelSide = new Map(feedback.map((e, i) => [e.id, feedback.length > 1 && i === 0 ? -1 : 1]));
  const hints = /* @__PURE__ */ new Map();
  const sides = Object.fromEntries(free.edges.map((edge, i) => {
    const s = edge.sections[0], m = bySegment.get(edge.id);
    const start = m.feedback ? s.endPoint : s.startPoint, end = m.feedback ? s.startPoint : s.endPoint;
    for (const [key, p] of [["source", start], ["target", end]]) {
      const side = sideOf2(freeNodes.get(m[key]), p);
      hints.set(`${m.id}:${key}`, side === "NORTH" || side === "SOUTH" ? p.x : p.y);
    }
    const rotation = { DOWN: 0, LEFT: 1, UP: 2, RIGHT: 3 }[direction || "DOWN"];
    const rotate = (side) => STATE_PORT_SIDES[(STATE_PORT_SIDES.indexOf(side) + rotation) % 4];
    if (m.loop) {
      if (m.source === m.target) return [edge.id, { source: rotate("EAST"), target: rotate("NORTH") }];
      return [edge.id, m.arrow ? { source: rotate("EAST"), target: rotate("NORTH") } : { source: rotate("EAST"), target: rotate("WEST") }];
    }
    if (m.feedback) return [edge.id, { source: rotate("NORTH"), target: rotate("SOUTH") }];
    return [edge.id, {
      source: sideOf2(freeNodes.get(m.source), s.startPoint),
      target: sideOf2(freeNodes.get(m.target), s.endPoint)
    }];
  }));
  for (const e of model.segments) for (const start of [true, false]) {
    const n = model.nodes.find((n2) => n2.id === (start ? e.source : e.target));
    const key = start ? "source" : "target";
    if (!n.envelope?.blockedSides.includes(sides[e.id][key])) continue;
    const forward = {
      DOWN: ["SOUTH", "NORTH"],
      UP: ["NORTH", "SOUTH"],
      RIGHT: ["EAST", "WEST"],
      LEFT: ["WEST", "EAST"]
    }[direction || "DOWN"];
    sides[e.id][key] = [forward[start ? 0 : 1], ...STATE_PORT_SIDES].find((s) => !n.envelope.blockedSides.includes(s));
  }
  const candidateFor = async (selected, ordering, poleTurn = 0) => {
    for (const n of model.nodes.filter(stateCardinalOnly)) {
      const occupied = /* @__PURE__ */ new Set();
      for (const e of model.segments) for (const end of ["source", "target"]) if (e[end] === n.id) {
        const desired = selected[e.id][end];
        const fallback = [1, 3, 2].map((delta2) => STATE_PORT_SIDES[(STATE_PORT_SIDES.indexOf(desired) + delta2 + poleTurn) % 4]);
        const side = [desired, ...fallback, ...STATE_PORT_SIDES].find((s) => !occupied.has(s));
        if (!side) throw new Error(`unsupported: state-port-capacity:${n.id}`);
        selected[e.id][end] = side;
        occupied.add(side);
      }
    }
    const selectedHints = new Map(hints);
    if (ordering) for (const m of model.segments) {
      for (const end of ["source", "target"]) {
        if (model.nodes.find((n) => n.id === m[end]).kind !== "state") continue;
        const side = channelSide.get(m.owner);
        const hint = side ? (ordering === 1 ? side : ordering === 2 ? -side : ordering === 3 ? 1 : -1) * 1e6 + feedback.find((e) => e.id === m.owner).span : selectedHints.get(`${m.id}:${end}`);
        selectedHints.set(`${m.id}:${end}`, hint);
      }
    }
    const allocation = allocateStatePorts(model, selected, selectedHints);
    const fixed = await layout(graphFor(model, allocation, direction));
    const nodes = new Map(fixed.children.map((n) => {
      const inputNode = allocation.nodes.get(n.id);
      return [n.id, {
        ...inputNode,
        x: n.x + inputNode.padding.WEST + (inputNode.envelope?.dx || 0),
        y: n.y + inputNode.padding.NORTH + (inputNode.envelope?.dy || 0)
      }];
    }));
    const port = (node, id) => {
      const p = allocation.ends.get(id);
      return { x: node.x + p.x, y: node.y + p.y };
    };
    const fixedEdges = new Map(fixed.edges.map((e) => [e.id, e]));
    const segments2 = model.segments.map((m) => {
      const e = fixedEdges.get(m.id), s = e.sections[0], endpoints = selected[e.id];
      const route = [s.startPoint, ...s.bendPoints || [], s.endPoint];
      if (m.feedback) route.reverse();
      return { ...m, sides: endpoints, points: [
        port(nodes.get(m.source), `${m.id}:source`),
        ...route,
        port(nodes.get(m.target), `${m.id}:target`)
      ] };
    });
    const result = { width: fixed.width, height: fixed.height, nodes: [...nodes.values()], segments: segments2, edges: input.edges, sides: selected };
    const compact = compactStateSpacing(result, direction);
    const compactReport = validateStateLayout(compact);
    const accepted = compactReport.accepted;
    return accepted ? compact : result;
  };
  let best = await candidateFor(structuredClone(sides), 1), quality = validateStateLayout(best);
  const lanePenalty = (result) => feedback.reduce((sum, e) => {
    const byId = new Map(result.nodes.map((n) => [n.id, n])), a = byId.get(e.source), b = byId.get(e.target);
    const label = byId.get(`${e.id}:label`);
    if (!label) return sum;
    const cross2 = (n) => vertical ? n.x + n.width / 2 : n.y + n.height / 2;
    return sum + (Math.sign(cross2(label) - (cross2(a) + cross2(b)) / 2) === channelSide.get(e.id) ? 0 : 1);
  }, 0);
  const score = (result, report) => [
    report.issues.length,
    report.intersections.length,
    lanePenalty(result),
    stateReadingMetrics(result, direction).readingCost,
    result.width * result.height,
    result.segments.reduce((sum, e) => sum + e.points.length, 0)
  ];
  const better = (a, b) => a.some((v, i) => v < b[i] && a.slice(0, i).every((x, j) => x === b[j]));
  let bestScore = score(best, quality);
  const loopTurns = model.segments.some((e) => e.loop) ? [0, 1, 2, 3] : [0];
  const orderings = feedback.length ? [1, 0, 2, 3, 4] : [1];
  const alternatives = loopTurns.flatMap((loopTurn) => orderings.map((ordering) => ({ loopTurn, ordering, poleTurn: 0 })));
  const loopOwners = [...new Set(model.segments.filter((e) => e.loop).map((e) => e.owner))];
  if (loopOwners.length > 1) for (const loopTurn of loopTurns) alternatives.push({ loopTurn, ordering: 1, poleTurn: 0, spreadLoops: true });
  if (model.nodes.some((n) => stateCardinalOnly(n) && model.segments.filter((e) => e.source === n.id || e.target === n.id).length > 1))
    for (const poleTurn of [1, 2, 3]) alternatives.push({ loopTurn: 0, ordering: 1, poleTurn });
  for (const { loopTurn, ordering, poleTurn, spreadLoops } of alternatives) {
    if (!loopTurn && ordering === 1 && !poleTurn && !spreadLoops) continue;
    const selected = structuredClone(sides);
    for (const edge of model.segments) {
      if (edge.loop) for (const end of ["source", "target"]) {
        selected[edge.id][end] = STATE_PORT_SIDES[(STATE_PORT_SIDES.indexOf(sides[edge.id][end]) + loopTurn + (spreadLoops ? loopOwners.indexOf(edge.owner) : 0)) % 4];
      }
    }
    const result = await candidateFor(selected, ordering, poleTurn), report = validateStateLayout(result);
    const next = score(result, report);
    if (better(next, bestScore)) {
      best = result;
      bestScore = next;
    }
  }
  return { ...best, reading: stateReadingMetrics(best, direction) };
}
var STATE_LAYOUT_LEAD, options;
var init_state_model = __esm({
  "src/state-model.js"() {
    init_state_constraints();
    init_state_ports();
    init_layout_style();
    init_state_spacing();
    STATE_LAYOUT_LEAD = statePortLead(false);
    options = {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.randomSeed": "1",
      "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
      "elk.layered.feedbackEdges": "true",
      "elk.layered.nodePlacement.strategy": READING_LAYOUT.placement,
      "elk.layered.nodePlacement.bk.fixedAlignment": READING_LAYOUT.alignment,
      "elk.spacing.nodeNode": String(READING_LAYOUT.nodeGap),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(READING_LAYOUT.stateLayerGap),
      "elk.spacing.edgeNode": String(READING_LAYOUT.edgeClearance),
      "elk.layered.spacing.edgeNodeBetweenLayers": String(READING_LAYOUT.stateLayerGap),
      "elk.spacing.edgeEdge": String(READING_LAYOUT.laneGap),
      "elk.layered.spacing.edgeEdgeBetweenLayers": String(READING_LAYOUT.laneGap)
    };
  }
});

// src/state-layout.js
async function solveStateLayout(input, direction = "DOWN", layout) {
  const containers = new Map(input.nodes.filter((n) => n.shape === "noteGroup").map((n) => [n.id, n]));
  input = { ...input, nodes: input.nodes.filter((n) => !containers.has(n.id)).map((n) => {
    const noteGroup = containers.get(n.parentId);
    if (!noteGroup) return n;
    const connector = input.edges.find((e) => e.note && (e.source === n.id || e.target === n.id));
    const ownerId = connector && (connector.source === n.id ? connector.target : connector.source);
    return { ...n, parentId: input.nodes.find((n2) => n2.id === ownerId)?.parentId, noteOwner: ownerId };
  }) };
  const notes = input.nodes.filter((n) => n.noteOwner), noteEdges = input.edges.filter((e) => e.note);
  const associated = /* @__PURE__ */ new Map();
  for (const note of notes) {
    if (!associated.has(note.noteOwner)) associated.set(note.noteOwner, []);
    associated.get(note.noteOwner).push(note);
  }
  input = { ...input, nodes: input.nodes.filter((n) => !n.noteOwner).map((n) => {
    const decorations = associated.get(n.id) || [];
    if (!decorations.length) return n;
    const left = decorations.filter((x) => x.position === "left of"), right = decorations.filter((x) => x.position !== "left of");
    const leftWidth = left.length ? Math.max(...left.map((x) => x.width)) + 90 : 0;
    const rightWidth = right.length ? Math.max(...right.map((x) => x.width)) + 90 : 0;
    const sideHeight = (list) => list.reduce((sum, x) => sum + x.height + 20, -20);
    const height = Math.max(n.height, sideHeight(left), sideHeight(right));
    return { ...n, envelope: {
      width: n.width + leftWidth + rightWidth,
      height,
      dx: leftWidth,
      dy: (height - n.height) / 2,
      blockedSides: [...left.length ? ["WEST"] : [], ...right.length ? ["EAST"] : []]
    } };
  }), edges: input.edges.filter((e) => !e.note) };
  const byId = new Map(input.nodes.map((n) => [n.id, n]));
  for (const n of input.nodes) {
    const seen = /* @__PURE__ */ new Set();
    let current = n;
    while (current?.parentId) {
      if (seen.has(current.id)) throw new Error("constraint-conflict: containment-cycle");
      seen.add(current.id);
      current = byId.get(current.parentId);
    }
  }
  const roots = input.nodes.filter((n) => !n.parentId);
  const used = /* @__PURE__ */ new Set(), groups = /* @__PURE__ */ new Map();
  const solveScope = async (parent) => {
    const children = input.nodes.filter((n) => (n.parentId || null) === parent);
    for (const node of children.filter((n) => n.isGroup)) {
      const inner = await solveScope(node.id);
      groups.set(node.id, inner);
    }
    const measured = children.map((n) => {
      const inner = groups.get(n.id);
      return inner ? { ...n, width: Math.max(n.width, inner.width + 32), height: inner.height + 64 } : n;
    });
    const ids = new Set(children.map((n) => n.id));
    const edges = input.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    edges.forEach((e) => used.add(e.id));
    const local = await solveStateScope({ nodes: measured, edges, arrowDepth: input.arrowDepth }, direction, layout);
    const nodes = [], segments2 = [...local.segments];
    for (const n of local.nodes) {
      nodes.push({ ...n, parentId: parent || void 0 });
      const inner = groups.get(n.id);
      if (!inner) continue;
      const dx = n.x + 16 + (n.width - inner.width - 32) / 2, dy = n.y + 48;
      nodes.push(...inner.nodes.map((c) => ({ ...c, x: c.x + dx, y: c.y + dy })));
      segments2.push(...inner.segments.map((e) => ({
        ...e,
        points: e.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
      })));
    }
    return { ...local, nodes, segments: segments2 };
  };
  if (!roots.length && input.nodes.length) throw new Error("constraint-conflict: containment-cycle");
  for (const n of input.nodes) if (n.parentId && !byId.has(n.parentId)) throw new Error("unsupported: missing-parent");
  const result = await solveScope(null);
  const unmatched = input.edges.filter((e) => !used.has(e.id));
  if (unmatched.length) return {
    status: "unsupported",
    reason: "cross-hierarchy-portals-required",
    unmatched: unmatched.map((e) => e.id)
  };
  for (const note of notes) {
    const owner = result.nodes.find((n) => n.id === note.noteOwner), right = note.position !== "left of";
    const placed = {
      ...note,
      kind: "note",
      x: right ? owner.x + owner.width + 90 : owner.x - 90 - note.width,
      y: owner.y + (owner.height - note.height) / 2,
      parentId: owner.parentId
    };
    result.nodes.push(placed);
    const edge = noteEdges.find((e) => e.source === note.id || e.target === note.id), sourceIsNote = edge.source === note.id;
    const p = { x: right ? owner.x + owner.width : owner.x, y: owner.y + owner.height / 2 };
    const q = { x: right ? placed.x : placed.x + placed.width, y: placed.y + placed.height / 2 };
    result.segments.push({ ...edge, owner: edge.id, points: sourceIsNote ? [q, p] : [p, q] });
  }
  return { ...result, edges: [...input.edges, ...noteEdges] };
}
var init_state_layout = __esm({
  "src/state-layout.js"() {
    init_state_model();
  }
});

// src/state-svg.js
function placement(svg, element) {
  const m = svg.getScreenCTM().inverse().multiply(element.getScreenCTM());
  return `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
}
function textLabel(doc, value, x, y, font, fill) {
  const text = doc.createElementNS(NS3, "text");
  text.setAttribute("x", x);
  text.setAttribute("y", y);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.setAttribute("font-family", font);
  text.setAttribute("font-size", "14");
  text.setAttribute("font-weight", "600");
  text.setAttribute("fill", fill);
  text.textContent = value;
  return text;
}
function freezeGeometry(model) {
  for (const n of model.nodes) Object.freeze(n);
  for (const e of model.segments) {
    e.points.forEach(Object.freeze);
    Object.freeze(e.points);
    Object.freeze(e);
  }
  Object.freeze(model.nodes);
  Object.freeze(model.segments);
  return Object.freeze(model);
}
async function layoutStateSvg(svg, semantic, layout, variables, signal) {
  if (typeof layout !== "function" || !semantic?.nodes || !semantic?.edges) {
    throw new Error("gpt-mermaid: state layout capability unavailable");
  }
  throwIfAborted(signal);
  const doc = svg.ownerDocument;
  const originalNodes = new Map([...svg.querySelectorAll("g[data-id]")].filter((n) => n.classList.contains("node") || n.classList.contains("statediagram-cluster") || n.classList.contains("cluster")).map((n) => [n.dataset.id, n]));
  const originalEdges = new Map([...svg.querySelectorAll("path.transition[data-id]")].map((e) => [e.dataset.id, e]));
  const originalLabels = new Map([...svg.querySelectorAll("g.edgeLabel")].map((l) => [
    l.querySelector("[data-id]")?.dataset.id || l.dataset.id,
    l
  ]));
  const views = /* @__PURE__ */ new Map();
  const nodes = semantic.nodes.map((n) => {
    if (n.shape === "noteGroup") return { ...n, width: 1, height: 1 };
    if (n.shape === "divider") return { ...n, width: 80, height: 48 };
    const element = originalNodes.get(n.id), shape = element && nodeShape(element);
    if (!element || !shape) throw new Error(`gpt-mermaid: missing state geometry: ${n.id}`);
    const box = boundsInSvg(svg, shape);
    views.set(n.id, { element: element.cloneNode(true), box, transform: placement(svg, element) });
    if (n.isGroup) {
      const title = element.querySelector(".cluster-label,.label,.nodeLabel");
      const size = title ? boundsInSvg(svg, title) : { width: 80, height: 20 };
      return { ...n, width: Math.max(80, size.width + 32), height: 48 };
    }
    return {
      ...n,
      width: box.width,
      height: box.height,
      // 主题CSS能覆盖rx/ry属性；容量必须使用浏览器真正画出的圆角。
      cornerRadius: shape.localName === "rect" ? Math.max(
        parseFloat(getComputedStyle(shape).rx) || 0,
        parseFloat(getComputedStyle(shape).ry) || 0,
        Number(shape.getAttribute("rx") || 0)
      ) : 0
    };
  });
  const edges = semantic.edges.map((e) => {
    if (!originalEdges.has(e.id)) throw new Error(`gpt-mermaid: missing state relation: ${e.id}`);
    const element = originalLabels.get(e.id);
    if (e.label && !element) throw new Error(`gpt-mermaid: missing state label: ${e.id}`);
    const box = element ? boundsInSvg(svg, element) : { width: 0, height: 0 };
    if (e.label) views.set(`${e.id}:label`, { element: element.cloneNode(true), box, transform: placement(svg, element) });
    return { ...e, width: box.width, height: box.height };
  });
  const solve2 = (arrowDepth) => solveStateLayout({ nodes, edges, arrowDepth }, DIRECTION[semantic.direction] || "DOWN", async (graph) => {
    throwIfAborted(signal);
    const result = await layout(graph);
    throwIfAborted(signal);
    return result;
  });
  let candidate = await solve2(11);
  if (Math.max(candidate.width, candidate.height) > 1100) candidate = await solve2(18);
  const quality = validateStateLayout(candidate);
  if (quality.unsupported || quality.issues?.length) {
    const error = new Error(`gpt-mermaid: state layout ${quality.unsupported || "constraint-conflict"}`);
    error.violations = quality.issues || quality.unmatched;
    throw error;
  }
  const model = freezeGeometry(candidate);
  const drawing = doc.createElementNS(NS3, "g"), containers = doc.createElementNS(NS3, "g");
  const paths = doc.createElementNS(NS3, "g"), objects = doc.createElementNS(NS3, "g");
  drawing.append(containers, paths, objects);
  const rendered = /* @__PURE__ */ new Map();
  for (const n of model.nodes) {
    let element;
    if (n.isGroup) {
      element = doc.createElementNS(NS3, "g");
      const old = views.get(n.id)?.element;
      element.id = old?.id || `${svg.id}-container-${rendered.size}`;
      element.setAttribute("class", "statediagram-cluster");
      const shape = doc.createElementNS(NS3, "rect");
      for (const [k, v] of Object.entries({
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        rx: 12,
        fill: n.shape === "divider" ? "none" : variables.clusterBkg || "#f7f9fc",
        stroke: variables.flowchartNodeBorderColor,
        "stroke-width": 1.5
      })) shape.setAttribute(k, v);
      if (n.shape === "divider") shape.setAttribute("stroke-dasharray", "5 5");
      element.append(shape);
      if (n.shape !== "divider") element.append(textLabel(
        doc,
        n.label,
        n.x + n.width / 2,
        n.y + 18,
        variables.fontFamily,
        variables.flowchartTextColor
      ));
      containers.append(element);
    } else {
      const view = views.get(n.id);
      if (!view) throw new Error(`gpt-mermaid: missing visual model: ${n.id}`);
      element = view.element;
      const dw = n.width - view.box.width, dh = n.height - view.box.height;
      if (dw > 0.01 || dh > 0.01) {
        const shape = nodeShape(element) || element.querySelector("g.label rect.background,rect.labelBkg");
        if (shape?.localName !== "rect") throw new Error(`gpt-mermaid: unsupported shape capacity:${n.id}`);
        shape.setAttribute("x", Number(shape.getAttribute("x") || 0) - dw / 2);
        shape.setAttribute("y", Number(shape.getAttribute("y") || 0) - dh / 2);
        shape.setAttribute("width", Number(shape.getAttribute("width")) + dw);
        shape.setAttribute("height", Number(shape.getAttribute("height")) + dh);
      }
      element.setAttribute("transform", `translate(${n.x - view.box.x + dw / 2},${n.y - view.box.y + dh / 2}) ${view.transform}`);
      if (n.kind === "label") {
        element.id = `${svg.id}-condition-${rendered.size}`;
        element.dataset.gptmLabelOwner = n.owner;
      }
      objects.append(element);
    }
    element.dataset.id = n.id;
    element.dataset.gptmLayoutObject = n.kind;
    if (n.parentId) element.dataset.gptmParent = n.parentId;
    rendered.set(n.id, element);
  }
  for (const relation of edges) {
    const segments2 = model.segments.filter((s) => s.owner === relation.id);
    const routes = segments2.map((s) => simplifyPoints(s.points));
    for (const [index, segment] of segments2.entries()) {
      const path = originalEdges.get(relation.id).cloneNode(false);
      path.id = `${path.id}-segment-${index}`;
      path.dataset.id = segment.id;
      path.dataset.source = segment.source;
      path.dataset.target = segment.target;
      path.dataset.gptmEdgeOwner = relation.id;
      path.dataset.gptmLogicalSource = relation.source;
      path.dataset.gptmLogicalTarget = relation.target;
      const route = routes[index];
      path.removeAttribute("transform");
      path.setAttribute("d", roundedPath(route, STATE_CORNER_RADIUS));
      path.setAttribute("data-points", btoa(JSON.stringify(route)));
      path.dataset.gptmSource = rendered.get(segment.source).id;
      path.dataset.gptmTarget = rendered.get(segment.target).id;
      path.dataset.gptmNativeRerouted = "true";
      if (!segment.arrow) path.removeAttribute("marker-end");
      if (relation.source === relation.target && index === 0) path.dataset.gptmSelfLoop = "true";
      if (relation.label) {
        const label = rendered.get(`${relation.id}:label`);
        if (index === 0) label.dataset.gptmLabelEdge = path.id;
        label.dataset.gptmLabelPorts = JSON.stringify({ incoming: routes[0].at(-1), outgoing: routes[1][0] });
      }
      paths.append(path);
    }
  }
  const definitions = [...svg.querySelectorAll("defs")].map((d) => d.cloneNode(true));
  const markerDefinitions = [...svg.querySelectorAll("marker")].filter((m) => !m.closest("defs")).map((m) => m.cloneNode(true));
  for (const child of [...svg.children]) if (child.localName === "g") child.remove();
  for (const definition of definitions) {
    const missing = [...definition.children].filter((child) => !child.id || !svg.getElementById(child.id));
    if (missing.length) {
      const defs = doc.createElementNS(NS3, "defs");
      defs.append(...missing);
      svg.append(defs);
    }
  }
  if (markerDefinitions.length) {
    const defs = doc.createElementNS(NS3, "defs");
    defs.append(...markerDefinitions.filter((m) => !svg.getElementById(m.id)));
    svg.append(defs);
  }
  svg.append(drawing);
  svg.setAttribute("viewBox", `0 0 ${model.width} ${model.height}`);
  svg.setAttribute("width", model.width);
  svg.setAttribute("height", model.height);
  svg.dataset.gptmStateLayout = "constraint-model";
  svg.dataset.gptmNativeRoutes = String(model.segments.length);
  svg.dataset.gptmLogicalEdges = String(edges.length);
  svg.dataset.gptmStateNodes = String(nodes.filter((n) => n.shape !== "noteGroup").length);
  svg.dataset.gptmStateLabels = String(edges.filter((e) => e.label).length);
  svg.dataset.gptmStatePorts = String(quality.ports.length);
  svg.dataset.gptmStateConstraints = quality.accepted ? "satisfied" : "crossings";
  return quality;
}
var NS3, DIRECTION;
var init_state_svg = __esm({
  "src/state-svg.js"() {
    init_state_layout();
    init_state_constraints();
    init_svg_routing();
    init_runtime_guard();
    init_state_ports();
    NS3 = "http://www.w3.org/2000/svg";
    DIRECTION = { TB: "DOWN", TD: "DOWN", BT: "UP", LR: "RIGHT", RL: "LEFT" };
  }
});

// src/render.js
function bodyAfterFrontmatter(lines) {
  let start = 0;
  while (start < lines.length) {
    const line = lines[start].replace(/^\uFEFF/, "");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) {
      start++;
      continue;
    }
    break;
  }
  if (start >= lines.length || !FRONTMATTER_FENCE_RE.test(lines[start].replace(/^\uFEFF/, ""))) {
    return lines;
  }
  for (let end = start + 1; end < lines.length; end++) {
    if (FRONTMATTER_FENCE_RE.test(lines[end])) return lines.slice(end + 1);
  }
  return lines;
}
function isFlowchart(source) {
  for (const line of bodyAfterFrontmatter(String(source || "").split(/\r?\n/))) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) continue;
    return FLOWCHART_RE.test(line);
  }
  return false;
}
function isStateDiagram(source) {
  for (const line of bodyAfterFrontmatter(String(source || "").split(/\r?\n/))) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) continue;
    return /^stateDiagram(?:-v2)?\b/.test(trimmed);
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
  return [...svg.querySelectorAll("g.node, g.cluster, g.statediagram-cluster, g.edgeLabel[data-gptm-label-owner]")].map((node) => {
    const container = nodeShape(node) || node.querySelector("g.label rect.background,rect.labelBkg");
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
function repairEdgeConnections(svg, onlyElement = null) {
  const outlines = nodeOutlines(svg);
  const elements = onlyElement ? onlyElement.matches?.(`${CONNECTED_EDGE_SELECTOR}, [data-gptm-source]`) ? [onlyElement] : [] : svg.querySelectorAll(`${CONNECTED_EDGE_SELECTOR}, [data-gptm-source]`);
  for (const edge of elements) {
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
async function attachForGeometry(svg, callback) {
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
    return await callback(live);
  } finally {
    host.remove();
  }
}
async function postProcessSvg(svgMarkup, variables, graph, config = {}) {
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
  const measured = await attachForGeometry(svg, async (live) => {
    fixSvgLabels(live, variables);
    if (graph?.state) {
      await layoutStateSvg(live, graph.state, graph.layout, variables, config.signal);
      repairEdgeConnections(live);
    } else {
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
      if (live.classList?.contains("statediagram")) {
        routeNativeEdges(live);
        repairEdgeConnections(live);
        placeEdgeLabels(live);
      }
    }
    if (graph || Number(live.getAttribute("data-gptm-native-routes")) > 0 || live.hasAttribute("data-gptm-planar-layout") || Number(live.getAttribute("data-gptm-spacing-factor")) > 1) fitSvgBounds(live);
    colorDirectionalEdges(live, variables);
    const shafts = trimArrowShafts(live);
    live.setAttribute("data-gptm-trimmed-shafts", String(shafts.trimmed));
    live.setAttribute("data-gptm-shaft-skips", String(shafts.skipped.length));
    recordCrossings(live);
    return new XMLSerializer().serializeToString(live);
  });
  return measured || new XMLSerializer().serializeToString(svg);
}
function runtimeState(runtime) {
  let state = runtimeStates.get(runtime);
  if (!state) {
    state = { queue: createSerialScheduler(), configKey: null };
    runtimeStates.set(runtime, state);
  }
  return state;
}
function createRenderer(baseUrl2 = globalThis.document?.baseURI) {
  let sequence = 0;
  function runtime(config = {}, signal) {
    return loadRuntime(config, baseUrl2, signal);
  }
  function initialize(mermaid, config, flowchart, stateDiagram) {
    const layout = flowchart ? "elk" : "dagre";
    const state = runtimeState(mermaid);
    const initialization = {
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
      ...runtimeLayoutOptions(flowchart, stateDiagram),
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
    };
    const nextKey = JSON.stringify(initialization);
    if (state.configKey === nextKey) return;
    mermaid.initialize(initialization);
    state.configKey = nextKey;
  }
  async function renderSvg(rawSource, config = {}) {
    const source = sanitizeMermaidSource(rawSource);
    if (!source) throw new Error("gpt-mermaid: diagram source is empty or contains blocked directives");
    const timeoutMs = positiveTimeout(
      config.renderTimeoutMs ?? config.timeoutMs,
      DEFAULT_RENDER_TIMEOUT_MS
    );
    const mermaid = await runtime(config, config.signal);
    const renderQueue = runtimeState(mermaid).queue;
    return renderQueue.schedule(async (signal) => {
      throwIfAborted(signal);
      const flowchart = isFlowchart(source);
      const stateDiagram = isStateDiagram(source);
      initialize(mermaid, config, flowchart, stateDiagram);
      const id = `mgpt-${Date.now().toString(36)}-${++sequence}`;
      const result = await mermaid.render(id, source);
      throwIfAborted(signal);
      if (!result?.svg) throw new Error("gpt-mermaid: renderer returned no SVG");
      let graph;
      if (stateDiagram && result.gptMermaidStateModel) {
        graph = { state: result.gptMermaidStateModel, layout: mermaid.gptMermaidLayout };
      } else if (mermaid.mermaidAPI?.getDiagramFromText && (flowchart || /^\s*C4\w+/m.test(source))) {
        const diagram = await mermaid.mermaidAPI.getDiagramFromText(source);
        throwIfAborted(signal);
        if (flowchart && diagram.db.getData) graph = { ...diagram.db.getData(), direction: diagram.db.getDirection() };
        else if (diagram.db.getRels) graph = { c4Nodes: diagram.db.getC4ShapeArray(), c4Relations: diagram.db.getRels() };
      }
      const themeCSS = flowchart ? buildFlowchartThemeCSS(config.themeVariables) : buildGlobalThemeCSS(config.themeVariables);
      let svg = result.svg;
      if (!flowchart && themeCSS && !svg.includes("mgpt-global-theme")) {
        const style = `<style id="mgpt-global-theme">${themeCSS}</style>`;
        svg = svg.replace(/<svg\b[^>]*>/, (tag) => `${tag}${style}`);
      }
      const processed = await postProcessSvg(svg, config.themeVariables, graph, { ...config, signal });
      throwIfAborted(signal);
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
    }, {
      signal: config.signal,
      timeoutMs,
      timeoutMessage: "gpt-mermaid: render timed out"
    });
  }
  function load(config = {}) {
    return runtime(config, config.signal);
  }
  return { renderSvg, load, postProcessSvg };
}
var FLOWCHART_RE, FRONTMATTER_FENCE_RE, DIRECTION_KEYS, TRIANGLE_MARKER_RE, TRIANGLE_ASPECT, CONNECTED_EDGE_SELECTOR, PATH_NUMBER, runtimeStates;
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
    init_runtime_guard();
    init_runtime_loader();
    init_state_svg();
    init_layout_style();
    FLOWCHART_RE = /^\s*(?:flowchart|graph)\b/im;
    FRONTMATTER_FENCE_RE = /^---\s*$/;
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
    runtimeStates = /* @__PURE__ */ new WeakMap();
  }
});

// src/ui.js
function icon(doc, name) {
  const shapes = ICONS[name];
  if (!shapes) return null;
  const svg = doc.createElementNS(NS4, "svg");
  svg.setAttribute("class", "mgpt-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const [tag, attrs] of shapes) {
    const node = doc.createElementNS(NS4, tag);
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
  else if (el?.querySelector?.(".mgpt-icon")) {
    el.setAttribute("aria-label", text);
    el.title = text;
  } else if (el) el.textContent = text;
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
      state = {
        records: /* @__PURE__ */ new Set(),
        viewer: null,
        outside: null,
        pendingWaits: /* @__PURE__ */ new Map(),
        disconnectObserver: null
      };
      state.outside = (event) => {
        if (!event.target.closest?.("[data-gpt-mermaid]")) closeMenus(state);
      };
      doc.addEventListener("pointerdown", state.outside, true);
      states.set(doc, state);
    }
    return state;
  }
  function menuItems(record) {
    return [...record.menu.querySelectorAll(MENU_ITEM_SELECTOR)];
  }
  function setMenuExpanded(record, open) {
    record.menu.hidden = !open;
    record.figure.dataset.menuOpen = String(open);
    record.menuButton?.setAttribute("aria-expanded", String(open));
  }
  function openMenu(state, record, position = "first") {
    closeMenus(state, record);
    setMenuExpanded(record, true);
    const items = menuItems(record);
    (position === "last" ? items.at(-1) : items[0])?.focus();
  }
  function closeMenu(record, restoreFocus = false) {
    if (!record?.menu) return;
    setMenuExpanded(record, false);
    if (restoreFocus) record.menuButton?.focus();
  }
  function closeMenus(state, except = null) {
    for (const record of state.records) {
      if (record === except || !record.menu) continue;
      setMenuExpanded(record, false);
    }
  }
  function handleMenuKeydown(record, event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(record, true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = menuItems(record);
    if (!items.length) return;
    const current = items.indexOf(record.figure.ownerDocument.activeElement);
    let next = 0;
    if (event.key === "End") next = items.length - 1;
    else if (event.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % items.length;
    else if (event.key === "ArrowUp") next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
    event.preventDefault();
    items[next].focus();
  }
  function handleMenuButtonKeydown(record, event) {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    openMenu(record.state, record, event.key === "ArrowUp" ? "last" : "first");
  }
  function showNotice(record, message, kind = "info") {
    record.status.hidden = false;
    record.status.dataset.kind = kind;
    record.figure.dataset.notice = kind;
    record.status.setAttribute("role", kind === "error" ? "alert" : "status");
    record.status.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
    record.status.textContent = message;
  }
  function setStatus(record, status, message) {
    record.figure.dataset.state = status;
    if (status === "error") record.figure.dataset.notice = "error";
    else delete record.figure.dataset.notice;
    record.status.dataset.kind = status;
    record.status.setAttribute("role", status === "error" ? "alert" : "status");
    record.status.setAttribute("aria-live", status === "error" ? "assertive" : "polite");
    record.status.textContent = message;
    record.status.hidden = status === "ready";
    record.retry.hidden = status !== "error";
    for (const action of ["copy-image", "download", "zoom-in", "zoom-out", "fit", "expand"]) {
      const el = record.buttons[action];
      if (el) el.disabled = status !== "ready";
    }
    if (status === "ready" || status === "error") settleRecord(record, status);
  }
  function settleRecord(record, outcome) {
    const waiters = [...record.waiters];
    record.waiters.clear();
    for (const waiter of waiters) waiter(outcome);
  }
  function watchDisconnect(record, waiter) {
    const state = record.state;
    state.pendingWaits.set(record, waiter);
    if (state.disconnectObserver || !record.figure.ownerDocument.documentElement) return;
    state.disconnectObserver = new MutationObserver(() => {
      for (const [pending, finish] of [...state.pendingWaits]) {
        if (!pending.figure.isConnected) {
          if (typeof pending.destroy === "function") pending.destroy();
          else finish("disconnected");
        }
      }
    });
    state.disconnectObserver.observe(record.figure.ownerDocument.documentElement, {
      childList: true,
      subtree: true
    });
  }
  function unwatchDisconnect(record, waiter) {
    const state = record.state;
    if (state.pendingWaits.get(record) === waiter) state.pendingWaits.delete(record);
    if (!state.pendingWaits.size) {
      state.disconnectObserver?.disconnect();
      state.disconnectObserver = null;
    }
  }
  function zoom(record, value, reset = false, anchor = null) {
    if (!record.result) return;
    const inDialog = Boolean(record.state.viewer?.dialog?.open && record.state.viewer.dialog.contains(record.stage));
    if (inDialog) record.stage.style.height = "100%";
    const box = record.stage.getBoundingClientRect();
    if (record.motion?.resize(box)) {
      anchor = null;
      value = record.zoom;
    }
    const previous = anchor?.fromZoom ?? record.zoom ?? 1;
    const next = Math.min(8, Math.max(0.25, value));
    if (reset) {
      record.motion?.reset();
      record.panX = record.panY = 0;
      if (!inDialog) record.stage.scrollTop = 0;
    } else if (anchor) {
      const x = anchor.x - box.left - box.width / 2;
      const y = anchor.y - box.top - box.height / 2;
      record.panX = x - (x - (anchor.fromPanX ?? record.panX ?? 0)) * next / previous;
      record.panY = y - (y - (anchor.fromPanY ?? record.panY ?? 0)) * next / previous;
      record.panX += (anchor.toX ?? anchor.x) - anchor.x;
      record.panY += (anchor.toY ?? anchor.y) - anchor.y;
    }
    record.zoom = next;
    const available = Math.max(1, record.stage.clientWidth || box.width || record.result.width);
    const maxHeight = inDialog ? Math.max(1, box.height) : record.config.fitMaxHeight;
    const fitted = Math.min(1, available / record.result.width, maxHeight / record.result.height);
    const width = record.result.width * fitted;
    const height = record.result.height * fitted;
    const naturalStageHeight = Math.max(INLINE_STAGE_MIN_HEIGHT, height);
    const viewport = record.stage.ownerDocument.defaultView;
    const inlineCap = Math.max(240, Math.min(INLINE_STAGE_MAX_HEIGHT, (viewport?.innerHeight || 900) * 0.8));
    const scrollable = !inDialog && !Number.isFinite(maxHeight) && naturalStageHeight > inlineCap;
    const stageHeight = inDialog ? Math.max(1, box.height) : Math.min(naturalStageHeight, scrollable ? inlineCap : Infinity);
    record.stage.style.height = inDialog ? "100%" : `${stageHeight}px`;
    record.image.style.width = `${width}px`;
    record.image.style.height = `${height}px`;
    if (scrollable) {
      record.stage.style.overflowY = "auto";
      record.stage.style.overflowX = "hidden";
      record.stage.dataset.scrollable = "true";
      record.image.style.position = "relative";
      record.image.style.left = "0";
      record.image.style.top = "0";
      record.image.style.margin = "0 auto";
      record.image.style.transformOrigin = "top center";
    } else {
      record.stage.style.removeProperty("overflow-y");
      record.stage.style.removeProperty("overflow-x");
      delete record.stage.dataset.scrollable;
      for (const property of ["position", "left", "top", "margin", "transform-origin"]) {
        record.image.style.removeProperty(property);
      }
    }
    const capX = (width * next + available) / 2 - 24;
    const capY = scrollable ? Math.max(0, (height * next - stageHeight) / 2) : (height * next + stageHeight) / 2 - 24;
    record.panX = Math.min(capX, Math.max(-capX, record.panX || 0));
    record.panY = Math.min(capY, Math.max(-capY, record.panY || 0));
    record.image.style.transform = scrollable ? `translate(${record.panX}px, ${record.panY}px) scale(${next})` : `translate(calc(-50% + ${record.panX}px), calc(-50% + ${record.panY}px)) scale(${next})`;
    record.stage.dataset.zoom = String(next);
    record.stage.dataset.panX = String(record.panX);
    record.stage.dataset.panY = String(record.panY);
    const percent = Math.round(next * 100);
    const zoomMessage = `\u7F29\u653E ${percent}%${next === 1 ? "\uFF0C\u9002\u5E94\u7A97\u53E3" : ""}`;
    setLabel(record.buttons.fit, next === 1 ? "\u590D\u4F4D" : `${percent}%`);
    if (record.state.viewer?.record === record) {
      const viewer2 = record.state.viewer;
      if (viewer2.zoomStatus && viewer2.zoomStatus.textContent !== zoomMessage) viewer2.zoomStatus.textContent = zoomMessage;
      setLabel(viewer2.fitButton, next === 1 ? "\u9002\u5E94\u7A97\u53E3\uFF0C\u5F53\u524D 100%" : `\u9002\u5E94\u7A97\u53E3\uFF0C\u5F53\u524D ${percent}%`);
    }
    if (!inDialog) {
      if (record.result.width > record.config.maxInlineWidth) record.figure.dataset.wide = "true";
      else delete record.figure.dataset.wide;
    }
  }
  function bindMotion(record) {
    const pointers = /* @__PURE__ */ new Map();
    let gesture = null;
    const doc = record.stage.ownerDocument;
    const inViewer = () => record.state.viewer?.dialog?.open && record.state.viewer.viewport.contains(record.stage);
    const release = (id) => {
      if (record.stage.hasPointerCapture?.(id)) record.stage.releasePointerCapture(id);
    };
    const rebase = () => {
      const active = [...pointers.entries()].slice(0, 2);
      gesture = active.length ? {
        ids: active.map(([id]) => id),
        x: active.reduce((sum, [, p]) => sum + p.x, 0) / active.length,
        y: active.reduce((sum, [, p]) => sum + p.y, 0) / active.length,
        distance: active.length === 2 ? Math.hypot(active[1][1].x - active[0][1].x, active[1][1].y - active[0][1].y) : 0,
        fromZoom: record.zoom,
        fromPanX: record.panX || 0,
        fromPanY: record.panY || 0,
        box: record.stage.getBoundingClientRect()
      } : null;
    };
    record.motion = {
      resize(box) {
        if (!gesture || ["left", "top", "width", "height"].every((key) => Math.abs(box[key] - gesture.box[key]) < 0.5)) return false;
        record.motion.reset();
        return true;
      },
      reset() {
        const ids = [...pointers.keys()];
        pointers.clear();
        gesture = null;
        record.stage.dataset.dragging = "false";
        ids.forEach(release);
      },
      wheel(event) {
        if (!record.result) return;
        if (!inViewer() && !event.ctrlKey) return;
        event.preventDefault();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? record.stage.clientHeight : 1;
        const delta2 = Math.min(600, Math.max(-600, event.deltaY * unit));
        zoom(record, record.zoom * Math.exp(-delta2 * 2e-3), false, { x: event.clientX, y: event.clientY });
      },
      down(event) {
        if (event.button !== 0 || !record.result) return;
        if (event.pointerType === "touch" && !inViewer()) return;
        const first = pointers.values().next().value;
        if (first && first.type !== event.pointerType) return;
        event.preventDefault();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, type: event.pointerType });
        if (pointers.size <= 2) rebase();
        record.stage.setPointerCapture?.(event.pointerId);
        record.stage.dataset.dragging = "true";
      },
      move(event) {
        const pointer = pointers.get(event.pointerId);
        if (!pointer) return;
        event.preventDefault();
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        if (!gesture?.ids.includes(event.pointerId)) return;
        const active = gesture.ids.map((id) => pointers.get(id));
        const x = active.reduce((sum, p) => sum + p.x, 0) / active.length;
        const y = active.reduce((sum, p) => sum + p.y, 0) / active.length;
        const distance2 = active.length === 2 ? Math.hypot(active[1].x - active[0].x, active[1].y - active[0].y) : 0;
        const ratio = gesture.distance > 1 ? distance2 / gesture.distance : 1;
        zoom(record, gesture.fromZoom * ratio, false, { ...gesture, toX: x, toY: y });
        if (gesture && gesture.distance <= 1 && distance2 > 1) rebase();
      },
      end(event) {
        const active = gesture?.ids.includes(event.pointerId);
        pointers.delete(event.pointerId);
        if (active) rebase();
        release(event.pointerId);
        record.stage.dataset.dragging = String(pointers.size > 0);
      },
      visibility() {
        if (doc.hidden) record.motion.reset();
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
    doc.addEventListener("visibilitychange", record.motion.visibility);
    doc.defaultView?.addEventListener("blur", record.motion.reset);
    record.motion.destroy = () => {
      record.motion.reset();
      doc.removeEventListener("visibilitychange", record.motion.visibility);
      doc.defaultView?.removeEventListener("blur", record.motion.reset);
    };
  }
  function lockBackgroundScroll(state, doc) {
    const viewer2 = state.viewer;
    if (!viewer2 || viewer2.scrollLock) return;
    const root = doc.documentElement;
    const body = doc.body;
    const scrollX = doc.defaultView?.scrollX ?? 0;
    const scrollY = doc.defaultView?.scrollY ?? 0;
    const lock = {
      root,
      body,
      scrollX,
      scrollY,
      rootHadLock: root.classList.contains(SCROLL_LOCK_CLASS),
      bodyHadLock: Boolean(body?.classList.contains(SCROLL_LOCK_CLASS))
    };
    root.classList.add(SCROLL_LOCK_CLASS);
    body?.classList.add(SCROLL_LOCK_CLASS);
    viewer2.scrollLock = lock;
  }
  function unlockBackgroundScroll(state) {
    const viewer2 = state.viewer;
    const lock = viewer2?.scrollLock;
    if (!lock) return;
    if (!lock.rootHadLock) lock.root.classList.remove(SCROLL_LOCK_CLASS);
    if (lock.body && !lock.bodyHadLock) lock.body.classList.remove(SCROLL_LOCK_CLASS);
    viewer2.scrollLock = null;
    const win = lock.root.ownerDocument.defaultView;
    if (win && (Math.abs(win.scrollX - lock.scrollX) > 0.5 || Math.abs(win.scrollY - lock.scrollY) > 0.5)) {
      win.scrollTo(lock.scrollX, lock.scrollY);
    }
  }
  function viewer(state, record) {
    const doc = record.figure.ownerDocument;
    if (!state.viewer) {
      const dialog = doc.createElement("dialog");
      dialog.className = "mgpt-dialog";
      dialog.setAttribute("aria-label", "\u56FE\u8868\u5168\u5C4F\u67E5\u770B\u5668");
      const bar = doc.createElement("div");
      bar.className = "mgpt-dialog-bar";
      const group = doc.createElement("div");
      group.className = "mgpt-dialog-actions";
      let fitButton = null;
      for (const [action, label, symbol] of [
        ["zoom-out", "\u7F29\u5C0F", "zoom-out"],
        ["fit", "\u9002\u5E94\u7A97\u53E3", "fit"],
        ["zoom-in", "\u653E\u5927", "zoom-in"]
      ]) {
        const item = button(doc, action, label, symbol, true);
        item.className = "mgpt-icon-button";
        group.append(item);
        if (action === "fit") fitButton = item;
      }
      const zoomStatus = doc.createElement("output");
      zoomStatus.className = "mgpt-zoom-status";
      zoomStatus.setAttribute("aria-label", "\u5F53\u524D\u7F29\u653E");
      zoomStatus.setAttribute("aria-live", "polite");
      zoomStatus.setAttribute("aria-atomic", "true");
      zoomStatus.textContent = "\u7F29\u653E 100%\uFF0C\u9002\u5E94\u7A97\u53E3";
      group.insertBefore(zoomStatus, fitButton?.nextSibling ?? null);
      const close = button(doc, "close", "\u5173\u95ED", "close", true);
      close.className = "mgpt-icon-button";
      bar.append(group, close);
      const viewport = doc.createElement("div");
      viewport.className = "mgpt-dialog-viewport";
      dialog.append(bar, viewport);
      doc.body.append(dialog);
      state.viewer = { dialog, viewport, record: null, fitButton, zoomStatus, scrollLock: null };
      dialog.addEventListener("close", () => {
        if (!dialog.open) {
          closeViewer(state, false);
          unlockBackgroundScroll(state);
        }
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
    record.stage.setAttribute("aria-label", "\u53CC\u6307\u7F29\u653E\uFF0C\u5355\u6307\u62D6\u52A8\u5E73\u79FB\uFF1B\u9F20\u6807\u6EDA\u8F6E\u7F29\u653E\uFF0CHome \u590D\u4F4D");
    if (!state.viewer.dialog.open) {
      lockBackgroundScroll(state, doc);
      try {
        state.viewer.dialog.showModal();
      } catch (error) {
        unlockBackgroundScroll(state);
        state.viewer.record = null;
        record.viewport.append(record.stage);
        record.stage.setAttribute("aria-label", "\u89E6\u5C4F\u6ED1\u52A8\u9875\u9762\uFF0C\u70B9\u51FB\u653E\u5927\u540E\u53CC\u6307\u7F29\u653E\uFF1BCtrl + \u6EDA\u8F6E\u7F29\u653E\uFF0C\u9F20\u6807\u62D6\u52A8\u5E73\u79FB");
        zoom(record, 1, true);
        throw error;
      }
    }
    zoom(record, 1, true);
  }
  function closeViewer(state, closeDialog = true) {
    const current = state.viewer;
    if (!current) return;
    const record = current.record;
    current.record = null;
    if (record) {
      record.viewport.append(record.stage);
      record.stage.setAttribute("aria-label", "\u89E6\u5C4F\u6ED1\u52A8\u9875\u9762\uFF0C\u70B9\u51FB\u653E\u5927\u540E\u53CC\u6307\u7F29\u653E\uFF1BCtrl + \u6EDA\u8F6E\u7F29\u653E\uFF0C\u9F20\u6807\u62D6\u52A8\u5E73\u79FB");
      zoom(record, 1, true);
    }
    if (closeDialog) {
      if (current.dialog.open) current.dialog.close();
      unlockBackgroundScroll(state);
    }
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
      if (record.menu.hidden) openMenu(state, record);
      else closeMenu(record, true);
      return;
    }
    const openedMenu = !record.menu.hidden;
    closeMenus(state);
    if (openedMenu && record.menu.contains(actionEl)) record.menuButton?.focus();
    if (action === "copy") {
      navigator.clipboard.writeText(record.source).then(() => {
        setLabel(actionEl, "\u5DF2\u590D\u5236\u6E90\u7801");
        showNotice(record, "\u6E90\u7801\u5DF2\u590D\u5236", "success");
      }).catch((error) => showNotice(record, `\u590D\u5236\u6E90\u7801\u5931\u8D25\uFF1A${error?.message || error}`, "error"));
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
        showNotice(record, "\u56FE\u7247\u5DF2\u590D\u5236", "success");
      }).catch((error) => showNotice(record, `\u590D\u5236\u56FE\u7247\u5931\u8D25\uFF1A${error?.message || error}`, "error"));
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
    record.renderAbort?.abort();
    const abort = new AbortController();
    record.renderAbort = abort;
    const attempt = (record.renderAttempt || 0) + 1;
    record.renderAttempt = attempt;
    record.loading = true;
    setStatus(record, "loading", "\u6B63\u5728\u6E32\u67D3\u56FE\u8868\u2026");
    const timeoutMs = positiveTimeout(
      record.config.renderTimeoutMs ?? record.config.timeoutMs,
      DEFAULT_RENDER_TIMEOUT_MS
    );
    const external = record.config.signal;
    const forwardAbort = () => abort.abort(external?.reason);
    if (external?.aborted) forwardAbort();
    else external?.addEventListener?.("abort", forwardAbort, { once: true });
    clearTimeout(record.imageTimer);
    record.imageTimer = 0;
    try {
      const result = await renderSvg(record.source, {
        ...record.config,
        signal: abort.signal,
        renderTimeoutMs: timeoutMs
      });
      if (attempt !== record.renderAttempt || record.destroyed) {
        record.loading = false;
        return;
      }
      if (!record.figure.isConnected) {
        record.loading = false;
        settleRecord(record, "disconnected");
        return;
      }
      if (record.url) URL.revokeObjectURL(record.url);
      record.result = result;
      record.url = URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }));
      record.image.onload = () => {
        clearTimeout(record.imageTimer);
        record.imageTimer = 0;
        if (attempt !== record.renderAttempt || record.destroyed) {
          record.loading = false;
          return;
        }
        record.loading = false;
        setStatus(record, "ready", "\u56FE\u8868\u5DF2\u6E32\u67D3");
        zoom(record, record.zoom);
      };
      record.image.onerror = () => {
        clearTimeout(record.imageTimer);
        record.imageTimer = 0;
        if (attempt !== record.renderAttempt || record.destroyed) return;
        record.loading = false;
        record.image.hidden = true;
        record.image.removeAttribute("src");
        if (record.url) {
          URL.revokeObjectURL(record.url);
          record.url = null;
        }
        setStatus(record, "error", "\u56FE\u7247\u65E0\u6CD5\u663E\u793A\uFF0C\u53EF\u91CD\u8BD5\u6216\u68C0\u67E5\u6E90\u7801\u3002");
      };
      record.image.src = record.url;
      record.image.hidden = false;
      record.imageTimer = setTimeout(() => {
        if (attempt !== record.renderAttempt || record.destroyed) return;
        record.imageTimer = 0;
        record.loading = false;
        record.image.hidden = true;
        record.image.removeAttribute("src");
        if (record.url) {
          URL.revokeObjectURL(record.url);
          record.url = null;
        }
        setStatus(record, "error", "\u56FE\u7247\u52A0\u8F7D\u8D85\u65F6\uFF0C\u53EF\u91CD\u8BD5\u6216\u68C0\u67E5\u56FE\u8868\u5C3A\u5BF8\u3002");
      }, timeoutMs);
    } catch (error) {
      if (attempt !== record.renderAttempt) return;
      record.loading = false;
      if (record.destroyed) {
        settleRecord(record, "destroyed");
        return;
      }
      if (!record.figure.isConnected) {
        settleRecord(record, "disconnected");
        return;
      }
      record.image.hidden = true;
      if (record.url) {
        URL.revokeObjectURL(record.url);
        record.url = null;
      }
      const message = error?.name === "TimeoutError" ? "\u6E32\u67D3\u8D85\u65F6\uFF0C\u53EF\u91CD\u8BD5\u6216\u7B80\u5316\u56FE\u8868\u3002" : error?.name === "AbortError" ? "\u6E32\u67D3\u5DF2\u53D6\u6D88\u3002" : error?.message || String(error);
      setStatus(record, "error", message);
    } finally {
      external?.removeEventListener?.("abort", forwardAbort);
    }
  }
  function createRecord(source, sourceElement, options2) {
    const doc = options2.document || sourceElement?.ownerDocument || document;
    const state = uiState(doc);
    const config = getConfig(options2);
    const figure = doc.createElement("figure");
    figure.className = "mgpt-diagram";
    figure.dataset.gptMermaid = "";
    figure.dataset.state = "pending";
    figure.setAttribute("aria-label", "Mermaid \u56FE\u8868");
    const toolbar = doc.createElement("div");
    toolbar.className = "mgpt-floatbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "\u56FE\u8868\u64CD\u4F5C");
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
      item.tabIndex = -1;
      menu.append(item);
      buttons[action] = item;
    }
    toolbar.append(menuButton, expandButton, menu);
    const status = doc.createElement("div");
    status.className = "mgpt-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    const retry = button(doc, "retry", "\u91CD\u65B0\u6E32\u67D3");
    retry.className = "mgpt-retry";
    const viewport = doc.createElement("div");
    viewport.className = "mgpt-viewport";
    viewport.setAttribute("role", "group");
    viewport.tabIndex = 0;
    viewport.setAttribute("aria-label", "\u56FE\u8868\u9884\u89C8");
    const stage = doc.createElement("div");
    stage.className = "mgpt-stage";
    stage.tabIndex = 0;
    stage.setAttribute("aria-label", "\u89E6\u5C4F\u6ED1\u52A8\u9875\u9762\uFF0C\u70B9\u51FB\u653E\u5927\u540E\u53CC\u6307\u7F29\u653E\uFF1BCtrl + \u6EDA\u8F6E\u7F29\u653E\uFF0C\u9F20\u6807\u62D6\u52A8\u5E73\u79FB");
    const image = doc.createElement("img");
    image.className = "mgpt-image";
    image.alt = "Mermaid \u56FE\u8868";
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
      destroyed: false,
      waiters: /* @__PURE__ */ new Set(),
      renderAbort: null,
      renderAttempt: 0,
      imageTimer: 0
    };
    state.records.add(record);
    menuButton.addEventListener("keydown", (event) => handleMenuButtonKeydown(record, event));
    menu.addEventListener("keydown", (event) => handleMenuKeydown(record, event));
    bindMotion(record);
    setStatus(record, "pending", "\u6EDA\u52A8\u5230\u6B64\u5904\u65F6\u663E\u793A\u56FE\u8868\u2026");
    if (window.ResizeObserver) {
      record.resize = new ResizeObserver(() => {
        if (!record.result || record.destroyed || record.resizeFrame) return;
        record.resizeFrame = requestAnimationFrame(() => {
          record.resizeFrame = 0;
          if (!record.destroyed && record.result) zoom(record, record.zoom);
        });
      });
      record.resize.observe(stage);
    }
    record.destroy = () => {
      if (record.destroyed) return;
      record.destroyed = true;
      record.loading = false;
      record.renderAttempt += 1;
      record.renderAbort?.abort();
      clearTimeout(record.imageTimer);
      record.motion.destroy();
      record.resize?.disconnect();
      if (record.resizeFrame) cancelAnimationFrame(record.resizeFrame);
      if (state.viewer?.record === record) closeViewer(state);
      if (record.url) URL.revokeObjectURL(record.url);
      state.records.delete(record);
      settleRecord(record, "destroyed");
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
  async function mount(target, source, options2 = {}) {
    const doc = target?.ownerDocument || document;
    const sourceElement = options2.sourceElement || null;
    const record = createRecord(source, sourceElement, { ...options2, document: doc });
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
  function waitForRecord(record) {
    const state = record.figure.dataset.state;
    if (record.destroyed || !record.figure.isConnected || state === "ready" || state === "error") {
      return Promise.resolve(record);
    }
    return new Promise((resolve) => {
      let settled = false;
      let timer = 0;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        record.waiters.delete(finish);
        unwatchDisconnect(record, finish);
        resolve(record);
      };
      record.waiters.add(finish);
      watchDisconnect(record, finish);
      if (!record.figure.isConnected) {
        finish();
        return;
      }
      const timeoutMs = positiveTimeout(
        record.config.renderTimeoutMs ?? record.config.timeoutMs,
        DEFAULT_RENDER_TIMEOUT_MS
      ) + 1e3;
      timer = setTimeout(() => {
        if (settled) return;
        record.renderAbort?.abort(timeoutError("gpt-mermaid: render wait timed out"));
        record.loading = false;
        setStatus(record, "error", "\u6E32\u67D3\u8D85\u65F6\uFF0C\u53EF\u91CD\u8BD5\u6216\u7B80\u5316\u56FE\u8868\u3002");
        finish();
      }, timeoutMs);
    });
  }
  function renderAll(root = document, options2 = {}) {
    const doc = root.ownerDocument || root;
    const diagrams = [];
    const codeBlocks = [...root.querySelectorAll("pre > code.language-mermaid, pre > code.lang-mermaid")];
    for (const code of codeBlocks) {
      if (code.closest("[data-gpt-mermaid]")) continue;
      const pre = code.parentElement;
      const source = code.textContent || "";
      const record = createRecord(source, pre, { ...options2, document: doc });
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
      const record = createRecord(source, null, { ...options2, document: doc });
      target.replaceWith(record.figure);
      record.figure.addEventListener("click", (event) => handleClick(uiState(doc), event));
      void renderRecord(record);
      diagrams.push(record);
    }
    return Promise.all(diagrams.map(waitForRecord));
  }
  return { mount, renderAll, handleClick, uiState, closeMenus, svgToPng };
}
var NS4, SCROLL_LOCK_CLASS, MENU_ITEM_SELECTOR, INLINE_STAGE_MAX_HEIGHT, INLINE_STAGE_MIN_HEIGHT, ICONS;
var init_ui = __esm({
  "src/ui.js"() {
    init_runtime_guard();
    NS4 = "http://www.w3.org/2000/svg";
    SCROLL_LOCK_CLASS = "mgpt-scroll-locked";
    MENU_ITEM_SELECTOR = '[role="menuitem"]:not(:disabled)';
    INLINE_STAGE_MAX_HEIGHT = 720;
    INLINE_STAGE_MIN_HEIGHT = 112;
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
    styles_default = '/* \u804C\u8D23\uFF1Agpt-mermaid \u7684 ChatGPT \u98CE\u683C\u5185\u8054\u56FE\u8868\u6837\u5F0F\u3002 */\nhtml.mgpt-scroll-locked,\nbody.mgpt-scroll-locked {\n  overflow: hidden !important;\n  overscroll-behavior: none !important;\n  scrollbar-gutter: stable;\n}\n.mgpt-diagram {\n  position: relative;\n  display: block;\n  width: 100%;\n  min-width: 0;\n  max-width: 100%;\n  margin: 18px 0;\n  border: 0;\n  background: transparent;\n  color: #263244;\n  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;\n}\n.mgpt-diagram[data-wide="true"] {\n  width: min(calc(100% + 8rem), 96vw);\n  max-width: 96vw;\n  margin-left: 50%;\n  transform: translateX(-50%);\n}\n.mgpt-floatbar {\n  position: absolute;\n  top: 4px;\n  right: 4px;\n  z-index: 8;\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  padding: 2px;\n  border: 1px solid rgba(26, 28, 31, .06);\n  border-radius: 9999px;\n  background: rgba(255, 255, 255, .94);\n  box-shadow: 0 1px 4px rgba(24, 32, 48, .08);\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity .15s ease;\n}\n.mgpt-diagram:hover .mgpt-floatbar,\n.mgpt-diagram:focus-within .mgpt-floatbar,\n.mgpt-diagram[data-menu-open="true"] .mgpt-floatbar,\n.mgpt-diagram[data-state="error"] .mgpt-floatbar {\n  opacity: 1;\n  pointer-events: auto;\n}\n@media (hover: none), (pointer: coarse) {\n  .mgpt-floatbar { opacity: 1; pointer-events: auto; }\n}\n.mgpt-icon-button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 32px;\n  height: 32px;\n  padding: 0;\n  border: 0;\n  border-radius: 9999px;\n  background: transparent;\n  color: #626f82;\n  cursor: pointer;\n}\n.mgpt-icon-button:hover:not(:disabled),\n.mgpt-diagram[data-menu-open="true"] .mgpt-floatbar [data-mgpt-action="menu"] {\n  background: #ebf0f7;\n  color: #263244;\n}\n.mgpt-icon-button:focus-visible,\n.mgpt-menuitem:focus-visible {\n  outline: 2px solid #2563c9;\n  outline-offset: 1px;\n}\n.mgpt-icon {\n  width: 16px;\n  height: 16px;\n  flex-shrink: 0;\n}\n.mgpt-menu {\n  position: absolute;\n  top: calc(100% + 6px);\n  right: 0;\n  z-index: 20;\n  display: flex;\n  flex-direction: column;\n  min-width: 148px;\n  padding: 6px;\n  border: 1px solid #e1e7ef;\n  border-radius: 12px;\n  background: #fff;\n  box-shadow: 0 8px 32px #1b2b4212, 0 1px 4px #1b2b4208;\n}\n.mgpt-menu[hidden] { display: none; }\n.mgpt-menuitem {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  padding: 7px 10px;\n  border: 0;\n  border-radius: 8px;\n  background: transparent;\n  color: #263244;\n  font: inherit;\n  font-size: 12.5px;\n  line-height: 1.5;\n  text-align: left;\n  cursor: pointer;\n}\n.mgpt-menuitem:hover:not(:disabled) { background: #f2f5f9; }\n.mgpt-menuitem:disabled,\n.mgpt-icon-button:disabled { opacity: .42; cursor: default; }\n.mgpt-status {\n  padding: 12px 16px;\n  color: #626f82;\n  font-size: 12px;\n  line-height: 1.6;\n}\n.mgpt-status[data-kind="error"],\n.mgpt-diagram[data-state="error"] .mgpt-status { color: #a44c32; }\n.mgpt-retry {\n  margin: 0 16px 12px;\n  padding: 5px 9px;\n  border: 1px solid #e1e7ef;\n  border-radius: 7px;\n  background: #fff;\n  color: #263244;\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n}\n.mgpt-retry[hidden] { display: none; }\n.mgpt-viewport {\n  box-sizing: border-box;\n  width: 100%;\n  min-width: 0;\n  max-width: 100%;\n  padding: 8px 0;\n  overflow: visible;\n  background: transparent;\n}\n.mgpt-stage {\n  position: relative;\n  width: 100%;\n  min-height: 112px;\n  overflow: hidden;\n  cursor: grab;\n  touch-action: pan-y pinch-zoom;\n  user-select: none;\n}\n.mgpt-stage[data-dragging="true"] { cursor: grabbing; }\n.mgpt-stage:focus-visible { outline: 2px solid #2563c9; outline-offset: -2px; }\n.mgpt-image {\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  display: block;\n  width: 100%;\n  height: auto;\n  max-width: none;\n  margin: 0;\n  border: 0;\n  object-fit: contain;\n  pointer-events: none;\n  transform-origin: center;\n}\n.mgpt-image[hidden] { display: none; }\n.mgpt-diagram > pre {\n  max-height: 420px;\n  margin: 0;\n  overflow: auto;\n}\n.mgpt-dialog {\n  box-sizing: border-box;\n  width: min(1440px, calc(100vw - 32px));\n  height: min(900px, calc(100dvh - 32px));\n  max-width: none;\n  padding: 0;\n  border: 1px solid #e1e7ef;\n  border-radius: 16px;\n  background: #fff;\n  color: #263244;\n  box-shadow: 0 8px 32px #1b2b4212;\n  overflow: hidden;\n  overscroll-behavior: contain;\n}\n.mgpt-dialog::backdrop { background: #0006; }\n.mgpt-dialog[open] { display: flex; flex-direction: column; }\n.mgpt-dialog-bar {\n  display: flex;\n  align-items: center;\n  flex: 0 0 auto;\n  min-height: 42px;\n  padding: 5px 8px;\n  border-bottom: 1px solid #f1f4f8;\n  background: #fafbfd;\n  touch-action: none;\n}\n.mgpt-dialog-actions { display: flex; align-items: center; gap: 2px; }\n.mgpt-dialog-bar > [data-mgpt-action="close"] { margin-left: auto; }\n.mgpt-zoom-status {\n  min-width: 58px;\n  color: #626f82;\n  font: inherit;\n  font-size: 12px;\n  font-variant-numeric: tabular-nums;\n  text-align: center;\n}\n.mgpt-dialog-viewport { flex: 1; min-height: 0; overscroll-behavior: contain; }\n.mgpt-dialog-viewport .mgpt-stage {\n  height: 100%;\n  min-height: 100%;\n  /* \u5168\u5C4F\u624D\u63A5\u7BA1\u89E6\u5C4F\uFF0C\u907F\u514D\u6D4F\u89C8\u5668\u7EB5\u5411\u6EDA\u52A8\u53D6\u6D88\u5355\u6307\u5E73\u79FB/\u53CC\u6307\u7F29\u653E\u3002 */\n  touch-action: none;\n}\n@media (pointer: coarse) {\n  .mgpt-icon-button { width: 44px; height: 44px; }\n  .mgpt-menuitem { min-height: 44px; }\n  .mgpt-retry { min-width: 44px; min-height: 44px; }\n}\n@media (max-width: 900px) {\n  .mgpt-diagram[data-wide="true"] {\n    width: 100%;\n    max-width: 100%;\n    margin-left: 0;\n    transform: none;\n  }\n}\n@media (max-width: 640px) {\n  .mgpt-diagram { margin: 14px 0; }\n  .mgpt-viewport { padding: 4px 0; }\n  .mgpt-dialog { width: calc(100vw - 12px); height: calc(100dvh - 12px); }\n  .mgpt-diagram[data-state="error"] .mgpt-floatbar,\n  .mgpt-diagram[data-notice] .mgpt-floatbar {\n    position: static;\n    width: max-content;\n    margin: 4px 4px 0 auto;\n  }\n}\n';
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
    renderSvg: (source, options2) => renderer.renderSvg(source, resolveConfig(options2, config)),
    getConfig: (options2) => resolveConfig(options2, config)
  });
  function configure(next = {}) {
    config = resolveConfig(next, config);
    if (globalObject.document) injectStyles(globalObject.document, config.autoInjectStyles);
    return resolveConfig({}, config);
  }
  async function renderSvg(source, options2 = {}) {
    const effective = resolveConfig(options2, config);
    if (globalObject.document) injectStyles(globalObject.document, effective.autoInjectStyles);
    return renderer.renderSvg(source, effective);
  }
  function load(options2 = {}) {
    return renderer.load(resolveConfig(options2, config));
  }
  async function mount(target, source, options2 = {}) {
    const effective = resolveConfig(options2, config);
    if (globalObject.document) injectStyles(globalObject.document, effective.autoInjectStyles);
    const element = typeof target === "string" ? globalObject.document.querySelector(target) : target;
    if (!element) throw new Error(`gpt-mermaid: mount target not found: ${target}`);
    return ui.mount(element, source, { ...effective, ...options2 });
  }
  async function render(source, options2 = {}) {
    if (options2.target || options2.container) {
      return mount(options2.target || options2.container, source, options2);
    }
    const target = globalObject.document.createElement("div");
    globalObject.document.body.append(target);
    return mount(target, source, options2);
  }
  function renderAll(root = globalObject.document, options2 = {}) {
    if (globalObject.document) injectStyles(globalObject.document, resolveConfig(options2, config).autoInjectStyles);
    return ui.renderAll(root, { ...resolveConfig(options2, config), ...options2 });
  }
  function autoRender(options2 = {}) {
    if (globalObject.document?.readyState === "loading") {
      return new Promise((resolve) => {
        globalObject.document.addEventListener("DOMContentLoaded", () => resolve(renderAll(globalObject.document, options2)), { once: true });
      });
    }
    return renderAll(globalObject.document, options2);
  }
  function destroy(record) {
    if (record?.destroy) record.destroy();
  }
  const api = {
    version: VERSION,
    presets: PRESETS,
    configure,
    load,
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

/* 职责：主题变量、CSS 片段与配置归一化；不访问 DOM。 */

export const VERSION = "1.0.2";

export const PRESETS = Object.freeze({
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
    lineUp: "#7c3aed",
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
    lineUp: "#8250df",
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
    lineUp: "#7c3aed",
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
    lineUp: "#bb9af7",
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
    lineUp: "#b48ead",
  }),
});

export const DEFAULT_CONFIG = Object.freeze({
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
  adaptiveLayout: Object.freeze({ enabled: true, maxWidth: 1200, maxHeight: 1000, gap: 80 }),
});

const SERIES = ["#339cff", "#f3883b", "#5dc977", "#eb77b1", "#9b79ec", "#3ab9b1"];

// factory/UI 会浅拷贝配置，故来源跟随主题对象身份，不给公共配置添加字段。
// 只继承显式覆盖：旧派生值会锁住新 preset/字体；显式值即使等于默认值也必须保留。
const EXPLICIT_THEME_OVERRIDES = new WeakMap();

export function resolveConfig(input = {}, previous = DEFAULT_CONFIG) {
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
    ...Object.fromEntries(["quadrant1TextFill", "quadrant2TextFill", "quadrant3TextFill", "quadrant4TextFill",
      "quadrantPointTextFill", "quadrantXAxisTextFill", "quadrantYAxisTextFill", "quadrantTitleFill"]
      .map((key) => [key, colors.text])),
    ...cScale,
    ...fillType,
    ...pie,
    ...git,
  };
  const explicitVariables = {
    ...(EXPLICIT_THEME_OVERRIDES.get(previous.themeVariables) || previous.themeVariables || {}),
    ...(EXPLICIT_THEME_OVERRIDES.get(input.themeVariables) || input.themeVariables || {}),
  };
  const themeVariables = { ...variables, ...explicitVariables };
  EXPLICIT_THEME_OVERRIDES.set(themeVariables, explicitVariables);
  return {
    ...DEFAULT_CONFIG,
    ...previous,
    ...input,
    preset: presetName,
    fontFamily,
    adaptiveLayout: input.adaptiveLayout === false || (input.adaptiveLayout === undefined && previous.adaptiveLayout === false)
      ? false : { ...DEFAULT_CONFIG.adaptiveLayout, ...(previous.adaptiveLayout || {}), ...(input.adaptiveLayout || {}) },
    themeVariables,
    isDark,
  };
}

export function buildFlowchartThemeCSS(vars) {
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

export function buildGlobalThemeCSS(vars) {
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

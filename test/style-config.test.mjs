/*
 * 职责：验证 preset、字体与显式主题覆盖在多轮配置中的传播。
 * 调用方：node --test / npm test；依赖 defaults 真实实现，不需要 DOM 或构建。
 * 红线：派生值不能锁住后续配置；显式覆盖即使等于默认值也必须保留。
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG, PRESETS, resolveConfig, buildFlowchartThemeCSS, buildGlobalThemeCSS,
} from "../src/defaults.js";

test("默认节点和标签仍使用 14px / 13px", () => {
  const config = resolveConfig();
  assert.equal(config.fontFamily, DEFAULT_CONFIG.fontFamily);
  assert.equal(config.themeVariables.fontFamily, DEFAULT_CONFIG.fontFamily);
  assert.equal(config.themeVariables.fontSize, "14px");
  assert.match(buildFlowchartThemeCSS(config.themeVariables), /\.node text \{ font-size: 14px;/);
  assert.match(buildFlowchartThemeCSS(config.themeVariables), /\.edgeLabels text \{ font-size: 13px;/);
  assert.match(buildGlobalThemeCSS(config.themeVariables), /\.node text, \.node tspan \{[^}]*font-size: 14px;/);
  assert.match(buildGlobalThemeCSS(config.themeVariables), /\.edgeLabel text, \.edgeLabel tspan \{[^}]*font-size: 13px;/);
});

test("连续往返切换全部 preset 会重新派生各图形主题", () => {
  let config = resolveConfig({}, DEFAULT_CONFIG);
  for (const preset of ["tokyo", "nord", "github", "linear", "gpt", "tokyo", "gpt"]) {
    const previous = config;
    const snapshot = structuredClone(previous);
    config = resolveConfig({ preset }, previous);
    const colors = PRESETS[preset];
    const vars = config.themeVariables;
    const dark = preset === "tokyo" || preset === "nord";
    assert.equal(config.preset, preset);
    assert.equal(config.isDark, dark);
    assert.equal(vars.primaryColor, colors.node, `${preset} 节点底色`);
    assert.equal(vars.flowchartNodeColor, colors.node);
    assert.equal(vars.flowchartDecisionColor, colors.decision);
    assert.equal(vars.flowchartTextColor, colors.text);
    assert.equal(vars.flowchartLineColor, colors.line);
    assert.equal(vars.flowchartEdgeLabelColor, colors.label);
    assert.equal(vars.gptMermaidLineRight, colors.lineRight);
    assert.equal(vars.actorBkg, colors.node);
    assert.equal(vars.taskTextColor, colors.text);
    assert.equal(vars.clusterBkg, dark ? colors.decision : "#f7f9fc");
    assert.equal(vars.noteBkgColor, dark ? "#3b4252" : "#fefaf0");
    assert.deepEqual(previous, snapshot, "切换不能改写先前配置");
  }
});

test("顶层字体更新会替换旧派生字体并支持回到默认字体", () => {
  let config = resolveConfig();
  for (const fontFamily of ["Arial, sans-serif", "Georgia, serif", DEFAULT_CONFIG.fontFamily]) {
    config = resolveConfig({ fontFamily }, config);
    assert.equal(config.fontFamily, fontFamily);
    assert.equal(config.themeVariables.fontFamily, fontFamily);
    assert.equal(config.themeVariables.fontSize, "14px");
  }
});

test("等于旧默认值的显式覆盖仍优先于新 preset 和顶层字体", () => {
  const initial = resolveConfig({
    themeVariables: {
      primaryColor: PRESETS.gpt.node,
      fontFamily: DEFAULT_CONFIG.fontFamily,
      fontSize: "18px",
    },
  });
  for (const preset of ["tokyo", "github", "nord"]) {
    const config = resolveConfig({ preset, fontFamily: "Georgia, serif" }, initial);
    assert.equal(config.themeVariables.primaryColor, PRESETS.gpt.node);
    assert.equal(config.themeVariables.fontFamily, DEFAULT_CONFIG.fontFamily);
    assert.equal(config.themeVariables.fontSize, "18px");
    assert.equal(config.themeVariables.flowchartNodeColor, PRESETS[preset].node);
    assert.equal(config.fontFamily, "Georgia, serif");
  }
});

test("显式覆盖逐项继承，新覆盖替换旧值，空对象不清空既有覆盖", () => {
  const first = resolveConfig({
    themeVariables: { primaryColor: "#123456", lineColor: "#654321", customVariable: "retained" },
  });
  const second = resolveConfig({
    preset: "tokyo",
    themeVariables: { primaryColor: "#abcdef" },
  }, first);
  const third = resolveConfig({ preset: "nord", themeVariables: {} }, second);
  assert.equal(third.themeVariables.primaryColor, "#abcdef");
  assert.equal(third.themeVariables.lineColor, "#654321");
  assert.equal(third.themeVariables.customVariable, "retained");
  assert.equal(third.themeVariables.flowchartNodeColor, PRESETS.nord.node);
  assert.equal(first.themeVariables.primaryColor, "#123456");
});

test("普通 previous 配置中的主题变量仍全部作为显式覆盖", () => {
  const previous = {
    ...DEFAULT_CONFIG,
    themeVariables: { primaryColor: "#123456", fontFamily: "Helvetica, sans-serif" },
    adaptiveLayout: false,
    menu: false,
  };
  const config = resolveConfig({ preset: "tokyo", fontFamily: "Georgia, serif" }, previous);
  assert.equal(config.themeVariables.primaryColor, "#123456");
  assert.equal(config.themeVariables.fontFamily, "Helvetica, sans-serif");
  assert.equal(config.themeVariables.flowchartNodeColor, PRESETS.tokyo.node);
  assert.equal(config.adaptiveLayout, false);
  assert.equal(config.menu, false);
});

test("UI 浅拷贝后再次归一化不会把派生主题变成永久覆盖", () => {
  const globalConfig = resolveConfig({ themeVariables: { primaryColor: "#123456" } });
  const effective = resolveConfig({ preset: "tokyo" }, globalConfig);
  const forwarded = resolveConfig({ ...effective, fontFamily: "Georgia, serif" }, globalConfig);
  assert.equal(forwarded.themeVariables.fontFamily, "Georgia, serif");
  assert.equal(forwarded.themeVariables.flowchartNodeColor, PRESETS.tokyo.node);

  const next = resolveConfig({ preset: "nord", fontFamily: "Arial, sans-serif" }, { ...forwarded });
  assert.equal(next.themeVariables.primaryColor, "#123456");
  assert.equal(next.themeVariables.flowchartNodeColor, PRESETS.nord.node);
  assert.equal(next.themeVariables.fontFamily, "Arial, sans-serif");
});

test("单次 render 主题和字体覆盖不污染全局或下次渲染", () => {
  const globalConfig = resolveConfig({
    preset: "tokyo",
    fontFamily: "Georgia, serif",
    themeVariables: { primaryColor: "#123456" },
  });
  const snapshot = structuredClone(globalConfig);
  const once = resolveConfig({
    preset: "github",
    fontFamily: "Arial, sans-serif",
    themeVariables: { primaryColor: "#abcdef", fontSize: "18px", customVariable: "once" },
  }, globalConfig);
  assert.equal(once.themeVariables.primaryColor, "#abcdef");
  assert.equal(once.themeVariables.flowchartNodeColor, PRESETS.github.node);
  assert.equal(once.themeVariables.fontFamily, "Arial, sans-serif");
  assert.equal(once.themeVariables.fontSize, "18px");
  const next = resolveConfig({}, globalConfig);
  assert.deepEqual(globalConfig, snapshot);
  assert.deepEqual(next, snapshot);
  assert.equal(Object.hasOwn(next.themeVariables, "customVariable"), false);
  assert.notEqual(next.themeVariables, globalConfig.themeVariables);
});

test("冻结的输入和前值可读取，调用方事后改原始覆盖不影响已解析配置", () => {
  const themeVariables = { primaryColor: "#123456" };
  const previous = resolveConfig({ themeVariables });
  themeVariables.primaryColor = "#ffffff";
  Object.freeze(previous.themeVariables);
  Object.freeze(previous.adaptiveLayout);
  Object.freeze(previous);
  const input = Object.freeze({
    preset: "tokyo",
    fontFamily: "Georgia, serif",
    themeVariables: Object.freeze({ lineColor: "#abcdef" }),
    adaptiveLayout: Object.freeze({ gap: 96 }),
  });
  const snapshot = structuredClone(input);
  const config = resolveConfig(input, previous);
  assert.equal(config.themeVariables.primaryColor, "#123456");
  assert.equal(config.themeVariables.lineColor, "#abcdef");
  assert.equal(config.themeVariables.flowchartNodeColor, PRESETS.tokyo.node);
  assert.equal(config.themeVariables.fontFamily, "Georgia, serif");
  assert.equal(config.adaptiveLayout.gap, 96);
  assert.equal(previous.adaptiveLayout.gap, DEFAULT_CONFIG.adaptiveLayout.gap);
  assert.deepEqual(input, snapshot);
  assert.deepEqual(Reflect.ownKeys(config), [...Reflect.ownKeys(DEFAULT_CONFIG), "isDark"]);
  assert.deepEqual(Object.getOwnPropertySymbols(config.themeVariables), []);
});

test("空配置保留当前主题，未知 preset 仍回退到 gpt 配色", () => {
  const dark = resolveConfig({ preset: "tokyo" });
  assert.deepEqual(resolveConfig({}, dark), dark);
  const fallback = resolveConfig({ preset: "unknown-preset" }, dark);
  assert.equal(fallback.preset, "unknown-preset");
  assert.equal(fallback.isDark, false);
  assert.equal(fallback.themeVariables.primaryColor, PRESETS.gpt.node);
  assert.equal(fallback.themeVariables.flowchartTextColor, PRESETS.gpt.text);
});

#!/usr/bin/env node
/* 职责：真实 Chromium 验证 UMD 入口、菜单、缩放、全屏与 SVG/PNG 操作。 */

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { verifyRenderingGeometry } from "./render-geometry.mjs";
import { verifyLayoutQuality } from "./layout-quality.mjs";
import { auditDetailOverlaps } from "./detail-overlaps.mjs";
import { verifyCrossingQuality } from "./crossing-quality.mjs";
import { auditArrowContacts } from "./arrow-contacts.mjs";
import { verifyPracticalVariants } from "./practical-variants.mjs";
import { verifyTouchGestures } from "./touch-gestures.mjs";
import { BASE_GEOMETRY_EXPECTATIONS } from "./geometry-expectations.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4173;
const output = path.join(ROOT, "output");
await fs.mkdir(output, { recursive: true });
const server = spawn(process.execPath, [path.join(ROOT, "scripts/serve.mjs")], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore",
});

async function waitServer() {
  for (let index = 0; index < 80; index++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("local demo server did not start");
}

const browser = await chromium.launch({ headless: true });
try {
  await waitServer();
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 }, hasTouch: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && !url.startsWith(`http://127.0.0.1:${PORT}`)) external.push(url);
  });
  await page.goto(`http://127.0.0.1:${PORT}/demo/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.GPTMermaid?.version === "1.0.2");
  const diagrams = page.locator(".mgpt-diagram");
  await page.waitForFunction(() => [...document.querySelectorAll(".mgpt-diagram")].every((el) => ["ready", "error"].includes(el.dataset.state)), null, { timeout: 30000 });
  assert.equal(await diagrams.count(), 3);
  assert.equal(await page.locator(".mgpt-diagram[data-state='ready']").count(), 3);
  assert.equal(await page.locator(".mgpt-diagram img").count(), 3);
  assert.equal(await page.locator(".mgpt-diagram pre:visible").count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);

  const programmatic = await page.evaluate(async () => {
    const result = await GPTMermaid.renderSvg("flowchart LR\nA[API] --> B[SVG]");
    const extras = await Promise.all([
      GPTMermaid.renderSvg("stateDiagram-v2\n[*] --> Ready\nReady --> Done"),
      GPTMermaid.renderSvg("classDiagram\nclass Api\nclass Client\nApi --> Client : calls"),
      GPTMermaid.renderSvg("erDiagram\nUSER ||--o{ ORDER : places"),
      GPTMermaid.renderSvg("sequenceDiagram\nA->>B: ping\nB-->>A: pong"),
      GPTMermaid.renderSvg("mindmap\n  root((Root))\n    Browser\n    Runtime"),
      GPTMermaid.renderSvg("timeline\ntitle History\n2020 : Launch\n2021 : Scale"),
      GPTMermaid.renderSvg("xychart-beta\n  x-axis [Jan, Feb, Mar]\n  y-axis 0 --> 100\n  bar [30, 50, 80]"),
      GPTMermaid.renderSvg("requirementDiagram\n  requirement req1 {\n    id: 1\n    text: API\n    risk: Low\n    verifymethod: Test\n  }\n  element test1 {\n    type: simulation\n  }\n  req1 - verifies -> test1"),
    ]);
    const directionResults = await Promise.all([
      GPTMermaid.renderSvg("flowchart TD\nA --> B\nB --> C\nC --> A"),
      GPTMermaid.renderSvg("flowchart LR\nA --> B\nB --> C\nC --> A"),
    ]);
    const erResult = await GPTMermaid.renderSvg("erDiagram\nUSER ||--o{ ORDER : places");
    const classResult = await GPTMermaid.renderSvg("classDiagram\nclass A\nclass B\nA ..> B : uses");
    const sequenceResult = await GPTMermaid.renderSvg(
      "sequenceDiagram\n  autonumber\n  participant U as Browser\n  participant G as Gateway\n  U->>G: POST /responses\n  G-->>U: event stream"
    );
    const journeyResult = await GPTMermaid.renderSvg(
      "journey\n  title Setup journey\n  section Configure\n    Open settings: 5: User\n    Create token: 3: User\n  section Verify\n    Send request: 4: User"
    );
    const erCenterResult = await GPTMermaid.renderSvg(
      "erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ ORDER_ITEM : contains"
    );
    const classConnectResult = await GPTMermaid.renderSvg(
      "classDiagram\n  class Client {\n    +String token\n    +send()\n  }\n  class Gateway\n  Gateway <|-- Client\n  Client ..> Gateway : calls"
    );
    const inspectEdges = (rendered) => {
      const parsed = new DOMParser().parseFromString(rendered.svg, "image/svg+xml");
      return {
        edges: [...parsed.querySelectorAll("[data-gptm-direction]")].map((edge) => ({
          direction: edge.dataset.gptmDirection,
          stroke: edge.style.stroke,
          linecap: edge.style.strokeLinecap,
        })),
        markers: [...parsed.querySelectorAll("marker[id*='-gptm-']")].map((marker) => ({
          id: marker.id,
          width: Number(marker.getAttribute("markerWidth")),
          height: Number(marker.getAttribute("markerHeight")),
          path: marker.querySelector("path")?.getAttribute("d") || "",
          fill: marker.querySelector("path")?.style.fill || "",
          stroke: marker.querySelector("path")?.style.stroke || "",
        })),
      };
    };
    const host = document.createElement("div");
    document.body.append(host);
    const diagram = await GPTMermaid.mount(host, "flowchart LR\nA[API] --> B[Mount]");
    const safeSvg = GPTMermaid.sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><image href="https://evil.invalid/x.png"/><text>safe</text></svg>'
    );
    const stateResult = await GPTMermaid.renderSvg(
      "stateDiagram-v2\n[*] --> INIT\nINIT --> DISABLED : 使能关闭\nDISABLED --> WAIT_CONDITION : 开启命令保存成功"
    );
    const stateHost = document.createElement("div");
    stateHost.innerHTML = stateResult.svg;
    document.body.append(stateHost);
    const stateNode = [...stateHost.querySelectorAll("g.node")].find((node) => node.textContent.includes("WAIT_CONDITION"));
    const stateText = stateNode?.querySelector("text");
    const stateRect = stateNode?.querySelector("rect.basic.label-container");
    const stateLabel = stateNode?.querySelector(":scope > g.label");
    const stateRectBox = stateRect?.getBoundingClientRect();
    const stateTextBox = stateText?.getBoundingClientRect();
    const stateGeometry = {
      labelTransform: stateLabel?.getAttribute("transform") || "",
      anchor: stateText?.getAttribute("text-anchor") || "",
      rows: stateText?.querySelectorAll(".text-outer-tspan").length || 0,
      centerDelta: stateRectBox && stateTextBox
        ? Math.abs((stateRectBox.left + stateRectBox.width / 2) - (stateTextBox.left + stateTextBox.width / 2))
        : Infinity,
      border: stateRect ? getComputedStyle(stateRect).stroke : "",
      borderWidth: stateRect ? getComputedStyle(stateRect).strokeWidth : "",
    };
    stateHost.remove();
    const attach = (svgText) => {
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-100000px;top:0;width:max-content;";
      host.innerHTML = svgText;
      document.body.append(host);
      return host;
    };
    const erCenterHost = attach(erCenterResult.svg);
    const erCenterNodes = [...erCenterHost.querySelectorAll("g.node")].map((node) => {
      const rect = node.querySelector("rect.basic.label-container");
      const text = node.querySelector(":scope > g.label text");
      const rectBox = rect?.getBoundingClientRect();
      const textBox = text?.getBoundingClientRect();
      return {
        name: text?.textContent?.trim() || "",
        delta: rectBox && textBox
          ? Math.abs((rectBox.left + rectBox.width / 2) - (textBox.left + textBox.width / 2))
          : Infinity,
      };
    });
    erCenterHost.remove();
    const classConnectHost = attach(classConnectResult.svg);
    const classNodes = [...classConnectHost.querySelectorAll("g.node")].map((node) => {
      const box = node.querySelector(".label-container")?.getBoundingClientRect();
      return box ? { left: box.left, top: box.top, right: box.right, bottom: box.bottom } : null;
    }).filter(Boolean);
    const connectionGaps = [...classConnectHost.querySelectorAll(".relation")].map((edge) => {
      const matrix = edge.getScreenCTM();
      const length = edge.getTotalLength();
      return [0, length].map((offset) => {
        const local = edge.getPointAtLength(offset);
        const point = new DOMPoint(local.x, local.y).matrixTransform(matrix);
        return Math.min(...classNodes.map((box) => Math.hypot(
          Math.max(box.left - point.x, 0, point.x - box.right),
          Math.max(box.top - point.y, 0, point.y - box.bottom)
        )));
      });
    });
    classConnectHost.remove();
    const sequenceHost = attach(sequenceResult.svg);
    const sequenceNumberFills = [...sequenceHost.querySelectorAll("text")]
      .filter((text) => /^\d+$/.test(text.textContent.trim()))
      .map((text) => getComputedStyle(text).fill);
    sequenceHost.remove();
    const journeyTexts = [...new DOMParser().parseFromString(journeyResult.svg, "image/svg+xml").querySelectorAll("text")]
      .map((text) => text.textContent.trim())
      .filter(Boolean);
    return {
      width: result.width,
      height: result.height,
      mounted: Boolean(diagram?.figure),
      controller: ["destroy", "fit", "zoomIn", "zoomOut", "download", "copySource", "copyImage", "expand"].every((key) => typeof diagram[key] === "function"),
      extras: extras.map((item) => item.svg.length > 1000),
      directions: directionResults.map(inspectEdges),
      triangleFamilies: [extras[0], extras[3], extras[5]].map(inspectEdges),
      erSemantics: inspectEdges(erResult),
      classSemantics: inspectEdges(classResult),
      sequenceSemantics: inspectEdges(sequenceResult),
      sequenceNumberFills,
      journeyTexts,
      erCenterNodes,
      connectionGaps,
      safeSvg,
      stateGeometry,
    };
  });
  assert(programmatic.width > 0 && programmatic.height > 0);
  assert.equal(programmatic.mounted, true);
  assert.equal(programmatic.controller, true);
  assert.deepEqual(programmatic.extras, [true, true, true, true, true, true, true, true]);
  assert.doesNotMatch(programmatic.safeSvg, /script|evil\.invalid|<image/i);
  assert.match(programmatic.safeSvg, /safe/);
  assert.equal(programmatic.stateGeometry.rows, 1);
  assert(programmatic.stateGeometry.centerDelta < 1, JSON.stringify(programmatic.stateGeometry));
  assert.equal(programmatic.stateGeometry.border, "rgb(91, 143, 189)");
  assert.equal(programmatic.stateGeometry.borderWidth, "1.5px");
  const edges = programmatic.directions.flatMap((diagram) => diagram.edges);
  const directionColors = {
    right: "rgb(37, 99, 235)",
    down: "rgb(15, 118, 110)",
    left: "rgb(194, 65, 12)",
    up: "rgb(124, 58, 237)",
  };
  assert.deepEqual(new Set(edges.map((edge) => edge.direction)), new Set(["right", "down", "left", "up"]));
  for (const edge of edges) assert.equal(edge.stroke, directionColors[edge.direction], JSON.stringify(edge));
  const triangleMarkers = [...programmatic.directions, ...programmatic.triangleFamilies].flatMap((diagram) => diagram.markers);
  assert(triangleMarkers.length >= 8);
  for (const marker of triangleMarkers) {
    assert(marker.width > marker.height, JSON.stringify(marker));
    const values = marker.path.match(/[-+]?\d*\.?\d+/g)?.map(Number) || [];
    assert.equal(values.length, 6, JSON.stringify(marker));
    const [x0, y0, x1, y1, x2, y2] = values;
    assert.equal(x0, 0);
    assert.equal(y0, 0);
    assert.equal(x2, 0);
    assert.equal(y2, 8);
    assert.equal(x1, 10);
    assert.equal(y1, 4);
    assert(Math.abs(marker.width / marker.height - 1.25) < 0.001, JSON.stringify(marker));
    assert.notEqual(marker.fill, "none", JSON.stringify(marker));
  }
  assert(programmatic.erSemantics.markers.some((marker) => marker.id.includes("zeroOrMoreEnd") && marker.path === "M21,18 Q39,0 57,18 Q39,36 21,18"));
  assert(programmatic.classSemantics.markers.some((marker) => marker.id.includes("dependencyEnd") && marker.width > marker.height && marker.fill !== "none"));
  assert.deepEqual(
    programmatic.sequenceSemantics.edges.map((edge) => edge.direction),
    ["right", "left"]
  );
  assert.deepEqual(
    programmatic.sequenceSemantics.edges.map((edge) => edge.stroke),
    [directionColors.right, directionColors.left]
  );
  assert(programmatic.sequenceSemantics.edges.every((edge) => edge.linecap === "butt"));
  assert(programmatic.sequenceNumberFills.every((fill) => fill === "rgb(255, 255, 255)"), JSON.stringify(programmatic.sequenceNumberFills));
  for (const label of ["Configure", "Open settings", "Create token", "Verify", "Send request"]) {
    assert(programmatic.journeyTexts.includes(label), `${label} missing: ${JSON.stringify(programmatic.journeyTexts)}`);
  }
  assert(programmatic.erCenterNodes.length >= 3);
  assert(programmatic.erCenterNodes.every((node) => node.delta < 1), JSON.stringify(programmatic.erCenterNodes));
  assert(programmatic.connectionGaps.flat().every((gap) => gap < 1), JSON.stringify(programmatic.connectionGaps));

  const first = diagrams.first();
  await first.hover();
  await first.locator('[data-mgpt-action="menu"]').click();
  await first.locator('[data-mgpt-action="copy"]').click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /flowchart/);
  await first.locator('[data-mgpt-action="menu"]').click();
  const download = page.waitForEvent("download");
  await first.locator('[data-mgpt-action="download"]').click();
  await download;
  await first.locator('[data-mgpt-action="expand"]').click();
  await page.waitForFunction(() => Boolean(document.querySelector(".mgpt-dialog")?.open));
  assert.equal(await page.locator(".mgpt-dialog .mgpt-image").count(), 1);
  const fullStage = page.locator(".mgpt-dialog .mgpt-stage");
  const fullBox = await fullStage.boundingBox();
  await page.mouse.move(fullBox.x + fullBox.width * 0.7, fullBox.y + fullBox.height * 0.4);
  await page.mouse.wheel(0, -240);
  await page.waitForFunction((el) => Number(el.dataset.zoom) > 1, await fullStage.elementHandle());
  const enlargedZoom = Number(await fullStage.getAttribute("data-zoom"));
  assert(Math.abs(Number(await fullStage.getAttribute("data-pan-x"))) > 0);
  await page.mouse.wheel(0, 240);
  await page.waitForFunction(({ el, before }) => Number(el.dataset.zoom) < before, { el: await fullStage.elementHandle(), before: enlargedZoom });
  assert(Math.abs(Number(await fullStage.getAttribute("data-zoom")) - 1) < 0.01);
  await page.screenshot({ path: path.join(output, "e2e-fullscreen.png") });
  await page.locator('.mgpt-dialog [data-mgpt-action="close"]').click();
  await page.waitForFunction(() => !document.querySelector(".mgpt-dialog")?.open);
  await page.screenshot({ path: path.join(output, "e2e-desktop.png") });

  const stage = first.locator(".mgpt-stage");
  const before = await stage.getAttribute("data-zoom");
  await stage.hover();
  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(100);
  assert.equal(await stage.getAttribute("data-zoom"), before, "行内普通滚轮不能缩放");
  await stage.hover();
  await page.keyboard.down("Control");
  try { await page.mouse.wheel(0, -240); } finally { await page.keyboard.up("Control"); }
  await page.waitForFunction((el) => Number(el.dataset.zoom) > 1, await stage.elementHandle());
  assert.notEqual(await stage.getAttribute("data-zoom"), before);

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.screenshot({ path: path.join(output, "e2e-mobile.png") });
  await page.goto(`http://127.0.0.1:${PORT}/demo/compatibility.html?suite=base`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll(".sample[data-result]").length === 22, null, { timeout: 30000 });
  assert.equal(await page.locator(".sample[data-result='ready']").count(), 21);
  assert.equal(await page.locator(".sample[data-result='error']").count(), 1);
  assert.equal(await page.locator(".sample[data-expected='error'][data-result='error']").count(), 1);
  assert.match(await page.locator("#summary").innerText(), /21 张渲染成功/);
  assert.equal(await page.locator(".sample[data-sample-id='mindmap'][data-result='ready']").count(), 1);
  await page.locator("#search").fill("flow-shapes");
  assert.equal(await page.locator(".sample:visible").count(), 1);
  await page.locator('[data-sample-id="flow-shapes"] [data-size]').click();
  assert.equal(await page.locator('[data-sample-id="flow-shapes"]').getAttribute("data-natural"), "true");
  await page.locator('[data-sample-id="flow-shapes"] [data-size]').click();
  await page.locator("#reset").click();
  assert.equal(await page.locator(".sample:visible").count(), 22);
  await page.screenshot({ path: path.join(output, "compatibility-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await verifyRenderingGeometry(page, path.join(output, "playwright"));
  await page.screenshot({ path: path.join(output, "compatibility-desktop.png"), fullPage: true });
  await page.goto(`http://127.0.0.1:${PORT}/demo/compatibility.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.dataset.labReady === "true", null, { timeout: 120000 });
  const stress = await page.evaluate(() => ({
    total: window.GPT_MERMAID_LAB_CASES.length,
    families: new Set(window.GPT_MERMAID_LAB_CASES.map((item) => item.type)).size,
    ready: document.querySelectorAll('.sample[data-result="ready"]').length,
    unexpected: [...document.querySelectorAll('.sample[data-result="error"]:not([data-expected="error"])')]
      .map((card) => ({ id: card.dataset.sampleId, error: card.querySelector(".mgpt-status").textContent })),
    dimensions: [...GPTMermaid.ui.uiState(document).records].filter((record) => record.result)
      .map((record) => ({ id: record.figure.closest(".sample").dataset.sampleId, width: record.result.width, height: record.result.height })),
  }));
  assert.equal(stress.total, 101);
  assert.equal(stress.ready, 100);
  assert(stress.families >= 22);
  assert.deepEqual(stress.unexpected, []);
  const practical = await page.evaluate(async () => {
    const ids = ["stress-flow-lr-extreme-chain", "stress-flow-td-long-chain", "stress-flow-lr-dense"];
    const samples = ids.map(id => {
      const record = [...GPTMermaid.ui.uiState(document).records].find(r => r.figure.closest(".sample").dataset.sampleId === id);
      const svg = new DOMParser().parseFromString(record.result.svg, "image/svg+xml");
      return { id, nodes: svg.querySelectorAll("g.node").length, edges: svg.querySelectorAll(".flowchart-link").length };
    });
    const foldSource = `flowchart LR
Receive[Receive order] --> Validate[Validate items] --> Reserve[Reserve stock] --> Charge[Authorize payment]
Charge --> Pack[Pack order] --> Ship[Ship parcel] --> Deliver[Confirm delivery] --> Close[Close order]`;
    const adaptive = await GPTMermaid.renderSvg(foldSource, {
      adaptiveLayout: { maxWidth: 600, maxHeight: 600, gap: 80 },
    });
    const original = await GPTMermaid.renderSvg(foldSource, { adaptiveLayout: false });
    const adaptiveSvg = new DOMParser().parseFromString(adaptive.svg, "image/svg+xml");
    return {
      samples,
      fold: {
        adaptive: { width: adaptive.width, height: adaptive.height, state: adaptiveSvg.documentElement.dataset.gptmAdaptive },
        original: { width: original.width, height: original.height },
      },
    };
  });
  for (const item of practical.samples) {
    assert(item.nodes >= 8 && item.nodes <= 18, `${item.id} 应为实用规模`);
    assert(item.edges >= item.nodes, `${item.id} 应覆盖分支/反馈，不能退化为纯串行`);
  }
  assert.equal(practical.fold.adaptive.state, "applied", "8步订单链必须实际应用自适应折返");
  assert(practical.fold.adaptive.width <= 600, `自适应宽度应受600阈值约束：${JSON.stringify(practical.fold)}`);
  assert(practical.fold.original.width > practical.fold.adaptive.width * 1.25,
    `原始布局应有明显横向对照：${JSON.stringify(practical.fold)}`);
  assert(practical.fold.original.height < practical.fold.adaptive.height,
    `折返后应增加纵向高度：${JSON.stringify(practical.fold)}`);
  await verifyLayoutQuality(page, path.join(output, "playwright", "layout-after"));
  const details = await auditDetailOverlaps(page, path.join(output, "playwright", "detail-audit"), true, BASE_GEOMETRY_EXPECTATIONS);
  const crossingReport = await verifyCrossingQuality(page, path.join(output, "playwright", "route-quality"));
  const contacts = await auditArrowContacts(page, path.join(output, "playwright", "arrow-detail"), true, BASE_GEOMETRY_EXPECTATIONS);
  console.log(`箭头接触验收：${contacts.length} 图，三角完整可见、线杆连接与所属轮廓断言通过`);
  const variants = await verifyPracticalVariants(page, path.join(output, "playwright", "practical-variants"));
  console.log(`独立实用变体验收：${variants.length} 张方向/字体/名称组合通过`);
  console.log(`交叉验收：${crossingReport.verified.length} 个图种/方向变体独立采样通过，复杂图库残留按实际报告`);
  assert.equal(contacts.length, 100, "箭头接触验收必须实际覆盖100张基准图");
  assert.equal(variants.length, 15, "实用变体必须实际覆盖15张独立图");
  assert.equal(crossingReport.verified.length, 9, "交叉独立采样必须实际覆盖9个图种/方向变体");
  assert.equal(details.length, 100);
  console.log(`细节验收：${details.length} 图，${details.reduce((sum, item) => sum + item.triangles, 0)} 个三角箭头，箭头/线杆/胶囊互遮断言通过`);
  await fs.writeFile(path.join(output, "playwright", "stress-report.json"), JSON.stringify(stress, null, 2));
  await page.locator("#family").selectOption("sequenceDiagram");
  assert((await page.locator(".sample:visible").count()) >= 10);
  await page.locator("#reset").click();
  await page.locator("#search").fill("Webhook");
  assert.equal(await page.locator(".sample:visible").count(), 1);
  await page.locator("#reset").click();
  await page.screenshot({ path: path.join(output, "playwright", "stress-lab.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  const touch = await verifyTouchGestures(page, { mode: "cdp", output: path.join(output, "playwright", "touch") });
  console.log(`触屏验收：${touch.checks.length}项浏览器原生触摸输入检查，包含双指缩放、手指切换与行内真实滚动`);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log("gpt-mermaid E2E passed");
} finally {
  await browser.close();
  server.kill();
}

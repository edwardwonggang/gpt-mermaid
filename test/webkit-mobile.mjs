/* 职责：在单个WebKit手机上下文验收SVG与tap；多指状态机单独标记为合成PointerEvent。 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { webkit } from "playwright";
import { auditArrowContacts } from "./arrow-contacts.mjs";
import { auditDetailOverlaps } from "./detail-overlaps.mjs";
import { verifyPracticalVariants } from "./practical-variants.mjs";
import { verifyTouchGestures } from "./touch-gestures.mjs";
import { BASE_GEOMETRY_EXPECTATIONS } from "./geometry-expectations.mjs";
import { verifyStateIndependentVariants } from "./state-independent-variants.mjs";
import { verifyStyleRuntime } from "./style-runtime-browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), port = 4175;
const output = path.join(root, "output/playwright/webkit");
await fs.mkdir(output, { recursive: true });
const server = spawn(process.execPath, [path.join(root, "scripts/serve.mjs")], {
  cwd: root, env: { ...process.env, PORT: String(port) }, stdio: "ignore",
});
const browser = await webkit.launch({ headless: true });
try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/demo/compatibility.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.dataset.labReady === "true", null, { timeout: 180000 });
  const summary = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    ready: document.querySelectorAll('.sample[data-result="ready"]').length,
    unexpected: [...document.querySelectorAll('.sample[data-result="error"]:not([data-expected="error"])')].map(e => e.dataset.sampleId),
    remaining: [...GPTMermaid.ui.uiState(document).records].filter(r => r.result?.routing.status === "unresolved")
      .map(r => ({ id: r.figure.closest(".sample").dataset.sampleId, ...r.result.routing })),
  }));
  assert.equal(summary.width, 390); assert.equal(summary.ready, 100); assert.deepEqual(summary.unexpected, []);
  await fs.writeFile(path.join(output,"style-runtime-browser.json"),JSON.stringify(await verifyStyleRuntime(page),null,2));
  await auditArrowContacts(page, output, true, BASE_GEOMETRY_EXPECTATIONS);
  await auditDetailOverlaps(page, output, true, BASE_GEOMETRY_EXPECTATIONS);
  const variants = await verifyPracticalVariants(page, path.join(output, "variants"));
  const statePorts = await verifyStateIndependentVariants(page, path.join(output,"independent-state-ports"));
  await page.locator('#search').fill("state");
  const touch = await verifyTouchGestures(page, { mode: "synthetic", output });
  await page.locator('#state [data-fullscreen]').tap();
  const stage = page.locator("dialog[open] .mgpt-stage");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector("dialog[open] .mgpt-stage")?.dataset.zoom === "1");
  assert.equal(await stage.getAttribute("data-zoom"), "1");
  await page.locator('.mgpt-dialog[open] [data-mgpt-action="fit"]').tap();
  await page.locator('.mgpt-dialog[open] [data-mgpt-action="close"]').tap();
  await page.waitForFunction(() => !document.querySelector(".mgpt-dialog")?.open);
  await page.locator("#reset").tap(); await page.locator("#state").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, "state-mobile.png") });
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, "mobile-report.json"), JSON.stringify({
    ...summary, variants: variants.length, statePorts: statePorts.length, touch, errors,
    touchLimit: "开关与复位使用locator.tap；多指/取消/捕获为合成PointerEvent，未证明WebKit原生多指或页面触摸滚动。",
  }, null, 2));
  console.log(`WebKit手机视口验收通过：${summary.ready}图，${variants.length}变体，tap开关复位；${touch.checks.length}项合成触点状态机检查，未计作真机多指或原生滚动`);
} finally {
  await browser.close(); server.kill();
}

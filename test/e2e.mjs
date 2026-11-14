#!/usr/bin/env node
/* 职责：真实 Chromium 验证 UMD 入口、菜单、缩放、全屏与 SVG/PNG 操作。 */

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

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
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && !url.startsWith(`http://127.0.0.1:${PORT}`)) external.push(url);
  });
  await page.goto(`http://127.0.0.1:${PORT}/demo/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.GPTMermaid?.version === "1.0.0");
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
    ]);
    const host = document.createElement("div");
    document.body.append(host);
    const diagram = await GPTMermaid.mount(host, "flowchart LR\nA[API] --> B[Mount]");
    const safeSvg = GPTMermaid.sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><image href="https://evil.invalid/x.png"/><text>safe</text></svg>'
    );
    return {
      width: result.width,
      height: result.height,
      mounted: Boolean(diagram?.figure),
      controller: ["destroy", "fit", "zoomIn", "zoomOut", "download", "copySource", "copyImage", "expand"].every((key) => typeof diagram[key] === "function"),
      extras: extras.map((item) => item.svg.length > 1000),
      safeSvg,
    };
  });
  assert(programmatic.width > 0 && programmatic.height > 0);
  assert.equal(programmatic.mounted, true);
  assert.equal(programmatic.controller, true);
  assert.deepEqual(programmatic.extras, [true, true, true, true]);
  assert.doesNotMatch(programmatic.safeSvg, /script|evil\.invalid|<image/i);
  assert.match(programmatic.safeSvg, /safe/);

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
  await page.screenshot({ path: path.join(output, "e2e-fullscreen.png") });
  await page.locator('.mgpt-dialog [data-mgpt-action="close"]').click();
  await page.waitForFunction(() => !document.querySelector(".mgpt-dialog")?.open);
  await page.screenshot({ path: path.join(output, "e2e-desktop.png") });

  const stage = first.locator(".mgpt-stage");
  const before = await stage.getAttribute("data-zoom");
  await stage.hover();
  await page.keyboard.down("Control");
  try { await page.mouse.wheel(0, -240); } finally { await page.keyboard.up("Control"); }
  await page.waitForFunction((el) => Number(el.dataset.zoom) > 1, await stage.elementHandle());
  assert.notEqual(await stage.getAttribute("data-zoom"), before);

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.screenshot({ path: path.join(output, "e2e-mobile.png") });
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log("gpt-mermaid E2E passed");
} finally {
  await browser.close();
  server.kill();
}

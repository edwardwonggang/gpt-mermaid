import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ui = fs.readFileSync(path.join(root, "src/ui.js"), "utf8");
const render = fs.readFileSync(path.join(root, "src/render.js"), "utf8");

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `缺少源码起点：${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `缺少源码终点：${end}`);
  return source.slice(from, to);
}

/*
 * 这些是源码接线契约，不复制实现，也不依赖行号。
 * 真实 DOM 时序、图片事件和浏览器布局仍由 E2E 验收。
 */
test("renderAll uses terminal-state waiters instead of a polling interval", () => {
  const block = section(ui, "function renderAll(root = document", "\n  return { mount");
  assert.match(block, /waitForRecord/);
  assert.match(block, /Promise\.all\(diagrams\.map\(waitForRecord\)\)/);
  assert.doesNotMatch(block, /setInterval|30\s*ms/i);
  assert.doesNotMatch(ui, /setInterval\s*\([^;\n]*,\s*30\s*\)/);
});

test("render queue is wired through the serial scheduler and abortable timeout", () => {
  assert.match(render, /createSerialScheduler\(\)/);
  assert.match(render, /renderQueue\.schedule\(/);
  assert.match(render, /signal:\s*config\.signal/);
  assert.match(render, /timeoutMessage:\s*"gpt-mermaid: render timed out"/);
});

test("destroyed, image-error and image-timeout paths reset loading and revoke URLs", () => {
  const destroy = section(ui, "record.destroy = () => {", "record.fit = () =>");
  assert.match(destroy, /record\.loading = false/);
  assert.match(destroy, /record\.renderAbort\?\.abort\(\)/);
  assert.match(destroy, /URL\.revokeObjectURL\(record\.url\)/);

  const renderRecord = section(ui, "async function renderRecord(record)", "function createRecord(");
  const imageError = section(renderRecord, "record.image.onerror = () => {", "record.image.src = record.url;");
  const imageTimeout = section(renderRecord, "record.imageTimer = setTimeout(() => {", "}, timeoutMs);");
  const catchPath = section(renderRecord, "} catch (error) {", "} finally {");
  for (const block of [imageError, imageTimeout, catchPath]) {
    assert.match(block, /record\.loading = false/);
    assert.match(block, /URL\.revokeObjectURL\(record\.url\)/);
  }
});

test("long inline diagrams cap the stage height and become independently scrollable", () => {
  assert.match(ui, /const INLINE_STAGE_MAX_HEIGHT = 720;/);
  assert.match(ui, /const INLINE_STAGE_MIN_HEIGHT = 112;/);
  assert.match(ui, /const inlineCap = Math\.max\(240, Math\.min\(INLINE_STAGE_MAX_HEIGHT,/);
  assert.match(ui, /const scrollable = !inDialog && !Number\.isFinite\(maxHeight\) && naturalStageHeight > inlineCap;/);
  assert.match(ui, /record\.stage\.style\.overflowY = "auto"/);
  assert.match(ui, /record\.stage\.dataset\.scrollable = "true"/);
});

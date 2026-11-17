import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const factory = fs.readFileSync(path.join(root, "src/factory.js"), "utf8");
const ui = fs.readFileSync(path.join(root, "src/ui.js"), "utf8");

/*
 * 职责：在没有浏览器 DOM 的 Node 环境中锁定公开 API 的静态接线契约。
 * 调用方：npm test；不启动浏览器，不生成截图。
 * 红线：本文件只能证明源码中存在行为路径，不能替代 E2E 的实际 DOM 验收。
 */
test("factory wires renderAll, autoRender and destroy into the public API", () => {
  assert.match(factory, /function renderAll\(root = globalObject\.document, options = \{\}\)/);
  assert.match(factory, /return ui\.renderAll\(root, \{ \.\.\.resolveConfig\(options, config\), \.\.\.options \}\)/);
  assert.match(factory, /function autoRender\(options = \{\}\)/);
  assert.match(factory, /readyState === "loading"/);
  assert.match(factory, /addEventListener\("DOMContentLoaded"/);
  assert.match(factory, /function destroy\(record\)/);
  assert.match(factory, /if \(record\?\.destroy\) record\.destroy\(\)/);
  assert.match(factory, /renderAll,\s*autoRender,\s*destroy,/);
});

test("UI renderAll retains both documented source selectors and waits for terminal states", () => {
  assert.match(ui, /function renderAll\(root = document, options = \{\}\)/);
  assert.match(ui, /pre > code\.language-mermaid, pre > code\.lang-mermaid/);
  assert.match(ui, /\[data-gpt-mermaid-source\]/);
  assert.match(ui, /function waitForRecord\(record\)/);
  assert.match(ui, /state === "ready" \|\| state === "error"/);
  assert.match(ui, /Promise\.all\(diagrams\.map\(waitForRecord\)\)/);
});

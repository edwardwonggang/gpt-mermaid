#!/usr/bin/env node
/*
 * 职责：确认 CI 保留关键门禁，并确保 test/ 下每个脚本都有实际执行入口。
 * 调用方：CI unit-api job，也可在本地执行以发现漏接入 CI 的新测试。
 * 依赖：Node 内置模块与 git。
 * 红线：新增测试必须进入 npm test 通配、e2e/webkit 导入闭包，
 *       或使用 node:test 并由 run-extra-node-tests.mjs 执行。
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(root, ".github/workflows/ci.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");
const requiredSnippets = [
  "git diff --exit-code -- dist",
  "npm test",
  "npm run test:api",
  "npm run test:api-types",
  "npm run test:e2e",
  "node test/webkit-mobile.mjs",
  "node scripts/verify-package.mjs",
  "node scripts/verify-runtime-integrity.mjs",
  "node scripts/run-extra-node-tests.mjs",
];

for (const snippet of requiredSnippets) {
  assert.ok(workflow.includes(snippet), `CI 缺少关键门禁：${snippet}`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function importClosure(entryRelative) {
  const seen = new Set();
  const pending = [path.join(root, entryRelative)];
  while (pending.length) {
    const file = pending.pop();
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    const source = fs.readFileSync(file, "utf8");
    const pattern = /(?:from\s+|import\s*\()\s*["'](\.\/[^"']+\.mjs)["']/g;
    for (const match of source.matchAll(pattern)) {
      pending.push(path.resolve(path.dirname(file), match[1]));
    }
  }
  return seen;
}

const browserCoverage = new Set([
  ...importClosure("test/e2e.mjs"),
  ...importClosure("test/webkit-mobile.mjs"),
]);
const testFiles = walk(path.join(root, "test"))
  .filter((file) => file.endsWith(".mjs"))
  .sort();
// node:test入口也会消费独立夹具；验证真实导入链，而非按fixtures目录全量豁免。
const nodeCoverage = new Set(testFiles.filter(file => file.endsWith(".test.mjs"))
  .flatMap(file => [...importClosure(relative(file))]));
const unregistered = [];

for (const file of testFiles) {
  const rel = relative(file);
  const base = path.basename(file);
  const source = fs.readFileSync(file, "utf8");
  const nodeTest = /(?:from\s+["']node:test["']|require\(\s*["']node:test["']\s*\))/.test(source);
  if (base.endsWith(".test.mjs")) continue;
  if (nodeTest) continue;
  if (browserCoverage.has(file)) continue;
  if (nodeCoverage.has(file)) continue;
  unregistered.push(rel);
}

assert.deepEqual(
  unregistered,
  [],
  `发现未接入 CI 的测试脚本：\n${unregistered.map((file) => `- ${file}`).join("\n")}\n` +
    "请将其改为 *.test.mjs、导入 e2e/webkit，或使用 node:test 交给 run-extra-node-tests.mjs。",
);

const untracked = spawnSync("git", ["ls-files", "--others", "--exclude-standard", "--", "test"], {
  cwd: root,
  encoding: "utf8",
});
if (untracked.status === 0 && untracked.stdout.trim()) {
  console.log("提示：以下测试文件尚未纳入 Git；提交前必须 git add，否则 CI 看不到：");
  for (const file of untracked.stdout.trim().split("\n")) console.log(`- ${file}`);
}

console.log(`CI coverage ok: ${testFiles.length} test scripts classified`);

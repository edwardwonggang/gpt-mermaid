#!/usr/bin/env node
/*
 * 职责：执行使用 node:test、但文件名不匹配 package.json 中 *.test.mjs 通配的测试。
 * 调用方：CI unit-api job。
 * 依赖：Node 内置测试运行器。
 * 红线：这里只自动发现 node:test 文件；其他新增浏览器/辅助脚本仍须显式接入 CI。
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(path.join(root, "test"))
  .filter((file) => file.endsWith(".mjs") && !file.endsWith(".test.mjs"))
  .filter((file) => {
    const source = fs.readFileSync(file, "utf8");
    return /(?:from\s+["']node:test["']|require\(\s*["']node:test["']\s*\))/.test(source);
  })
  .map((file) => path.relative(root, file))
  .sort();

if (!files.length) {
  console.log("extra node:test files: none");
  process.exit(0);
}

console.log(`extra node:test files: ${files.join(", ")}`);
const result = spawnSync(process.execPath, ["--test", ...files], {
  cwd: root,
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);

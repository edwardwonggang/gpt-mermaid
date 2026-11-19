#!/usr/bin/env node
/*
 * 职责：固定 Mermaid 构建版本与受版本控制的 runtime 产物。
 * 调用方：CI 的 unit-api job，也可在本地单独执行。
 * 依赖：Node 内置模块。
 * 红线：runtime 合法升级时必须同时更新 VERSION 和 EXPECTED_SHA256；
 *       禁止为了绕过失败直接删除本检查。
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_MERMAID_VERSION = "12.3.0";
// 公开内嵌ELK布局及同次解析状态模型，不新增另一份引擎或第二次解析。
const EXPECTED_BYTES = 5_656_054;
const EXPECTED_SHA256 = "a34281c56acf5c0edbe37638d19e8831a8f6687db337b6201d31664752f3ae25";

const patchScript = fs.readFileSync(path.join(root, "scripts/apply-patch.mjs"), "utf8");
const versionMatch = patchScript.match(/const VERSION = ["']([^"']+)["'];/);
assert.ok(versionMatch, "scripts/apply-patch.mjs 中缺少 Mermaid VERSION 常量");
assert.equal(
  versionMatch[1],
  EXPECTED_MERMAID_VERSION,
  `Mermaid 版本漂移：期望 ${EXPECTED_MERMAID_VERSION}，实际 ${versionMatch[1]}`,
);

const runtimePath = path.join(root, "dist/gpt-mermaid.runtime.min.js");
const runtime = fs.readFileSync(runtimePath);
const sha256 = createHash("sha256").update(runtime).digest("hex");
assert.equal(runtime.byteLength, EXPECTED_BYTES, `runtime 大小漂移：${runtime.byteLength}`);
assert.equal(sha256, EXPECTED_SHA256, `runtime SHA-256 漂移：${sha256}`);

console.log(`runtime ok: Mermaid ${EXPECTED_MERMAID_VERSION}, ${EXPECTED_BYTES} bytes, ${sha256}`);

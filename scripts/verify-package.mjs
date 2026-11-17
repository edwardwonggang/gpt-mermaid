#!/usr/bin/env node
/*
 * 职责：校验 npm 包文件清单，并在隔离临时目录安装 tarball 后冒烟 ESM/CJS/UMD 入口。
 * 调用方：CI package job。
 * 依赖：Node 内置模块、npm 与本地 tarball；不访问 registry。
 * 红线：临时安装不得使用仓库 node_modules 作为回退；失败时必须保留原始输出并清理临时目录。
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "gpt-mermaid-package-"));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 180_000,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`);
  }
  return result;
}

function parsePack(stdout, label) {
  try {
    const [metadata] = JSON.parse(stdout);
    assert.ok(metadata?.filename && Array.isArray(metadata.files), `${label} 缺少 pack 元数据`);
    return metadata;
  } catch (error) {
    throw new Error(`${label} 无法解析 npm pack JSON：${error.message}\n${stdout}`);
  }
}

try {
  const dryRun = parsePack(
    run(npm, ["pack", "--dry-run", "--json", "--ignore-scripts"]).stdout,
    "npm pack --dry-run",
  );
  const dryFiles = new Set(dryRun.files.map((file) => file.path));
  for (const file of [
    "dist/gpt-mermaid.esm.js",
    "dist/gpt-mermaid.cjs",
    "dist/gpt-mermaid.umd.js",
    "dist/gpt-mermaid.runtime.min.js",
    "types/index.d.ts",
    "types/index.d.cts",
    "types/umd.d.ts",
  ]) {
    assert.ok(dryFiles.has(file), `npm 包缺少 ${file}`);
  }

  const packed = parsePack(
    run(npm, ["pack", "--json", "--ignore-scripts", "--pack-destination", temp]).stdout,
    "npm pack",
  );
  const tarball = path.join(temp, packed.filename);
  assert.ok(fs.existsSync(tarball), `tarball 不存在：${tarball}`);

  const consumer = path.join(temp, "consumer");
  fs.mkdirSync(consumer, { recursive: true });
  fs.writeFileSync(
    path.join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }, null, 2),
  );
  run(
    npm,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      tarball,
    ],
    { cwd: consumer },
  );

  const installed = path.join(consumer, "node_modules/gpt-mermaid");
  const installedPackage = JSON.parse(fs.readFileSync(path.join(installed, "package.json"), "utf8"));
  for (const file of [
    "dist/gpt-mermaid.esm.js",
    "dist/gpt-mermaid.cjs",
    "dist/gpt-mermaid.umd.js",
    "dist/gpt-mermaid.runtime.min.js",
  ]) {
    assert.ok(fs.existsSync(path.join(installed, file)), `安装后缺少 ${file}`);
  }
  assert.equal(installedPackage.version, packageJson.version);

  fs.writeFileSync(
    path.join(consumer, "smoke.mjs"),
    [
      'import assert from "node:assert/strict";',
      'const esm = await import("gpt-mermaid");',
      `assert.equal(esm.version, ${JSON.stringify(packageJson.version)});`,
      "assert.equal(esm.default.version, esm.version);",
      'assert.equal(typeof esm.renderSvg, "function");',
      "assert.equal(globalThis.GPTMermaid, undefined);",
      'console.log("esm ok:", esm.version);',
      "",
    ].join("\n"),
  );
  run(process.execPath, ["smoke.mjs"], { cwd: consumer });

  fs.writeFileSync(
    path.join(consumer, "smoke.cjs"),
    [
      'const assert = require("node:assert/strict");',
      'const cjs = require("gpt-mermaid");',
      `assert.equal(cjs.version, ${JSON.stringify(packageJson.version)});`,
      'assert.equal(typeof cjs.renderSvg, "function");',
      "assert.equal(cjs.default, undefined);",
      'console.log("cjs ok:", cjs.version);',
      "",
    ].join("\n"),
  );
  run(process.execPath, ["smoke.cjs"], { cwd: consumer });

  const umdPath = path.join(installed, "dist/gpt-mermaid.umd.js");
  const umd = fs.readFileSync(umdPath, "utf8");
  const document = {
    currentScript: null,
    baseURI: "https://example.test/",
    readyState: "complete",
    head: { append() {} },
    body: { append() {} },
    getElementById() {
      return null;
    },
    createElement(tagName) {
      return { tagName, style: {}, dataset: {}, setAttribute() {}, append() {} };
    },
    createElementNS(_namespace, tagName) {
      return { tagName, style: {}, dataset: {}, setAttribute() {}, append() {} };
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const context = vm.createContext({
    URL,
    document,
    console,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(umd, context, { timeout: 10_000, filename: umdPath });
  assert.equal(context.GPTMermaid?.version, packageJson.version);
  assert.equal(typeof context.GPTMermaid?.renderSvg, "function");

  console.log(`package ok: ${packed.filename}, ESM/CJS/UMD ${packageJson.version}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

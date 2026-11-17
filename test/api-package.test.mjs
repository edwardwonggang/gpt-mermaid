import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const require = createRequire(import.meta.url);

test("root exports select declarations before runtime files", () => {
  const rootExport = pkg.exports["."];
  assert.equal(pkg.types, "./types/index.d.cts");
  assert.deepEqual(Object.keys(rootExport), ["import", "require"]);
  assert.deepEqual(Object.keys(rootExport.import), ["types", "default"]);
  assert.deepEqual(Object.keys(rootExport.require), ["types", "default"]);
  assert.equal(rootExport.import.types, "./types/index.d.ts");
  assert.equal(rootExport.require.types, "./types/index.d.cts");
  assert.equal(rootExport.import.default, "./dist/gpt-mermaid.esm.js");
  assert.equal(rootExport.require.default, "./dist/gpt-mermaid.cjs");
});

test("module-system declarations stay isolated", () => {
  const esm = fs.readFileSync(path.join(root, "types/index.d.ts"), "utf8");
  const cjs = fs.readFileSync(path.join(root, "types/index.d.cts"), "utf8");
  const umd = fs.readFileSync(path.join(root, "types/umd.d.ts"), "utf8");
  assert.doesNotMatch(esm, /interface\s+Window/);
  assert.match(esm, /signal\?: AbortSignal;/);
  assert.match(esm, /renderTimeoutMs\?: number;/);
  assert.match(esm, /runtimeTimeoutMs\?: number;/);
  assert.match(cjs, /export\s*=\s*GPTMermaid\s*;/);
  assert.match(umd, /interface\s+Window/);
  assert.match(umd, /GPTMermaidApi/);
});

test("script-only helpers are not exposed as module subpaths", async () => {
  for (const name of ["./runtime", "./themes", "./arrows"]) {
    assert.equal(pkg.exports[name], undefined, `${name} must not resolve as a module`);
    await assert.rejects(
      import(`gpt-mermaid/${name.slice(2)}`),
      (error) => error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED",
      `${name} must stay script-only`,
    );
  }
  assert.equal(pkg.exports["."].default, undefined);
});

test("ESM and CommonJS package entries load with their declared shapes", async () => {
  const esm = await import("gpt-mermaid");
  assert.equal(esm.version, pkg.version);
  assert.equal(esm.default.version, pkg.version);
  assert.equal(typeof esm.renderSvg, "function");
  assert.equal(globalThis.GPTMermaid, undefined, "ESM must not install the UMD global");

  const cjs = require("gpt-mermaid");
  assert.equal(cjs.version, pkg.version);
  assert.equal(typeof cjs.renderSvg, "function");
  assert.equal(cjs.default, undefined, "CommonJS has no synthetic runtime .default");
});

test("npm pack includes declarations and the lazy runtime", () => {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);

  const [pack] = JSON.parse(result.stdout);
  const files = new Set(pack.files.map((file) => file.path));
  for (const expected of [
    "dist/gpt-mermaid.esm.js",
    "dist/gpt-mermaid.cjs",
    "dist/gpt-mermaid.runtime.min.js",
    "types/index.d.ts",
    "types/index.d.cts",
    "types/umd.d.ts",
  ]) {
    assert.ok(files.has(expected), `npm package is missing ${expected}`);
  }
});

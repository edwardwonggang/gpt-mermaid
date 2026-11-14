import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import GPTMermaid, { presets, sanitizeSource } from "../dist/gpt-mermaid.esm.js";

test("exports a standard ES module API", () => {
  assert.equal(typeof GPTMermaid.render, "function");
  assert.equal(typeof GPTMermaid.renderSvg, "function");
  assert.equal(typeof GPTMermaid.renderAll, "function");
  assert.equal(typeof GPTMermaid.configure, "function");
  assert.equal(typeof GPTMermaid.mount, "function");
  assert.equal(GPTMermaid.version, "1.0.0");
});

test("sanitizes unsafe Mermaid configuration and clicks", () => {
  assert.equal(sanitizeSource("%%{init: {\"securityLevel\":\"loose\"}}%%\nflowchart TD\nA-->B"), null);
  assert.match(sanitizeSource("flowchart TD\nA-->B\nclick A \"javascript:alert(1)\""), /flowchart TD/);
  assert.doesNotMatch(sanitizeSource("flowchart TD\nA-->B\nclick A \"javascript:alert(1)\""), /click/);
});

test("provides built-in presets and merges configuration", () => {
  assert(presets.gpt.node);
  const config = GPTMermaid.configure({ preset: "github", themeVariables: { primaryColor: "#fff" } });
  assert.equal(config.preset, "github");
  assert.equal(config.themeVariables.primaryColor, "#fff");
});

test("package metadata exposes browser and npm entrypoints", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.name, "gpt-mermaid");
  assert.equal(pkg.exports["."].import, "./dist/gpt-mermaid.esm.js");
  assert.equal(pkg.exports["."].require, "./dist/gpt-mermaid.cjs");
  assert.equal(pkg.exports["./css"], "./dist/gpt-mermaid.css");
});

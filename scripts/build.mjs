#!/usr/bin/env node
/* 职责：构建 UMD/ESM/CJS 产物、复制 CSS，不修改已生成的 gpt-mermaid.runtime.min.js。 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SRC = path.join(ROOT, "src");
const version = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;

fs.mkdirSync(DIST, { recursive: true });
if (!fs.existsSync(path.join(DIST, "gpt-mermaid.runtime.min.js"))) {
  throw new Error("dist/gpt-mermaid.runtime.min.js is missing; run npm run build:runtime first");
}

fs.copyFileSync(path.join(SRC, "styles.css"), path.join(DIST, "gpt-mermaid.css"));
fs.copyFileSync(path.join(ROOT, "LICENSES", "Mermaid.txt"), path.join(DIST, "LICENSE"));

const common = {
  bundle: true,
  target: ["es2020"],
  sourcemap: false,
  legalComments: "inline",
  loader: { ".css": "text" },
  banner: { js: `/*! gpt-mermaid v${version} | MIT | https://github.com/edwardwonggang/gpt-mermaid */` },
};

const jobs = [
  { entryPoints: [path.join(SRC, "umd-entry.js")], format: "iife", outfile: path.join(DIST, "gpt-mermaid.umd.js") },
  { entryPoints: [path.join(SRC, "umd-entry.js")], format: "iife", minify: true, outfile: path.join(DIST, "gpt-mermaid.min.js") },
  { entryPoints: [path.join(SRC, "esm-entry.js")], format: "esm", outfile: path.join(DIST, "gpt-mermaid.esm.js") },
  { entryPoints: [path.join(SRC, "esm-entry.js")], format: "esm", minify: true, outfile: path.join(DIST, "gpt-mermaid.esm.min.js") },
  { entryPoints: [path.join(SRC, "cjs-entry.cjs")], format: "cjs", outfile: path.join(DIST, "gpt-mermaid.cjs") },
];

for (const job of jobs) {
  await build({ ...common, ...job });
  console.log("built", path.relative(ROOT, job.outfile));
}

console.log(`\ngpt-mermaid v${version} built.`);

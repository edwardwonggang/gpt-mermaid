#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsc = process.env.TSC || (process.platform === "win32" ? "npx.cmd" : "npx");
const prefix = process.env.TSC ? [] : ["--yes", "-p", "typescript@5.9.3", "tsc"];
const configs = [
  "test/fixtures/api-types/tsconfig.esm-bundler.json",
  "test/fixtures/api-types/tsconfig.esm-nodenext.json",
  "test/fixtures/api-types/tsconfig.cjs.json",
  "test/fixtures/api-types/tsconfig.umd.json",
];

for (const config of configs) {
  const result = spawnSync(tsc, [...prefix, "-p", config], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    process.exit(result.status || 1);
  }
  console.log(`types ok: ${config}`);
}

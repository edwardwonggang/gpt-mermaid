import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isTriangleMarkerReference, wrapJourneyText } from "../src/svg-labels.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Journey 任务文字按词换行，不把单词硬拆开", () => {
  const measure = (value) => value.length * 6;
  assert.deepEqual(wrapJourneyText("alpha beta gamma", 42, measure, 4), [
    "alpha",
    "beta",
    "gamma",
  ]);
});

test("Journey 任务中的超长无空格英文按字符切分", () => {
  const measure = (value) => value.length * 6;
  const lines = wrapJourneyText("abcdefghij", 18, measure, 4);
  assert.deepEqual(lines, ["abc", "def", "ghi", "j"]);
});

test("Journey 任务行数超过上限时仍保留全部内容，交给 textLength 压缩", () => {
  const measure = (value) => value.length * 6;
  const lines = wrapJourneyText("one two three four five six seven eight", 36, measure, 2);
  assert.equal(lines.length, 2);
  assert.equal(lines.join(" ").replace(/\s+/g, " "), "one two three four five six seven eight");
});

test("超长无空格词合并到末行时不能插入新空格", () => {
  const measure = (value) => value.length * 6;
  const lines = wrapJourneyText("abcdefghijkl", 12, measure, 2);
  assert.equal(lines.join(""), "abcdefghijkl");
});

test("Journey 空内容和非法宽度不会抛异常", () => {
  assert.deepEqual(wrapJourneyText("", 20, (value) => value.length), []);
  assert.deepEqual(wrapJourneyText("abc", 0, (value) => value.length), ["abc"]);
});

test("箭头避让覆盖当前三角 marker family，而非只覆盖 flowchart marker", () => {
  for (const marker of [
    "url(#diagram_flowchart-v2-pointEnd-gptm-0-right-end)",
    "url(#diagram_stateDiagram-barbEnd-gptm-0-down-end)",
    "url(#diagram_classDiagram-dependencyEnd-gptm-0-down-end)",
    "url(#diagram_requirement-requirement_arrowEnd-gptm-0-down-end)",
    "url(#diagram_filled-head-gptm-0-right-end)",
    "url(#diagram_solidTopArrowHead-gptm-0-right-end)",
    "url(#diagram_solidBottomArrowHead-gptm-0-right-end)",
    "url(#diagram_stick-arrowhead-gptm-0-right-end)",
  ]) assert.equal(isTriangleMarkerReference(marker), true, marker);
  assert.equal(isTriangleMarkerReference("url(#diagram_flowchart-v2-circleEnd)"), false);
  assert.equal(isTriangleMarkerReference("url(#diagram_flowchart-v2-crossEnd)"), false);
});

test("arrowRegions 使用共享三角家族判定，防止白名单回退", () => {
  const source = fs.readFileSync(path.join(ROOT, "src", "svg-labels.js"), "utf8");
  const start = source.indexOf("function arrowRegions");
  const end = source.indexOf("export function placeEdgeLabels", start);
  assert(start >= 0 && end > start);
  assert.match(source.slice(start, end), /isTriangleMarkerReference\(ref\)/);
});

test("Journey task 适配契约包含矩形宽度、textLength 和 lengthAdjust", () => {
  const source = fs.readFileSync(path.join(ROOT, "src", "svg-labels.js"), "utf8");
  const start = source.indexOf("function fitJourneyTask");
  const end = source.indexOf("function journeyLabels", start);
  assert(start >= 0 && end > start);
  const body = source.slice(start, end);
  assert.match(body, /rect\.getBBox\(\)/);
  assert.match(body, /textLength/);
  assert.match(body, /lengthAdjust/);
  assert.match(body, /maxWidth/);
});

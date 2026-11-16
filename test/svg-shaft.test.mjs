import test from "node:test";
import assert from "node:assert/strict";
import { trimArrowShafts } from "../src/svg-shaft.js";

// 本文件验证区间代数与属性契约；SVG 的实际描边/marker 光栅化仍由浏览器 E2E 验证。
const viewportDiagonal = Math.hypot(300, 400) / Math.SQRT2;
const lengthValue = (value) => parseFloat(value)
  * (String(value).endsWith("%") ? viewportDiagonal / 100 : 1);

function installStyleReader(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true, writable: true, value: (edge) => edge.computedStyle(),
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "getComputedStyle", previous);
    else delete globalThis.getComputedStyle;
  });
}

function fixture({
  pattern = "none", offset = "0", head = true, tail = true, calibration = null,
  length = 50, d = "M0 0 L50 0", vectorEffect = "none", kind = "path",
} = {}) {
  const geometry = kind === "line" ? [["x1", "0"], ["y1", "0"], ["x2", "50"], ["y2", "0"]]
    : kind === "polyline" ? [["points", "0,0 25,0 50,0"]] : [["d", d]];
  const attributes = new Map([
    ...geometry, ["data-gptm-direction", "right"],
    ["marker-start", head ? "url(#triangle)" : "url(#diamond)"],
    ["marker-end", tail ? "url(#triangle)" : "url(#diamond)"],
  ]);
  if (calibration !== null) attributes.set("pathLength", String(calibration));
  const originalAttributes = Object.fromEntries(attributes);
  const css = new Map();
  const edge = {
    id: "edge-test", localName: kind,
    style: { setProperty: (key, value, priority) => css.set(key, { value, priority }) },
    getAttribute: (key) => attributes.get(key) ?? null,
    getTotalLength: () => length,
    computedStyle: () => ({
      strokeDasharray: css.get("stroke-dasharray")?.value ?? pattern,
      strokeDashoffset: css.get("stroke-dashoffset")?.value ?? offset,
      vectorEffect,
    }),
  };
  const marker = {
    getAttribute: (key) => ({
      markerUnits: "userSpaceOnUse", viewBox: "0 0 10 8", markerWidth: "11",
    }[key] ?? null),
    querySelector: () => ({ getAttribute: () => "M 0 0 L 10 4 L 0 8 Z" }),
  };
  const svg = {
    viewBox: { baseVal: { width: 300, height: 400 } },
    querySelectorAll: () => [edge],
    getElementById: (id) => id === "triangle" ? marker : null,
  };
  edge.ownerSVGElement = svg;
  return { svg, edge, attributes, originalAttributes, css };
}

// 独立判据：用周期相位判定任意点是否着墨，不复用被测代码的区间枚举与编码算法。
function inkAt(position, pattern, offset, scale) {
  if (pattern === "none") return true;
  let values = pattern.split(/[ ,]+/).map(lengthValue).map((value) => value * scale);
  if (values.length % 2) values = [...values, ...values];
  const period = values.reduce((sum, value) => sum + value, 0);
  if (!period) return true;
  let point = ((position + lengthValue(offset) * scale) % period + period) % period;
  for (let index = 0; index < values.length; index++) {
    if (point < values[index]) return index % 2 === 0;
    point -= values[index];
  }
  return false;
}

test("没有独立marker的共享汇入线杆仍在主箭头底部截止", (t) => {
  installStyleReader(t);
  const leader = fixture({ head: false }), follower = fixture({ head: false, tail: false });
  leader.attributes.set("data-id", "leader");
  leader.attributes.set("data-gptm-shared-tip", "leader");
  follower.attributes.set("data-id", "follower");
  follower.attributes.delete("marker-end");
  follower.attributes.set("data-gptm-shared-tip", "leader");
  leader.svg.querySelectorAll = () => [leader.edge, follower.edge];
  assert.equal(trimArrowShafts(leader.svg).trimmed, 2);
  for (const item of [leader, follower]) {
    const dash = item.css.get("stroke-dasharray").value;
    assert(inkAt(38.5, dash, "0", 1));
    assert(!inkAt(39.5, dash, "0", 1));
    assert(!inkAt(49.7, dash, "0", 1), "共享线杆不能穿过尖端");
  }
});

test("裁线保留虚线相位、pathLength与百分比标尺，且重复执行幂等", (t) => {
  installStyleReader(t);
  let assertions = 0;
  let combinations = 0;
  for (const pattern of ["none", "4 3", "3 2 1", "0 5", "0 0", "0 1 2 0", "3px, 2px", "2% 1%"]) {
    for (const offset of ["-23", "-7", "0", "3", "16", "-2%"]) {
      for (const calibration of [null, 25, 100]) {
        for (const [head, tail] of [[true, true], [false, true], [true, false]]) {
          const item = fixture({ pattern, offset, head, tail, calibration });
          assert.deepEqual(trimArrowShafts(item.svg), { trimmed: 1, skipped: [] });
          assert.deepEqual(Object.fromEntries(item.attributes), item.originalAttributes);
          const encoded = item.css.get("stroke-dasharray").value;
          const scale = calibration ? 50 / calibration : 1;
          for (let index = 0; index < 97; index++) {
            // 非整点样本避开恰好落在 dash 边界时的浮点舍入歧义。
            const x = (index + 0.314159) * 50 / 97;
            const expected = x >= (head ? 11 : 0) && x < 50 - (tail ? 11 : 0)
              && inkAt(x, pattern, offset, scale);
            assert.equal(inkAt(x, encoded, "0", scale), expected,
              JSON.stringify({ pattern, offset, calibration, head, tail, x, encoded }));
            assertions++;
          }
          assert(Number(encoded.split(" ").at(-1)) * scale > 50, "末段空白必须阻止周期回卷");
          assert.deepEqual(item.css.get("stroke-dashoffset"), { value: "0", priority: "important" });
          assert.deepEqual(item.css.get("stroke-linecap"), { value: "butt", priority: "important" });
          trimArrowShafts(item.svg);
          assert.equal(item.css.get("stroke-dasharray").value, encoded);
          combinations++;
        }
      }
    }
  }
  assert.equal(combinations, 432);
  assert.equal(assertions, 41904);
  t.diagnostic(`${combinations} 组组合，${assertions} 个着墨位置断言`);
});

test("直线与折线沿原几何裁线，不改变原属性", (t) => {
  installStyleReader(t);
  for (const kind of ["line", "polyline"]) {
    const item = fixture({ kind, head: false });
    assert.deepEqual(trimArrowShafts(item.svg), { trimmed: 1, skipped: [] });
    assert.equal(item.css.get("stroke-dasharray").value, "0 0 39 51");
    assert.deepEqual(Object.fromEntries(item.attributes), item.originalAttributes);
  }
});

test("非三角语义端点不动，双头短边仅隐藏线身", (t) => {
  installStyleReader(t);
  const untouched = fixture({ head: false, tail: false });
  assert.deepEqual(trimArrowShafts(untouched.svg), { trimmed: 0, skipped: [] });
  assert.equal(untouched.css.size, 0);
  const short = fixture({ length: 12 });
  assert.deepEqual(trimArrowShafts(short.svg), { trimmed: 1, skipped: [] });
  assert.equal(short.css.get("stroke-dasharray").value, "0 13");
  assert.deepEqual(Object.fromEntries(short.attributes), short.originalAttributes);
});

test("无法可靠计算的线型显式报告，保留原样而非猜测", (t) => {
  installStyleReader(t);
  for (const [options, reason] of [
    [{ pattern: "calc(1px + 1%) 3" }, "unsupported-dash-length"],
    [{ d: "M0 0 L20 0 M30 0 L50 0" }, "multiple-subpaths"],
    [{ vectorEffect: "non-scaling-stroke" }, "non-scaling-stroke"],
    [{ pattern: "0.00001 0.00001" }, "dash-segment-budget"],
    [{ length: 0 }, "invalid-length"],
  ]) {
    const item = fixture(options);
    assert.deepEqual(trimArrowShafts(item.svg), { trimmed: 0, skipped: [{ id: "edge-test", reason }] });
    assert.equal(item.css.size, 0);
    assert.deepEqual(Object.fromEntries(item.attributes), item.originalAttributes);
  }
  const broken = fixture();
  broken.edge.getTotalLength = () => { throw new Error("unavailable"); };
  assert.equal(trimArrowShafts(broken.svg).skipped[0].reason, "geometry-unavailable");
  assert.equal(broken.css.size, 0);
});

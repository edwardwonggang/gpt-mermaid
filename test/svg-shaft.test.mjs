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

function polylineGeometry(points) {
  const lengths = points.slice(1).map((point, index) =>
    Math.hypot(point.x - points[index].x, point.y - points[index].y));
  return {
    length: lengths.reduce((sum, length) => sum + length, 0),
    pointAt(distance) {
      let remaining = distance;
      for (let index = 0; index < lengths.length; index++) {
        if (remaining <= lengths[index] || index === lengths.length - 1) {
          const fraction = remaining / lengths[index], a = points[index], b = points[index + 1];
          return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
        }
        remaining -= lengths[index];
      }
    },
  };
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

test("裁线保留主体虚线相位并补齐三角接头，兼容pathLength、百分比及幂等", (t) => {
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
            const expected = x >= (head ? 10.6 : 0) && x < 50 - (tail ? 10.6 : 0)
              && (inkAt(x, pattern, offset, scale) || head && x < 13.6 || tail && x >= 36.4);
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

test("短曲线按实际三角交界裁剪，不能把三角深度当弧长造成断开", (t) => {
  installStyleReader(t);
  const item = fixture({ head: false, tail: true, length: 30 });
  item.edge.getPointAtLength = (offset) => {
    const distance = 30 - offset;
    return { x: 10 * Math.sin(distance / 10), y: 10 * (1 - Math.cos(distance / 10)) };
  };
  trimArrowShafts(item.svg);
  const dash = item.css.get("stroke-dasharray").value;
  // 独立解析：圆弧与边斜率0.4的交界为2*atan(0.4)*R，约7.61；
  // 原固定11裁法会在真正接头前空出3.39单位。
  assert(inkAt(30 - 8, dash, "0", 1), "箭头外的曲线必须可见");
  assert(!inkAt(30 - 7, dash, "0", 1), "三角内的线杆必须裁去");
});

test("整条折线仍在三角内部时不能退回深度裁剪而重新露出线杆", (t) => {
  installStyleReader(t);
  const insidePoints = [
    { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 1.5 },
    { x: 8, y: 1.5 }, { x: 8, y: -1.5 }, { x: 10, y: -1.5 },
  ];
  // 凸三角包含每个折点即包含整条折线；弧长14.5大于marker深度11。
  assert(insidePoints.every(({ x, y }) => x >= 0 && x <= 11 && Math.abs(y) <= x * 0.4));
  for (const start of [true, false]) {
    const points = start ? insidePoints : insidePoints.slice().reverse(), geometry = polylineGeometry(points);
    assert.equal(geometry.length, 14.5);
    const item = fixture({
      head: start, tail: !start, length: geometry.length,
      d: points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(""),
    });
    item.edge.getPointAtLength = geometry.pointAt;
    assert.deepEqual(trimArrowShafts(item.svg), { trimmed: 1, skipped: [] });
    const encoded = item.css.get("stroke-dasharray").value;
    for (let offset = 0.1; offset < geometry.length; offset += 0.2) {
      assert(!inkAt(offset, encoded, "0", 1),
        `${start ? "起点" : "终点"}三角内部仍有可见线杆：offset=${offset},dash=${encoded}`);
    }
    trimArrowShafts(item.svg);
    assert.equal(item.css.get("stroke-dasharray").value, encoded, "完全覆盖场景重复裁剪也必须幂等");
    assert.deepEqual(Object.fromEntries(item.attributes), item.originalAttributes);
  }
});

test("直线与折线沿原几何裁线，不改变原属性", (t) => {
  installStyleReader(t);
  for (const kind of ["line", "polyline"]) {
    const item = fixture({ kind, head: false });
    assert.deepEqual(trimArrowShafts(item.svg), { trimmed: 1, skipped: [] });
    assert.equal(item.css.get("stroke-dasharray").value, "0 0 39.4 51");
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

test("长度可读但实际路径取点失败时逐边跳过，不能中断其余箭杆处理", (t) => {
  installStyleReader(t);
  const failures = [
    () => { throw new Error("point measurement unavailable"); },
    () => ({ x: NaN, y: 0 }),
    () => ({ x: 0, y: Infinity }),
  ];
  for (const failure of failures) for (const failAfter of [0, 0.1]) {
    const broken = fixture({ head: true, tail: false }), healthy = fixture({ head: false, tail: true });
    healthy.edge.id = "healthy";
    broken.edge.getPointAtLength = (distance) => {
      if (distance >= failAfter) return failure();
      return { x: distance, y: 0 };
    };
    broken.svg.querySelectorAll = () => [broken.edge, healthy.edge];
    const report = trimArrowShafts(broken.svg);
    assert.deepEqual(report, { trimmed: 1, skipped: [{ id: "edge-test", reason: "geometry-unavailable" }] });
    assert.equal(broken.css.size, 0, "取点失败时不应留下部分裁剪样式");
    assert.deepEqual(Object.fromEntries(broken.attributes), broken.originalAttributes);
    assert(healthy.css.has("stroke-dasharray"), "其它合法边仍应继续处理");
  }
});

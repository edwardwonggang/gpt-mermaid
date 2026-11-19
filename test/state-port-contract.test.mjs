/* 职责：验收最终 SVG 检查器的独立端口契约与实际路径采样反例。
 * 调用方：node --test；依赖：Node 内置模块、验收器的纯数据入口及最小 SVG API 夹具。
 * 红线：不启动浏览器、不读取布局模型的 accepted、不修改生产数据或源码。
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { evaluateStatePortContract as inspect, inspectStateLayout } from "./state-layout-geometry.mjs";
import { inspectStatePorts } from "./state-ports.mjs";

const point = (x, y) => ({ x, y });
const absent = () => ({ present: false, resolved: false, visible: false, depth: 0, width: 0, tipGap: null });
const marker = (extra = {}) => ({ present: true, resolved: true, visible: true, depth: 10, width: 8, tipGap: 0, ...extra });
function object(id, x, y, width = 100, height = 100, extra = {}) {
  const rx = extra.rx ?? 10, ry = extra.ry ?? rx, cx = x + width / 2, cy = y + height / 2;
  const value = { id, kind: "state", bounds: { x, y, right: x + width, bottom: y + height, width, height }, ...extra };
  value.sides = {
    top: { min: value.poleOnly ? cx : x + rx, max: value.poleOnly ? cx : x + width - rx, center: cx },
    bottom: { min: value.poleOnly ? cx : x + rx, max: value.poleOnly ? cx : x + width - rx, center: cx },
    left: { min: value.poleOnly ? cy : y + ry, max: value.poleOnly ? cy : y + height - ry, center: cy },
    right: { min: value.poleOnly ? cy : y + ry, max: value.poleOnly ? cy : y + height - ry, center: cy },
  };
  return value;
}
function endpoint(o, side, coordinate, start, m) {
  const b = o.bounds, vertical = ["left", "right"].includes(side);
  const p = vertical ? point(side === "left" ? b.x : b.right, coordinate)
    : point(coordinate, side === "top" ? b.y : b.bottom);
  return { owner: o.id, start, side, coordinate, point: p, contourGap: 0, normalError: 0,
    middleError: Math.abs(coordinate - o.sides[side].center), normalLead: 40, visibleLead: 40 - m.depth,
    markerDepth: m.depth, markerWidth: m.width, strokeWidth: 1.5, controlLead: 28 };
}
function edge(id, source, target, a, b, extra = {}) {
  const startMarker = extra.markerStart || absent(), endMarker = extra.markerEnd || marker();
  const endpoints = [endpoint(source, a[0], a[1], true, startMarker), endpoint(target, b[0], b[1], false, endMarker)];
  return { id, logical: id, source: source.id, target: target.id, segments: 1, endpoints,
    markerStart: startMarker, markerEnd: endMarker, ranges: [[endpoints[0].point, endpoints[1].point]], ...extra };
}
function parallel(count = 1, { width = 100, spacing = 16, offset = 0 } = {}) {
  const a = object("A", 0, 0, width), b = object("B", 0, 300, width);
  const edges = Array.from({ length: count }, (_, i) => {
    const x = width / 2 + (i - (count - 1) / 2) * spacing + offset;
    return edge(`e${i}`, a, b, ["bottom", x], ["top", x]);
  });
  return { objects: [a, b], edges };
}
function accepted(snapshot) {
  const before = structuredClone(snapshot), report = inspect(snapshot);
  assert.deepEqual(snapshot, before, "验收器不得写回输入快照");
  assert.deepEqual(report.issues, [], JSON.stringify(report.issues)); assert.equal(report.accepted, true);
  return report;
}
function rejected(snapshot, reason) {
  const report = inspect(snapshot);
  assert.equal(report.accepted, false);
  assert(report.issues.some(i => i.reason === reason), `${reason}: ${JSON.stringify(report.issues)}`);
  return report;
}

test("兼容旧报告字段；单端口居中且可见16单位，无40/32固定门槛", () => {
  const input = parallel();
  input.edges[0].endpoints.forEach(p => { p.visibleLead = 16; p.normalLead = 16 + p.markerDepth; });
  const report = accepted(input);
  for (const key of ["nodes", "logicalEdges", "displaySegments", "labels", "ports", "issues", "edges"]) assert(key in report);
  assert.equal(report.independentPorts, 2); assert.equal(report.markerCount, 1);
  assert.equal(report.expectedMarkerCount, 1); assert.equal(report.ports[0].controlLead, 28);
});

for (const count of [2, 3, 7]) test(`${count}个同侧端口独立有序、居中，非零middleError不报错`, () => {
  const report = accepted(parallel(count, { width: 180 }));
  assert.equal(report.portGroups[0].count, count);
  assert.equal(report.portGroups[0].centerError, 0);
  assert.equal(report.portGroups[0].minSpacing, 16);
  assert(report.ports.some(p => p.middleError > .1));
});

test("同侧入端与出端共同居中计算，不能各自占中点", () => {
  const input = parallel(2, { spacing: 12 }), second = input.edges[1];
  const [a, b] = input.objects;
  input.edges[1] = edge(second.id, b, a, ["top", 56], ["bottom", 56]);
  const report = accepted(input), bottom = report.portGroups.find(g => g.owner === "A");
  assert.equal(bottom.incoming, 1); assert.equal(bottom.outgoing, 1);
  assert.equal(bottom.requiredSpacing, 12); assert.equal(bottom.centerError, 0);
});

test("单端口偏心、多端口组偏心、相邻少于12分别显式拒绝", () => {
  rejected(parallel(1, { offset: 4 }), "port-group-center");
  rejected(parallel(3, { offset: 4 }), "port-group-center");
  rejected(parallel(2, { spacing: 11 }), "port-spacing");
});

test("容量临界通过，超限返回只扩所需维度的数据", () => {
  accepted(parallel(3, { width: 52, spacing: 12 }));
  const report = rejected(parallel(3, { width: 50, spacing: 12 }), "port-capacity");
  const group = report.portGroups.find(g => g.owner === "B");
  assert.equal(group.availableSpan, 22); assert.equal(group.requiredSpan, 24);
  assert.equal(group.dimension, "width"); assert.equal(group.growBy, 2); assert.equal(group.requiredDimension, 52);
  rejected(parallel(7, { width: 80 }), "port-corner-clearance");
});

test("混合端口扩容建议对称预留两侧较大的箭头占位", () => {
  const input = parallel(2, { width: 38, spacing: 12 }), [a, b] = input.objects;
  input.edges[1] = edge("e1", b, a, ["top", 25], ["bottom", 25]);
  const report = rejected(input, "port-capacity");
  const group = report.portGroups.find(g => g.owner === "A");
  assert.equal(group.growBy, 2); assert.equal(group.requiredDimension, 40);
});

test("箭头实际底宽和线宽共同影响端口净距，不局限12", () => {
  const input = parallel(2, { spacing: 16 });
  for (const e of input.edges) {
    e.markerEnd = marker({ depth: 22.5, width: 18 });
    Object.assign(e.endpoints[1], { markerWidth: 18, markerDepth: 22.5 });
  }
  const report = rejected(input, "port-spacing");
  assert.equal(report.portGroups.find(g => g.owner === "B").requiredSpacing, 20);
});

test("空集、缺失归属、退化路径和重复身份均拒绝", () => {
  rejected({ objects: [], edges: [] }, "empty-edge-set");
  const missing = parallel(); missing.objects.pop(); rejected(missing, "missing-owner");
  const empty = parallel(); empty.edges[0].ranges = [[]]; rejected(empty, "invalid-path");
  const duplicate = parallel(); duplicate.edges.push(structuredClone(duplicate.edges[0]));
  rejected(duplicate, "duplicate-edge-id");
});

test("末段各自marker；共享定义合法，缺失/隐藏/失效marker非法", () => {
  const input = parallel(2);
  for (const e of input.edges) e.markerEnd.id = "同一个marker定义";
  assert.equal(accepted(input).markerCount, 2);
  for (const patch of [absent(), marker({ resolved: false }), marker({ visible: false }), marker({ tipGap: 3 })]) {
    const changed = structuredClone(input); changed.edges[1].markerEnd = patch;
    rejected(changed, patch.present ? "invalid-marker" : "missing-final-marker");
  }
  const old = structuredClone(input); old.edges[1].sharedTip = old.edges[0].id;
  rejected(old, "shared-port-metadata");
});

function condition() {
  const a = object("A", 0, 0), c = object("条件", 0, 200, 100, 50, { kind: "label", labelOwner: "业务", text: "允许" });
  const b = object("B", 0, 400);
  return { objects: [a, c, b], edges: [
    edge("前段", a, c, ["bottom", 50], ["top", 50], { logical: "业务", markerEnd: absent() }),
    edge("后段", c, b, ["bottom", 50], ["top", 50], { logical: "业务" }),
  ] };
}
test("条件前段无marker、后段独立marker、同owner对侧", () => {
  const report = accepted(condition());
  assert.equal(report.logicalEdges, 1); assert.equal(report.displaySegments, 2);
  assert.equal(report.labels.length, 1); assert.equal(report.ports.length, 4);
  assert.equal(report.markerCount, 1);
  const marked = condition(); marked.edges[0].markerEnd = marker();
  rejected(marked, "condition-entry-marker");
  const side = condition();
  side.edges[1].endpoints[0] = endpoint(side.objects[1], "right", 225, true, absent());
  rejected(side, "condition-opposite-sides");
  const owner = condition(); owner.edges[0].logical = "另一业务";
  rejected(owner, "condition-owner");
});

test("16单位按箭头之外的真实可见长度验收", () => {
  const short = parallel();
  Object.assign(short.edges[0].endpoints[1], { normalLead: 28, markerDepth: 18, visibleLead: 10 });
  rejected(short, "port-contract");
  const wrong = parallel(); wrong.edges[0].endpoints[0].normalError = 2;
  rejected(wrong, "port-contract");
});

test("圆和菱形仅保留极点，偏移与重复极点不伪装矩形容量", () => {
  for (const shape of ["circle", "polygon"]) {
    const input = parallel(), old = input.objects[0];
    input.objects[0] = object(old.id, 0, 0, 100, 100, { shape, poleOnly: true });
    accepted(input);
    const shifted = structuredClone(input); shifted.edges[0].endpoints[0].middleError = 3;
    rejected(shifted, "port-contract");
    const crowded = structuredClone(input), second = structuredClone(input.edges[0]);
    second.id = second.logical = "另一业务"; crowded.edges.push(second);
    const report = rejected(crowded, "port-capacity");
    assert.equal(report.portGroups[0].growBy, null);
  }
});

test("不同owner完全重合、正长度重合、仅端点接触与正交相交均拒绝", () => {
  const same = parallel(2, { spacing: 0 });
  rejected(same, "cross-owner-overlap"); rejected(same, "marker-overlap");
  const touch = parallel(2);
  touch.edges[0].ranges = [[point(0, 0), point(30, 0)]];
  touch.edges[1].ranges = [[point(30, 0), point(30, 40)]];
  rejected(touch, "endpoint-touch");
  const cross = parallel(2);
  cross.edges[0].ranges = [[point(0, 20), point(50, 20)]];
  cross.edges[1].ranges = [[point(25, 0), point(25, 40)]];
  rejected(cross, "path-crossing");
});

test("小圆角实际近邻弦段不误报交叉；真折返和自交仍拒绝", () => {
  const input = parallel();
  const samples = [point(0, 0), point(50, 0)];
  for (let i = 1; i <= 80; i++) {
    const t = i / 80; samples.push(point(50 + 2 * (1 - t) * t * 5 + t * t * 5, t * t * 5));
  }
  samples.push(point(55, 80)); input.edges[0].ranges = [samples];
  accepted(input);
  const reverse = parallel(); reverse.edges[0].ranges = [[point(0, 0), point(50, 0), point(40, 0)]];
  rejected(reverse, "self-intersection");
  const cross = parallel(); cross.edges[0].ranges = [[point(0, 0), point(40, 0), point(40, 30), point(20, 30), point(20, -20)]];
  rejected(cross, "self-intersection");
});

test("多个自环两端独立占位，重叠通道和共用端口不豁免", () => {
  const a = object("A", 0, 0), input = { objects: [a], edges: [
    edge("环1", a, a, ["right", 50], ["top", 50], {
      ranges: [[point(100, 50), point(160, 50), point(160, -60), point(50, -60), point(50, 0)]] }),
    edge("环2", a, a, ["left", 50], ["bottom", 50], {
      ranges: [[point(0, 50), point(-60, 50), point(-60, 160), point(50, 160), point(50, 100)]] }),
  ] };
  assert.equal(accepted(input).independentPorts, 4);
  input.edges[1].ranges = structuredClone(input.edges[0].ranges);
  rejected(input, "cross-owner-overlap");
});

test("声明数量只是对账，不以通过标记或缺失marker掩盖少边", () => {
  const input = parallel(); input.declaredCounts = { logicalEdges: 10, labels: 0, ports: 20 };
  rejected(input, "declared-count");
});

// 最小 DOM/SVG 夹具仅提供解析后元素及原生几何接口；不实现布局算法。
// 通过 vm 重新序列化整个回调，能捕获 page.evaluate 丢失模块闭包的错误。
function browserFixture({ rectRx = 10, markerDepth = 10, lead = 40, noMarker = false, empty = false } = {}) {
  const identity = { a: 1, b: 0, c: 0, d: 1, inverse() { return this; }, multiply() { return this; } };
  class DOMPoint {
    constructor(x, y) { this.x = x; this.y = y; }
    matrixTransform() { return new DOMPoint(this.x, this.y); }
  }
  const style = { strokeWidth: "1.5", fill: "black", stroke: "black", opacity: "1", visibility: "visible", display: "inline" };
  const polyline = points => {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    return { getTotalLength: () => lengths.reduce((a, b) => a + b, 0),
      getPointAtLength(at) {
        for (let i = 0; i < lengths.length; i++) {
          if (at <= lengths[i] || i === lengths.length - 1) {
            const t = Math.min(1, Math.max(0, at / lengths[i]));
            return point(points[i].x + (points[i + 1].x - points[i].x) * t, points[i].y + (points[i + 1].y - points[i].y) * t);
          }
          at -= lengths[i];
        }
      } };
  };
  function rect(id, x, y, width, height) {
    const outline = [point(x + rectRx, y), point(x + width - rectRx, y),
      point(x + width, y + rectRx), point(x + width, y + height - rectRx),
      point(x + width - rectRx, y + height), point(x + rectRx, y + height),
      point(x, y + height - rectRx), point(x, y + rectRx), point(x + rectRx, y)];
    const shape = { localName: "rect", ...polyline(outline), getScreenCTM: () => identity,
      getBBox: () => ({ x, y, width, height }), getAttribute: n => ["rx", "ry"].includes(n) ? String(rectRx) : null,
      isPointInFill: () => false };
    return { dataset: { id, gptmLayoutObject: "state" }, textContent: id, children: [shape], querySelector: () => shape };
  }
  const nodes = [rect("A", 0, 0, 100, 100), rect("B", 200, 200, 100, 100)];
  const route = [point(50, 100), point(50, 100 + lead), point(250, 100 + lead), point(250, 200)];
  const markerElement = { querySelector: () => ({ getBBox: () => ({ x: 0, y: 0, width: 10, height: 8 }) }),
    getAttribute: name => ({ markerUnits: "userSpaceOnUse", markerWidth: String(markerDepth), markerHeight: String(markerDepth * .8),
      refX: "10", refY: "4", viewBox: "0 0 10 8" })[name] || null };
  const attrs = { d: "M50 100L50 140L250 140L250 200", "marker-end": noMarker ? null : "url(#arrow)" };
  const path = { dataset: { id: "e", gptmEdgeOwner: "e", source: "A", target: "B",
    points: Buffer.from(JSON.stringify(route)).toString("base64") }, ...polyline(route),
    getScreenCTM: () => identity, getAttribute: name => attrs[name] || null };
  const svg = { dataset: {}, getScreenCTM: () => identity, getElementById: () => markerElement,
    querySelectorAll: selector => selector.includes("layout-object") ? nodes : empty ? [] : [path] };
  let removed = false;
  const document = { body: { append() {} }, createElement: () => ({
    style: {}, set innerHTML(_) {}, querySelector: () => svg, remove() { removed = true; },
  }) };
  return { context: { document, DOMPoint, getComputedStyle: () => style, atob: s => Buffer.from(s, "base64").toString() },
    removed: () => removed };
}
function runBrowserCallback(callback, options) {
  const fixture = browserFixture(options);
  const report = vm.runInNewContext(`(${callback.toString()})("<svg/>")`, fixture.context);
  assert.equal(fixture.removed(), true, "离屏宿主必须被回收");
  return JSON.parse(JSON.stringify(report));
}
test("page.evaluate序列化保持闭包独立，真实轮廓采样与marker尺寸读入", () => {
  const report = runBrowserCallback(inspectStateLayout);
  assert.deepEqual(report.issues, []);
  assert.equal(report.markerCount, 1);
  assert.equal(report.ports[0].contourGap, 0);
  assert.equal(report.ports[1].markerDepth, 10);
  assert(report.ports[0].visibleLead >= 39.9);
  const rows = runBrowserCallback(inspectStatePorts);
  assert.equal(rows.length, 1); assert.equal(rows[0].endpoints.length, 2); assert.equal(rows[0].accepted, true);
});
test("SVG采样拒绝少箭头、实际短直段、空边集", () => {
  for (const [options, reason] of [[{ noMarker: true }, "missing-final-marker"],
    [{ lead: 8 }, "port-contract"], [{ empty: true }, "empty-edge-set"]]) {
    const report = runBrowserCallback(inspectStateLayout, options);
    assert.equal(report.accepted, false);
    assert(report.issues.some(i => i.reason === reason), JSON.stringify(report.issues));
  }
  assert.throws(() => runBrowserCallback(inspectStatePorts, { empty: true }), /empty-edge-set/);
});

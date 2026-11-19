/* 职责：回归独立连接端的身份、混合计数、真实边容量与冻结几何拒绝边界。
 * 调用方：node --test；依赖：Node 内置模块、state-ports 和 state-constraints。
 * 红线：不模拟分配算法，不启动浏览器，不修改源码、真实数据或构建产物；
 * 验证器反例手写几何，避免分配器与验证器共享错误时相互证明正确。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { allocateStatePorts } from "../src/state-ports.js";
import { validateStateLayout } from "../src/state-constraints.js";

const SIDES = ["NORTH", "EAST", "SOUTH", "WEST"];
const OPPOSITE = { NORTH: "SOUTH", EAST: "WEST", SOUTH: "NORTH", WEST: "EAST" };
const point = (x, y) => ({ x, y });
const node = (id, extra = {}) =>
  ({ id, kind: "state", shape: "rect", width: 180, height: 180, cornerRadius: 4, ...extra });
const relation = (id, source, target) => ({ id, owner: id, source, target, arrow: true });
const near = (actual, expected, message) =>
  assert(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} != ${expected}`);
const dimension = side => ["NORTH", "SOUTH"].includes(side) ? "width" : "height";
const coordinate = (port, side) => dimension(side) === "width" ? port.x : port.y;

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function fan(count, side = "NORTH", extra = {}) {
  const nodes = [node("hub", extra)], segments = [], selected = {};
  for (let i = 0; i < count; i++) {
    const peer = `peer-${i}`, incoming = i % 2 === 1;
    nodes.push(node(peer));
    const edge = relation(`edge-${i}`, incoming ? peer : "hub", incoming ? "hub" : peer);
    segments.push(edge);
    selected[edge.id] = incoming ? { source: OPPOSITE[side], target: side }
      : { source: side, target: OPPOSITE[side] };
  }
  return { model: { nodes, segments, arrowDepth: 18 }, selected };
}

function allocate(fixture, hints = new Map()) {
  const before = structuredClone(fixture), hintsBefore = [...hints];
  freeze(fixture);
  const result = allocateStatePorts(fixture.model, fixture.selected, hints);
  assert.deepEqual(fixture, before, "分配不得改写尺寸、嵌套占位、连接端或选侧输入");
  assert.deepEqual([...hints], hintsBefore, "分配不得消费或改写排序提示");
  const ports = [...result.nodes.values()].flatMap(n => n.ports);
  assert.equal(ports.length, fixture.model.segments.length * 2);
  assert.equal(new Set(ports.map(p => p.id)).size, ports.length, "所有连接端的 ID 必须全局唯一");
  assert.equal(result.ends.size, ports.length, "端口索引不能覆盖另一个连接端");
  for (const edge of fixture.model.segments) for (const end of ["source", "target"]) {
    const port = result.ends.get(`${edge.id}:${end}`);
    assert(port, `${edge.id} 缺少 ${end}`);
    assert.equal(port.segment, edge.id);
    assert.equal(port.owner, edge.owner);
    assert.equal(port.end, end);
    assert.equal(port.side, fixture.selected[edge.id][end]);
    assert(result.nodes.get(edge[end]).ports.some(p => p.id === port.id), "端口必须属于真实连接节点");
  }
  return result;
}

function checkGroup(n, side, count) {
  const ports = n.ports.filter(p => p.side === side)
    .sort((a, b) => coordinate(a, side) - coordinate(b, side));
  assert.equal(ports.length, count, `${n.id}:${side} 的入出端必须共同计数`);
  const values = ports.map(p => coordinate(p, side)), center = n[dimension(side)] / 2;
  near(values.reduce((sum, value) => sum + value, 0) / count, center, "整组端口的中心");
  for (let i = 0; i < count; i++) {
    near(values[i] + values[count - 1 - i], center * 2, "端口须围绕边中心对称");
    if (i) assert(values[i] - values[i - 1] >= 18 - 1e-8, "相邻连接端间距至少为 18");
    const p = ports[i];
    near(dimension(side) === "width" ? p.y : p.x,
      side === "SOUTH" ? n.height : side === "EAST" ? n.width : 0, "端点必须在指定直边");
  }
  return ports;
}

for (const count of [1, 2, 3, 7]) test(`${count} 个混合连接端在四侧均独立、居中且不挤压已有容量`, () => {
  for (const side of SIDES) {
    const fixture = fan(count, side), allocated = allocate(fixture), hub = allocated.nodes.get("hub");
    checkGroup(hub, side, count);
    assert.equal(hub.width, 180); assert.equal(hub.height, 180);
    assert.equal(hub.ports.filter(p => p.end === "target").length, Math.floor(count / 2));
    assert.equal(hub.ports.filter(p => p.end === "source").length, Math.ceil(count / 2));
  }
});

test("相同起终点的不同关系仍独立，自环的 source/target 各占一个连接端", () => {
  const segments = [relation("first", "hub", "peer"), relation("second", "hub", "peer"),
    relation("loop", "hub", "hub")];
  const selected = Object.fromEntries(segments.map(e =>
    [e.id, { source: "WEST", target: e.id === "loop" ? "WEST" : "EAST" }]));
  const result = allocate({ model: { nodes: [node("hub"), node("peer")], segments }, selected });
  checkGroup(result.nodes.get("hub"), "WEST", 4);
  checkGroup(result.nodes.get("peer"), "EAST", 2);
  const start = result.ends.get("loop:source"), end = result.ends.get("loop:target");
  assert.notEqual(start.id, end.id);
  assert(Math.abs(start.y - end.y) >= 18);
  assert.equal(result.ends.size, 6, "三条关系必须有六个连接端，不能按邻居节点去重");
});

test("排序提示保持端口通道顺序，输入数组重排不改变身份及位置", () => {
  const fixture = fan(7, "SOUTH");
  const hints = new Map([50, -20, 20, 20, 100, 0, -80].map((value, i) =>
    [`edge-${i}:${i % 2 ? "target" : "source"}`, value]));
  const first = allocate(fixture, hints);
  const reordered = structuredClone(fixture);
  reordered.model.nodes.reverse(); reordered.model.segments.reverse();
  const second = allocate(reordered, hints);
  const snapshot = allocation => [...allocation.ends.values()].map(p =>
    [p.id, p.segment, p.end, p.side, p.x, p.y]).sort((a, b) => a[0].localeCompare(b[0]));
  assert.deepEqual(snapshot(first), snapshot(second));
  const ports = checkGroup(first.nodes.get("hub"), "SOUTH", 7);
  const ordering = ports.map(p => hints.get(p.id));
  assert.deepEqual(ordering, [...ordering].sort((a, b) => a - b));
});

test("七端口容量不足只扩所需方向，嵌套占位跟随扩展且原输入不变", () => {
  for (const side of SIDES) {
    const dim = dimension(side), other = dim === "width" ? "height" : "width";
    const fixture = fan(7, side, { width: 120, height: 120, [dim]: 10 });
    const original = fixture.model.nodes[0];
    original.envelope = { width: original.width + 60, height: original.height + 20,
      dx: 30, dy: 10, blockedSides: [] };
    const result = allocate(fixture), hub = result.nodes.get("hub");
    const ports = checkGroup(hub, side, 7);
    assert(hub[dim] > original[dim]);
    assert.equal(hub[other], original[other], "无端口压力的方向不得扩张");
    near(hub.envelope[dim] - original.envelope[dim], hub[dim] - original[dim], "占位随框扩大");
    assert.equal(hub.envelope[other], original.envelope[other]);
    assert.equal(hub.envelope.dx, 30); assert.equal(hub.envelope.dy, 10);
    // 按实际三角的 10:8 高底比核验投影，不读分配器的 inset/offset 计算函数。
    const arrowHalfBase = 18 * 8 / 10 / 2;
    for (const p of ports) {
      const at = coordinate(p, side);
      assert(Math.min(at, hub[dim] - at) >= 4 + arrowHalfBase + 1 - 1e-8,
        "混合端口整组须保留最大箭头、圆角和描边容量");
    }
  }
});

test("单连接端短边也容纳实际箭头与圆角，直段预算不吞掉可见 16 单位", () => {
  for (const side of SIDES) for (const end of ["source", "target"]) for (const depth of [11, 18]) {
    const dim = dimension(side), other = dim === "width" ? "height" : "width";
    const edge = relation("one", end === "source" ? "hub" : "peer", end === "target" ? "hub" : "peer");
    const fixture = { model: { nodes: [node("hub", { [dim]: 8 }), node("peer")],
      segments: [edge], arrowDepth: depth },
    selected: { one: end === "source" ? { source: side, target: OPPOSITE[side] }
      : { source: OPPOSITE[side], target: side } } };
    const result = allocate(fixture), hub = result.nodes.get("hub");
    const [port] = checkGroup(hub, side, 1);
    const arrowDepth = end === "target" ? depth : 0, halfBase = arrowDepth * 8 / 10 / 2;
    assert(hub[dim] > 8, "一个连接端也可能需要扩容");
    assert.equal(hub[other], 180);
    assert(hub[dim] / 2 - 4 >= halfBase + 1 - 1e-8, "箭头两侧不能侵入圆角");
    assert(port.lead - arrowDepth - 4 >= 16, "扣除真实箭头及拐角后仍有可见直段");
    assert(hub.padding[side] >= port.lead);
    for (const unused of SIDES.filter(s => s !== side)) assert.equal(hub.padding[unused], 0);
  }
});

test("圆和 choice 单极点不偏移，同侧多端口与同侧自环明确拒绝", () => {
  for (const shape of ["stateStart", "stateEnd", "choice", "choiceState"]) for (const side of SIDES) {
    const single = allocate(fan(1, side, { shape, width: 20, height: 20 }));
    const hub = single.nodes.get("hub");
    checkGroup(hub, side, 1);
    assert.equal(hub.width, 20); assert.equal(hub.height, 20);
    const crowded = fan(2, side, { shape, width: 20, height: 20 }), before = structuredClone(crowded);
    assert.throws(() => allocateStatePorts(freeze(crowded.model), freeze(crowded.selected)),
      /unsupported: state-port-capacity:hub:/);
    assert.deepEqual(crowded, before, "拒绝容量不足也不能改写输入");
    const loop = { nodes: [node("hub", { shape, width: 20, height: 20 })],
      segments: [relation("loop", "hub", "hub")] };
    assert.throws(() => allocateStatePorts(freeze(loop), { loop: { source: side, target: side } }),
      /unsupported: state-port-capacity:hub:/, "一个自环不是一个连接端");
  }
});

test("空模型和孤立短边节点不制造端口、扩容或全局留白", () => {
  for (const nodes of [[], [node("alone", { width: 8, height: 6 })]]) {
    const result = allocate({ model: { nodes, segments: [] }, selected: {} });
    assert.equal(result.ends.size, 0);
    for (const n of result.nodes.values()) {
      assert.equal(n.width, 8); assert.equal(n.height, 6);
      assert.deepEqual(n.ports, []);
      assert(Object.values(n.padding).every(value => value === 0));
    }
  }
});

function validate(model) {
  const before = structuredClone(model), result = validateStateLayout(freeze(model));
  assert.deepEqual(model, before, "验证器不得修线、扩框或改写输入");
  return result;
}
function accept(model) {
  const report = validate(model);
  assert.equal(report.accepted, true, JSON.stringify(report));
  assert.deepEqual(report.issues, []); assert.deepEqual(report.intersections, []);
}

function parallelLayout() {
  const edges = [relation("first", "A", "B"), relation("second", "A", "B")];
  return { nodes: [node("A", { x: 0, y: 0, width: 100, height: 100 }),
    node("B", { x: 0, y: 400, width: 100, height: 100 })], edges,
  segments: edges.map((e, i) => ({ ...e, points: [point(41 + 18 * i, 100), point(41 + 18 * i, 400)] })) };
}

test("独立端口不能豁免关系中段重合，完全重合也必须被验证器拒绝", () => {
  const valid = parallelLayout(); accept(valid);
  const coincident = structuredClone(valid);
  coincident.segments[1].points = structuredClone(coincident.segments[0].points);
  const partial = structuredClone(valid);
  partial.segments[0].points = [[41, 100], [41, 180], [150, 180], [150, 320], [41, 320], [41, 400]].map(p => point(...p));
  partial.segments[1].points = [[59, 100], [59, 220], [150, 220], [150, 280], [59, 280], [59, 400]].map(p => point(...p));
  for (const model of [coincident, partial]) {
    const report = validate(model);
    assert.equal(report.accepted, false);
    assert(report.intersections.some(hit => hit.kind === "overlap"), JSON.stringify(report));
    assert(report.issues.some(issue => issue.constraint === "G08"), JSON.stringify(report));
    if (model === partial) assert(!report.issues.some(issue => ["G01", "G02", "G03", "G04"].includes(issue.constraint)),
      "中段重合反例须保持语义、端口及出入直段合法");
  }
});

test("子节点仍在祖父容器内也不能越过直接父容器的任意一侧", () => {
  const model = { nodes: [
    node("outer", { x: 0, y: 0, width: 500, height: 500, isGroup: true }),
    node("parent", { x: 100, y: 100, width: 300, height: 300, isGroup: true, parentId: "outer" }),
    node("child", { x: 150, y: 150, width: 80, height: 60, parentId: "parent" }),
  ], edges: [], segments: [] };
  accept(model);
  for (const overflow of [{ x: 99 }, { x: 321 }, { y: 99 }, { y: 341 }]) {
    const escaped = structuredClone(model);
    Object.assign(escaped.nodes[2], overflow);
    const report = validate(escaped);
    assert.equal(report.accepted, false, JSON.stringify(overflow));
    assert(report.issues.some(issue => issue.constraint === "G05" && issue.subject === "child"),
      JSON.stringify(report));
  }
});

test("验证器拒绝居中但连单个箭头都容纳不了的短边，不能把负容量截成合法零跨度", () => {
  const edge = relation("one", "A", "B");
  const model = { nodes: [
    node("A", { x: 0, y: 0, width: 80, height: 80, arrowDepth: 18 }),
    node("B", { x: 300, y: 27.8, width: 80, height: 24.4, arrowDepth: 18 }),
  ], edges: [edge], segments: [{ ...edge, points: [point(80, 40), point(300, 40)] }] };
  accept(model);
  // 保持连接点、边中心、圆角及箭头不变：先验严重不足，再验安全容量临界值下方。
  for (const height of [10, 24.2]) {
    const short = structuredClone(model);
    short.nodes[1].height = height; short.nodes[1].y = 40 - height / 2;
    const report = validate(short);
    assert.equal(report.accepted, false, `短边 ${height} 的单端口负容量不得通过：${JSON.stringify(report)}`);
    assert(report.issues.some(issue => issue.constraint === "G02" && issue.subject === "B"), JSON.stringify(report));
  }
});

/* 职责：独立验证状态模型、可注入布局与冻结几何的G01/G02/G03/G05/G06/G08边界。
 * 调用方：node --test；依赖：Node内置模块与src纯逻辑接口，不依赖浏览器、ELK产物或output。
 * 红线：反例不得通过放宽断言、todo或捕获任意异常假装已拒绝；不修改生产源码与真实用户数据。
 * 重放：rtk node --test test/state-layout-model.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { expandModel, STATE_LAYOUT_LEAD } from "../src/state-model.js";
import { solveStateLayout } from "../src/state-layout.js";
import { validateStateLayout } from "../src/state-constraints.js";

const point = (x, y) => ({ x, y });
const node = (id, x, y, extra = {}) => ({ id, kind: "state", shape: "rect", x, y, width: 80, height: 60, ...extra });
const edge = (id, source, target, extra = {}) => ({ id, source, target, arrow: true, ...extra });
const segment = (id, owner, source, target, points, extra = {}) =>
  ({ id, owner, source, target, arrow: true, points: points.map(([x, y]) => point(x, y)), ...extra });
function freeze(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function validate(model) {
  const before = structuredClone(model);
  freeze(model);
  const report = validateStateLayout(model);
  assert.deepEqual(model, before, "验证不得改写冻结几何、关系或标签");
  assert.equal(typeof report.accepted, "boolean", "验证必须给出明确接纳状态");
  return report;
}
function accepted(model, message) {
  const report = validate(model);
  assert.equal(report.accepted, true, `${message}：${JSON.stringify(report)}`);
  assert.deepEqual(report.issues, []);
  assert.deepEqual(report.intersections, []);
  return report;
}
function rejected(model, constraint, message) {
  const report = validate(model);
  assert.equal(report.accepted, false, `${message}；非法几何被接纳：${JSON.stringify(report)}`);
  if (constraint) assert(report.issues.some(issue => issue.constraint === constraint),
    `${message}；须明确报告${constraint}：${JSON.stringify(report)}`);
  return report;
}
function straight() {
  return { nodes: [node("A", 0, 0), node("B", 400, 0)],
    edges: [edge("ab", "A", "B")],
    segments: [segment("ab", "ab", "A", "B", [[80, 30], [120, 30], [360, 30], [400, 30]])] };
}
function labelled() {
  return { nodes: [node("A", 0, 0), node("ab:label", 200, 10,
    { kind: "label", owner: "ab", label: "条件", height: 40 }), node("B", 400, 0)],
  edges: [edge("ab", "A", "B", { label: "条件", width: 80, height: 40 })],
  segments: [
    segment("ab:in", "ab", "A", "ab:label", [[80, 30], [120, 30], [160, 30], [200, 30]], { arrow: false }),
    segment("ab:out", "ab", "ab:label", "B", [[280, 30], [320, 30], [360, 30], [400, 30]]),
  ] };
}

// 只模拟布局引擎的输入/输出契约，返回确定性的直线候选；不是另写一个布局算法。
// 正式测试不加载output中的ELK。固定端口按ID解析，因此可独立验证回执重排是否被错误按数组下标处理。
function deterministicLayout({ reverseEdges = false } = {}) {
  const calls = [];
  const layout = async input => {
    calls.push(structuredClone(input));
    const result = structuredClone(input), direction = result.layoutOptions["elk.direction"];
    const vertical = ["DOWN", "UP"].includes(direction), reverse = ["UP", "LEFT"].includes(direction);
    const ordered = reverse ? result.children.slice().reverse() : result.children;
    const breadth = Math.max(0, ...ordered.map(n => vertical ? n.width : n.height));
    let cursor = 0;
    for (const n of ordered) {
      n.x = vertical ? (breadth - n.width) / 2 : cursor;
      n.y = vertical ? cursor : (breadth - n.height) / 2;
      cursor += (vertical ? n.height : n.width) + 120;
    }
    const nodes = new Map(result.children.map(n => [n.id, n])), ports = new Map();
    for (const n of result.children) for (const port of n.ports || []) ports.set(port.id, point(n.x + port.x, n.y + port.y));
    const endpoint = (id, start) => {
      if (ports.has(id)) return ports.get(id);
      const n = nodes.get(id);
      assert(n, `布局替身收到未知节点/端口${id}`);
      const high = start !== reverse;
      return vertical ? point(n.x + n.width / 2, n.y + (high ? n.height : 0))
        : point(n.x + (high ? n.width : 0), n.y + n.height / 2);
    };
    for (const e of result.edges) {
      const startPoint = endpoint(e.sources[0], true), endPoint = endpoint(e.targets[0], false);
      const bendPoints = startPoint.x === endPoint.x || startPoint.y === endPoint.y ? []
        : vertical ? [point(startPoint.x, (startPoint.y + endPoint.y) / 2),
          point(endPoint.x, (startPoint.y + endPoint.y) / 2)]
          : [point((startPoint.x + endPoint.x) / 2, startPoint.y),
            point((startPoint.x + endPoint.x) / 2, endPoint.y)];
      e.sections = [{ startPoint, endPoint, bendPoints }];
    }
    if (reverseEdges) result.edges.reverse();
    result.width = vertical ? breadth : Math.max(0, cursor - 120);
    result.height = vertical ? Math.max(0, cursor - 120) : breadth;
    return result;
  };
  return { layout, calls };
}
function semanticChain() {
  return { nodes: [node("A", 0, 0), node("B", 0, 0), node("C", 0, 0)],
    edges: [edge("ab", "A", "B", { label: "放行", width: 80, height: 40 }), edge("bc", "B", "C")] };
}

test("G01/G04 展开保留特殊节点、重复关系和原方向，条件框不是业务状态", () => {
  const input = {
    nodes: [node("start", 0, 0, { shape: "stateStart" }), node("A", 0, 0),
      node("fork", 0, 0, { shape: "fork" }), node("choice", 0, 0, { shape: "choice" }),
      node("end", 0, 0, { shape: "stateEnd" })],
    edges: [edge("start-a", "start", "A"), edge("parallel-1", "A", "fork", { label: "同文", width: 72, height: 32 }),
      edge("parallel-2", "A", "fork", { label: "同文", width: 72, height: 32, arrow: false }),
      edge("fork-choice", "fork", "choice"), edge("choice-end", "choice", "end")],
  };
  const before = structuredClone(input), model = expandModel(freeze(input));
  assert.deepEqual(input, before);
  assert.deepEqual(model.nodes.filter(n => n.kind === "state").map(n => [n.id, n.shape]).sort(),
    input.nodes.map(n => [n.id, n.shape]).sort());
  assert.deepEqual(model.edges, input.edges);
  const labels = model.nodes.filter(n => n.kind === "label");
  assert.equal(labels.length, 2); assert.equal(new Set(labels.map(n => n.id)).size, 2);
  for (const original of input.edges) {
    const pieces = model.segments.filter(s => s.owner === original.id);
    assert.equal(pieces.length, original.label ? 2 : 1);
    assert.equal(pieces[0].source, original.source); assert.equal(pieces.at(-1).target, original.target);
    assert.equal(pieces.at(-1).arrow, original.arrow);
    if (original.label) {
      const label = labels.find(n => n.owner === original.id);
      assert.equal(label.label, original.label); assert.equal(label.width, original.width); assert.equal(label.height, original.height);
      assert.equal(pieces[0].target, label.id); assert.equal(pieces[1].source, label.id);
      assert.equal(pieces[0].arrow, false);
    }
  }
});

test("G01 反馈和自环保留业务方向，显示展开不修改调用方输入", () => {
  const input = { nodes: [node("A", 0, 0), node("B", 0, 0)],
    edges: [edge("forward", "A", "B"), edge("back", "B", "A", { label: "回退", width: 80, height: 40 }),
      edge("self", "B", "B", { label: "重试", width: 80, height: 40 })] };
  const before = structuredClone(input), model = expandModel(freeze(input));
  for (const original of input.edges) {
    const pieces = model.segments.filter(s => s.owner === original.id);
    assert.equal(pieces[0].source, original.source); assert.equal(pieces.at(-1).target, original.target);
    assert.equal(pieces.at(-1).arrow, true);
  }
  assert(model.segments.filter(s => s.owner === "back").every(s => s.feedback));
  assert(model.segments.filter(s => s.owner === "self").every(s => s.loop));
  assert.deepEqual(input, before);
});

test("G01/G02/G03 冻结正例同时验状态和标签端口，验证器不得修改冗余共线点", () => {
  assert.equal(STATE_LAYOUT_LEAD, 21);
  const report = accepted(labelled(), "两段标签关系的四个中点端口应合格");
  assert.equal(report.logicalNodes, 2); assert.equal(report.logicalEdges, 1);
  assert.equal(report.labels, 1); assert.equal(report.displaySegments, 2);
  assert.equal(report.ports.length, 4);
  assert(report.ports.every(port => port.middleError === 0 && port.normalError === 0 && port.lead >= 40));
});

test("G02 条件框偏心不能因为业务状态端点正确而通过", () => {
  accepted(labelled(), "偏心反例基准");
  const model = labelled();
  model.segments[0].points = [[80, 30], [120, 30], [120, 36], [200, 36]].map(([x, y]) => point(x, y));
  const report = rejected(model, "G02", "条件框入口偏心6单位");
  assert(report.ports.some(port => port.node === "ab:label" && port.middleError >= 6));
});

test("G03 框内折返或不足局部引线的首段必须拒绝", async t => {
  for (const lead of [-20, 0, 20]) await t.test(`法向首段${lead}`, () => {
    const model = labelled();
    model.segments[0].points = [[80, 30], [80 + lead, 30], [80 + lead, -60],
      [160, -60], [160, 30], [200, 30]].map(([x, y]) => point(x, y));
    const report = rejected(model, "G03", `首段${lead}应拒绝`);
    assert(report.ports.some(port => port.node === "A" && port.lead === lead));
  });
  const boundary = labelled();
  boundary.segments[0].points = [[80, 30], [120, 30], [120, -60],
    [160, -60], [160, 30], [200, 30]].map(([x, y]) => point(x, y));
  accepted(boundary, "两端恰好40的法向直段必须通过");
});

test("G01 无标签关系缺失须明确报告，不能仅凭剩余图形报完整", () => {
  const model = straight(); model.segments = [];
  rejected(model, "G01", "预期关系缺失");
});

test("G01 条件关系缺任一显示段须返回问题而非TypeError", async t => {
  for (const keep of [[], [0], [1]]) await t.test(`保留段${keep.join(",") || "无"}`, () => {
    const model = labelled(); model.segments = keep.map(index => model.segments[index]);
    rejected(model, "G01", "缺标签关系段必须被验证器正常拒绝");
  });
});

test("G01 未声明的显示关系不能借合法公共端段豁免而补造", () => {
  const model = straight();
  model.segments.push({ ...structuredClone(model.segments[0]), id: "ghost", owner: "undeclared" });
  rejected(model, "G01", "额外关系owner不在原逻辑边中");
});

test("G01/G04 标签所有者、正文和箭头语义必须与原关系逐项一致", async t => {
  const cases = [
    ["标签owner", model => { model.nodes[1].owner = "other"; }],
    ["标签正文", model => { model.nodes[1].label = "被替换"; }],
    ["标签不是业务状态", model => { model.nodes[1].kind = "state"; }],
    ["条件入口无箭头", model => { model.segments[0].arrow = true; }],
    ["业务目标保留箭头", model => { model.segments[1].arrow = false; }],
  ];
  for (const [name, change] of cases) await t.test(name, () => {
    const model = labelled(); change(model); rejected(model, null, name);
  });
});

test("G05 异线穿框、贴框或离无关框不足净距均拒绝，恰好净距可通过", async t => {
  for (const [y, expected] of [[0, false], [30, false], [39, false], [40, true]]) await t.test(`障碍上沿${y}`, () => {
    const model = straight(); model.nodes.push(node("obstacle", 200, y, { width: 40, height: 40 }));
    if (expected) accepted(model, "距水平线恰好10的无关框");
    else rejected(model, "G05", "无关框侵入连接的10单位净距");
  });
  const boxes = straight(); boxes.nodes.push(node("near-A", 85, 120), node("near-B", 170, 120));
  rejected(boxes, "G05", "两个无关框只有5单位净距");
});

test("G06 中间斜段、自交和立即折返均拒绝，不因首尾中点与足够引线而放行", async t => {
  const paths = [
    ["斜段", [[80, 30], [120, 30], [145, -20], [160, -20], [160, 30], [200, 30]]],
    ["自交", [[80, 30], [120, 30], [120, -100], [180, -100], [180, -60],
      [100, -60], [100, -140], [160, -140], [160, 30], [200, 30]]],
    ["折返", [[80, 30], [140, 30], [120, 30], [200, 30]]],
  ];
  for (const [name, points] of paths) await t.test(name, () => {
    const model = labelled(); model.segments[0].points = points.map(([x, y]) => point(x, y));
    rejected(model, "G06", name);
  });
});

test("G02/G06 非有限坐标不能因NaN比较均为false而被接纳", () => {
  const model = straight(); model.segments[0].points = [point(NaN, NaN), point(NaN, NaN)];
  rejected(model, null, "NaN端口与路径必须明确拒绝");
});

test("G06 无标签自环的出发和返回不能退化成同一线段反向重走", () => {
  const model = { nodes: [node("A",0,0)], edges: [edge("loop","A","A")],
    segments: [segment("loop","loop","A","A",[[40,0],[40,-80],[40,0]])] };
  rejected(model,"G06","两段自环不能以中点和引线通过掩盖折返");
});

function branching(reverse = false) {
  const ys = [-360, -240, -120, 0, 120, 240, 360];
  const model = { nodes: [node("hub", 0, -30)], edges: [], segments: [] };
  for (const [index, y] of ys.entries()) {
    const id = `branch-${index}`, target = `target-${index}`;
    model.nodes.push(node(target, 400, y - 30));
    const source = reverse ? target : "hub", end = reverse ? "hub" : target;
    const points = [[80, 0], [200, 0], [200, y], [400, y]];
    model.edges.push(edge(id, source, end));
    model.segments.push(segment(id, id, source, end, reverse ? points.reverse() : points));
  }
  return model;
}

test("G08 七分支不得复用中点和公共前缀后缀，逻辑关系保留也不能掩盖视觉混并", () => {
  for (const reverse of [false, true]) {
    const report = rejected(branching(reverse), "G08", reverse ? "七路汇入共享后缀" : "七路出边共享前缀");
    assert.equal(report.logicalNodes, 8); assert.equal(report.logicalEdges, 7); assert.equal(report.displaySegments, 7);
    const ports = report.ports.filter(port => port.node === "hub");
    assert.equal(ports.length, 7); assert(ports.every(port => port.side === "EAST" && port.middleError === 0));
  }
});

test("G08 反向关系不能重叠，同向分叉后再汇合也不能冒充连续公共端段", () => {
  const reverse = straight();
  reverse.edges.push(edge("ba", "B", "A"));
  reverse.segments.push(segment("ba", "ba", "B", "A", [[400, 30], [80, 30]]));
  const report = rejected(reverse, null, "同一路径两条反向业务关系");
  assert(report.intersections.some(hit => hit.kind === "overlap"));
  const shared = { nodes: [node("A", 0, 0), node("B", 500, 0)],
    edges: [edge("p", "A", "B"), edge("q", "A", "B")], segments: [
      segment("p", "p", "A", "B", [[80, 30], [160, 30], [160, -100], [340, -100], [340, 30], [500, 30]]),
      segment("q", "q", "A", "B", [[80, 30], [240, 30], [240, -100], [420, -100], [420, 30], [500, 30]]),
    ] };
  assert(rejected(shared, null, "两端共享之外的中间重叠").intersections.length > 0);
});

test("G09/G11 冻结几何验证重复调用稳定，调用方不能被就地修线或移标签", () => {
  const model = labelled(), first = validate(model), second = validateStateLayout(model);
  assert.deepEqual(first, second);
  assert(Object.isFrozen(model.segments[0].points[0])); assert(Object.isFrozen(model.nodes[1]));
});

test("G02/G03/G11 注入确定性布局的四方向均固定中点端口，重复求解不改输入", async t => {
  for (const direction of ["DOWN", "UP", "LEFT", "RIGHT"]) await t.test(direction, async () => {
    const input = semanticChain(), before = structuredClone(input), stub = deterministicLayout();
    const first = await solveStateLayout(freeze(input), direction, stub.layout);
    accepted(first, `方向${direction}的确定性候选`);
    assert.equal(stub.calls.length, 2, "先自由候选再固定端口");
    assert(stub.calls.every(graph => graph.layoutOptions["elk.direction"] === direction));
    assert(stub.calls[0].children.every(n => !n.ports));
    for (const n of stub.calls[1].children) {
      assert.equal(n.layoutOptions["elk.portConstraints"], "FIXED_POS");
      assert(n.ports.length <= 2, "串行关系仅创建实际使用的独立端口");
      assert.equal(new Set(n.ports.map(p=>p.id)).size,n.ports.length);
      const bySide = new Map(n.ports.map(p => [p.layoutOptions["elk.port.side"], p]));
      if(bySide.has("NORTH")) assert.deepEqual([bySide.get("NORTH").x, bySide.get("NORTH").y], [n.width / 2, 0]);
      if(bySide.has("SOUTH")) assert.deepEqual([bySide.get("SOUTH").x, bySide.get("SOUTH").y], [n.width / 2, n.height]);
      if(bySide.has("WEST")) assert.deepEqual([bySide.get("WEST").x, bySide.get("WEST").y], [0, n.height / 2]);
      if(bySide.has("EAST")) assert.deepEqual([bySide.get("EAST").x, bySide.get("EAST").y], [n.width, n.height / 2]);
    }
    const second = await solveStateLayout(input, direction, stub.layout);
    assert.deepEqual(first, second); assert.deepEqual(input, before);
  });
});

test("G01 布局回执可按ID重排，不能用数组下标把路线绑到另一关系", async () => {
  const input = freeze(semanticChain());
  const base = await solveStateLayout(input, "RIGHT", deterministicLayout().layout);
  accepted(base, "按提交顺序回传的基准");
  const reordered = await solveStateLayout(input, "RIGHT", deterministicLayout({ reverseEdges: true }).layout);
  accepted(reordered, "引擎只重排回执数组，语义与几何应保持一致");
  const byId = model => model.segments.map(s => [s.id, s.owner, s.source, s.target, s.points]).sort(([a], [b]) => a.localeCompare(b));
  assert.deepEqual(byId(reordered), byId(base));
});

test("G01 层级内关系保留父容器与原边，未提供门户的跨层关系明确unsupported", async () => {
  const nodes = [node("group", 0, 0, { isGroup: true, width: 160, height: 100 }),
    node("child-A", 0, 0, { parentId: "group" }), node("child-B", 0, 0, { parentId: "group" }),
    node("outside", 0, 0)];
  const input = { nodes, edges: [edge("inside", "child-A", "child-B", { label: "内部", width: 80, height: 40 })] };
  const result = await solveStateLayout(freeze(input), "RIGHT", deterministicLayout().layout);
  accepted(result, "有父容器且仅层级内关系");
  assert.deepEqual(result.nodes.filter(n => n.kind === "state").map(n => n.id).sort(), nodes.map(n => n.id).sort());
  for (const id of ["child-A", "child-B"]) assert.equal(result.nodes.find(n => n.id === id).parentId, "group");
  for (const extra of [edge("exit", "child-A", "outside"), edge("enter", "outside", "child-B"),
    edge("ancestor", "child-A", "group")]) {
    const cross = await solveStateLayout({ nodes, edges: [...input.edges, extra] }, "RIGHT", deterministicLayout().layout);
    assert.equal(cross.status, "unsupported"); assert.equal(cross.reason, "cross-hierarchy-portals-required");
    assert.deepEqual(cross.unmatched, [extra.id]);
    assert.equal(validate(freeze(cross)).accepted, false);
  }
});

test("G01/G10 缺父节点和无根包含环明确失败，不能丢节点后返回成功", async () => {
  await assert.rejects(solveStateLayout({ nodes: [node("child", 0, 0, { parentId: "missing" }), node("root", 0, 0)],
    edges: [] }, "DOWN", deterministicLayout().layout), /missing-parent/);
  await assert.rejects(solveStateLayout({ nodes: [node("A", 0, 0, { isGroup: true, parentId: "B" }),
    node("B", 0, 0, { isGroup: true, parentId: "A" })], edges: [] }, "DOWN", deterministicLayout().layout), /containment-cycle/);
});

test("G01 一个正常根不能掩盖另一个包含环，求解不得静默遗漏环内节点", async () => {
  const input = { nodes: [node("root", 0, 0), node("A", 0, 0, { isGroup: true, parentId: "B" }),
    node("B", 0, 0, { isGroup: true, parentId: "A" })], edges: [] };
  await assert.rejects(solveStateLayout(freeze(input), "DOWN", deterministicLayout().layout), /containment-cycle/);
});

test("G10 注入布局失败原样向上传递，不把失败变成空成功模型", async () => {
  const failure = new Error("budget-exceeded: isolated-fixture"); let calls = 0;
  await assert.rejects(solveStateLayout(freeze(semanticChain()), "RIGHT", async () => { calls++; throw failure; }),
    error => error === failure);
  assert.equal(calls, 1);
});

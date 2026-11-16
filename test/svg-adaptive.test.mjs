import test from "node:test";
import assert from "node:assert/strict";
import { planAdaptiveFlowLayout } from "../src/svg-adaptive.js";

function chain(count, direction = "LR", labelled = false) {
  const horizontal = ["LR", "RL"].includes(direction);
  const sign = ["RL", "BT"].includes(direction) ? -1 : 1;
  const nodes = Array.from({ length: count }, (_, index) => {
    const primary = sign * (index * 140 + 40);
    return {
      id: `node_with_under_score_${index}`, domId: `flowchart-X_${index}-${index}`,
      box: horizontal ? { x: primary - 40, y: 80, width: 80, height: 40 }
        : { x: 80, y: primary - 20, width: 40, height: 40 },
    };
  });
  const edges = nodes.slice(1).map((node, index) => {
    const source = nodes[index];
    const from = { x: source.box.x + source.box.width / 2, y: source.box.y + source.box.height / 2 };
    const to = { x: node.box.x + node.box.width / 2, y: node.box.y + node.box.height / 2 };
    from[horizontal ? "x" : "y"] += sign * (horizontal ? 40 : 20);
    to[horizontal ? "x" : "y"] -= sign * (horizontal ? 40 : 20);
    return { id: `custom-edge-${index}`, start: source.id, end: node.id, points: [from, to],
      ...(labelled ? { labelBox: {
        x: (from.x + to.x) / 2 - 24, y: (from.y + to.y) / 2 - 12, width: 48, height: 24,
      } } : {}) };
  });
  return { direction, nodes, edges };
}

function groupedFlow() {
  const nodes = [];
  const edges = [];
  const addNode = (id, rank, y) => nodes.push({ id, box: { x: rank * 120, y, width: 60, height: 40 } });
  const link = (start, end) => {
    const from = nodes.find((node) => node.id === start).box;
    const to = nodes.find((node) => node.id === end).box;
    const middle = (from.x + from.width + to.x) / 2;
    edges.push({ id: `${start}__${end}`, start, end, points: [
      { x: from.x + from.width, y: from.y + 20 }, { x: middle, y: from.y + 20 },
      { x: middle, y: to.y + 20 }, { x: to.x, y: to.y + 20 },
    ] });
  };
  for (let group = 0; group < 4; group++) {
    addNode(`enter${group}`, group * 3, 100);
    addNode(`top${group}`, group * 3 + 1, 40);
    addNode(`bottom${group}`, group * 3 + 1, 160);
    addNode(`join${group}`, group * 3 + 2, 100);
    link(`enter${group}`, `top${group}`);
    link(`enter${group}`, `bottom${group}`);
    link(`top${group}`, `join${group}`);
    link(`bottom${group}`, `join${group}`);
    if (group) link(`join${group - 1}`, `enter${group}`);
  }
  return { direction: "LR", nodes, edges };
}

function overlaps(a, b) {
  return Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.01
    && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.01;
}

// 独立碰撞判据：采样每条线段内部，不能穿过任何不属于该边的节点。
function verifyPlan(graph, plan) {
  assert.equal(plan.status, "applied", plan.reason);
  assert.deepEqual(plan.positions.map((node) => node.id), graph.nodes.map((node) => node.id));
  assert.deepEqual(plan.routes.map(({ id, start, end }) => ({ id, start, end })),
    graph.edges.map(({ id, start, end }) => ({ id, start, end })));
  for (let index = 0; index < plan.positions.length; index++) {
    const node = plan.positions[index];
    assert.equal(node.box.width, graph.nodes[index].box.width);
    assert.equal(node.box.height, graph.nodes[index].box.height);
    for (const other of plan.positions.slice(index + 1)) assert(!overlaps(node.box, other.box), `${node.id}/${other.id}`);
  }
  for (const route of plan.routes) {
    const unrelated = plan.positions.filter((node) => node.id !== route.start && node.id !== route.end);
    for (let index = 1; index < route.points.length; index++) {
      const from = route.points[index - 1];
      const to = route.points[index];
      for (let sample = 1; sample < 50; sample++) {
        const point = { x: from.x + (to.x - from.x) * sample / 50, y: from.y + (to.y - from.y) * sample / 50 };
        for (const node of unrelated) {
          assert(!(point.x > node.box.x + 0.01 && point.x < node.box.x + node.box.width - 0.01
            && point.y > node.box.y + 0.01 && point.y < node.box.y + node.box.height - 0.01),
          `${route.id} 穿过 ${node.id}`);
        }
      }
    }
  }
}

test("横向换行、纵向换列，四方向保持边归属、节点尺寸与输入不变", () => {
  for (const direction of ["LR", "RL", "TD", "BT"]) {
    const graph = chain(24, direction, true);
    const before = structuredClone(graph);
    const plan = planAdaptiveFlowLayout(graph, { maxWidth: 900, maxHeight: 800 });
    verifyPlan(graph, plan);
    assert.deepEqual(graph, before);
    const horizontal = ["LR", "RL"].includes(direction);
    assert(plan[horizontal ? "rows" : "columns"] > 1);
    assert.equal(plan[horizontal ? "columns" : "rows"], 1);
    assert(plan.after[horizontal ? "width" : "height"] < plan.before[horizontal ? "width" : "height"] / 2);
    const firstEdge = plan.routes[0].points;
    const delta = firstEdge.at(-1)[horizontal ? "x" : "y"] - firstEdge[0][horizontal ? "x" : "y"];
    assert.equal(Math.sign(delta), ["RL", "BT"].includes(direction) ? -1 : 1);
    assert(plan.routes.every((route) => Number.isFinite(route.label.x) && Number.isFinite(route.label.y)));
  }
});

test("连续分支组整体折返，扇出与汇入绝不跨带", () => {
  const graph = groupedFlow();
  const plan = planAdaptiveFlowLayout(graph, { maxWidth: 650, maxHeight: 1000 });
  verifyPlan(graph, plan);
  assert.equal(plan.groups, 4);
  assert.equal(plan.rows, 4);
  for (let group = 0; group < 4; group++) {
    const top = plan.positions.find((node) => node.id === `top${group}`);
    const bottom = plan.positions.find((node) => node.id === `bottom${group}`);
    const enter = plan.positions.find((node) => node.id === `enter${group}`);
    const join = plan.positions.find((node) => node.id === `join${group}`);
    assert.equal(top.x, bottom.x);
    assert.equal(bottom.y - top.y, 120);
    assert.equal(enter.y, join.y);
    assert.equal(enter.y, (top.y + bottom.y) / 2);
    assert.equal(Math.sign(join.x - enter.x), group % 2 ? -1 : 1);
  }
});

test("已有真实SVG数值可直接规划；不靠节点文字或拼接边ID识别", () => {
  // 来自 output/playwright/review-baseline/flow-minimal-raw.svg：
  // 节点 translate(38,30.5)/(130,30.5)，rect x=-26,y=-18.5,w=52,h=37。
  const graph = {
    direction: "LR",
    nodes: [
      { id: "Input", box: { x: 12, y: 12, width: 52, height: 37 } },
      { id: "Output", box: { x: 104, y: 12, width: 52, height: 37 } },
    ],
    edges: [{ id: "L_Input_Output_0", start: "Input", end: "Output",
      points: JSON.parse(Buffer.from("W3sieCI6NjQsInkiOjMwLjV9LHsieCI6MTA0LCJ5IjozMC41fV0=", "base64")) }],
  };
  const plan = planAdaptiveFlowLayout(graph, { maxWidth: 180 });
  verifyPlan(graph, plan);
  assert.equal(plan.rows, 2);
});

test("反馈、自环、跨层、多组件、子图和过大的不可切分组明确保留", () => {
  const feedback = chain(18);
  feedback.edges.push({ id: "feedback", start: feedback.nodes[10].id, end: feedback.nodes[2].id,
    points: [{ x: 1480, y: 100 }, { x: 320, y: 100 }] });
  const self = chain(18);
  self.edges.push({ id: "self", start: self.nodes[8].id, end: self.nodes[8].id,
    points: [{ x: 1200, y: 100 }, { x: 1200, y: 100 }] });
  const skipLayer = chain(18);
  skipLayer.edges.push({ id: "skip-layer", start: skipLayer.nodes[1].id, end: skipLayer.nodes[5].id,
    points: [{ x: 220, y: 100 }, { x: 700, y: 100 }] });
  const disconnected = chain(18);
  disconnected.nodes.push({ id: "alone", box: { x: 20, y: 500, width: 50, height: 50 } });
  const subgraph = chain(18);
  subgraph.nodes[1].parentId = "group";
  const fixtures = [
    [feedback, "cycle-or-feedback"], [self, "cycle-or-feedback"],
    [skipLayer, "cross-layer-edge"], [disconnected, "disconnected-components"],
    [subgraph, "subgraph-layout"], [groupedFlow(), "block-exceeds-threshold"],
  ];
  for (const [graph, expected] of fixtures) {
    const before = structuredClone(graph);
    const plan = planAdaptiveFlowLayout(graph, { maxWidth: 300 });
    assert.equal(plan.status, "unsupported");
    assert.equal(plan.reason, expected);
    assert(!plan.positions && !plan.routes, "失败时不能给出可误应用的部分计划");
    assert.deepEqual(graph, before);
  }
});

test("关闭、阈值内、单节点和空输入都保持原布局", () => {
  assert.equal(planAdaptiveFlowLayout(null, false).reason, "disabled");
  assert.equal(planAdaptiveFlowLayout(chain(20), { enabled: false }).reason, "disabled");
  assert.equal(planAdaptiveFlowLayout(chain(2)).reason, "within-threshold");
  assert.equal(planAdaptiveFlowLayout(chain(1)).reason, "too-few-nodes");
  assert.equal(planAdaptiveFlowLayout({ nodes: [], edges: [] }).reason, "too-few-nodes");
  assert.equal(planAdaptiveFlowLayout(null).reason, "missing-graph-metadata");
});

test("末两带按安全切口均衡，避免长链的最后一带只剩一个节点", () => {
  for (const direction of ["LR", "RL", "TD", "BT"]) {
    const graph = chain(61, direction);
    const plan = planAdaptiveFlowLayout(graph, { maxWidth: 990, maxHeight: 990 });
    verifyPlan(graph, plan);
    const horizontal = ["LR", "RL"].includes(direction), bands = new Map();
    for (const node of plan.positions) {
      const cross = node[horizontal ? "y" : "x"];
      bands.set(cross, (bands.get(cross) || 0) + 1);
    }
    const counts = [...bands].sort((a, b) => a[0] - b[0]).map(([, count]) => count);
    assert(counts.at(-1) > 1, `${direction} 最后一带仍为孤节点：${counts}`);
    assert(Math.abs(counts.at(-1) - counts.at(-2)) <= 1);
  }
});

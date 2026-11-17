import test from "node:test";
import assert from "node:assert/strict";
import { planarLayoutCandidates } from "../src/planar-layout.js";

function graph(size, links, rename = (i) => `n${i}`) {
  return { nodes: Array.from({ length: size }, (_, i) => ({ id: rename(i) })),
    edges: links.map(([source, target]) => ({ source: rename(source), target: rename(target) })) };
}

function assertNoCrossings(positions, edges) {
  const orient = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const onSegment = (a, b, p) => Math.abs(orient(a, b, p)) < 1e-8
    && p.x >= Math.min(a.x, b.x) - 1e-8 && p.x <= Math.max(a.x, b.x) + 1e-8
    && p.y >= Math.min(a.y, b.y) - 1e-8 && p.y <= Math.max(a.y, b.y) + 1e-8;
  for (const [id, point] of positions) {
    assert(Number.isFinite(point.x) && Number.isFinite(point.y), `${id} 返回非有限坐标`);
    for (const [other, next] of positions) {
      if (id !== other) assert(Math.hypot(point.x - next.x, point.y - next.y) > 1e-8, `${id}/${other} 退化为同一位置`);
    }
  }
  for (const edge of edges) {
    const p = positions.get(edge.source), q = positions.get(edge.target);
    assert(p && q, "候选不能遗漏边的端点");
    for (const [id, point] of positions) {
      if (id !== edge.source && id !== edge.target) assert(!onSegment(p, q, point), `${edge.source}-${edge.target} 穿过第三节点${id}`);
    }
  }
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const a = edges[i], b = edges[j];
    const shared = [a.source, a.target].find(id => id === b.source || id === b.target);
    const p = positions.get(a.source), q = positions.get(a.target), r = positions.get(b.source), s = positions.get(b.target);
    if (shared !== undefined) {
      const junction = positions.get(shared);
      const first = positions.get(a.source === shared ? a.target : a.source);
      const second = positions.get(b.source === shared ? b.target : b.source);
      const dot = (first.x - junction.x) * (second.x - junction.x) + (first.y - junction.y) * (second.y - junction.y);
      assert(!(Math.abs(orient(junction, first, second)) < 1e-8 && dot > 0), "共同端点外不能同向重叠");
      continue;
    }
    assert(!(orient(p, q, r) * orient(p, q, s) < -1e-16 && orient(r, s, p) * orient(r, s, q) < -1e-16),
      "不同边存在十字交叉");
    assert(!onSegment(p, q, r) && !onSegment(p, q, s) && !onSegment(r, s, p) && !onSegment(r, s, q),
      "非共同端点接触或共线重叠也不能假报零交叉");
  }
}

test("不同规模梯形关系、轮图及重编号结构均生成独立验证的零交叉候选", () => {
  const structures = [];
  for (const width of [3, 5, 7]) {
    const links = [];
    for (let i = 0; i < width - 1; i++) links.push([i, i + 1], [width + i, width + i + 1]);
    for (let i = 0; i < width; i++) links.push([i, width + i]);
    structures.push([width * 2, links]);
  }
  structures.push([7, Array.from({ length: 6 }, (_, i) => [[i, (i + 1) % 6], [i, 6]]).flat()]);
  for (const [size, links] of structures) for (const rename of [(i) => `n${i}`, (i) => `业务_${size - i}`]) {
    const item = graph(size, links, rename), candidates = planarLayoutCandidates(item.nodes, item.edges);
    assert(candidates.length > 0);
    for (const positions of candidates) {
      assert.equal(positions.size, size);
      assert([...positions.values()].every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
      assertNoCrossings(positions, item.edges);
    }
  }
});

test("K3,3不能产生假零交叉候选，平行边与缺失节点不会被静默合并", () => {
  const links = Array.from({ length: 3 }, (_, a) => Array.from({ length: 3 }, (_, b) => [a, b + 3])).flat();
  const item = graph(6, links);
  assert.deepEqual(planarLayoutCandidates(item.nodes, item.edges), []);
  const triangle = graph(3, [[0, 1], [1, 2], [2, 0]]);
  assert.deepEqual(planarLayoutCandidates(triangle.nodes, [...triangle.edges, triangle.edges[0]]), []);
  assert.deepEqual(planarLayoutCandidates(triangle.nodes.slice(1), triangle.edges), []);
});

test("冻结输入与附带元数据保持不变，重复调用不共享可被污染的坐标对象", () => {
  const item = graph(5, [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4]]);
  item.nodes.forEach((node, index) => { node.box = { x: index * 13, y: index * 7, width: 100, height: 60 }; });
  item.edges.forEach((edge, index) => { edge.metadata = { marker: `marker-${index}`, sourceOrder: index }; });
  const before = structuredClone(item);
  const freeze = (value) => {
    Object.values(value).forEach((child) => { if (child && typeof child === "object") freeze(child); });
    return Object.freeze(value);
  };
  freeze(item);
  const first = planarLayoutCandidates(item.nodes, item.edges);
  assert(first.length > 0);
  first.forEach((positions) => assertNoCrossings(positions, item.edges));
  assert.deepEqual(item, before, "候选搜索不能改写节点/边/附带元数据");
  const expected = first.map((positions) => [...positions].map(([id, point]) => [id, { ...point }]));
  first[0].get("n0").x = 999;
  first[0].delete("n1");
  const second = planarLayoutCandidates(item.nodes, item.edges);
  assert.deepEqual(second.map((positions) => [...positions]), expected);
  assert.deepEqual(item, before);
});

test("改名不改变结构坐标，节点和边重排后仍只返回完整安全候选", () => {
  const links = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  ];
  const original = graph(7, links);
  const names = ["订单入口", "not-a-special-graph", "零", "alpha beta", "∑", "尾部", "center-renamed"];
  const renamed = graph(7, links, (index) => names[index]);
  const first = planarLayoutCandidates(original.nodes, original.edges);
  const second = planarLayoutCandidates(renamed.nodes, renamed.edges);
  assert(first.length > 0);
  assert.equal(second.length, first.length);
  for (let index = 0; index < first.length; index++) {
    for (let node = 0; node < names.length; node++) {
      assert.deepEqual(second[index].get(names[node]), first[index].get(`n${node}`), "不应按节点名称选择不同候选");
    }
  }
  const reordered = planarLayoutCandidates(renamed.nodes.slice().reverse(), renamed.edges.slice().reverse()
    .map((edge) => ({ source: edge.target, target: edge.source })));
  assert(reordered.length > 0);
  for (const positions of reordered) {
    assert.equal(positions.size, names.length);
    assert.deepEqual([...positions.keys()].sort(), names.slice().sort());
    assertNoCrossings(positions, renamed.edges);
  }
});

test("K5与每条边细分后的K3,3均不能绕过最终几何门禁", () => {
  const complete = graph(5, Array.from({ length: 5 }, (_, a) =>
    Array.from({ length: 4 - a }, (_, index) => [a, a + index + 1])).flat());
  assert.deepEqual(planarLayoutCandidates(complete.nodes, complete.edges), []);
  const subdivision = [];
  let next = 6;
  for (let a = 0; a < 3; a++) for (let b = 3; b < 6; b++) {
    subdivision.push([a, next], [next, b]);
    next++;
  }
  const item = graph(next, subdivision, (index) => `任意_${(index * 7) % next}`);
  assert(item.edges.length < 3 * item.nodes.length - 6, "该反例不能只靠稀疏边数上界拒绝");
  assert.deepEqual(planarLayoutCandidates(item.nodes, item.edges), []);
});

test("反向平行关系、自环、重复身份与缺失身份不能静默压缩为有效图", () => {
  const item = graph(3, [[0, 1], [1, 2], [2, 0]]);
  assert.deepEqual(planarLayoutCandidates(item.nodes, [...item.edges, { source: "n1", target: "n0" }]), []);
  assert.deepEqual(planarLayoutCandidates(item.nodes, [...item.edges, { source: "n1", target: "n1" }]), []);
  assert.deepEqual(planarLayoutCandidates([...item.nodes, { id: "n2" }], item.edges), []);
  for (const invalid of [null, undefined, "", NaN, Infinity]) {
    const nodes = [{ id: invalid }, { id: "b" }, { id: "c" }];
    const edges = [{ source: invalid, target: "b" }, { source: "b", target: "c" }, { source: "c", target: invalid }];
    assert.deepEqual(planarLayoutCandidates(nodes, edges), [], `无效身份${String(invalid)}不得返回候选`);
  }
});

test("孤立节点、叶节点和共享关节生成安全候选，多非平凡分量明确 unsupported", () => {
  for (const [name, size, links] of [
    ["tri+isolated", 4, [[0, 1], [1, 2], [2, 0]]],
    ["tri+leaf", 4, [[0, 1], [1, 2], [2, 0], [2, 3]]],
    ["figure-eight", 5, [[0, 1], [1, 2], [2, 0], [0, 3], [3, 4], [4, 0]]],
  ]) {
    const item = graph(size, links), candidates = planarLayoutCandidates(item.nodes, item.edges);
    assert(candidates.length > 0, `${name} 应产生可验证候选`);
    for (const positions of candidates) {
      assert.equal(positions.size, size);
      assertNoCrossings(positions, item.edges);
    }
  }
  const disconnected = graph(6, [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]]);
  assert.deepEqual(planarLayoutCandidates(disconnected.nodes, disconnected.edges), [],
    "多个非平凡分量未支持时必须明确返回空候选");
});

test("非有限边界坐标故障注入必须被最终门禁拒绝", () => {
  // 正常输入不依赖该故障；此注入仅验证未来数值变化不能令NaN比较全部失效后假报成功。
  const item = graph(3, [[0, 1], [1, 2], [2, 0]]);
  for (const method of ["sin", "cos"]) for (const invalid of [NaN, Infinity, -Infinity]) {
    const original = Math[method];
    try {
      Math[method] = () => invalid;
      assert.deepEqual(planarLayoutCandidates(item.nodes, item.edges), [],
        `${method}生成${invalid}时仍然返回候选`);
    } finally {
      Math[method] = original;
    }
  }
  const after = planarLayoutCandidates(item.nodes, item.edges);
  assert(after.length > 0, "故障注入后必须恢复数学函数");
  after.forEach((positions) => assertNoCrossings(positions, item.edges));
});

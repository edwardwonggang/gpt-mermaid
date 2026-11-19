import test from "node:test";
import assert from "node:assert/strict";
import { routeFlowEdges, routeNativeEdges, readPoints, segmentBlocked, simplifyPoints, orthogonalRoute } from "../src/svg-routing.js";
import * as routing from "../src/svg-routing.js";
import { segmentIntersection } from "../src/path-intersections.js";
import { crossingPairs, sampleEdge, planAvoidance, expandFlatSpacing } from "../src/svg-crossings.js";

function installGeometry(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "DOMPoint");
  class Point {
    #x;
    #y;
    constructor(x, y) { this.#x = x; this.#y = y; }
    // 浏览器 DOMPoint 的坐标来自原型访问器；对象展开不会复制这些坐标。
    get x() { return this.#x; }
    get y() { return this.#y; }
    matrixTransform(matrix) {
      return new Point(matrix.a * this.x + matrix.c * this.y + matrix.e,
        matrix.b * this.x + matrix.d * this.y + matrix.f);
    }
  }
  Object.defineProperty(globalThis, "DOMPoint", { configurable: true, writable: true, value: Point });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "DOMPoint", previous);
    else delete globalThis.DOMPoint;
  });
  return Point;
}

function fixture(spec) {
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } };
  const attributes = (initial = {}) => {
    const values = new Map(Object.entries(initial));
    return {
      getAttribute: (key) => values.get(key) ?? null,
      setAttribute: (key, value) => values.set(key, String(value)),
      removeAttribute: (key) => values.delete(key),
      hasAttribute: (key) => values.has(key),
    };
  };
  const graph = {
    nodes: spec.nodes.map(({ id }) => ({ id, domId: `node-${id}`, isGroup: false })),
    edges: spec.edges.map((edge) => ({
      arrowTypeStart: "none", arrowTypeEnd: "arrow_point", pattern: "normal", thickness: "normal", style: [],
      ...edge,
    })),
  };
  const nodeElements = new Map(spec.nodes.map(({ id, box }) => {
    const shape = { getBBox: () => box, getScreenCTM: () => matrix };
    return [`svg-node-${id}`, { id: `svg-node-${id}`, querySelector: () => shape, getScreenCTM: () => matrix }];
  }));
  const edges = graph.edges.map((edge) => ({
    ...attributes({ "data-points": btoa(JSON.stringify(edge.points)), "marker-end": "url(#arrow)" }),
    id: `svg-${edge.id}`, dataset: { id: edge.id }, getScreenCTM: () => matrix,
  }));
  const svg = {
    ...attributes(), id: "svg", getScreenCTM: () => matrix,
    getElementById: (id) => nodeElements.get(id),
    querySelectorAll: (selector) => selector.startsWith("path.flowchart-link") ? edges : [],
  };
  return { svg, graph, edges, nodeElements };
}

function assertOrthogonal(points) {
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1], to = points[index];
    assert(Math.abs(from.x - to.x) < 0.01 || Math.abs(from.y - to.y) < 0.01,
      `端口整理引入斜线 ${JSON.stringify([from, to])}`);
  }
}

test("共享目标端口不把三点L形路由变成斜线", (t) => {
  installGeometry(t);
  const item = fixture({
    nodes: [
      { id: "A", box: { x: 0, y: -10, width: 40, height: 20 } },
      { id: "B", box: { x: 20, y: 60, width: 40, height: 20 } },
      { id: "T", box: { x: 100, y: 0, width: 40, height: 60 } },
    ],
    edges: [
      { id: "a", start: "A", end: "T", points: [{ x: 20, y: 10 }, { x: 20, y: 20 }, { x: 100, y: 20 }] },
      { id: "b", start: "B", end: "T", points: [{ x: 40, y: 60 }, { x: 40, y: 40 }, { x: 100, y: 40 }] },
    ],
  });
  routeFlowEdges(item.svg, item.graph);
  assert.equal(item.svg.getAttribute("data-gptm-shared-arrows"), "1");
  item.edges.forEach((edge) => assertOrthogonal(readPoints(edge)));
  const terminals = item.edges.map((edge) => readPoints(edge).slice(-2));
  assert.deepEqual(terminals[0], terminals[1], "共享箭头的最终主干应一致");
});

test("拥挤端口整理不能把原来无碰撞的边移进邻近节点", (t) => {
  installGeometry(t);
  const obstacle = { x: 55, y: 18, width: 10, height: 8, right: 65, bottom: 26 };
  const item = fixture({
    nodes: [
      { id: "A", box: { x: 0, y: 0, width: 40, height: 60 } },
      { id: "T", box: { x: 100, y: 0, width: 40, height: 60 } },
      { id: "O", box: obstacle },
    ],
    edges: [
      { id: "a", start: "A", end: "T", points: [{ x: 40, y: 10 }, { x: 100, y: 10 }] },
      { id: "b", start: "A", end: "T", pattern: "dotted", points: [{ x: 40, y: 14 }, { x: 100, y: 14 }] },
    ],
  });
  assert(item.graph.edges.every((edge) => !segmentBlocked(edge.points[0], edge.points[1], [obstacle])));
  routeFlowEdges(item.svg, item.graph);
  for (const edge of item.edges) {
    const points = readPoints(edge);
    assertOrthogonal(points);
    for (let index = 1; index < points.length; index++) {
      assert(!segmentBlocked(points[index - 1], points[index], [obstacle]),
        `${edge.id} 端口整理后穿过 O: ${JSON.stringify(points)}`);
    }
  }
});

test("正交避障保留端点、绕开中间节点并输出有限坐标", () => {
  const boxes = [
    { x: 40, y: -10, right: 70, bottom: 30, width: 30, height: 40 },
    { x: 80, y: -30, right: 100, bottom: 10, width: 20, height: 40 },
  ];
  const points = orthogonalRoute({ x: 0, y: 0 }, { x: 140, y: 0 }, boxes);
  assert(points);
  assertOrthogonal(points);
  assert.deepEqual(points[0], { x: 0, y: 0 });
  assert.deepEqual(points.at(-1), { x: 140, y: 0 });
  assert(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
  for (let index = 1; index < points.length; index++) assert(!segmentBlocked(points[index - 1], points[index], boxes));
});

test("折点简化只删除同向共线点，保留折返和独立转角", () => {
  assert.deepEqual(simplifyPoints([
    { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 },
    { x: 20, y: 20 }, { x: 20, y: 10 }, { x: 40, y: 10 },
  ]), [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 20, y: 10 }, { x: 40, y: 10 }]);
});

test("双向箭头尺寸约束包含拥挤的源端", (t) => {
  installGeometry(t);
  const targets = Array.from({ length: 6 }, (_, i) => ({ id: `T${i}`, box: { x: 150, y: i * 80 - 200, width: 50, height: 40 } }));
  const item = fixture({
    nodes: [{ id: "A", box: { x: 0, y: 0, width: 40, height: 30 } }, ...targets],
    edges: targets.map((target, i) => ({
      id: `e${i}`, start: "A", end: target.id, arrowTypeStart: "arrow_point",
      points: [{ x: 40, y: 10 + i * 2 }, { x: 90, y: 10 + i * 2 },
        { x: 90, y: target.box.y + 20 }, { x: 150, y: target.box.y + 20 }],
    })),
  });
  routeFlowEdges(item.svg, item.graph);
  for (const edge of item.edges) {
    assert(Number(edge.getAttribute("data-gptm-port-span")) <= 4.2 + 1e-6);
    assertOrthogonal(readPoints(edge));
  }
});

function nativeFixture(spec) {
  const item = fixture(spec);
  const nodes = [...item.nodeElements.values()];
  nodes.forEach((node, index) => {
    node.dataset = { id: spec.nodes[index].id };
    node.contains = other => node === other;
  });
  item.edges.forEach((edge, index) => {
    const model = item.graph.edges[index];
    edge.dataset.source = model.start;
    edge.dataset.target = model.end;
    edge.setAttribute("marker-end", model.markerEnd || "url(#svg-stateDiagram-barbEnd)");
    if (model.markerStart) edge.setAttribute("marker-start", model.markerStart);
    edge.setAttribute("d", model.points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" "));
  });
  const labels = spec.edges.filter((edge) => edge.labelBox).map((edge) => ({
    dataset: { id: edge.id }, textContent: edge.label || "关系标签",
    querySelector: () => ({ dataset: { id: edge.id } }),
    getBBox: () => edge.labelBox, getScreenCTM: () => item.svg.getScreenCTM(),
  }));
  item.svg.querySelectorAll = (selector) => {
    if (selector === "g.node[data-id],g.statediagram-cluster[data-id]") return nodes;
    if (selector.startsWith("path.transition")) return item.edges;
    if (selector === "g.edgeLabel") return labels;
    return [];
  };
  return item;
}

test("原生路由按语义元数据绑定，不能拆边ID猜节点，并保留不兼容端点", (t) => {
  installGeometry(t);
  const item = nativeFixture({
    nodes: [
      { id: "源_A_1", box: { x: 0, y: 0, width: 40, height: 40 } },
      { id: "目标_B_2", box: { x: 150, y: 0, width: 40, height: 40 } },
    ],
    edges: [
      { id: "unrelated-edge-id", start: "源_A_1", end: "目标_B_2",
        points: [{ x: 40, y: 20 }, { x: 150, y: 20 }] },
      { id: "another-edge", start: "源_A_1", end: "目标_B_2",
        markerStart: "url(#svg-classDiagram-aggregationStart)",
        points: [{ x: 40, y: 30 }, { x: 150, y: 30 }] },
    ],
  });
  const original = item.edges[1].getAttribute("d");
  routeNativeEdges(item.svg);
  for (const edge of item.edges) {
    assert.equal(edge.getAttribute("data-gptm-source"), "svg-node-源_A_1");
    assert.equal(edge.getAttribute("data-gptm-target"), "svg-node-目标_B_2");
  }
  assert.equal(item.edges[1].getAttribute("d"), original);
  assert.equal(item.edges[1].getAttribute("marker-start"), "url(#svg-classDiagram-aggregationStart)");
  assert(!item.edges[1].hasAttribute("data-gptm-native-rerouted"));
});

test("原生多边端口分离后仍保留每条逻辑边和箭头", (t) => {
  installGeometry(t);
  const item = nativeFixture({
    nodes: [
      { id: "A", box: { x: 0, y: 0, width: 40, height: 60 } },
      { id: "B", box: { x: 160, y: 0, width: 40, height: 60 } },
    ],
    edges: Array.from({ length: 3 }, (_, index) => ({
      id: `e${index}`, start: "A", end: "B",
      points: [{ x: 40, y: 30 }, { x: 160, y: 30 }],
    })),
  });
  routeNativeEdges(item.svg);
  assert.equal(item.svg.getAttribute("data-gptm-native-routes"), "3");
  const ports = item.edges.map((edge) => readPoints(edge)[0].y);
  assert.equal(new Set(ports).size, 3);
  for (const edge of item.edges) {
    assert.equal(edge.getAttribute("marker-end"), "url(#svg-stateDiagram-barbEnd)");
    assertOrthogonal(readPoints(edge));
    assert(Number(edge.getAttribute("data-gptm-port-span")) <= 18);
  }
});

test("原生端口的短引线也不能穿过非目标节点", (t) => {
  installGeometry(t);
  const obstacle = { x: 48, y: 10, width: 4, height: 20, right: 52, bottom: 30 };
  const item = nativeFixture({
    nodes: [
      { id: "A", box: { x: 0, y: 0, width: 40, height: 40 } },
      { id: "B", box: { x: 120, y: 0, width: 40, height: 40 } },
      { id: "O", box: obstacle },
    ],
    edges: [{
      id: "safe-original", start: "A", end: "B",
      points: [{ x: 40, y: 20 }, { x: 44, y: 20 }, { x: 44, y: -10 },
        { x: 96, y: -10 }, { x: 96, y: 20 }, { x: 120, y: 20 }],
    }],
  });
  const before = readPoints(item.edges[0]);
  assert(before.slice(1).every((p, i) => !segmentBlocked(before[i], p, [obstacle])));
  routeNativeEdges(item.svg);
  const points = readPoints(item.edges[0]);
  assert(points.slice(1).every((p, i) => !segmentBlocked(points[i], p, [obstacle])),
    `完整新路径穿过非目标节点 O: ${JSON.stringify(points)}`);
});

test("无冲突的原生直线保留原d，不进入全量重路由", (t) => {
  installGeometry(t);
  const item = nativeFixture({
    nodes: [
      { id: "A", box: { x: 0, y: 0, width: 40, height: 40 } },
      { id: "B", box: { x: 240, y: 0, width: 40, height: 40 } },
    ],
    edges: [{ id: "clear-line", start: "A", end: "B",
      points: [{ x: 40, y: 20 }, { x: 240, y: 20 }] }],
  });
  const edge = item.edges[0];
  const original = { d: edge.getAttribute("d"), points: edge.getAttribute("data-points") };
  routeNativeEdges(item.svg);
  assert.equal(edge.getAttribute("d"), original.d, "原直线没有需要修复的冲突");
  assert.equal(edge.getAttribute("data-points"), original.points);
  assert(!edge.hasAttribute("data-gptm-native-rerouted"));
});

test("可直接容纳标签的纵向直线不能为水平标签通道绕成六个弯", (t) => {
  installGeometry(t);
  const item = nativeFixture({
    nodes: [
      { id: "A", box: { x: 80, y: 0, width: 40, height: 40 } },
      { id: "B", box: { x: 80, y: 200, width: 40, height: 40 } },
    ],
    edges: [{ id: "vertical-labelled", start: "A", end: "B",
      points: [{ x: 100, y: 40 }, { x: 100, y: 200 }],
      label: "纵向标签", labelBox: { x: 70, y: 110, width: 60, height: 20 } }],
  });
  const original = item.edges[0].getAttribute("d");
  routeNativeEdges(item.svg);
  const points = readPoints(item.edges[0]);
  const length = points.slice(1).reduce((total, point, index) =>
    total + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
  assert(length <= 160.01, `无障碍直线原长160，整理后变为${length}: ${JSON.stringify(points)}`);
  assert.equal(item.edges[0].getAttribute("d"), original);
});

test("保留原线时DOMPoint原型坐标仍生成有限的标签定位元数据", (t) => {
  const Point = installGeometry(t);
  const probe = new Point(100, 120);
  assert.deepEqual(Object.keys(probe), []);
  assert.equal(Object.hasOwn(probe, "x"), false);
  assert.equal(typeof Object.getOwnPropertyDescriptor(Point.prototype, "x").get, "function");
  const item = nativeFixture({
    nodes: [
      { id: "A", box: { x: 80, y: 0, width: 40, height: 40 } },
      { id: "B", box: { x: 80, y: 200, width: 40, height: 40 } },
    ],
    edges: [{ id: "accessor-point", start: "A", end: "B",
      points: [{ x: 100, y: 40 }, { x: 100, y: 200 }],
      label: "沿原线采样", labelBox: { x: 70, y: 110, width: 60, height: 20 } }],
  });
  const edge = item.edges[0], original = edge.getAttribute("d");
  let samples = 0;
  edge.getTotalLength = () => 160;
  edge.getPointAtLength = (offset) => {
    samples++;
    return new Point(100, 40 + offset);
  };
  routeNativeEdges(item.svg);
  assert(samples > 0, "必须实际执行原路径采样分支");
  assert.equal(edge.getAttribute("d"), original);
  assert(!edge.hasAttribute("data-gptm-native-rerouted"));
  for (const key of ["data-gptm-label-x", "data-gptm-label-y"]) {
    const raw = edge.getAttribute(key);
    assert(raw !== null && raw.trim() !== "", `${key} 不能缺失`);
    assert(Number.isFinite(Number(raw)), `${key} 不是有限坐标：${raw}`);
  }
  assert.equal(Number(edge.getAttribute("data-gptm-label-x")), 100);
  assert.equal(Number(edge.getAttribute("data-gptm-label-y")), 120);
});

test("路线质量忽略重复点与同向中间点，接受正常L和S形路线", () => {
  assert.equal(typeof routing.routeQuality, "function", "实现须提供纯几何 routeQuality");
  const fixtures = [
    { points: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: 0 }], length: 40, bends: 0 },
    { points: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 40 }], length: 70, bends: 1 },
    { points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 40 }, { x: 60, y: 40 }], length: 100, bends: 2 },
  ];
  for (const { points, length, bends } of fixtures) {
    const result = routing.routeQuality(points);
    assert.equal(result.length, length);
    assert.equal(result.bends, bends);
    assert.equal(result.selfIntersections, 0);
    assert.equal(result.retraces, 0);
    assert(Number.isFinite(result.score));
    assert(result.score >= result.length);
  }
});

test("路线质量拒绝相邻回头和非相邻共线重叠，不让总长度评分掩盖重复走线", () => {
  assert.equal(typeof routing.routeQuality, "function", "实现须提供纯几何 routeQuality");
  const fixtures = [
    [{ x: 0, y: 0 }, { x: 24, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 50 }],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 20, y: 50 },
      { x: 20, y: 0 }, { x: 80, y: 0 }, { x: 80, y: -30 }],
  ];
  for (const points of fixtures) {
    const result = routing.routeQuality(points);
    assert(result.retraces > 0, `漏检重复走线 ${JSON.stringify(points)}`);
    assert.equal(result.score, Infinity);
  }
});

test("路线质量拒绝非相邻穿越和回到旧顶点，合法相邻转角不算自交", () => {
  assert.equal(typeof routing.routeQuality, "function", "实现须提供纯几何 routeQuality");
  const fixtures = [
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 },
      { x: 50, y: 100 }, { x: 50, y: -50 }, { x: 150, y: -50 }],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 },
      { x: 50, y: 50 }, { x: 50, y: 0 }, { x: 50, y: -30 }],
    [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 50 },
      { x: 100, y: 0 }, { x: 50, y: 0 }, { x: 50, y: -30 }],
  ];
  for (const points of fixtures) {
    const result = routing.routeQuality(points);
    assert(result.selfIntersections > 0, `漏检自交 ${JSON.stringify(points)}`);
    assert.equal(result.score, Infinity);
  }
});

test("真实state基线的端口引线反向重走14单位必须判为不可接受", () => {
  assert.equal(typeof routing.routeQuality, "function", "实现须提供纯几何 routeQuality");
  // 固化 output/playwright/route-quality/before.json 的 state/edge1，
  // 避免测试依赖不随仓库发布的 output 文件。
  const points = [
    { x: 168.3593749999709, y: 114.99999999999999 },
    { x: 168.3593749999709, y: 139 },
    { x: 168.3593749999709, y: 124.99999999999999 },
    { x: 86.4218749999709, y: 124.99999999999999 },
    { x: 86.4218749999709, y: 151.00000095367432 },
    { x: 168.3593749999709, y: 151.00000095367432 },
    { x: 168.3593749999709, y: 186 },
  ];
  const result = routing.routeQuality(points);
  assert(Math.abs(result.length - 262.875) < 0.001);
  assert(result.retraces > 0);
  assert.equal(result.score, Infinity);
});

// 独立的正交线段区间判据，不复用被测 segmentIntersection，防止双方共享同一个漏检。
function orthogonalContact(a, b, c, d) {
  const same = (x, y) => Math.abs(x - y) < 1e-7;
  const between = (value, first, second) => value >= Math.min(first, second) - 1e-7
    && value <= Math.max(first, second) + 1e-7;
  const overlap = (a1, a2, b1, b2) => Math.max(Math.min(a1, a2), Math.min(b1, b2))
    <= Math.min(Math.max(a1, a2), Math.max(b1, b2)) + 1e-7;
  const horizontal = same(a.y, b.y), otherHorizontal = same(c.y, d.y);
  if (horizontal && otherHorizontal) return same(a.y, c.y) && overlap(a.x, b.x, c.x, d.x);
  if (!horizontal && !otherHorizontal) return same(a.x, c.x) && overlap(a.y, b.y, c.y, d.y);
  if (horizontal) return between(c.x, a.x, b.x) && between(a.y, c.y, d.y);
  return between(a.x, c.x, d.x) && between(c.y, a.y, b.y);
}

function assertAvoidedSegments(points, obstacles) {
  assertOrthogonal(points);
  for (let index = 1; index < points.length; index++) {
    for (const [a, b] of obstacles) {
      assert(!orthogonalContact(points[index - 1], points[index], a, b),
        `路线仍接触禁止穿越的线段 ${JSON.stringify({ route: [points[index - 1], points[index]], obstacle: [a, b] })}`);
    }
  }
  assert(Number.isFinite(routing.routeQuality(points).score), "外绕不能引入自交或重复走线");
}

test("线段检测区分内部穿越与端点接触，分离线段无交点", () => {
  const cases = [
    { a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, c: { x: 50, y: -20 }, d: { x: 50, y: 20 },
      expected: { x: 50, y: 0, kind: "cross" } },
    { a: { x: 0, y: 0 }, b: { x: 10, y: 0 }, c: { x: 10, y: 0 }, d: { x: 10, y: 30 },
      expected: { x: 10, y: 0, kind: "touch" } },
    { a: { x: 0, y: 0 }, b: { x: 20, y: 0 }, c: { x: 10, y: 0 }, d: { x: 10, y: 30 },
      expected: { x: 10, y: 0, kind: "touch" } },
    { a: { x: 0, y: 0 }, b: { x: 10, y: 0 }, c: { x: 11, y: -20 }, d: { x: 11, y: 20 },
      expected: null },
  ];
  for (const { a, b, c, d, expected } of cases) {
    assert.deepEqual(segmentIntersection(a, b, c, d), expected);
    assert.deepEqual(segmentIntersection(c, d, a, b), expected, "交换线段顺序不应改变交点分类");
    assert.deepEqual(segmentIntersection(b, a, d, c), expected, "反向端点不应改变交点分类");
  }
});

test("共线正长度相交判为overlap，只有共同端点才是touch", () => {
  const a = { x: 0, y: 10 }, b = { x: 100, y: 10 };
  for (const [c, d] of [
    [{ x: 30, y: 10 }, { x: 130, y: 10 }],
    [{ x: 130, y: 10 }, { x: 30, y: 10 }],
  ]) {
    const result = segmentIntersection(a, b, c, d);
    assert.equal(result.kind, "overlap");
    assert(result.x >= 30 && result.x <= 100);
    assert.equal(result.y, 10);
  }
  assert.deepEqual(segmentIntersection(a, b, { x: 100, y: 10 }, { x: 130, y: 10 }),
    { x: 100, y: 10, kind: "touch" });
  assert.equal(segmentIntersection(a, b, { x: 101, y: 10 }, { x: 130, y: 10 }), null);
  assert.equal(segmentIntersection(a, b, { x: 30, y: 11 }, { x: 130, y: 11 }), null);
});

test("正交寻路将垂直相交作为硬障碍，并使用额外网格外绕", () => {
  const start = { x: 0, y: 0 }, end = { x: 100, y: 0 };
  const obstacles = [[{ x: 50, y: -20 }, { x: 50, y: 20 }]];
  const direct = orthogonalRoute(start, end, []);
  assert(orthogonalContact(direct[0], direct.at(-1), ...obstacles[0]), "原最短路应能暴露十字相交");
  const routed = orthogonalRoute(start, end, [], 10, [], {
    avoidSegments: obstacles, extraX: [-10, 110], extraY: [-30, 30],
  });
  assert(routed, "存在从上方或下方绕过的路径，不能误报无解");
  assert.deepEqual(routed[0], start);
  assert.deepEqual(routed.at(-1), end);
  assert(routed.some((point) => Math.abs(point.y) >= 30));
  assertAvoidedSegments(routed, obstacles);
  assert(routing.routeQuality(routed).length <= 160.01, "简单十字障碍无需额外长绕行");
});

test("timeout与backoff真实端口保序时可外绕，不能穿过既有timeout路线", () => {
  const timeout = [
    { x: 168, y: 219 }, { x: 168, y: 247 }, { x: 278, y: 247 },
    { x: 278, y: 263 }, { x: 193, y: 263 }, { x: 193, y: 290 },
  ];
  const obstacles = timeout.slice(1).map((point, index) => [timeout[index], point]);
  const first = { x: 216.436, y: 290 }, start = { x: 216.436, y: 266 };
  const end = { x: 191.52, y: 243 }, last = { x: 191.52, y: 219 };
  const route = orthogonalRoute(start, end, [], 10, [], {
    start: { x: 0, y: -1 }, end: { x: 0, y: -1 },
    avoidSegments: obstacles, extraX: [150, 300], extraY: [210, 230, 280, 310],
  });
  assert(route, "有额外右侧走廊的保序端口应存在不交叉路线");
  assert.deepEqual(route[0], start);
  assert.deepEqual(route.at(-1), end);
  const complete = simplifyPoints([first, ...route, last]);
  assertAvoidedSegments(complete, obstacles);
  assert(routing.routeQuality(complete).bends <= 4, "这一无节点障碍夹具无需10折弯");
});

function crossingEdge(id, coordinates, metadata = {}) {
  const points = coordinates.map(([x, y]) => ({ x, y }));
  return {
    id, points, controls: points, ...metadata,
    box: {
      x: Math.min(...points.map((point) => point.x)), right: Math.max(...points.map((point) => point.x)),
      y: Math.min(...points.map((point) => point.y)), bottom: Math.max(...points.map((point) => point.y)),
    },
  };
}

test("相同目标的合法共享末段不计作交叉", () => {
  const edges = [
    crossingEdge("a", [[0, 0], [100, 0]], { source: "A", target: "T", shared: "bundle" }),
    crossingEdge("b", [[80, -30], [80, 0], [100, 0]], { source: "B", target: "T", shared: "bundle" }),
  ];
  assert.deepEqual(crossingPairs(edges), []);
  assert.deepEqual(crossingPairs(edges.slice().reverse()), [], "共享主干判据应与边枚举顺序无关");
});

test("同源公共前缀仅豁免分叉前的连续共享线段，重入交叉仍报错", () => {
  const first = crossingEdge("a", [[0, 0], [40, 0], [40, 100]], { source: "S", target: "A", sharedStart: "s" });
  const branch = crossingEdge("b", [[0, 0], [80, 0], [80, -50]], { source: "S", target: "B", sharedStart: "s" });
  assert.deepEqual(crossingPairs([first, branch]), []);
  assert.deepEqual(crossingPairs([branch, first]), []);
  assert.equal(crossingPairs([first, { ...branch, source: "OTHER" }]).length, 1);
  const reenter = crossingEdge("c", [[0, 0], [80, 0], [80, 60], [20, 60]],
    { source: "S", target: "C", sharedStart: "s" });
  const pairs = crossingPairs([first, reenter]);
  assert.equal(pairs.length, 1);
  assert(pairs[0].hits.some(p => p.kind === "cross" && p.x === 40 && p.y === 60));
});

test("共享末段只能豁免实际重叠区间，不能吞掉同一长线段远处的十字", () => {
  // x=73 离共同主干仅7单位，不能被用于圆弧误差容忍的邻域一并吞掉。
  for (const x of [20, 73]) {
    const edges = [
      crossingEdge("a", [[0, 0], [100, 0]], { source: "A", target: "T", shared: "bundle" }),
      crossingEdge("b", [[x, -10], [x, 10], [80, 10], [80, 0], [100, 0]],
        { source: "B", target: "T", shared: "bundle" }),
    ];
    // 唯一合法共享区间是 x=80..100；它不能豁免该区间外的真实十字。
    for (const order of [edges, edges.slice().reverse()]) {
      const pairs = crossingPairs(order);
      assert.equal(pairs.length, 1, `枚举顺序 ${order.map((edge) => edge.id)} 漏掉x=${x}的十字`);
      assert.deepEqual(pairs[0].hits, [{ x, y: 0, kind: "cross" }]);
    }
  }
});

test("同一共享主干的两个转角在远处相接仍应报告，不能豁免全部touch", () => {
  const edges = [
    crossingEdge("a", [[0, 0], [40, 0], [40, 40], [100, 40]],
      { source: "A", target: "T", shared: "bundle" }),
    crossingEdge("b", [[40, -20], [40, 0], [60, 0], [60, 40], [100, 40]],
      { source: "B", target: "T", shared: "bundle" }),
  ];
  // 末段 y=40,x=60..100 可以共享，离该主干40单位的(40,0)没有合法节点身份。
  for (const order of [edges, edges.slice().reverse()]) {
    const pairs = crossingPairs(order);
    assert.equal(pairs.length, 1, "同bundle的非共同主干接触被全部豁免");
    assert.deepEqual(pairs[0].hits, [{ x: 40, y: 0, kind: "touch" }]);
  }
});

test("共享主干附近的浅角相交也是真实十字，不能只按切线夹角豁免", () => {
  const edges = [
    crossingEdge("a", [[0, 0], [100, 0]], { source: "A", target: "T", shared: "bundle" }),
    crossingEdge("b", [[65, -1], [75, 1], [76, 1], [76, 0], [100, 0]],
      { source: "B", target: "T", shared: "bundle" }),
  ];
  assert.equal(routing.routeQuality(edges[1].controls).selfIntersections, 0, "夹具自身不能自交");
  for (const order of [edges, edges.slice().reverse()]) {
    const pairs = crossingPairs(order);
    assert.equal(pairs.length, 1, "主干前6单位的浅角十字不能因夹角小而被吞掉");
    assert.deepEqual(pairs[0].hits, [{ x: 70, y: 0, kind: "cross" }]);
  }
});

test("共享末端标记不能豁免先重叠再分离的上游线段", () => {
  const edges = [
    crossingEdge("a", [[0, 0], [30, 0], [30, 40], [100, 40]],
      { source: "A", target: "T", shared: "bundle" }),
    crossingEdge("b", [[10, -20], [10, 0], [20, 0], [20, 60], [60, 60], [60, 40], [100, 40]],
      { source: "B", target: "T", shared: "bundle" }),
  ];
  for (const edge of edges) assert.equal(routing.routeQuality(edge.points).selfIntersections, 0);
  for (const order of [edges, edges.slice().reverse()]) {
    const pairs = crossingPairs(order);
    assert.equal(pairs.length, 1, "上游重叠后又分离的路线不能冒充通向同一目标的共享末段");
    assert(pairs[0].hits.some((hit) => hit.kind === "overlap" && hit.x >= 10 && hit.x <= 20 && hit.y === 0));
    assert(pairs[0].hits.every((hit) => hit.y === 0), "真正通向共同目标的y=40末段仍应豁免");
  }
});

test("共同节点端点只按结构化归属豁免，坐标相同本身不是合法连接", () => {
  const first = crossingEdge("a", [[0, 0], [40, 0]], { source: "A", target: "T" });
  const second = crossingEdge("b", [[40, 0], [40, 40]], { source: "T", target: "B" });
  assert.deepEqual(crossingPairs([first, second]), []);
  const unrelated = crossingPairs([first, { ...second, source: "U" }]);
  assert.equal(unrelated.length, 1);
  assert.deepEqual(unrelated[0].hits, [{ x: 40, y: 0, kind: "touch" }]);
});

test("实际路径采样不能跨过短折线极值后把两个真实交点都漏掉", (t) => {
  installGeometry(t);
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } };
  const svg = { getScreenCTM: () => matrix };
  const sampledEdge = (id, coordinates) => {
    const edge = crossingEdge(id, coordinates), controls = edge.points;
    const lengths = controls.slice(1).map((p, i) => Math.hypot(p.x - controls[i].x, p.y - controls[i].y));
    const total = lengths.reduce((sum, length) => sum + length, 0);
    // 夹具按真实折线弧长求点；不把控制点偷塞给被测检测器。
    const path = {
      getScreenCTM: () => matrix, getTotalLength: () => total,
      getPointAtLength(distance) {
        let remaining = distance;
        for (let i = 0; i < lengths.length; i++) {
          if (remaining <= lengths[i] || i === lengths.length - 1) {
            const fraction = remaining / lengths[i], a = controls[i], b = controls[i + 1];
            return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
          }
          remaining -= lengths[i];
        }
      },
    };
    const points = sampleEdge(svg, path);
    return { ...crossingEdge(id, points.map(({ x, y }) => [x, y])), controls: undefined };
  };
  const edges = [
    sampledEdge("horizontal", [[0, 0], [8, 0]]),
    sampledEdge("short-v", [[0, 3], [4, -1], [8, 3]]),
  ];
  const pairs = crossingPairs(edges);
  assert.equal(pairs.length, 1, `采样绕过真实低点后误报无交叉：${JSON.stringify(edges[1].points)}`);
  assert.equal(pairs[0].hits.length, 2);
  const actual = pairs[0].hits.slice().sort((a, b) => a.x - b.x);
  for (const [index, x] of [3, 5].entries()) {
    assert(Math.abs(actual[index].x - x) <= 0.2, `交点${index}应在(${x},0)，实际${JSON.stringify(actual[index])}`);
    assert(Math.abs(actual[index].y) <= 0.2);
  }
});

test("非三角语义marker避障保留首尾真实端点及斜切线，不能投影成轴向端口", (t) => {
  installGeometry(t);
  const item = nativeFixture({
    nodes: [
      { id: "A", box: { x: 0, y: 0, width: 40, height: 40 } },
      { id: "B", box: { x: 160, y: 30, width: 40, height: 40 } },
    ],
    edges: [
      { id: "semantic", start: "A", end: "B",
        markerStart: "url(#svg-classDiagram-aggregationStart)",
        markerEnd: "url(#svg-classDiagram-compositionEnd)",
        points: [{ x: 40, y: 20 }, { x: 80, y: 50 }, { x: 130, y: 70 }, { x: 160, y: 50 }] },
      { id: "wall", start: "A", end: "B", points: [{ x: 100, y: 10 }, { x: 100, y: 70 }] },
    ],
  });
  item.edges[1].removeAttribute("marker-end");
  const edge = { ...crossingEdge("semantic", [[50, 30], [80, 50], [130, 70], [150, 50]]),
    element: item.edges[0], source: "svg-node-A", target: "svg-node-B" };
  const wall = { ...crossingEdge("wall", [[100, 10], [100, 70]]), element: item.edges[1] };
  const model = {
    nodes: [
      { id: "svg-node-A", box: { x: 0, y: 0, right: 40, bottom: 40 } },
      { id: "svg-node-B", box: { x: 160, y: 30, right: 200, bottom: 70 } },
    ], labels: [],
  };
  const original = item.edges[0].getAttribute("d");
  for (const alternatives of [false, true]) {
    const plan = planAvoidance(item.svg, edge, [edge, wall], model, alternatives);
    assert(plan, "保持语义端口仍有可行的外绕路线");
    assert.deepEqual(plan.points[0], edge.points[0], "不能回退到原布局锚点而丢失marker留白");
    assert.deepEqual(plan.points.at(-1), edge.points.at(-1));
    for (const [a, b, c, d] of [
      [edge.points[0], edge.points[1], plan.points[0], plan.points[1]],
      [edge.points.at(-2), edge.points.at(-1), plan.points.at(-2), plan.points.at(-1)],
    ]) {
      const before = { x: b.x - a.x, y: b.y - a.y }, after = { x: d.x - c.x, y: d.y - c.y };
      assert(Math.abs(before.x * after.y - before.y * after.x) < 1e-6, "首尾切线方向被改变");
      assert(before.x * after.x + before.y * after.y > 0, "首尾切线不能反向");
    }
    assert(Number.isFinite(routing.routeQuality(plan.points).score));
    for (let i = 1; i < plan.points.length; i++) {
      assert(!segmentIntersection(plan.points[i - 1], plan.points[i], ...wall.points), "保持端点不能牺牲避障");
    }
  }
  assert.equal(item.edges[0].getAttribute("d"), original, "规划阶段不得提前提交候选");
});

test("含菱形marker的布局拒绝扩距时保留原留白且不移动节点", (t) => {
  installGeometry(t);
  const item = nativeFixture({
    nodes: [
      { id: "A", box: { x: 0, y: 0, width: 40, height: 40 } },
      { id: "T", box: { x: 100, y: 0, width: 40, height: 40 } },
    ],
    edges: [{ id: "offset", start: "A", end: "T",
      markerStart: "url(#svg-classDiagram-aggregationStart)",
      points: [{ x: 40, y: 20 }, { x: 100, y: 20 }] }],
  });
  const nodes = [...item.nodeElements.values()], edge = item.edges[0];
  for (const node of nodes) {
    const attributes = new Map();
    node.getAttribute = (key) => attributes.get(key) ?? null;
    node.setAttribute = (key, value) => attributes.set(key, String(value));
    node.parentElement = { closest: () => null };
  }
  edge.setAttribute("d", "M50,20L100,20");
  edge.closest = () => null;
  edge.getTotalLength = () => 50;
  edge.getPointAtLength = (offset) => ({ x: 50 + offset, y: 20 });
  item.svg.querySelector = () => null;
  item.svg.querySelectorAll = (selector) => {
    if (selector === "g.node" || selector === "g.node[data-id]") return nodes;
    if (selector === "g.edgeLabel") return [];
    return [edge];
  };
  const before = {
    d: edge.getAttribute("d"), points: edge.getAttribute("data-points"),
    marker: edge.getAttribute("marker-start"), transforms: nodes.map((node) => node.getAttribute("transform")),
  };
  for (const factor of [1.45, 2]) {
    assert.equal(expandFlatSpacing(item.svg, factor), false, "不能重建语义marker锚点而丢掉原10单位留白");
    assert.deepEqual({
      d: edge.getAttribute("d"), points: edge.getAttribute("data-points"),
      marker: edge.getAttribute("marker-start"), transforms: nodes.map((node) => node.getAttribute("transform")),
    }, before, "拒绝扩距必须发生在任何几何写入之前");
  }
});

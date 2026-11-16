import test from "node:test";
import assert from "node:assert/strict";
import { routeFlowEdges, readPoints, segmentBlocked, simplifyPoints, orthogonalRoute } from "../src/svg-routing.js";

function installGeometry(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "DOMPoint");
  class Point {
    constructor(x, y) { this.x = x; this.y = y; }
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
  return { svg, graph, edges };
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

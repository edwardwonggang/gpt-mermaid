import test from "node:test";
import assert from "node:assert/strict";
import { crossingPairs, recordCrossings, sampleEdge } from "../src/svg-crossings.js";
import { routeC4Edges } from "../src/svg-c4.js";
import { readPoints, routeFlowEdges } from "../src/svg-routing.js";

function installGeometry(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "DOMPoint");
  class Point {
    #x;
    #y;
    constructor(x, y) { this.#x = x; this.#y = y; }
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

function crossingEdge(id, coordinates, source, target, shared) {
  const points = coordinates.map(([x, y]) => ({ x, y }));
  return {
    id, points, source, target, shared,
    box: {
      x: Math.min(...points.map((point) => point.x)),
      right: Math.max(...points.map((point) => point.x)),
      y: Math.min(...points.map((point) => point.y)),
      bottom: Math.max(...points.map((point) => point.y)),
    },
  };
}

function flowFixture() {
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
    nodes: [{ id: "A", domId: "node-A", isGroup: false }],
    edges: Array.from({ length: 2 }, (_, index) => ({
      id: `loop${index}`, start: "A", end: "A",
      arrowTypeStart: "none", arrowTypeEnd: "arrow_point", pattern: "normal",
      thickness: "normal", style: [], cssCompiledStyles: [],
      points: [{ x: 60, y: 20 + index * 4 }, { x: 100, y: 20 + index * 4 },
        { x: 100, y: 44 }, { x: 60, y: 44 }],
    })),
  };
  const box = { x: 0, y: 0, width: 60, height: 60 };
  const shape = { getBBox: () => box, getScreenCTM: () => matrix };
  const node = {
    id: "svg-node-A", dataset: { id: "A" },
    querySelector: () => shape, getScreenCTM: () => matrix,
  };
  const edges = graph.edges.map((edge) => ({
    ...attributes({ "data-points": btoa(JSON.stringify(edge.points)), "marker-end": "url(#arrow)" }),
    id: `svg-${edge.id}`, dataset: { id: edge.id }, getScreenCTM: () => matrix,
  }));
  const svg = {
    ...attributes(), id: "svg", getScreenCTM: () => matrix,
    getElementById: (id) => id === node.id ? node : null,
    querySelectorAll: (selector) => {
      if (selector === "g.node[data-id]") return [node];
      if (selector.startsWith("path.flowchart-link")) return edges;
      return [];
    },
  };
  return { svg, edges };
}

test("近端真实交叉不能被共享 owner 的 2 单位容差吞掉", () => {
  const first = crossingEdge("a", [[0, 0], [10, 0]], "S", "T");
  const second = crossingEdge("b", [[1, -1], [1, 1]], "S", "U");
  assert.equal(crossingPairs([first, second]).length, 1);

  const exact = crossingEdge("exact", [[0, 0], [0, 10]], "S", "U");
  assert.deepEqual(crossingPairs([first, exact]), []);
});

test("shared 标记必须同时匹配目标结构身份", () => {
  const a = crossingEdge("a", [[0, 0], [50, 0], [100, 0]], "A", "T1", "same");
  const mismatch = crossingEdge("mismatch", [[50, -20], [50, 0], [100, 0]], "B", "T2", "same");
  const match = crossingEdge("match", [[50, -20], [50, 0], [100, 0]], "B", "T1", "same");
  assert.equal(crossingPairs([a, mismatch]).length, 1, "不同目标不能共享豁免");
  assert.deepEqual(crossingPairs([a, match]), []);
});

test("最终交叉报告必须包含单边自交", () => {
  const self = crossingEdge("self", [[0, 0], [100, 100], [0, 100], [100, 0]], "A", "A");
  const pairs = crossingPairs([self]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].self, true);
  assert.equal(pairs[0].a, "self");
  assert.equal(pairs[0].b, "self");
});

test("多子路径采样保留 move 断点，不制造跨子路径假连线", (t) => {
  installGeometry(t);
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } };
  const svg = { getScreenCTM: () => matrix };
  const path = {
    getAttribute: (key) => key === "d" ? "M0,0 L10,0 Z M100,100 L110,100 Z" : null,
    getScreenCTM: () => matrix,
    getTotalLength: () => 20,
    getPointAtLength: (distance) => distance <= 10
      ? { x: distance, y: 0 }
      : { x: 100 + (distance - 10), y: 100 },
  };
  const points = sampleEdge(svg, path);
  assert(points.length >= 4);
  assert.equal(points.some((point) => point.move), true);
  const first = {
    ...crossingEdge("multi", [[0, 0], [10, 0]], "A", "B"),
    points,
    box: { x: 0, right: 110, y: 0, bottom: 100 },
  };
  const wall = crossingEdge("wall", [[30, 50], [70, 50]], "C", "D");
  assert.deepEqual(crossingPairs([first, wall]), []);
});

test("超长路径中的极小小环由命令边界提示采样，不被固定点数上限漏掉", (t) => {
  installGeometry(t);
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } };
  const svg = { getScreenCTM: () => matrix };
  const points = [[0, 100], [50002, 0], [50003, 3], [50004, 0], [100000, 0], [0, 100]];
  const lengths = points.slice(1).map((point, index) =>
    Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const at = (distance) => {
    let remaining = Math.max(0, Math.min(total, distance));
    for (let index = 0; index < lengths.length; index++) {
      if (remaining <= lengths[index]) {
        const ratio = lengths[index] ? remaining / lengths[index] : 0;
        return {
          x: points[index][0] + (points[index + 1][0] - points[index][0]) * ratio,
          y: points[index][1] + (points[index + 1][1] - points[index][1]) * ratio,
        };
      }
      remaining -= lengths[index];
    }
    return { x: points.at(-1)[0], y: points.at(-1)[1] };
  };
  const path = {
    getAttribute: (key) => key === "d"
      ? "M0,100 L50002,0 L50003,3 L50004,0 L100000,0 Z" : null,
    getScreenCTM: () => matrix,
    getTotalLength: () => total,
    getPointAtLength: at,
  };
  const sampled = sampleEdge(svg, path);
  const edge = {
    ...crossingEdge("long", [[0, 0], [50004, 0]], "A", "B"),
    points: sampled,
    box: { x: 0, right: 100000, y: 0, bottom: 100 },
  };
  const wall = crossingEdge("wall", [[50002.2, 1], [50003.8, 1]], "C", "D");
  const pairs = crossingPairs([edge, wall]);
  assert.equal(pairs.length, 1);
  assert(pairs[0].hits.length >= 2, "极小小环的两个交点都必须可见");
});

test("同一节点的重复自环分配不同 lane，不能完全重合", (t) => {
  installGeometry(t);
  const { svg, edges } = flowFixture();
  routeFlowEdges(svg, {
    nodes: [{ id: "A", domId: "node-A", isGroup: false }],
    edges: edges.map((edge, index) => ({
      id: index ? "loop1" : "loop0", start: "A", end: "A",
      arrowTypeStart: "none", arrowTypeEnd: "arrow_point", pattern: "normal",
      thickness: "normal", style: [], cssCompiledStyles: [],
    })),
  });
  const first = readPoints(edges[0]), second = readPoints(edges[1]);
  assert.notDeepEqual(first, second);
  assert.equal(svg.getAttribute("data-gptm-self-loops"), "2");
  const routed = [first, second].map((points, index) =>
    crossingEdge(`loop${index}`, points.map(({ x, y }) => [x, y]), "A", "A"));
  assert.deepEqual(crossingPairs(routed), []);
});

test("C4 expected 与 skipped 会使最终状态保持 unresolved", () => {
  const values = new Map([
    ["data-gptm-c4-expected", "2"],
    ["data-gptm-skipped-edges", "1"],
  ]);
  const svg = {
    getAttribute: (key) => values.get(key) ?? null,
    setAttribute: (key, value) => values.set(key, String(value)),
    querySelectorAll: () => [],
  };
  recordCrossings(svg);
  assert.equal(svg.getAttribute("data-gptm-checked-edges"), "0");
  assert.equal(svg.getAttribute("data-gptm-expected-edges"), "2");
  assert.equal(svg.getAttribute("data-gptm-skipped-edges"), "2");
  assert.equal(svg.getAttribute("data-gptm-routing-status"), "unresolved");
  assert.equal(svg.getAttribute("data-gptm-routing-reason"), "incomplete-relations");
});

test("C4 关系按结构化端点匹配，并显式记录未匹配 expected", (t) => {
  installGeometry(t);
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } };
  const pathAttributes = new Map([
    ["marker-end", "url(#arrow)"],
  ]);
  const path = {
    localName: "path", id: "svg-relation", dataset: { id: "relation" },
    style: { setProperty() {} },
    getAttribute: (key) => pathAttributes.get(key) ?? null,
    setAttribute: (key, value) => pathAttributes.set(key, String(value)),
    getScreenCTM: () => matrix,
    getTotalLength: () => 60,
    getPointAtLength: (distance) => ({ x: 40 + distance, y: 20 }),
    closest: () => null,
    nextElementSibling: null,
  };
  const shape = (box) => ({ getBBox: () => box, getScreenCTM: () => matrix });
  const nodes = new Map([
    ["svg-A", { id: "svg-A", querySelector: () => shape({ x: 0, y: 0, width: 40, height: 40 }) }],
    ["svg-B", { id: "svg-B", querySelector: () => shape({ x: 100, y: 0, width: 40, height: 40 }) }],
  ]);
  const values = new Map();
  const svg = {
    id: "svg", getAttribute: (key) => values.get(key) ?? null,
    setAttribute: (key, value) => values.set(key, String(value)), getScreenCTM: () => matrix,
    getElementById: (id) => nodes.get(id) || null,
    querySelectorAll: (selector) => selector === "path[marker-end],line[marker-end]"
      ? [path] : [],
  };
  routeC4Edges(svg, {
    c4Nodes: [{ alias: "A" }, { alias: "B" }],
    c4Relations: [{ from: "A", to: "B" }, { from: "A", to: "B" }],
  }, {});
  assert.equal(path.getAttribute("data-gptm-c4-relation"), "true");
  assert.equal(path.getAttribute("data-gptm-source"), "svg-A");
  assert.equal(path.getAttribute("data-gptm-target"), "svg-B");
  assert.equal(svg.getAttribute("data-gptm-c4-expected"), "2");
  assert.equal(svg.getAttribute("data-gptm-skipped-edges"), "1");
});

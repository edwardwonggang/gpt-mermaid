/*
 * 职责：将过长的平坦连续流程按安全切口折返，保留节点、边与标签身份。
 * 调用方：render.js 的离屏 SVG 后处理；依赖：Mermaid getData() 与实际 SVG 几何。
 * 红线：只在相邻单节点层的唯一连接边处折返；分支组整体移动，不能猜 ID 或拆开反馈环。
 * 节点和文字只平移，反向带仅反射路由坐标；真实轮廓端点、标签避让和画布由后续几何步骤复核。
 */

export const ADAPTIVE_LAYOUT_DEFAULTS = Object.freeze({
  enabled: true, maxWidth: 1200, maxHeight: 1000, gap: 80,
});
const ADAPTIVE_PADDING = 24;
const ADAPTIVE_TURN_CLEARANCE = 32;
const ADAPTIVE_EPSILON = 0.01;

function optionsFor(options) {
  const input = options && typeof options === "object" ? options : {};
  const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
  return {
    enabled: options !== false && input.enabled !== false,
    maxWidth: positive(input.maxWidth, ADAPTIVE_LAYOUT_DEFAULTS.maxWidth),
    maxHeight: positive(input.maxHeight, ADAPTIVE_LAYOUT_DEFAULTS.maxHeight),
    gap: positive(input.gap, ADAPTIVE_LAYOUT_DEFAULTS.gap),
  };
}

function boxPoints(box) {
  return [{ x: box.x, y: box.y }, { x: box.x + box.width, y: box.y + box.height }];
}

function boundsOf(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function validBox(box) {
  return box && [box.x, box.y, box.width, box.height].every(Number.isFinite)
    && box.width > 0 && box.height > 0;
}

function validPoints(points) {
  return Array.isArray(points) && points.length >= 2
    && points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function midpointOfLongestSegment(points) {
  let best = { length: -1, point: points[0] };
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const length = Math.hypot(current.x - previous.x, current.y - previous.y);
    if (length > best.length) best = {
      length, point: { x: (current.x + previous.x) / 2, y: (current.y + previous.y) / 2 },
    };
  }
  return best.point;
}

function flowRanks(nodes, edges) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (byId.size !== nodes.length) return { reason: "duplicate-node-id" };
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  const degree = new Map(nodes.map((node) => [node.id, 0]));
  const neighbors = new Map(nodes.map((node) => [node.id, []]));
  const edgeIds = new Set();
  for (const edge of edges) {
    if (!byId.has(edge.start) || !byId.has(edge.end)) return { reason: "missing-edge-endpoint" };
    if (!edge.id || edgeIds.has(edge.id)) return { reason: "duplicate-edge-id" };
    edgeIds.add(edge.id);
    outgoing.get(edge.start).push(edge.end);
    degree.set(edge.end, degree.get(edge.end) + 1);
    neighbors.get(edge.start).push(edge.end);
    neighbors.get(edge.end).push(edge.start);
  }
  const visited = new Set();
  const pending = [nodes[0].id];
  for (let index = 0; index < pending.length; index++) {
    const id = pending[index];
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...neighbors.get(id).filter((neighbor) => !visited.has(neighbor)));
  }
  if (visited.size !== nodes.length) return { reason: "disconnected-components" };
  const queue = nodes.filter((node) => degree.get(node.id) === 0).map((node) => node.id);
  const ranks = new Map(queue.map((id) => [id, 0]));
  let processed = 0;
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    processed++;
    for (const target of outgoing.get(id)) {
      ranks.set(target, Math.max(ranks.get(target) || 0, ranks.get(id) + 1));
      degree.set(target, degree.get(target) - 1);
      if (degree.get(target) === 0) queue.push(target);
    }
  }
  if (processed !== nodes.length) return { reason: "cycle-or-feedback" };
  if (edges.some((edge) => ranks.get(edge.end) !== ranks.get(edge.start) + 1)) {
    return { reason: "cross-layer-edge" };
  }
  const layers = [];
  for (const node of nodes) (layers[ranks.get(node.id)] ||= []).push(node);
  return { ranks, layers };
}

/**
 * 纯几何规划。nodes 的 box、edges 的 points/labelBox 均在同一个 SVG 用户坐标系。
 * 返回的 positions/routes 不改变原输入；unsupported 必须整图保留，不能应用半个计划。
 */
export function planAdaptiveFlowLayout(graph, options) {
  const config = optionsFor(options);
  const report = { status: "unchanged", reason: "within-threshold", rows: 1, columns: 1 };
  const skip = (reason) => ({ ...report, status: "unsupported", reason });
  if (!config.enabled) return { ...report, reason: "disabled" };
  if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.edges)) return skip("missing-graph-metadata");
  const { nodes, edges } = graph;
  if (nodes.length < 2) return { ...report, reason: "too-few-nodes" };
  if (nodes.some((node) => node.isGroup || node.parentId != null)) return skip("subgraph-layout");
  if (nodes.some((node) => !node.id || !validBox(node.box))
    || edges.some((edge) => !validPoints(edge.points) || (edge.labelBox && !validBox(edge.labelBox)))) {
    return skip("geometry-unavailable");
  }
  const direction = String(graph.direction || "").toUpperCase();
  if (!["LR", "RL", "TB", "TD", "BT"].includes(direction)) return skip("missing-direction");
  const horizontal = direction === "LR" || direction === "RL";
  const sign = direction === "RL" || direction === "BT" ? -1 : 1;
  const axis = horizontal ? "x" : "y";
  const cross = horizontal ? "y" : "x";
  const axisSize = horizontal ? "width" : "height";
  const crossSize = horizontal ? "height" : "width";
  const original = boundsOf([
    ...nodes.flatMap((node) => boxPoints(node.box)),
    ...edges.flatMap((edge) => [...edge.points, ...(edge.labelBox ? boxPoints(edge.labelBox) : [])]),
  ]);
  report.before = { width: original.width, height: original.height };
  if (original[axisSize] + ADAPTIVE_PADDING * 2 <= (horizontal ? config.maxWidth : config.maxHeight)) {
    return { ...report, reason: original[crossSize] > (horizontal ? config.maxHeight : config.maxWidth)
      ? "cross-axis-overflow" : "within-threshold" };
  }
  const ranked = flowRanks(nodes, edges);
  if (ranked.reason) return skip(ranked.reason);
  const { ranks, layers } = ranked;
  const center = (box, key) => box[key] + box[key === "x" ? "width" : "height"] / 2;
  if (edges.some((edge) => sign * (center(nodes.find((node) => node.id === edge.end).box, axis)
    - center(nodes.find((node) => node.id === edge.start).box, axis)) <= 0)) {
    return skip("non-monotonic-layout");
  }
  const cuts = layers.slice(0, -1).map((layer, index) => ({
    index,
    safe: layer.length === 1 && layers[index + 1].length === 1
      && edges.filter((edge) => ranks.get(edge.start) === index && ranks.get(edge.end) === index + 1).length === 1,
  })).filter((cut) => cut.safe).map((cut) => cut.index);
  if (!cuts.length) return skip("no-safe-break");
  const labelTurnSpace = Math.max(0, ...edges.filter((edge) => edge.labelBox)
    .map((edge) => edge.labelBox[axisSize] / 2 + 12));
  const clearance = Math.max(ADAPTIVE_TURN_CLEARANCE, labelTurnSpace);
  const limit = (horizontal ? config.maxWidth : config.maxHeight) - 2 * (ADAPTIVE_PADDING + clearance);
  const boundsFor = (start, end) => {
    const members = nodes.filter((node) => ranks.get(node.id) >= start && ranks.get(node.id) <= end);
    const internal = edges.filter((edge) => ranks.get(edge.start) >= start && ranks.get(edge.end) <= end);
    return boundsOf([
      ...members.flatMap((node) => boxPoints(node.box)),
      ...internal.flatMap((edge) => [...edge.points, ...(edge.labelBox ? boxPoints(edge.labelBox) : [])]),
    ]);
  };
  const bands = [];
  let start = 0;
  while (start < layers.length) {
    let selected = null;
    for (const end of [...cuts.filter((cut) => cut >= start), layers.length - 1]) {
      const box = boundsFor(start, end);
      if (box[axisSize] <= limit) selected = { start, end, box };
      else break;
    }
    if (!selected) return skip("block-exceeds-threshold");
    bands.push(selected);
    start = selected.end + 1;
  }
  if (bands.length === 1) return { ...report, reason: "within-threshold" };
  // 贪心填满会留下孤零零的末节点。只重选末两带之间已有的安全切口，
  // 不增加带数、不移动更早的带，也不为均衡而拆开完整分支组。
  const penultimate = bands.at(-2), last = bands.at(-1);
  let balanced = null;
  for (const cut of cuts.filter((cut) => cut >= penultimate.start && cut < last.end)) {
    const left = { start: penultimate.start, end: cut, box: boundsFor(penultimate.start, cut) };
    const right = { start: cut + 1, end: last.end, box: boundsFor(cut + 1, last.end) };
    if (left.box[axisSize] > limit || right.box[axisSize] > limit) continue;
    const count = (band) => layers.slice(band.start, band.end + 1).reduce((total, layer) => total + layer.length, 0);
    const lonely = Number(count(left) === 1) + Number(count(right) === 1) * 2;
    const difference = Math.abs(left.box[axisSize] - right.box[axisSize]);
    if (!balanced || lonely < balanced.lonely || (lonely === balanced.lonely && difference < balanced.difference)) {
      balanced = { left, right, lonely, difference };
    }
  }
  if (balanced) bands.splice(-2, 2, balanced.left, balanced.right);
  const span = Math.max(...bands.map((band) => band.box[axisSize]));
  const primaryMin = ADAPTIVE_PADDING + clearance;
  const primaryMax = primaryMin + span;
  let cursor = ADAPTIVE_PADDING;
  const nodeBands = new Map();
  bands.forEach((band, index) => {
    band.index = index;
    band.forward = sign * (index % 2 ? -1 : 1);
    band.crossStart = cursor;
    band.map = (point) => {
      const distance = sign > 0
        ? point[axis] - band.box[axis]
        : band.box[axis] + band.box[axisSize] - point[axis];
      return {
        [axis]: band.forward > 0 ? primaryMin + distance : primaryMax - distance,
        [cross]: band.crossStart + point[cross] - band.box[cross],
      };
    };
    for (let rank = band.start; rank <= band.end; rank++) {
      for (const node of layers[rank]) nodeBands.set(node.id, band);
    }
    const boundaryLabel = edges.find((edge) => ranks.get(edge.start) === band.end
      && ranks.get(edge.end) === band.end + 1)?.labelBox;
    cursor += band.box[crossSize] + Math.max(config.gap, (boundaryLabel?.[crossSize] || 0) + 24);
  });
  const positions = nodes.map((node) => {
    const point = nodeBands.get(node.id).map({ x: center(node.box, "x"), y: center(node.box, "y") });
    return {
      id: node.id, x: point.x, y: point.y,
      box: { x: point.x - node.box.width / 2, y: point.y - node.box.height / 2,
        width: node.box.width, height: node.box.height },
    };
  });
  const positionById = new Map(positions.map((position) => [position.id, position]));
  const routes = edges.map((edge) => {
    const fromBand = nodeBands.get(edge.start);
    const toBand = nodeBands.get(edge.end);
    let points;
    let label;
    if (fromBand === toBand) {
      points = edge.points.map(fromBand.map);
      if (edge.labelBox) label = fromBand.map({
        x: center(edge.labelBox, "x"), y: center(edge.labelBox, "y"),
      });
    } else {
      // 唯一桥边沿两条带外侧折返，绝不穿过同层分支组。
      const from = positionById.get(edge.start);
      const to = positionById.get(edge.end);
      const side = fromBand.forward;
      const outer = side > 0 ? primaryMax + clearance : primaryMin - clearance;
      const head = { [axis]: from[axis] + side * from.box[axisSize] / 2, [cross]: from[cross] };
      const tail = { [axis]: to[axis] + side * to.box[axisSize] / 2, [cross]: to[cross] };
      points = [head, { [axis]: outer, [cross]: head[cross] },
        { [axis]: outer, [cross]: tail[cross] }, tail];
      label = midpointOfLongestSegment(points);
    }
    return { id: edge.id, start: edge.start, end: edge.end, points, label };
  });
  const bounds = boundsOf([
    ...positions.flatMap((position) => boxPoints(position.box)),
    ...routes.flatMap((route) => route.points),
    ...routes.flatMap((route) => {
      const box = edges.find((edge) => edge.id === route.id).labelBox;
      return box && route.label ? boxPoints({
        x: route.label.x - box.width / 2, y: route.label.y - box.height / 2,
        width: box.width, height: box.height,
      }) : [];
    }),
  ]);
  return {
    ...report, status: "applied", reason: "safe-continuous-flow", direction,
    rows: horizontal ? bands.length : 1, columns: horizontal ? 1 : bands.length,
    groups: layers.filter((layer) => layer.length > 1).length,
    after: { width: bounds.width, height: bounds.height }, bounds, positions, routes,
  };
}

function rootMatrix(svg, element) {
  const root = svg.getScreenCTM();
  const current = element.getScreenCTM();
  if (!root || !current) throw new Error("geometry-unavailable");
  const matrix = root.inverse().multiply(current);
  // 后处理所见流程图仅有平移；旋转/缩放会改变节点端口与文字尺寸，不能套用平移计划。
  if (Math.abs(matrix.a - 1) + Math.abs(matrix.d - 1) + Math.abs(matrix.b) + Math.abs(matrix.c) > ADAPTIVE_EPSILON) {
    throw new Error("transformed-layout");
  }
  return matrix;
}

function elementBox(svg, element) {
  const box = element.getBBox();
  const matrix = rootMatrix(svg, element);
  return { x: box.x + matrix.e, y: box.y + matrix.f, width: box.width, height: box.height };
}

function shiftElement(svg, element, dx, dy) {
  rootMatrix(svg, element.parentNode);
  return `translate(${dx}, ${dy}) ${element.getAttribute("transform") || ""}`.trim();
}

function polylinePath(points) {
  // 原始折点来自上游路由。这里只映射坐标；共享路由步骤负责消除多余折点和统一圆角。
  return points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
}

function publish(svg, report) {
  svg.setAttribute("data-gptm-adaptive", report.status);
  svg.setAttribute("data-gptm-adaptive-reason", report.reason);
  svg.setAttribute("data-gptm-adaptive-rows", String(report.rows || 1));
  svg.setAttribute("data-gptm-adaptive-columns", String(report.columns || 1));
  const { positions: _positions, routes: _routes, bounds: _bounds, ...summary } = report;
  return summary;
}

/**
 * 在净化且已挂载的 SVG 上调用，graph 来自本轮 runtime db.getData()，另附 db.getDirection()。
 * 成功后继续执行统一路由、真实轮廓贴边、边标签避让及 fitSvgBounds，最后才着色和裁箭头。
 */
export function applyAdaptiveFlowLayout(svg, graph, options) {
  const base = { status: "unchanged", reason: "disabled", rows: 1, columns: 1 };
  if (!optionsFor(options).enabled) return publish(svg, base);
  if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.edges)) {
    return publish(svg, { ...base, status: "unsupported", reason: "missing-graph-metadata" });
  }
  if (graph.nodes.some((node) => node.isGroup || node.parentId != null)) {
    return publish(svg, { ...base, status: "unsupported", reason: "subgraph-layout" });
  }
  try {
    const nodeElements = [...svg.querySelectorAll("g.node")];
    const edgeElements = [...svg.querySelectorAll("path[data-edge='true']")];
    const labels = [...svg.querySelectorAll("g.edgeLabel")];
    const nodeById = new Map();
    const edgeById = new Map();
    const labelById = new Map();
    for (const label of labels) {
      const id = label.querySelector("g.label[data-id]")?.getAttribute("data-id");
      if (id) {
        if (labelById.has(id)) throw new Error("ambiguous-label-metadata");
        labelById.set(id, label);
      } else if (label.textContent.trim()) throw new Error("missing-label-metadata");
    }
    const nodes = graph.nodes.map((node) => {
      const matches = nodeElements.filter((element) => element.getAttribute("data-id") === node.id
        || (node.domId && (element.id === node.domId || element.id === `${svg.id}-${node.domId}`)));
      if (matches.length !== 1) throw new Error("missing-node-metadata");
      nodeById.set(node.id, matches[0]);
      return { ...node, box: elementBox(svg, matches[0]) };
    });
    const edges = graph.edges.map((edge) => {
      const matches = edgeElements.filter((element) => element.getAttribute("data-id") === edge.id);
      if (matches.length !== 1) throw new Error("missing-edge-metadata");
      const element = matches[0];
      const matrix = rootMatrix(svg, element);
      const points = JSON.parse(atob(element.getAttribute("data-points") || ""));
      if (!validPoints(points)) throw new Error("geometry-unavailable");
      edgeById.set(edge.id, element);
      const label = labelById.get(edge.id);
      return { ...edge, points: points.map((point) => ({ x: point.x + matrix.e, y: point.y + matrix.f })),
        labelBox: label ? elementBox(svg, label) : null };
    });
    if (nodeElements.length !== nodes.length || edgeElements.length !== edges.length) {
      throw new Error("unmapped-graph-elements");
    }
    const plan = planAdaptiveFlowLayout({ ...graph, nodes, edges }, options);
    if (plan.status !== "applied") return publish(svg, plan);
    // 所有几何与映射先验证完再写 DOM，保证失败回退不会留下半张折返图。
    const writes = [];
    for (const position of plan.positions) {
      const element = nodeById.get(position.id);
      const box = nodes.find((node) => node.id === position.id).box;
      writes.push([element, "transform", shiftElement(svg, element,
        position.x - (box.x + box.width / 2), position.y - (box.y + box.height / 2))]);
    }
    for (const route of plan.routes) {
      const element = edgeById.get(route.id);
      const matrix = rootMatrix(svg, element);
      const points = route.points.map((point) => ({ x: point.x - matrix.e, y: point.y - matrix.f }));
      writes.push([element, "d", polylinePath(points)], [element, "data-points", btoa(JSON.stringify(points))]);
      const label = labelById.get(route.id);
      if (label && route.label) {
        const box = elementBox(svg, label);
        writes.push([label, "transform", shiftElement(svg, label,
          route.label.x - (box.x + box.width / 2), route.label.y - (box.y + box.height / 2))]);
      }
    }
    for (const title of svg.querySelectorAll(".flowchartTitleText")) {
      const box = elementBox(svg, title);
      writes.push([title, "transform", shiftElement(svg, title,
        plan.bounds.x + plan.bounds.width / 2 - (box.x + box.width / 2),
        plan.bounds.y - ADAPTIVE_PADDING - (box.y + box.height))]);
    }
    for (const [element, key, value] of writes) element.setAttribute(key, value);
    return publish(svg, plan);
  } catch (error) {
    return publish(svg, { ...base, status: "unsupported", reason: error.message || "geometry-unavailable" });
  }
}

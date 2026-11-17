/*
 * 职责：对实际 SVG 连线做交叉检测，并对有身份归属的边做通用避障。
 * 调用方：render.js 的几何后处理；依赖：SVG 测量、同一套正交寻路及标签放置。
 * 红线：不按图名/文字特判，不隐藏路径，不改连接关系；共享端点只按结构化身份豁免。
 */
import { segmentIntersection } from "./path-intersections.js";
import { inSvg, fromSvg, boundsInSvg, nodeShape, readPoints, writePoints,
  orthogonalRoute, routeQuality, simplifyPoints, segmentBlocked, labelOnRoute } from "./svg-routing.js";
import { placeEdgeLabels } from "./svg-labels.js";

const EDGE_SELECTOR = ".flowchart-link,.transition,.relation,.relationshipLine,[data-gptm-source]";
const GAP = 12;
const ROUTING_BUDGETS = new WeakMap();
const norm = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const vector = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
const segments = (points) => points.slice(1).flatMap((p, i) => p.move ? [] : [[points[i], p]]);
const boxOf = (points) => ({ x: Math.min(...points.map((p) => p.x)), y: Math.min(...points.map((p) => p.y)),
  right: Math.max(...points.map((p) => p.x)), bottom: Math.max(...points.map((p) => p.y)) });
const overlaps = (a, b) => a.x <= b.right && a.right >= b.x && a.y <= b.bottom && a.bottom >= b.y;

function flattenPath(element) {
  const data = element.getAttribute?.("d");
  if (!data || /[aAbBsStTzZ]/.test(data)) return null;
  const tokens = data.match(/[MLHVQCmlhvqc]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g) || [];
  let point = { x: 0, y: 0 }, command, i = 0;
  const result = [];
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const flatten = (controls, depth = 0) => {
    const a = controls[0], b = controls.at(-1), v = vector(a, b), length = norm(a, b);
    const error = Math.max(...controls.slice(1, -1).map((p) => {
      const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * v.x + (p.y - a.y) * v.y) / length ** 2)) : 0;
      return norm(p, { x: a.x + v.x * t, y: a.y + v.y * t });
    }));
    if (error < 0.1 || depth >= 12) { result.push(b); return; }
    const left = [a], right = [b];
    let row = controls;
    while (row.length > 1) {
      row = row.slice(1).map((p, i) => midpoint(row[i], p));
      left.push(row[0]); right.unshift(row.at(-1));
    }
    flatten(left, depth + 1); flatten(right, depth + 1);
  };
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    if (!command) return null;
    const type = command.toUpperCase(), count = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6 }[type];
    if (!count || i + count > tokens.length) return null;
    const values = tokens.slice(i, i + count).map(Number);
    if (values.some((v) => !Number.isFinite(v))) return null;
    i += count;
    const relative = command !== type;
    const next = (x, y) => ({ x: x + (relative ? point.x : 0), y: y + (relative ? point.y : 0) });
    if (type === "H") point = { x: values[0] + (relative ? point.x : 0), y: point.y };
    else if (type === "V") point = { x: point.x, y: values[0] + (relative ? point.y : 0) };
    else if (type === "Q" || type === "C") {
      const controls = [point];
      for (let j = 0; j < values.length; j += 2) controls.push(next(values[j], values[j + 1]));
      flatten(controls); point = controls.at(-1); continue;
    } else point = next(...values);
    result.push(type === "M" ? { ...point, move: true } : point);
    if (type === "M") command = relative ? "l" : "L";
  }
  return result.length >= 2 ? result : null;
}

// 真实曲线采样后按误差收敛，不能拿 data-points 控制折线冒充最终显示路径。
export function sampleEdge(svg, element) {
  const explicit = flattenPath(element);
  if (explicit) return explicit.map((point) => {
    const p = inSvg(svg, element, point);
    return { x: p.x, y: p.y, ...(point.move ? { move: true } : {}) };
  });
  const length = element.getTotalLength();
  if (!Number.isFinite(length) || length <= 0) return [];
  const steps = Math.min(16384, Math.max(2, Math.ceil(length / 0.5)));
  const input = Array.from({ length: steps + 1 }, (_, i) => {
    const p = inSvg(svg, element, element.getPointAtLength(length * i / steps));
    return { x: p.x, y: p.y };
  });
  const reduce = (lo, hi) => {
    const a = input[lo], b = input[hi], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    let farthest = 0, at = -1;
    for (let i = lo + 1; i < hi; i++) {
      const p = input[i], t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length ** 2)) : 0;
      const distance = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
      if (distance > farthest) { farthest = distance; at = i; }
    }
    return farthest > 0.2 ? [...reduce(lo, at).slice(0, -1), ...reduce(at, hi)] : [a, b];
  };
  return reduce(0, input.length - 1);
}

export function collectEdges(svg) {
  const semanticNodes = new Map([...svg.querySelectorAll("g.node[data-id]")].map((node) => [node.dataset.id, node.id]));
  return [...svg.querySelectorAll(EDGE_SELECTOR)]
    .filter((element) => !element.closest("defs,marker") && typeof element.getTotalLength === "function")
    .map((element) => {
      const points = sampleEdge(svg, element);
      const source = element.dataset.gptmSource || semanticNodes.get(element.dataset.source);
      const target = element.dataset.gptmTarget || semanticNodes.get(element.dataset.target);
      if (source && target) {
        element.setAttribute("data-gptm-source", source); element.setAttribute("data-gptm-target", target);
      }
      return { element, id: element.dataset.id || element.id, points,
        controls: readPoints(element)?.map((p) => { const q = inSvg(svg, element, p); return { x: q.x, y: q.y }; }),
        source, target,
        shared: element.dataset.gptmSharedTip, box: points.length ? boxOf(points) : null };
    }).filter((edge) => edge.points.length >= 2);
}

function allowedJunction(a, b, hit) {
  if (a.shared && a.shared === b.shared) {
    // 精确分段的实际共享路径才可豁免；距离/角度阈值会吞掉邻近的浅角真实交叉。
    const commonSegments = [];
    let i = a.points.length - 1, j = b.points.length - 1, end = a.points[i];
    if (norm(end, b.points[j]) < 0.05) while (i > 0 && j > 0) {
      const p = a.points[i - 1], q = b.points[j - 1];
      const v = vector(end, p), w = vector(end, q), length = Math.hypot(v.x, v.y), otherLength = Math.hypot(w.x, w.y);
      if (Math.abs(v.x * w.y - v.y * w.x) > 1e-4 || v.x * w.x + v.y * w.y < 0) break;
      const next = length < otherLength ? p : q;
      commonSegments.push([next, end]); end = next;
      if (length <= otherLength + 0.05) i--;
      if (otherLength <= length + 0.05) j--;
    }
    for (const [p, q] of commonSegments) {
      const r = p, s = q;
      const common = segmentIntersection(p, q, r, s);
      if (common?.kind !== "overlap") continue;
      const v = vector(p, q), length2 = v.x ** 2 + v.y ** 2;
      const projection = (point) => ((point.x - p.x) * v.x + (point.y - p.y) * v.y) / length2;
      const lo = Math.max(0, Math.min(projection(r), projection(s)));
      const hi = Math.min(1, Math.max(projection(r), projection(s)));
      const t = Math.max(lo, Math.min(hi, projection(hit)));
      const gap = norm(hit, { x: p.x + t * v.x, y: p.y + t * v.y });
      if (gap < 0.05 && hit.kind !== "cross") return true;
    }
  }
  for (const [ownerA, p] of [[a.source, a.points[0]], [a.target, a.points.at(-1)]]) {
    for (const [ownerB, q] of [[b.source, b.points[0]], [b.target, b.points.at(-1)]]) {
      if (ownerA && ownerA === ownerB && norm(p, hit) < 2 && norm(q, hit) < 2) return true;
    }
  }
  return false;
}

export function crossingPairs(edges) {
  const pairs = [];
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const a = edges[i], b = edges[j];
    if (!overlaps(a.box, b.box)) continue;
    const hits = [];
    for (const [p, q] of segments(a.points)) for (const [r, s] of segments(b.points)) {
      if (!overlaps(boxOf([p, q]), boxOf([r, s]))) continue;
      const hit = segmentIntersection(p, q, r, s);
      if (hit && !allowedJunction(a, b, hit) && !hits.some((h) => norm(h, hit) < 1)) hits.push(hit);
    }
    if (hits.length) pairs.push({ a: a.id, b: b.id, hits });
  }
  return pairs;
}

function triangleCompatible(element) {
  return ["marker-start", "marker-end"].every((attribute) => {
    const marker = element.getAttribute(attribute);
    return !marker || /(?:point(?:Start|End)|barbEnd|extension(?:Start|End)|dependency(?:Start|End)|arrowhead)\)/.test(marker);
  });
}

function endpointShield(edge, start) {
  if (!edge.element.hasAttribute(start ? "marker-start" : "marker-end")) return null;
  const points = start ? edge.points : edge.points.slice().reverse();
  const p = points[0], q = points.find((q) => norm(q, p) >= 12) || points.at(-1), length = norm(p, q);
  if (!length) return null;
  const depth = Math.min(20, Number(edge.element.dataset.gptmPortSpan) * 0.85 || 20);
  const v = { x: (q.x - p.x) / length, y: (q.y - p.y) / length }, half = depth / 1.25 / 2 + 1;
  return boxOf([p, { x: p.x + v.x * depth + v.y * half, y: p.y + v.y * depth - v.x * half },
    { x: p.x + v.x * depth - v.y * half, y: p.y + v.y * depth + v.x * half }]);
}

function portsFor(node, anchor, adjacent, alternatives) {
  const b = node.box, v = vector(anchor, adjacent);
  const side = Math.abs(v.x) > Math.abs(v.y) ? v.x > 0 ? "right" : "left" : v.y > 0 ? "bottom" : "top";
  const make = (p, side) => {
    const axis = side === "left" || side === "right" ? "x" : "y", sign = side === "left" || side === "top" ? -1 : 1;
    return { anchor: p, lead: { ...p, [axis]: p[axis] + sign * 24 }, penalty: norm(p, anchor) };
  };
  const ports = [make(anchor, side)];
  if (alternatives) for (const side of ["left", "right", "top", "bottom"]) {
    const p = side === "left" || side === "right"
      ? { x: side === "left" ? b.x : b.right, y: (b.y + b.bottom) / 2 }
      : { x: (b.x + b.right) / 2, y: side === "top" ? b.y : b.bottom };
    if (norm(p, anchor) > 2) ports.push(make(p, side));
  }
  return ports;
}

function geometry(svg) {
  const nodes = [...svg.querySelectorAll("g.node")].map((element) => {
    const shape = nodeShape(element);
    return shape && { element, id: element.id, box: boundsInSvg(svg, shape) };
  }).filter(Boolean);
  const labels = [...svg.querySelectorAll("g.edgeLabel")].filter((l) => l.textContent.trim()).map((element) => ({
    element, id: element.querySelector("[data-id]")?.dataset.id || element.dataset.id, box: boundsInSvg(svg, element),
  }));
  return { nodes, labels };
}

function applyReservation(svg, edge, reservation) {
  if (!reservation) return;
  edge.element.setAttribute("data-gptm-label-x", String(reservation.x));
  edge.element.setAttribute("data-gptm-label-y", String(reservation.y));
  const label = geometry(svg).labels.find((label) => label.id === edge.id);
  if (label) translateInRoot(svg, label.element,
    reservation.x - (label.box.x + label.box.right) / 2,
    reservation.y - (label.box.y + label.box.bottom) / 2);
}

export function planAvoidance(svg, edge, edges, model, alternatives = false) {
  const budget = ROUTING_BUDGETS.get(svg);
  if (budget && budget.remaining <= 0) return null;
  const source = model.nodes.find((n) => n.id === edge.source), target = model.nodes.find((n) => n.id === edge.target);
  if (!source || !target || source === target || edge.shared) return null;
  const compatible = triangleCompatible(edge.element);
  alternatives = alternatives && compatible;
  const others = edges.filter((e) => e !== edge);
  const walls = others.flatMap((e) => segments(e.points));
  const labels = model.labels.filter((l) => l.id !== edge.id);
  const shields = others.flatMap((e) => [endpointShield(e, true), endpointShield(e, false)]).filter(Boolean);
  const boxes = [...model.nodes.map((n) => n.box), ...labels.map((l) => l.box), ...shields];
  const foreignBoxes = [...model.nodes.filter((n) => n !== source && n !== target).map((n) => n.box), ...labels.map((l) => l.box), ...shields];
  const ownLabel = model.labels.find((l) => l.id === edge.id);
  const original = readPoints(edge.element)?.map((p) => inSvg(svg, edge.element, p));
  // ER基数/菱形端点保留当前真正可见端点和切线，只允许中段改路。
  const points = compatible && original?.length ? original : edge.points;
  const starts = portsFor(source, points[0], points[1], alternatives);
  const ends = portsFor(target, points.at(-1), points.at(-2), alternatives);
  if (!compatible) {
    const preserveTangent = (port, adjacent) => {
      const v = vector(port.anchor, adjacent), length = norm(port.anchor, adjacent);
      if (length) port.lead = { x: port.anchor.x + v.x * 24 / length, y: port.anchor.y + v.y * 24 / length };
    };
    preserveTangent(starts[0], points[1]); preserveTangent(ends[0], points.at(-2));
  }
  const extraX = [], extraY = [];
  for (const other of others) {
    extraX.push(other.box.x - GAP, other.box.right + GAP);
    extraY.push(other.box.y - GAP, other.box.bottom + GAP);
  }
  const options = starts.flatMap((a) => ends.map((b) => ({ a, b, estimate: norm(a.lead, b.lead) + (a.penalty + b.penalty) * 0.2 })))
    .sort((a, b) => a.estimate - b.estimate);
  let best;
  let labelSearches = 0;
  for (const { a, b } of options.slice(0, 12)) {
    if (budget && budget.remaining <= 0) break;
    const blocked = (p, q) => segmentBlocked(p, q, foreignBoxes)
      || walls.some(([r, s]) => segmentIntersection(p, q, r, s));
    if (blocked(a.anchor, a.lead) || blocked(b.lead, b.anchor)) continue;
    const directions = {
      start: vector(a.anchor, a.lead), end: vector(b.lead, b.anchor), avoidSegments: walls, extraX, extraY, maxVisited: 5000, budget,
    };
    const route = orthogonalRoute(a.lead, b.lead, boxes, GAP, [], directions);
    if (!route) continue;
    const consider = (route) => {
      const candidate = simplifyPoints([a.anchor, ...route, b.anchor]), quality = routeQuality(candidate);
      if (!Number.isFinite(quality.score)) return false;
      const ownShields = [endpointShield({ ...edge, points: candidate }, true),
        endpointShield({ ...edge, points: candidate }, false)].filter(Boolean);
      const reservation = ownLabel && labelOnRoute(svg, candidate, ownLabel.box, [...boxes, ...ownShields], walls);
      if (ownLabel && !reservation) return false;
      const score = quality.score + (a.penalty + b.penalty) * 0.2;
      if (!best || score < best.score) best = { points: candidate, reservation, score };
      return true;
    };
    if (consider(route) || !ownLabel || best || ++labelSearches > 1) continue;
    const label = ownLabel.box, center = { x: (label.x + label.right) / 2, y: (label.y + label.bottom) / 2 }, candidates = [];
    // 路径可走但放不下标签时，联合搜索文字走廊；不把标签留给碰撞后的兜底。
    for (let row = -3; row <= 3; row++) for (let column = -3; column <= 3; column++) {
      const p = { x: center.x + column * (label.width / 2 + GAP), y: center.y + row * (label.height + GAP) };
      const box = { x: p.x - label.width / 2 - 7, right: p.x + label.width / 2 + 7,
        y: p.y - label.height / 2 - 7, bottom: p.y + label.height / 2 + 7 };
      if (boxes.some((b) => overlaps(box, b)) || walls.some(([p, q]) => segmentBlocked(p, q, [box], 2))) continue;
      candidates.push({ ...p, score: norm(a.lead, p) + norm(p, b.lead) });
    }
    candidates.sort((a, b) => a.score - b.score);
    for (const p of candidates.slice(0, 3)) for (const horizontal of [true, false]) {
      const from = horizontal ? { x: p.x - 8, y: p.y } : { x: p.x, y: p.y - 8 };
      const to = horizontal ? { x: p.x + 8, y: p.y } : { x: p.x, y: p.y + 8 };
      const forward = norm(a.lead, from) + norm(to, b.lead) <= norm(a.lead, to) + norm(from, b.lead);
      const enter = forward ? from : to, exit = forward ? to : from, v = vector(enter, exit);
      if (blocked(enter, exit)) continue;
      const before = orthogonalRoute(a.lead, enter, boxes, GAP, [], { ...directions, end: v });
      const after = orthogonalRoute(exit, b.lead, boxes, GAP, [], { ...directions, start: v });
      if (before && after) consider([...before, ...after]);
    }
  }
  return best;
}

export function avoidEdgeCrossings(svg) {
  let edges = collectEdges(svg), pairs = crossingPairs(edges), changed = 0;
  const initial = pairs.length;
  // 每轮只提交真实减少交叉的候选；最多两轮，不在不可解布局上无界兜圈。
  for (let pass = 0; pass < 2 && pairs.length; pass++) {
    let progress = false;
    const count = new Map();
    for (const pair of pairs) for (const id of [pair.a, pair.b]) count.set(id, (count.get(id) || 0) + 1);
    const order = [...count].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    for (const id of order) {
      if (!pairs.some((p) => p.a === id || p.b === id)) continue;
      const edge = edges.find((e) => e.id === id), model = geometry(svg);
      const plan = planAvoidance(svg, edge, edges, model, pass > 0);
      if (!plan) continue;
      const original = edge.element.getAttribute("d"), data = edge.element.getAttribute("data-points");
      writePoints(svg, edge.element, plan.points);
      const updated = collectEdges(svg), next = crossingPairs(updated);
      // 圆角后的真实曲线再检一遍；控制折线安全不代表圆弧安全。
      if (next.length >= pairs.length) {
        edge.element.setAttribute("d", original);
        if (data === null) edge.element.removeAttribute("data-points"); else edge.element.setAttribute("data-points", data);
        continue;
      }
      applyReservation(svg, edge, plan.reservation);
      edge.element.setAttribute("data-gptm-crossing-rerouted", "true");
      edges = updated; pairs = next; changed++; progress = true;
    }
    if (!progress && pass > 0) break;
  }
  if (changed) {
    // 避障改变了可用走廊，旧路径可能仍绕着已移走的边/标签；重新压缩受处理的边。
    // 不重排本来正常的路径，只提交交叉数不增加且完整长度/折弯评分更低的候选。
    for (const id of edges.filter((edge) => edge.element.hasAttribute("data-gptm-native-rerouted")
      || edge.element.hasAttribute("data-gptm-crossing-rerouted")).map((edge) => edge.id)) {
      const edge = edges.find((e) => e.id === id), raw = readPoints(edge.element);
      if (!raw) continue;
      const oldScore = routeQuality(raw.map((p) => inSvg(svg, edge.element, p))).score;
      const plan = planAvoidance(svg, edge, edges, geometry(svg), true);
      if (!plan || plan.score >= oldScore - 1) continue;
      const original = edge.element.getAttribute("d"), data = edge.element.getAttribute("data-points");
      writePoints(svg, edge.element, plan.points);
      const updated = collectEdges(svg), next = crossingPairs(updated);
      if (next.length > pairs.length) {
        edge.element.setAttribute("d", original); edge.element.setAttribute("data-points", data); continue;
      }
      applyReservation(svg, edge, plan.reservation);
      edges = updated; pairs = next;
    }
  }
  svg.setAttribute("data-gptm-crossings-before", String(initial));
  svg.setAttribute("data-gptm-crossing-routes", String(changed));
  return { before: initial, remaining: pairs.length, changed };
}

export function recordCrossings(svg) {
  const edges = collectEdges(svg), pairs = crossingPairs(edges);
  for (const edge of edges) edge.element.removeAttribute("data-gptm-crossing");
  for (const pair of pairs) for (const id of [pair.a, pair.b]) {
    edges.find((e) => e.id === id).element.setAttribute("data-gptm-crossing", "true");
  }
  svg.setAttribute("data-gptm-crossings", String(pairs.length));
  svg.setAttribute("data-gptm-checked-edges", String(edges.length));
  svg.setAttribute("data-gptm-routing-status", !edges.length ? "not-applicable" : pairs.length ? "unresolved" : "clear");
  svg.setAttribute("data-gptm-routing-reason", !pairs.length ? "" : exceedsPlanarEdgeBound(edges)
    ? "non-planar-edge-bound" : svg.getAttribute("data-gptm-routing-budget-exhausted") === "true" ? "search-budget" : "fixed-obstacles");
  return pairs;
}

function snapshotAttributes(element) {
  return [...element.attributes].map((attribute) => [attribute.name, attribute.value]);
}

function restoreAttributes(element, attributes) {
  for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
  for (const [key, value] of attributes) element.setAttribute(key, value);
}

function rerouteConflictGroup(svg) {
  const original = collectEdges(svg), pairs = crossingPairs(original);
  const ids = new Set(pairs.flatMap((pair) => [pair.a, pair.b]));
  if (!ids.size || ids.size > 40) return false;
  const movable = original.filter((e) => ids.has(e.id) && e.source && e.target && e.source !== e.target && !e.shared);
  const fixed = original.filter((e) => !movable.includes(e));
  const saved = [...movable.map((e) => e.element), ...geometry(svg).labels.map((l) => l.element)]
    .map((element) => ({ element, attributes: snapshotAttributes(element) }));
  const restore = () => saved.forEach(({ element, attributes }) => restoreAttributes(element, attributes));
  let bestCount = pairs.length, bestState;
  const length = (edge) => edge.element.getTotalLength();
  const orders = [
    movable.slice().sort((a, b) => length(a) - length(b)),
    movable.slice().sort((a, b) => length(b) - length(a)),
  ];
  for (const order of orders) {
    restore();
    const placed = fixed.slice(), pending = new Set(movable.map((e) => e.id));
    for (const edge of order) {
      const model = geometry(svg);
      // 尚未规划的标签不占旧位置；每次提交后立刻更新DOM，下一条边读取新位置。
      model.labels = model.labels.filter((l) => l.id === edge.id || !pending.has(l.id));
      const plan = planAvoidance(svg, edge, [...placed, edge], model, true);
      if (plan) {
        writePoints(svg, edge.element, plan.points); applyReservation(svg, edge, plan.reservation);
        edge.element.setAttribute("data-gptm-crossing-rerouted", "true");
      }
      pending.delete(edge.id);
      placed.push(collectEdges(svg).find((e) => e.id === edge.id));
    }
    const next = crossingPairs(collectEdges(svg)).length;
    if (next < bestCount) {
      bestCount = next;
      bestState = saved.map(({ element }) => ({ element, attributes: snapshotAttributes(element) }));
    }
  }
  restore();
  if (!bestState) return false;
  bestState.forEach(({ element, attributes }) => restoreAttributes(element, attributes));
  return true;
}

function translateInRoot(svg, element, dx, dy) {
  const a = fromSvg(svg, element.parentElement, { x: 0, y: 0 });
  const b = fromSvg(svg, element.parentElement, { x: dx, y: dy });
  element.setAttribute("transform", `translate(${b.x - a.x},${b.y - a.y}) ${element.getAttribute("transform") || ""}`.trim());
}

export function expandFlatSpacing(svg, factor) {
  const { nodes, labels } = geometry(svg), edges = collectEdges(svg);
  // 簇边框、组合状态、注释的所属关系没有统一元数据；不单独移动子节点破坏容器。
  if (!nodes.length || svg.querySelector("g.cluster,g.note,.c4-boundary")
      || nodes.some((n) => n.element.parentElement.closest("g.node"))
      || edges.some((e) => !e.source || !e.target || !triangleCompatible(e.element))) return false;
  const origin = { x: Math.min(...nodes.map((n) => n.box.x)), y: Math.min(...nodes.map((n) => n.box.y)) };
  const map = (p) => ({ x: origin.x + (p.x - origin.x) * factor, y: origin.y + (p.y - origin.y) * factor });
  const shifts = new Map(nodes.map((node) => {
    const p = { x: (node.box.x + node.box.right) / 2, y: (node.box.y + node.box.bottom) / 2 }, q = map(p);
    return [node.id, { x: q.x - p.x, y: q.y - p.y }];
  }));
  for (const edge of edges) {
    if (!shifts.has(edge.source) || !shifts.has(edge.target)) return false;
    if (!edge.controls || edge.controls.length < 2) return false;
  }
  for (const node of nodes) {
    const shift = shifts.get(node.id);
    translateInRoot(svg, node.element, shift.x, shift.y);
  }
  for (const label of labels) {
    const p = { x: (label.box.x + label.box.right) / 2, y: (label.box.y + label.box.bottom) / 2 }, q = map(p);
    translateInRoot(svg, label.element, q.x - p.x, q.y - p.y);
  }
  for (const edge of edges) {
    const raw = edge.controls, points = raw.map(map);
    for (const start of [true, false]) {
      const i = start ? 0 : points.length - 1, j = start ? 1 : points.length - 2;
      const shift = shifts.get(start ? edge.source : edge.target);
      points[i] = { x: raw[i].x + shift.x, y: raw[i].y + shift.y };
      if (points.length > 2) {
        if (Math.abs(raw[i].x - raw[j].x) < 0.1) points[j].x = points[i].x;
        if (Math.abs(raw[i].y - raw[j].y) < 0.1) points[j].y = points[i].y;
      }
    }
    writePoints(svg, edge.element, points);
    edge.element.removeAttribute("data-gptm-label-x"); edge.element.removeAttribute("data-gptm-label-y");
  }
  return true;
}

export function resolveEdgeCrossings(svg, repairConnections) {
  // 确定性的网格展开预算，防止复杂密图把同步渲染阻塞数十秒；未解结果仍如实输出。
  ROUTING_BUDGETS.set(svg, { remaining: 30000 });
  const first = avoidEdgeCrossings(svg);
  if (first.changed) { repairConnections(svg); placeEdgeLabels(svg); }
  let remaining = crossingPairs(collectEdges(svg)).length;
  if (remaining && !exceedsPlanarEdgeBound(collectEdges(svg)) && rerouteConflictGroup(svg)) {
    repairConnections(svg); placeEdgeLabels(svg);
    remaining = crossingPairs(collectEdges(svg)).length;
  }
  let expanded = 1;
  if (remaining > 0 && !exceedsPlanarEdgeBound(collectEdges(svg))) {
    const baseline = svg.cloneNode(true);
    const restore = () => {
      for (const attribute of [...svg.attributes]) svg.removeAttribute(attribute.name);
      for (const attribute of baseline.attributes) svg.setAttribute(attribute.name, attribute.value);
      svg.replaceChildren(...[...baseline.childNodes].map((node) => node.cloneNode(true)));
    };
    // 仅在确有交叉时尝试有限的间距扩张；节点/文字尺寸不缩放，失败完整回退。
    for (const factor of [1.45, 2]) {
      restore();
      if (!expandFlatSpacing(svg, factor)) break;
      repairConnections(svg); placeEdgeLabels(svg);
      avoidEdgeCrossings(svg);
      rerouteConflictGroup(svg);
      repairConnections(svg); placeEdgeLabels(svg);
      const count = crossingPairs(collectEdges(svg)).length;
      if (count < remaining) { remaining = count; expanded = factor; break; }
    }
    if (expanded === 1) restore();
  }
  svg.setAttribute("data-gptm-crossings-before", String(first.before));
  svg.setAttribute("data-gptm-spacing-factor", String(expanded));
  svg.setAttribute("data-gptm-routing-budget-exhausted", String(ROUTING_BUDGETS.get(svg).remaining <= 0));
  return { ...first, remaining, expanded };
}

function exceedsPlanarEdgeBound(edges) {
  const vertices = new Set(), links = new Set();
  for (const edge of edges) {
    if (!edge.source || !edge.target) return false;
    vertices.add(edge.source); vertices.add(edge.target);
    if (edge.source !== edge.target) links.add([edge.source, edge.target].sort().join("\0"));
  }
  return vertices.size >= 3 && links.size > 3 * vertices.size - 6;
}

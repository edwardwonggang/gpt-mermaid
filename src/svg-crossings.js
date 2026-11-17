/*
 * 职责：对实际 SVG 连线做交叉检测，并对有身份归属的边做通用避障。
 * 调用方：render.js 的几何后处理；依赖：SVG 测量、同一套正交寻路及标签放置。
 * 红线：不按图名/文字特判，不隐藏路径，不改连接关系；共享端点只按结构化身份豁免。
 */
import { segmentIntersection } from "./path-intersections.js";
import { inSvg, fromSvg, boundsInSvg, nodeShape, readPoints, writePoints,
  orthogonalRoute, routeQuality, simplifyPoints, segmentBlocked, labelOnRoute } from "./svg-routing.js";
import { placeEdgeLabels } from "./svg-labels.js";
import { planarLayoutCandidates } from "./planar-layout.js";

const EDGE_SELECTOR = ".flowchart-link,.transition,.relation,.relationshipLine,[data-gptm-source]";
const GAP = 12;
const ROUTING_BUDGETS = new WeakMap();
const SEGMENT_DATA = new WeakMap();
const ROUTING_VISIT_BUDGET = 18000;
const MAX_ARROW_REPAIR_EDGES = 36;
const MAX_GROUP_REROUTE_EDGES = 24;
const MAX_SPACING_EXPANSION_EDGES = 24;
const MAX_PLANAR_LAYOUT_EDGES = 24;
const norm = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const vector = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
// 退化曲线和折点简化会产生重复点；零长度段没有几何意义，还会把相邻重复点
// 错当成非相邻线段接触，制造 self-intersection 假阳性。
const segments = (points) => points.slice(1).flatMap((p, i) =>
  p.move || norm(points[i], p) < 1e-7 ? [] : [[points[i], p]]);
const boxOf = (points) => ({ x: Math.min(...points.map((p) => p.x)), y: Math.min(...points.map((p) => p.y)),
  right: Math.max(...points.map((p) => p.x)), bottom: Math.max(...points.map((p) => p.y)) });
const overlaps = (a, b) => a.x <= b.right && a.right >= b.x && a.y <= b.bottom && a.bottom >= b.y;

function segmentData(edge) {
  const cached = SEGMENT_DATA.get(edge);
  if (cached?.points === edge.points) return cached;
  const list = segments(edge.points);
  const data = {
    points: edge.points,
    list,
    boxes: list.map(([p, q]) => boxOf([p, q])),
  };
  SEGMENT_DATA.set(edge, data);
  return data;
}

function pointMapper(svg, element) {
  try {
    const elementMatrix = element.getScreenCTM?.();
    const svgInverse = svg.getScreenCTM?.()?.inverse?.();
    if (elementMatrix && svgInverse && typeof DOMPoint === "function") {
      return (point) => new DOMPoint(point.x, point.y)
        .matrixTransform(elementMatrix)
        .matrixTransform(svgInverse);
    }
  } catch {}
  return (point) => inSvg(svg, element, point);
}

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

// getPointAtLength() 的均匀网格会跨过很长近似直线中的小折返。
// 这里只提取命令边界作为采样提示，真实几何仍由浏览器测量。
function pathCommandHints(element) {
  const data = element.getAttribute?.("d") || "";
  const tokens = data.match(/[MLHVCSQTAZmlhvcsqtaz]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g) || [];
  const counts = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6, S: 4, T: 2, A: 7, Z: 0 };
  let x = 0, y = 0, startX = 0, startY = 0, total = 0, command = null, i = 0, started = false;
  const hints = [];
  const endpoint = (values, relative) => ({
    x: values[0] + (relative ? x : 0),
    y: values[1] + (relative ? y : 0),
  });
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    if (!command) return [];
    const type = command.toUpperCase(), relative = command !== type;
    if (type === "Z") {
      total += Math.hypot(startX - x, startY - y);
      x = startX; y = startY; command = null;
      hints.push({ position: total, move: false });
      continue;
    }
    const count = counts[type];
    if (!count || i + count > tokens.length) break;
    const values = tokens.slice(i, i + count).map(Number);
    if (values.some((value) => !Number.isFinite(value))) return [];
    i += count;
    let nx = x, ny = y;
    if (type === "M" || type === "L") {
      const point = endpoint(values, relative); nx = point.x; ny = point.y;
      if (type === "M") {
        startX = nx; startY = ny;
        if (started) hints.push({ position: total, move: true });
        started = true;
        command = relative ? "l" : "L";
        x = nx; y = ny;
        continue;
      }
    } else if (type === "H") {
      nx = values[0] + (relative ? x : 0);
    } else if (type === "V") {
      ny = values[0] + (relative ? y : 0);
    } else {
      // Q/C/S/T/A 的末两个数值是终点；这里只取终点作为采样提示。
      const point = endpoint(values.slice(-2), relative); nx = point.x; ny = point.y;
    }
    total += Math.hypot(nx - x, ny - y);
    hints.push({ position: total, move: false });
    x = nx; y = ny;
  }
  return hints.filter((hint) => Number.isFinite(hint.position) && hint.position >= 0);
}

// 真实曲线采样后按误差收敛，不能拿 data-points 控制折线冒充最终显示路径。
export function sampleEdge(svg, element) {
  const mapPoint = pointMapper(svg, element);
  const explicit = flattenPath(element);
  if (explicit) return explicit.map((point) => {
    const p = mapPoint(point);
    return { x: p.x, y: p.y, ...(point.move ? { move: true } : {}) };
  });
  const length = element.getTotalLength();
  if (!Number.isFinite(length) || length <= 0) return [];
  // 低密度均匀种子 + 路径命令边界 + 区间探针，再由 reduce() 按弦误差保留
  // 折点。总点数有确定性上限，不会因超长路径无界采样。
  const MAX_SAMPLE_POINTS = 32768;
  const hints = pathCommandHints(element);
  const hintPositions = [...new Set(hints.map((hint) => hint.position)
    .filter((position) => Number.isFinite(position) && position >= 0 && position <= length))];
  const positions = new Set([0, length]);
  const addPosition = (value) => {
    if (positions.size >= MAX_SAMPLE_POINTS) return;
    const position = Math.max(0, Math.min(length, Number(value)));
    if (Number.isFinite(position)) positions.add(position);
  };
  const baseSteps = Math.min(4096, Math.max(32, Math.ceil(length / 64)),
    Math.max(8, MAX_SAMPLE_POINTS - hintPositions.length));
  for (let i = 0; i <= baseSteps; i++) addPosition(length * i / baseSteps);
  for (const position of hintPositions) addPosition(position);
  const seed = [...positions].sort((a, b) => a - b);
  for (let i = 1; i < seed.length && positions.size < MAX_SAMPLE_POINTS; i++) {
    const from = seed[i - 1], to = seed[i];
    for (const fraction of [.25, .5, .75]) addPosition(from + (to - from) * fraction);
  }
  const ordered = [...positions].sort((a, b) => a - b);
  const movePositions = new Set(hints.filter((hint) => hint.move).map((hint) => hint.position));
  const input = ordered.map((position) => {
    const p = mapPoint(element.getPointAtLength(position));
    return { x: p.x, y: p.y, ...(movePositions.has(position) ? { move: true } : {}) };
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
  // getPointAtLength() 只返回全局弧长对应的点；多个子路径之间的跳变必须显式
  // 切成 move 段，否则会把两个不连续子路径用一条假线段连起来。
  const jumpLimit = Math.max(4, length / 4096);
  const ranges = [];
  let rangeStart = 0;
  for (let i = 1; i < input.length; i++) {
    if (input[i].move || norm(input[i - 1], input[i]) > jumpLimit) {
      ranges.push([rangeStart, i - 1]);
      rangeStart = i;
    }
  }
  ranges.push([rangeStart, input.length - 1]);
  const result = [];
  for (const [lo, hi] of ranges) {
    const part = reduce(lo, hi);
    if (result.length && part.length) part[0] = { ...part[0], move: true };
    result.push(...part);
  }
  return result;
}

function edgeElements(svg) {
  // C4 关系一旦建立了 expected 清单，就只能检查已结构化归属的关系线；
  // 否则装饰性箭头会被混入 checkedEdges，造成“部分检查但看似通过”。
  const c4Expected = Number(svg.getAttribute?.("data-gptm-c4-expected")) || 0;
  return [...svg.querySelectorAll(EDGE_SELECTOR)]
    .filter((element) => !element.closest("defs,marker") && typeof element.getTotalLength === "function"
      && (!c4Expected || element.getAttribute("data-gptm-c4-relation") === "true"));
}

function edgeSnapshot(svg, element, semanticNodes) {
  const points = sampleEdge(svg, element);
  if (points.length < 2) return null;
  const mapPoint = pointMapper(svg, element);
  const source = element.dataset.gptmSource || semanticNodes.get(element.dataset.source);
  const target = element.dataset.gptmTarget || semanticNodes.get(element.dataset.target);
  if (source && target) {
    element.setAttribute("data-gptm-source", source); element.setAttribute("data-gptm-target", target);
  }
  return { element, id: element.dataset.id || element.id, points,
    controls: readPoints(element)?.map((p) => { const q = mapPoint(p); return { x: q.x, y: q.y }; }),
    source, target,
    shared: element.dataset.gptmSharedTip, box: boxOf(points) };
}

function semanticNodes(svg) {
  return new Map([...svg.querySelectorAll("g.node[data-id]")].map((node) => [node.dataset.id, node.id]));
}

export function collectEdges(svg) {
  const nodes = semanticNodes(svg);
  return edgeElements(svg).map((element) => edgeSnapshot(svg, element, nodes)).filter(Boolean);
}

/**
 * 一次 SVG 后处理共享同一份边/节点/标签快照。
 * 路径端点变化时只刷新指定边；节点移动或整棵 SVG 回滚时显式失效。
 */
function createRoutingContext(svg) {
  const nodes = semanticNodes(svg);
  let edges = null;
  let model = null;
  let edgeById = new Map();
  let labelById = new Map();

  const getEdges = () => {
    if (edges) return edges;
    edges = edgeElements(svg).map((element) => edgeSnapshot(svg, element, nodes)).filter(Boolean);
    edgeById = new Map(edges.map((edge) => [edge.id, edge]));
    return edges;
  };

  const getModel = () => {
    if (model) return model;
    model = geometry(svg);
    labelById = new Map(model.labels.map((label) => [label.id, label]));
    return model;
  };

  return {
    edges: getEdges,
    model: getModel,
    findEdge(id) { getEdges(); return edgeById.get(id); },
    labelFor(id) { getModel(); return labelById.get(id); },
    refreshEdge(id) {
      if (!edges) return null;
      const index = edges.findIndex((edge) => edge.id === id);
      if (index < 0) return null;
      const fresh = edgeSnapshot(svg, edges[index].element, nodes);
      if (fresh) {
        edges[index] = fresh;
        edgeById.set(id, fresh);
      } else {
        edges.splice(index, 1);
        edgeById.delete(id);
      }
      return fresh;
    },
    invalidateModel() {
      model = null;
      labelById = new Map();
    },
    invalidateAll() {
      edges = null;
      model = null;
      edgeById = new Map();
      labelById = new Map();
    },
  };
}

function allowedJunction(a, b, hit) {
  if (a.shared && a.shared === b.shared && a.target && b.target && a.target === b.target) {
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
      // 只允许两条边在同一个结构节点的同一个端点真正相接；2 单位半径会
      // 把端点附近的真实交叉误当成节点连接。
      if (ownerA && ownerA === ownerB && hit.kind === "touch"
          && norm(p, hit) < 0.05 && norm(q, hit) < 0.05) return true;
    }
  }
  return false;
}

function selfIntersectionHits(points) {
  const list = segments(points), hits = [];
  const start = points[0], end = points.at(-1);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const [p, q] = list[i], [r, s] = list[j];
    if (!overlaps(boxOf([p, q]), boxOf([r, s]))) continue;
    const hit = segmentIntersection(p, q, r, s);
    if (!hit) continue;
    // 相邻线段共享一个普通折点不是自交；但反向重叠仍是回走。
    if (j === i + 1 && hit.kind === "touch") continue;
    // 闭合路径首尾在同一个点相接不是自交；真正回到该点的非相邻线段仍会命中。
    if (hit.kind === "touch" && norm(start, end) < 0.05 && norm(start, hit) < 0.05) continue;
    if (!hits.some((other) => norm(other, hit) < 1)) hits.push(hit);
  }
  return hits;
}

export function crossingPairs(edges) {
  const pairs = [];
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const a = edges[i], b = edges[j];
    if (!overlaps(a.box, b.box)) continue;
    const hits = [];
    const dataA = segmentData(a), dataB = segmentData(b);
    for (let ai = 0; ai < dataA.list.length; ai++) for (let bi = 0; bi < dataB.list.length; bi++) {
      const [p, q] = dataA.list[ai], [r, s] = dataB.list[bi];
      if (!overlaps(dataA.boxes[ai], dataB.boxes[bi])) continue;
      const hit = segmentIntersection(p, q, r, s);
      if (hit && !allowedJunction(a, b, hit) && !hits.some((h) => norm(h, hit) < 1)) hits.push(hit);
    }
    if (hits.length) pairs.push({ a: a.id, b: b.id, hits });
  }
  for (const edge of edges) {
    const hits = selfIntersectionHits(edge.points);
    if (hits.length) pairs.push({ a: edge.id, b: edge.id, hits, self: true });
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

function coveredArrow(svg, edge, model) {
  if (!triangleCompatible(edge.element)) return false;
  for (const start of [true, false]) {
    if (!edge.element.hasAttribute(start ? "marker-start" : "marker-end")) continue;
    const owner = model.nodes.find((n) => n.id === (start ? edge.source : edge.target));
    if (!owner) continue;
    const shape = nodeShape(owner.element);
    const shapes = shape instanceof SVGGeometryElement ? [shape] : [...shape.querySelectorAll("path,rect,circle,ellipse,polygon")];
    const pathLength = edge.element.getTotalLength();
    const tip = inSvg(svg, edge.element, edge.element.getPointAtLength(start ? 0 : pathLength));
    const q = inSvg(svg, edge.element, edge.element.getPointAtLength(start ? Math.min(.02, pathLength) : Math.max(0, pathLength - .02)));
    const magnitude = norm(tip, q);
    if (!magnitude) continue;
    const v = { x: (q.x - tip.x) / magnitude, y: (q.y - tip.y) / magnitude };
    const depth = Math.min(18, (Number(edge.element.dataset.gptmPortSpan) || Infinity) * .875,
      Math.max(11, Math.max(svg.viewBox.baseVal.width, svg.viewBox.baseVal.height) / 100));
    for (const t of [.15, .4, .8]) for (const across of [-.8, 0, .8]) {
      const p = { x: tip.x + v.x * depth * t - v.y * depth * .4 * t * across,
        y: tip.y + v.y * depth * t + v.x * depth * .4 * t * across };
      if (shapes.some(shape => {
        const q = fromSvg(svg, shape, p), style = getComputedStyle(shape);
        return style.fill !== "none" && shape.isPointInFill(q) || style.stroke !== "none" && shape.isPointInStroke(q);
      })) return true;
    }
  }
  return false;
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
  const labels = [
    ...svg.querySelectorAll("g.edgeLabel"),
    ...svg.querySelectorAll("[data-gptm-c4-boundary] > text"),
  ].filter((l) => String(l.textContent || "").trim()).map((element) => ({
    element, id: element.querySelector("[data-id]")?.dataset.id || element.dataset.id, box: boundsInSvg(svg, element),
  }));
  return { nodes, labels };
}

function applyReservation(svg, edge, reservation, context = null) {
  if (!reservation) return;
  edge.element.setAttribute("data-gptm-label-x", String(reservation.x));
  edge.element.setAttribute("data-gptm-label-y", String(reservation.y));
  const label = context ? context.labelFor(edge.id) : geometry(svg).labels.find((item) => item.id === edge.id);
  if (!label) return;
  translateInRoot(svg, label.element,
    reservation.x - (label.box.x + label.box.right) / 2,
    reservation.y - (label.box.y + label.box.bottom) / 2);
  // 后续边必须看到移动后的真实标签位置；只重测这一个标签，避免全图几何快照失效。
  label.box = boundsInSvg(svg, label.element);
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

export function avoidEdgeCrossings(svg, context = createRoutingContext(svg)) {
  let edges = context.edges(), pairs = crossingPairs(edges), changed = 0;
  const initial = pairs.length;
  // 每轮只提交真实减少交叉的候选；最多两轮，不在不可解布局上无界兜圈。
  for (let pass = 0; pass < 2 && pairs.length; pass++) {
    let progress = false;
    const count = new Map();
    for (const pair of pairs) for (const id of [pair.a, pair.b]) count.set(id, (count.get(id) || 0) + 1);
    const order = [...count].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    for (const id of order) {
      if (!pairs.some((p) => p.a === id || p.b === id)) continue;
      const edge = context.findEdge(id), model = context.model();
      if (!edge) continue;
      const plan = planAvoidance(svg, edge, edges, model, pass > 0);
      if (!plan) continue;
      const original = edge.element.getAttribute("d"), data = edge.element.getAttribute("data-points");
      writePoints(svg, edge.element, plan.points);
      context.refreshEdge(id);
      const updated = context.edges(), next = crossingPairs(updated);
      // 圆角后的真实曲线再检一遍；控制折线安全不代表圆弧安全。
      if (next.length >= pairs.length) {
        edge.element.setAttribute("d", original);
        if (data === null) edge.element.removeAttribute("data-points"); else edge.element.setAttribute("data-points", data);
        context.refreshEdge(id);
        continue;
      }
      applyReservation(svg, edge, plan.reservation, context);
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
      const edge = context.findEdge(id);
      if (!edge) continue;
      const raw = readPoints(edge.element);
      if (!raw) continue;
      const oldScore = routeQuality(raw.map((p) => inSvg(svg, edge.element, p))).score;
      const plan = planAvoidance(svg, edge, edges, context.model(), true);
      if (!plan || plan.score >= oldScore - 1) continue;
      const original = edge.element.getAttribute("d"), data = edge.element.getAttribute("data-points");
      writePoints(svg, edge.element, plan.points);
      context.refreshEdge(id);
      const updated = context.edges(), next = crossingPairs(updated);
      if (next.length > pairs.length) {
        if (original === null) edge.element.removeAttribute("d"); else edge.element.setAttribute("d", original);
        if (data === null) edge.element.removeAttribute("data-points"); else edge.element.setAttribute("data-points", data);
        context.refreshEdge(id);
        continue;
      }
      applyReservation(svg, edge, plan.reservation, context);
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
    edges.find((e) => e.id === id)?.element.setAttribute("data-gptm-crossing", "true");
  }
  const c4Expected = Number(svg.getAttribute?.("data-gptm-c4-expected")) || 0;
  const storedSkipped = Number(svg.getAttribute?.("data-gptm-skipped-edges")) || 0;
  const expected = c4Expected || edges.length;
  const skipped = c4Expected ? Math.max(storedSkipped, c4Expected - edges.length) : 0;
  svg.setAttribute("data-gptm-crossings", String(pairs.length));
  svg.setAttribute("data-gptm-checked-edges", String(edges.length));
  svg.setAttribute("data-gptm-expected-edges", String(expected));
  svg.setAttribute("data-gptm-skipped-edges", String(skipped));
  const incomplete = skipped > 0;
  svg.setAttribute("data-gptm-routing-status", incomplete ? "unresolved"
    : !edges.length ? "not-applicable" : pairs.length ? "unresolved" : "clear");
  svg.setAttribute("data-gptm-routing-reason", incomplete ? "incomplete-relations"
    : !pairs.length ? "" : pairs.some((pair) => pair.self) ? "self-intersection" : exceedsPlanarEdgeBound(edges)
      ? "non-planar-edge-bound" : svg.getAttribute("data-gptm-routing-budget-exhausted") === "true" ? "search-budget"
        : svg.getAttribute("data-gptm-routing-limited") === "true" ? "complexity-cap" : "fixed-obstacles");
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

function tryPlanarLayout(svg, repairConnections) {
  const model = geometry(svg), edges = collectEdges(svg);
  if (svg.querySelector("g.cluster,g.note,.c4-boundary")
      || model.nodes.some((n) => n.element.parentElement.closest("g.node"))
      || edges.some((e) => e.shared || !e.source || !e.target)) return false;
  const candidates = planarLayoutCandidates(model.nodes, edges);
  if (!candidates.length) {
    svg.setAttribute("data-gptm-planar-layout-support", "unsupported");
    return false;
  }
  const baseline = svg.cloneNode(true);
  const restore = () => svg.replaceChildren(...[...baseline.childNodes].map((n) => n.cloneNode(true)));
  const layouts = [];
  for (const sourcePositions of candidates) for (const ratio of [.8, 1, 1.25]) for (let turn = 0; turn < 6; turn++) {
    const angle = turn * Math.PI / 6, positions = new Map([...sourcePositions].map(([id, p]) => [
      id, { x: (p.x * Math.cos(angle) - p.y * Math.sin(angle)) * ratio,
        y: p.x * Math.sin(angle) + p.y * Math.cos(angle) },
    ]));
    let scale = 180;
    const labelSpan = Math.max(60, ...model.labels.map((l) => Math.hypot(l.box.width, l.box.height)));
    for (let i = 0; i < model.nodes.length; i++) for (let j = i + 1; j < model.nodes.length; j++) {
      const a = model.nodes[i], b = model.nodes[j], p = positions.get(a.id), q = positions.get(b.id);
      scale = Math.max(scale, Math.min(((a.box.width + b.box.width) / 2 + labelSpan + 36) / Math.abs(p.x - q.x),
        ((a.box.height + b.box.height) / 2 + labelSpan + 36) / Math.abs(p.y - q.y)));
    }
    for (const edge of edges) {
      const a = positions.get(edge.source), b = positions.get(edge.target), v = vector(a, b), length2 = v.x * v.x + v.y * v.y;
      for (const node of model.nodes) {
        if (node.id === edge.source || node.id === edge.target) continue;
        const p = positions.get(node.id), t = Math.max(0, Math.min(1, ((p.x - a.x) * v.x + (p.y - a.y) * v.y) / length2));
        const distance = norm(p, { x: a.x + t * v.x, y: a.y + t * v.y });
        scale = Math.max(scale, (Math.hypot(node.box.width, node.box.height) / 2 + 20) / distance);
      }
    }
    const bounds = boxOf([...positions.values()]);
    layouts.push({ positions, scale, area: (bounds.right - bounds.x) * (bounds.bottom - bounds.y) * scale ** 2 });
  }
  layouts.sort((a, b) => a.area - b.area);
  for (const { positions, scale } of layouts.slice(0, 8)) {
    if (!Number.isFinite(scale) || scale > 5000) continue;
    restore();
    const current = geometry(svg), liveEdges = collectEdges(svg), boxes = new Map();
    const point = (id) => ({ x: (positions.get(id).x + 1) * scale + 24, y: (positions.get(id).y + 1) * scale + 24 });
    for (const node of current.nodes) {
      const p = point(node.id), dx = p.x - (node.box.x + node.box.right) / 2, dy = p.y - (node.box.y + node.box.bottom) / 2;
      translateInRoot(svg, node.element, dx, dy);
      boxes.set(node.id, { x: p.x - node.box.width / 2, y: p.y - node.box.height / 2,
        right: p.x + node.box.width / 2, bottom: p.y + node.box.height / 2, width: node.box.width, height: node.box.height });
    }
    for (const edge of liveEdges) {
      const a = point(edge.source), b = point(edge.target), v = vector(a, b), length = norm(a, b);
      const port = (center, box, sign, start) => {
        const t = Math.min(Math.abs(box.width / 2 / v.x), Math.abs(box.height / 2 / v.y));
        const oldAnchor = start ? edge.controls?.[0] : edge.controls?.at(-1), oldTip = start ? edge.points[0] : edge.points.at(-1);
        // 特殊语义marker原有留白沿新切线保留；不能用原布局控制端点盖掉偏移。
        const offset = !triangleCompatible(edge.element) && oldAnchor ? norm(oldAnchor, oldTip) : 0;
        return { x: center.x + sign * v.x * (t + offset / length), y: center.y + sign * v.y * (t + offset / length) };
      };
      writePoints(svg, edge.element, [port(a, boxes.get(edge.source), 1, true), port(b, boxes.get(edge.target), -1, false)]);
      edge.element.removeAttribute("data-gptm-label-x"); edge.element.removeAttribute("data-gptm-label-y");
    }
    repairConnections(svg);
    const plannedEdges = collectEdges(svg), plannedModel = geometry(svg), reserved = [];
    let valid = true;
    for (const label of plannedModel.labels.sort((a, b) => b.box.width - a.box.width)) {
      const edge = plannedEdges.find((e) => e.id === label.id);
      if (!edge) { valid = false; break; }
      const size = { ...label.box, x: (edge.points[0].x + edge.points.at(-1).x) / 2 - label.box.width / 2,
        y: (edge.points[0].y + edge.points.at(-1).y) / 2 - label.box.height / 2 };
      const walls = plannedEdges.filter((e) => e !== edge).flatMap((e) => segments(e.points));
      const barriers = [...boxes.values(), ...reserved,
        ...plannedEdges.flatMap(e => [endpointShield(e, true), endpointShield(e, false)]).filter(Boolean)];
      const position = labelOnRoute(svg, edge.points, size, barriers, walls);
      if (!position) { valid = false; break; }
      applyReservation(svg, edge, position); reserved.push(position.box);
    }
    if (valid && crossingPairs(collectEdges(svg)).length === 0) {
      // 候选现在也可能是环挂树/双环关节，不能再统一宣称 convex-cycle。
      svg.setAttribute("data-gptm-planar-layout", "structured-candidate");
      svg.setAttribute("data-gptm-planar-layout-support", "candidate");
      return true;
    }
  }
  restore();
  svg.setAttribute("data-gptm-planar-layout-support", "unsupported");
  return false;
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
  // 确定性的工作量预算 + 图规模门槛。两者都按结构计数，不依赖机器速度；
  // 被门槛截断时仍输出真实检查结果，并明确标记 complexity-cap。
  const budget = { remaining: ROUTING_VISIT_BUDGET };
  ROUTING_BUDGETS.set(svg, budget);
  const context = createRoutingContext(svg);
  const initialEdges = context.edges();
  let limited = initialEdges.length > MAX_ARROW_REPAIR_EDGES;
  let arrowRepairs = 0;
  const arrowEdges = [...initialEdges]
    .sort((a, b) => Number(b.element.hasAttribute("marker-end"))
      - Number(a.element.hasAttribute("marker-end")))
    .slice(0, MAX_ARROW_REPAIR_EDGES);
  for (const edge of arrowEdges) {
    if (budget.remaining <= 0) break;
    const model = context.model();
    if (!coveredArrow(svg, edge, model)) continue;
    const plan = planAvoidance(svg, edge, context.edges(), model, true);
    if (!plan) continue;
    const attributes = snapshotAttributes(edge.element);
    writePoints(svg, edge.element, plan.points);
    repairConnections(svg, edge.element);
    const updated = context.refreshEdge(edge.id);
    if (!updated || coveredArrow(svg, updated, model)) {
      restoreAttributes(edge.element, attributes);
      context.refreshEdge(edge.id);
      continue;
    }
    applyReservation(svg, edge, plan.reservation, context);
    edge.element.setAttribute("data-gptm-arrow-approach-repaired", "true");
    arrowRepairs++;
  }
  if (arrowRepairs) {
    placeEdgeLabels(svg);
    context.invalidateModel();
  }
  const first = avoidEdgeCrossings(svg, context);
  if (first.changed) {
    repairConnections(svg);
    context.invalidateAll();
    placeEdgeLabels(svg);
    context.invalidateModel();
  }
  let currentEdges = context.edges();
  let remaining = crossingPairs(currentEdges).length;
  if (remaining && currentEdges.length <= MAX_GROUP_REROUTE_EDGES
      && !exceedsPlanarEdgeBound(currentEdges) && rerouteConflictGroup(svg)) {
    repairConnections(svg); placeEdgeLabels(svg);
    context.invalidateAll();
    currentEdges = context.edges();
    remaining = crossingPairs(currentEdges).length;
  } else if (remaining && currentEdges.length > MAX_GROUP_REROUTE_EDGES) {
    limited = true;
  }
  let expanded = 1;
  if (remaining > 0 && currentEdges.length <= MAX_SPACING_EXPANSION_EDGES
      && !exceedsPlanarEdgeBound(currentEdges)) {
    const baseline = svg.cloneNode(true);
    const restore = () => {
      for (const attribute of [...svg.attributes]) svg.removeAttribute(attribute.name);
      for (const attribute of baseline.attributes) svg.setAttribute(attribute.name, attribute.value);
      svg.replaceChildren(...[...baseline.childNodes].map((node) => node.cloneNode(true)));
      context.invalidateAll();
    };
    // 仅在确有交叉时尝试有限的间距扩张；节点/文字尺寸不缩放，失败完整回退。
    for (const factor of [1.45, 2]) {
      restore();
      if (!expandFlatSpacing(svg, factor)) break;
      context.invalidateAll();
      repairConnections(svg); placeEdgeLabels(svg);
      context.invalidateAll();
      avoidEdgeCrossings(svg, context);
      rerouteConflictGroup(svg);
      repairConnections(svg); placeEdgeLabels(svg);
      context.invalidateAll();
      const count = crossingPairs(context.edges()).length;
      if (count < remaining) { remaining = count; expanded = factor; break; }
    }
    if (expanded === 1) restore();
  } else if (remaining > 0 && currentEdges.length > MAX_SPACING_EXPANSION_EDGES) {
    limited = true;
  }
  currentEdges = context.edges();
  if (remaining > 0 && currentEdges.length <= MAX_PLANAR_LAYOUT_EDGES
      && !exceedsPlanarEdgeBound(currentEdges) && tryPlanarLayout(svg, repairConnections)) {
    context.invalidateAll();
    placeEdgeLabels(svg);
    context.invalidateModel();
    remaining = crossingPairs(context.edges()).length;
  } else if (remaining > 0 && currentEdges.length > MAX_PLANAR_LAYOUT_EDGES) {
    limited = true;
  }
  svg.setAttribute("data-gptm-crossings-before", String(first.before));
  svg.setAttribute("data-gptm-spacing-factor", String(expanded));
  svg.setAttribute("data-gptm-arrow-approach-repairs", String(arrowRepairs));
  svg.setAttribute("data-gptm-routing-budget-exhausted", String(budget.remaining <= 0));
  svg.setAttribute("data-gptm-routing-limited", String(limited));
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

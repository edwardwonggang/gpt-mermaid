/*
 * 职责：在已布局 SVG 上整理流程端口、自环、短折弯和避障路径。
 * 调用方：render.js；依赖：结构化图数据、浏览器 SVG 几何。
 * 红线：不从边 ID 猜来源，不删除逻辑边；只有同方向同样式实线可共享末端。
 */
import { segmentIntersection } from "./path-intersections.js";
const NS = "http://www.w3.org/2000/svg";
const EPS = 0.05;
const PORT_GAP = 18;
const CLEARANCE = 10;
const BEND_COST = 22;
const near = (a, b) => Math.abs(a - b) < EPS;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function nodeShape(node) {
  return node.querySelector(":scope > .label-container, :scope > .outer-path, :scope > rect, :scope > circle, :scope > ellipse, :scope > polygon, :scope > path")
    || [...node.children].find((child) => child.localName === "g" && !child.classList.contains("label")
      && child.querySelector("path,rect,circle,ellipse,polygon"));
}

export function inSvg(svg, element, point) {
  return new DOMPoint(point.x, point.y).matrixTransform(element.getScreenCTM()).matrixTransform(svg.getScreenCTM().inverse());
}

export function fromSvg(svg, element, point) {
  return new DOMPoint(point.x, point.y).matrixTransform(svg.getScreenCTM()).matrixTransform(element.getScreenCTM().inverse());
}

export function boundsInSvg(svg, element) {
  const box = element.getBBox();
  const a = inSvg(svg, element, box);
  const b = inSvg(svg, element, { x: box.x + box.width, y: box.y + box.height });
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y),
    right: Math.max(a.x, b.x), bottom: Math.max(a.y, b.y) };
}

export function readPoints(edge) {
  try {
    const points = JSON.parse(atob(edge.getAttribute("data-points") || ""));
    return Array.isArray(points) && points.length >= 2
      && points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) ? points : null;
  } catch { return null; }
}

export function simplifyPoints(points) {
  const result = [];
  for (const point of points) {
    if (result.length && distance(result.at(-1), point) < EPS) continue;
    while (result.length >= 2) {
      const a = result.at(-2), b = result.at(-1);
      const cross = (b.x - a.x) * (point.y - b.y) - (b.y - a.y) * (point.x - b.x);
      const forward = (b.x - a.x) * (point.x - b.x) + (b.y - a.y) * (point.y - b.y);
      if (Math.abs(cross) > EPS || forward < 0) break;
      result.pop();
    }
    result.push({ x: point.x, y: point.y });
  }
  return result;
}

// 评价完整路径（包含端口引线），不能只评价两段独立寻路的结果。
// 反向重走不能靠删折点掩盖；自交/重复段候选必须被拒绝。
export function routeQuality(input) {
  const invalid = { length: Infinity, bends: 0, selfIntersections: 0, retraces: 0, score: Infinity };
  if (!Array.isArray(input) || input.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return invalid;
  const points = simplifyPoints(input);
  if (points.length < 2) return invalid;
  let length = 0, selfIntersections = 0, retraces = 0;
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], v = { x: b.x - a.x, y: b.y - a.y };
    length += distance(a, b);
    for (let j = i + 1; j < points.length; j++) {
      const c = points[j - 1], d = points[j], w = { x: d.x - c.x, y: d.y - c.y };
      const offset = { x: c.x - a.x, y: c.y - a.y }, determinant = cross(v, w);
      if (Math.abs(determinant) < EPS) {
        if (Math.abs(cross(offset, v)) > EPS) continue;
        const axis = Math.abs(v.x) > Math.abs(v.y) ? "x" : "y";
        const overlap = Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis]))
          - Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]));
        if (overlap > EPS) retraces++;
        else if (overlap >= -EPS && j > i + 1) selfIntersections++;
      } else if (j > i + 1) {
        const t = cross(offset, w) / determinant, u = cross(offset, v) / determinant;
        if (t >= -1e-7 && t <= 1 + 1e-7 && u >= -1e-7 && u <= 1 + 1e-7) selfIntersections++;
      }
    }
  }
  const bends = Math.max(0, points.length - 2);
  return { length, bends, selfIntersections, retraces,
    score: selfIntersections || retraces ? Infinity : length + bends * BEND_COST };
}

export function roundedPath(input, radius = 7) {
  const points = simplifyPoints(input);
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const r = Math.min(radius, distance(a, b) / 2, distance(b, c) / 2);
    const before = { x: b.x + (a.x - b.x) * r / distance(a, b), y: b.y + (a.y - b.y) * r / distance(a, b) };
    const after = { x: b.x + (c.x - b.x) * r / distance(b, c), y: b.y + (c.y - b.y) * r / distance(b, c) };
    d += `L${before.x},${before.y}Q${b.x},${b.y} ${after.x},${after.y}`;
  }
  return `${d}L${points.at(-1).x},${points.at(-1).y}`;
}

export function writePoints(svg, edge, rootPoints) {
  const points = simplifyPoints(rootPoints).map((p) => fromSvg(svg, edge, p)).map(({ x, y }) => ({ x, y }));
  edge.setAttribute("data-points", btoa(JSON.stringify(points)));
  edge.setAttribute("d", roundedPath(points));
}

export function segmentBlocked(a, b, boxes, pad = 0) {
  return boxes.some((box) => {
    // Liang–Barsky 对线段求交；支持原始斜线，不能只检测端点。
    let lo = 0, hi = 1;
    for (const [p, q] of [
      [-(b.x - a.x), a.x - box.x + pad - EPS],
      [b.x - a.x, box.right + pad - a.x - EPS],
      [-(b.y - a.y), a.y - box.y + pad - EPS],
      [b.y - a.y, box.bottom + pad - a.y - EPS],
    ]) {
      if (Math.abs(p) < 1e-9) { if (q < 0) return false; }
      else if (p < 0) lo = Math.max(lo, q / p);
      else hi = Math.min(hi, q / p);
    }
    return lo <= hi;
  });
}

function clearRoute(points, boxes, pad = 0) {
  return points.slice(1).every((p, i) => !segmentBlocked(points[i], p, boxes, pad));
}

// 确定性的正交可见网格，路径代价同时考虑距离与弯折；不移动节点掩盖穿框。
export function orthogonalRoute(start, end, boxes, clearance = CLEARANCE, occupied = [], directions = {}) {
  const xs = [...new Set([start.x, end.x, ...(directions.extraX || []), ...boxes.flatMap((b) => [b.x - clearance, b.right + clearance])])].sort((a, b) => a - b);
  const ys = [...new Set([start.y, end.y, ...(directions.extraY || []), ...boxes.flatMap((b) => [b.y - clearance, b.bottom + clearance])])].sort((a, b) => a - b);
  // 超大密图保留上游布局，不建立无界网格。
  if (xs.length * ys.length > 40000) return null;
  const startIndex = ys.indexOf(start.y) * xs.length + xs.indexOf(start.x);
  const endIndex = ys.indexOf(end.y) * xs.length + xs.indexOf(end.x);
  const point = (index) => ({ x: xs[index % xs.length], y: ys[Math.floor(index / xs.length)] });
  const costs = new Map(), parents = new Map(), queue = [];
  const visibility = new Map(), congestionCache = new Map();
  const estimate = (index) => { const p = point(index); return Math.abs(p.x - end.x) + Math.abs(p.y - end.y); };
  const push = (state) => { queue.push(state); let i = queue.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (queue[p].priority <= state.priority) break; queue[i] = queue[p]; i = p; } queue[i] = state; };
  const pop = () => { const first = queue[0], last = queue.pop(); if (queue.length) { let i = 0;
    while (i * 2 + 1 < queue.length) { let j = i * 2 + 1; if (j + 1 < queue.length && queue[j + 1].priority < queue[j].priority) j++;
      if (queue[j].priority >= last.priority) break; queue[i] = queue[j]; i = j; } queue[i] = last; } return first; };
  const axisOf = (v) => Math.abs(v.x) > Math.abs(v.y) ? 0 : 1;
  for (const axis of directions.start ? [axisOf(directions.start)] : [0, 1]) {
    const key = startIndex * 2 + axis;
    costs.set(key, 0); push({ index: startIndex, axis, key, cost: 0, priority: estimate(startIndex) });
  }
  let finish;
  let visited = 0;
  while (queue.length) {
    const current = pop();
    if (current.cost !== costs.get(current.key)) continue;
    if (++visited > (directions.maxVisited || 80000)) return null;
    if (directions.budget && --directions.budget.remaining < 0) return null;
    if (current.index === endIndex) { finish = current.key; break; }
    const x = current.index % xs.length, y = Math.floor(current.index / xs.length);
    for (const [nx, ny, axis] of [[x - 1, y, 0], [x + 1, y, 0], [x, y - 1, 1], [x, y + 1, 1]]) {
      if (nx < 0 || nx >= xs.length || ny < 0 || ny >= ys.length) continue;
      const index = ny * xs.length + nx, a = point(current.index), b = point(index);
      const movement = { x: b.x - a.x, y: b.y - a.y };
      const backwards = (v) => v && movement.x * v.x + movement.y * v.y < -EPS;
      if (current.index === startIndex && backwards(directions.start)
          || index === endIndex && backwards(directions.end)) continue;
      const segmentKey = current.index < index ? `${current.index}:${index}` : `${index}:${current.index}`;
      if (!visibility.has(segmentKey)) visibility.set(segmentKey, !segmentBlocked(a, b, boxes)
        && !(directions.avoidSegments || []).some(([p, q]) => segmentIntersection(a, b, p, q)));
      if (!visibility.get(segmentKey)) continue;
      let congestion = congestionCache.get(segmentKey);
      if (congestion === undefined) {
        congestion = 0;
        for (const [p, q] of occupied) {
        const horizontal = near(a.y, b.y), otherHorizontal = near(p.y, q.y);
        if (horizontal !== otherHorizontal) continue;
        const axis = horizontal ? "x" : "y", cross = horizontal ? "y" : "x";
        if (Math.abs(a[cross] - p[cross]) > 4) continue;
        const overlap = Math.min(Math.max(a[axis], b[axis]), Math.max(p[axis], q[axis]))
          - Math.max(Math.min(a[axis], b[axis]), Math.min(p[axis], q[axis]));
          if (overlap > 0) congestion += overlap * 6;
        }
        congestionCache.set(segmentKey, congestion);
      }
      const cost = current.cost + distance(a, b) + (axis === current.axis ? 0 : BEND_COST) + congestion
        + (index === endIndex && directions.end && axis !== axisOf(directions.end) ? BEND_COST : 0);
      const key = index * 2 + axis;
      if (cost >= (costs.get(key) ?? Infinity)) continue;
      costs.set(key, cost); parents.set(key, current.key); push({ index, axis, key, cost, priority: cost + estimate(index) });
    }
  }
  if (finish === undefined) return null;
  const result = [];
  for (let key = finish; key !== undefined; key = parents.get(key)) result.push(point(Math.floor(key / 2)));
  return simplifyPoints(result.reverse());
}

export function flowGeometry(svg, graph) {
  if (!graph?.nodes || !graph?.edges) return null;
  const nodes = new Map(graph.nodes.map((model) => {
    const element = svg.getElementById(`${svg.id}-${model.domId}`) || svg.getElementById(model.domId);
    const shape = element?.querySelector(":scope > .label-container, :scope > .outer-path");
    return [model.id, element && shape && !model.isGroup ? { model, element, shape, box: boundsInSvg(svg, shape) } : null];
  }).filter(([, node]) => node));
  const byId = new Map([...svg.querySelectorAll("path.flowchart-link[data-id]")].map((e) => [e.dataset.id, e]));
  const edges = graph.edges.map((model) => {
    const element = byId.get(model.id), source = nodes.get(model.start), target = nodes.get(model.end);
    const raw = element && readPoints(element);
    return element && source && target && raw ? { model, element, source, target,
      points: simplifyPoints(raw.map((p) => inSvg(svg, element, p))) } : null;
  }).filter(Boolean);
  return { nodes, edges };
}

function sideOf(point, adjacent) {
  const dx = adjacent.x - point.x, dy = adjacent.y - point.y;
  return Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "bottom" : "top";
}
const horizontalSide = (side) => side === "left" || side === "right";
const signOf = (side) => side === "left" || side === "top" ? -1 : 1;
function onSide(box, side, cross) {
  return horizontalSide(side) ? { x: side === "left" ? box.x : box.right, y: cross }
    : { x: cross, y: side === "top" ? box.y : box.bottom };
}

function movePort(edge, start, side, value, reach) {
  let points = (start ? edge.points : edge.points.slice().reverse()).map((p) => ({ ...p }));
  const cross = horizontalSide(side) ? "y" : "x", axis = cross === "x" ? "y" : "x";
  const old = points[0][cross];
  points[0][cross] = value;
  if (points.length === 2 && !near(value, points[1][cross])) {
    const middle = reach === undefined ? (points[0][axis] + points[1][axis]) / 2 : points[0][axis] + signOf(side) * reach;
    points.splice(1, 0, { ...points[0], [axis]: middle }, { ...points[1], [axis]: middle });
  } else if (points.length > 2) {
    points[1][cross] = value;
    if (reach !== undefined) {
      const middle = points[0][axis] + signOf(side) * reach;
      points[1][axis] = middle;
      if (points.length === 3 || near(points[1][axis], points[2][axis]) || near(old, points[2][cross])) {
        points.splice(2, 0, { ...points[2], [axis]: middle });
      } else if (points.length >= 4) points[2][axis] = middle;
    }
  }
  edge.points = simplifyPoints(start ? points : points.reverse());
}

function simplifyPortJog(edge, start, side, peers, boxes) {
  const points = start ? edge.points : edge.points.slice().reverse();
  if (points.length < 4) return;
  const cross = horizontalSide(side) ? "y" : "x", axis = cross === "x" ? "y" : "x";
  if (!near(points[0][cross], points[1][cross]) || !near(points[1][axis], points[2][axis])
      || !near(points[2][cross], points[3][cross])) return;
  const nextCross = points[2][cross], delta = Math.abs(points[0][cross] - nextCross);
  const box = (start ? edge.source : edge.target).box;
  const low = horizontalSide(side) ? box.y : box.x, span = horizontalSide(side) ? box.height : box.width;
  if (delta > 12 || nextCross < low + 12 || nextCross > low + span - 12) return;
  if (peers.some((peer) => peer.edge !== edge && Math.abs(peer.value - nextCross) < PORT_GAP)) return;
  const next = [{ ...points[0], [cross]: nextCross }, ...points.slice(3)];
  if (!clearRoute(next, boxes)) return;
  edge.points = start ? next : next.reverse();
}

function loopRoute(box, side, size, reach = 0, lane = 0, laneCount = 1) {
  const horizontal = horizontalSide(side), center = horizontal ? box.y + box.height / 2 : box.x + box.width / 2;
  const span = Math.min(32, (horizontal ? box.height : box.width) * 0.7);
  // 同一节点同一侧可能重复自环；按 lane 在节点侧边分槽，避免同心环的
  // 内侧轨道穿过外侧轨道。单环仍保留原来的完整跨度。
  const count = Math.max(1, Math.floor(laneCount) || 1);
  const slotSpan = span / count;
  const laneCenter = center + (Math.max(0, lane) - (count - 1) / 2) * slotSpan;
  const laneSpan = count === 1 ? span : Math.max(2, Math.min(span, slotSpan * 0.65));
  const offset = Math.max(reach, 42, (horizontal ? size.width : size.height) + 24);
  const a = onSide(box, side, laneCenter - laneSpan / 2), b = onSide(box, side, laneCenter + laneSpan / 2);
  const axis = horizontal ? "x" : "y";
  return [a, { ...a, [axis]: a[axis] + signOf(side) * offset },
    { ...b, [axis]: b[axis] + signOf(side) * offset }, b];
}

export function routeFlowEdges(svg, graph) {
  const geometry = flowGeometry(svg, graph);
  if (!geometry) return;
  const { nodes, edges } = geometry;
  const groups = new Map();
  for (const edge of edges) {
    edge.element.setAttribute("data-gptm-source", edge.source.element.id);
    edge.element.setAttribute("data-gptm-target", edge.target.element.id);
    for (const start of [true, false]) {
      const points = start ? edge.points : edge.points.slice().reverse(), node = start ? edge.source : edge.target;
      const side = sideOf(points[0], points[1]), value = points[0][horizontalSide(side) ? "y" : "x"];
      const key = `${node.model.id}\0${side}`;
      if (!groups.has(key)) groups.set(key, { node, side, ports: [] });
      groups.get(key).ports.push({ edge, start, side, value });
    }
  }
  let bundled = 0, loops = 0, simplified = 0;
  for (const { node, side, ports } of groups.values()) {
    const units = [], bundles = new Map();
    for (const port of ports) {
      const { edge, start } = port;
      // 虚线相位、圈叉/双向、显式颜色都不是可丢弃的装饰。
      // 同侧还有出线时不强制共享汇入，否则共同主干会穿过回退边且锁死后续避障。
      const compatible = !start && edge.source !== edge.target && edge.model.arrowTypeStart === "none"
        && edge.model.arrowTypeEnd === "arrow_point" && edge.model.pattern === "normal"
        && !edge.model.animate && !ports.some((other) => other.start);
      const key = compatible ? JSON.stringify([edge.model.thickness, edge.model.style, edge.model.cssCompiledStyles]) : null;
      if (key !== null && bundles.has(key)) bundles.get(key).push(port);
      else { const unit = [port]; units.push(unit); if (key !== null) bundles.set(key, unit); }
    }
    units.sort((a, b) => a.reduce((n, p) => n + p.value, 0) / a.length - b.reduce((n, p) => n + p.value, 0) / b.length);
    const low = horizontalSide(side) ? node.box.y : node.box.x, span = horizontalSide(side) ? node.box.height : node.box.width;
    const margin = Math.min(12, span * 0.15), available = span - margin * 2;
    const spacing = units.length > 1 ? Math.min(PORT_GAP, available / (units.length - 1)) : PORT_GAP;
    const crowded = ports.some((p, i) => ports.some((q, j) => j !== i && Math.abs(p.value - q.value) < PORT_GAP));
    units.forEach((unit, index) => {
      const value = crowded || unit.length > 1 ? low + span / 2 + (index - (units.length - 1) / 2) * spacing : unit[0].value;
      const bundle = unit.length > 1;
      for (const port of unit) {
        if (crowded || bundle) movePort(port.edge, port.start, side, value, bundle ? 30 : undefined);
        port.value = value;
        const previousSpan = Number(port.edge.element.getAttribute("data-gptm-port-span")) || Infinity;
        port.edge.element.setAttribute("data-gptm-port-span", String(Math.min(previousSpan, spacing)));
        if (bundle) port.edge.element.setAttribute("data-gptm-shared-tip", unit[0].edge.model.id);
      }
      if (bundle) {
        bundled += unit.length - 1;
        for (const port of unit.slice(1)) port.edge.element.removeAttribute("marker-end");
      }
    });
    for (const port of ports) {
      if (port.edge.source === port.edge.target || port.edge.element.hasAttribute("data-gptm-shared-tip")) continue;
      const count = port.edge.points.length;
      const boxes = [...nodes.values()].filter((n) => n !== port.edge.source && n !== port.edge.target).map((n) => n.box);
      simplifyPortJog(port.edge, port.start, side, ports, boxes);
      if (port.edge.points.length < count) simplified++;
    }
  }
  const loopCounts = new Map();
  for (const edge of edges) {
    if (edge.source !== edge.target) continue;
    const side = sideOf(edge.points[0], edge.points[1]);
    const laneKey = `${edge.source.element.id}\0${side}`;
    loopCounts.set(laneKey, (loopCounts.get(laneKey) || 0) + 1);
  }
  const loopLanes = new Map();
  for (const edge of edges) {
    if (edge.source === edge.target) {
      const box = edge.source.box, side = sideOf(edge.points[0], edge.points[1]);
      const label = [...svg.querySelectorAll("g.edgeLabel .label[data-id]")].find((l) => l.dataset.id === edge.model.id);
      const size = label ? boundsInSvg(svg, label) : { width: 0, height: 0 };
      const laneKey = `${edge.source.element.id}\0${side}`;
      const lane = loopLanes.get(laneKey) || 0;
      loopLanes.set(laneKey, lane + 1);
      edge.points = loopRoute(box, side, size, 0, lane, loopCounts.get(laneKey) || 1);
      edge.element.setAttribute("data-gptm-self-loop", "true");
      loops++;
    }
    const obstacles = [...nodes.values()].filter((node) => node !== edge.source && node !== edge.target).map((node) => node.box);
    if (!clearRoute(edge.points, obstacles, 1)) {
      const first = edge.points[0], last = edge.points.at(-1);
      const lead = (point, adjacent, amount) => {
        const d = distance(point, adjacent);
        return { x: point.x + (adjacent.x - point.x) / d * amount, y: point.y + (adjacent.y - point.y) / d * amount };
      };
      const start = lead(first, edge.points[1], 8);
      const end = lead(last, edge.points.at(-2), edge.element.hasAttribute("data-gptm-shared-tip") ? 30 : 8);
      const route = orthogonalRoute(start, end, [...nodes.values()].map((node) => node.box), CLEARANCE);
      if (route) {
        edge.points = [first, ...route, last];
        edge.element.setAttribute("data-gptm-obstacle-rerouted", "true");
      }
    }
    writePoints(svg, edge.element, edge.points);
  }
  svg.setAttribute("data-gptm-shared-arrows", String(bundled));
  svg.setAttribute("data-gptm-self-loops", String(loops));
  svg.setAttribute("data-gptm-simplified-jogs", String(simplified));
}

export function fitSvgBounds(svg, padding = 12) {
  const boxes = [...svg.children].filter((el) => el.localName === "g" || el.localName === "text")
    .map((el) => boundsInSvg(svg, el)).filter((b) => b.width > 0 || b.height > 0);
  if (!boxes.length) return;
  const x = Math.min(...boxes.map((b) => b.x)) - padding, y = Math.min(...boxes.map((b) => b.y)) - padding;
  const width = Math.max(...boxes.map((b) => b.right)) - x + padding;
  const height = Math.max(...boxes.map((b) => b.bottom)) - y + padding;
  svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  svg.setAttribute("width", String(width)); svg.setAttribute("height", String(height));
  svg.style.maxWidth = "none";
}

export function asPath(element) {
  if (element.localName === "path") return element;
  const path = element.ownerDocument.createElementNS(NS, "path");
  for (const attribute of element.attributes) path.setAttribute(attribute.name, attribute.value);
  for (const name of ["x1", "x2", "y1", "y2"]) path.removeAttribute(name);
  element.replaceWith(path);
  return path;
}

const boxesOverlap = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
function nativeLabelBox(center, size) {
  // 包含胶囊描边和与其它线的空隙；该保留区也交给后续边避障。
  return { x: center.x - size.width / 2 - 7, y: center.y - size.height / 2 - 7,
    right: center.x + size.width / 2 + 7, bottom: center.y + size.height / 2 + 7 };
}

export function labelOnRoute(svg, points, size, barriers, occupied, original) {
  const old = { x: size.x + size.width / 2, y: size.y + size.height / 2 }, candidates = [];
  const add = (point) => {
    const box = nativeLabelBox(point, size);
    if (barriers.some((b) => boxesOverlap(box, b))
        || occupied.some(([a, b]) => segmentBlocked(a, b, [box], 2))) return;
    // DOMPoint 的 x/y 是原型访问器，展开对象会丢坐标。
    candidates.push({ x: point.x, y: point.y, box, score: distance(point, old) });
  };
  if (original?.getTotalLength) {
    // 上游可能是曲线，保留原 d 时必须用真实路径采样，不能把控制折线当可见线。
    const length = original.getTotalLength(), steps = Math.min(1000, Math.max(20, Math.ceil(length / 5)));
    for (let i = 1; i < steps; i++) add(inSvg(svg, original, original.getPointAtLength(length * i / steps)));
  } else {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = distance(a, b);
      if (length < 1) continue;
      // 胶囊可以放在纵线，文字仍水平；避开转角处的圆弧，中心必须真正落在线上。
      const margin = 8, lo = margin / length, hi = 1 - lo;
      if (lo > hi) continue;
      const projection = ((old.x - a.x) * (b.x - a.x) + (old.y - a.y) * (b.y - a.y)) / (length * length);
      const samples = new Set([Math.max(lo, Math.min(hi, projection)), 0.5]);
      const steps = Math.min(200, Math.ceil(length / 8));
      for (let j = 0; j <= steps; j++) samples.add(lo + (hi - lo) * j / steps);
      for (const t of samples) add({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return candidates.sort((a, b) => a.score - b.score)[0];
}

// 原生状态/类图可能从同一个斜向端口同时进出。仅处理实际渲染时带身份的边，
// 不重新解析有全局domId计数的类图，也不改变菱形/基数/lollipop端点的偏移契约。
export function routeNativeEdges(svg) {
  const nodes = new Map([...svg.querySelectorAll("g.node[data-id]")].map((element) => {
    const shape = nodeShape(element);
    return [element.dataset.id, shape && { element, shape, box: boundsInSvg(svg, shape) }];
  }).filter(([, node]) => node));
  const native = [...svg.querySelectorAll("path.transition[data-source],path.relation[data-source]")];
  const edges = native.map((element) => {
    const source = nodes.get(element.dataset.source), target = nodes.get(element.dataset.target), raw = readPoints(element);
    if (!source || !target || !raw) return null;
    element.setAttribute("data-gptm-source", source.element.id);
    element.setAttribute("data-gptm-target", target.element.id);
    const compatible = ["marker-start", "marker-end"].every((attribute) => {
      const value = element.getAttribute(attribute);
      return !value || /(?:barbEnd|extension(?:Start|End)|dependency(?:Start|End))\)/.test(value);
    });
    return { element, source, target, points: raw.map((p) => inSvg(svg, element, p)), compatible };
  }).filter(Boolean);
  // 原生状态/类图自环同样要给标签和三角留空间，不能只扩大流程图的环。
  const loopLabels = new Map([...svg.querySelectorAll("g.edgeLabel")].map((label) => [
    label.querySelector("[data-id]")?.dataset.id || label.dataset.id, label,
  ]));
  const loopCounts = new Map();
  for (const edge of edges) {
    if (edge.source !== edge.target || !edge.compatible) continue;
    const laneKey = edge.source.element.id;
    loopCounts.set(laneKey, (loopCounts.get(laneKey) || 0) + 1);
  }
  const loopLanes = new Map();
  for (const edge of edges) {
    if (edge.source !== edge.target || !edge.compatible) continue;
    const label = loopLabels.get(edge.element.dataset.id), size = label ? boundsInSvg(svg, label) : { width: 0, height: 0 };
    const initial = sideOf(edge.points[0], edge.points[1]);
    const obstacles = [...nodes.values()].filter((node) => node !== edge.source).map((node) => node.box);
    for (const side of [initial, ...["right", "left", "bottom", "top"].filter((s) => s !== initial)]) {
      const laneKey = edge.source.element.id;
      const lane = loopLanes.get(laneKey) || 0;
      const points = loopRoute(edge.source.box, side, size, 0, lane,
        loopCounts.get(laneKey) || 1);
      if (!clearRoute(points, obstacles, 4)) continue;
      const center = { x: (points[1].x + points[2].x) / 2, y: (points[1].y + points[2].y) / 2 };
      const reservation = nativeLabelBox(center, size);
      if (label && [...nodes.values()].some(node => boxesOverlap(reservation, node.box))) continue;
      edge.points = points;
      writePoints(svg, edge.element, points);
      if (label) {
        edge.element.setAttribute("data-gptm-label-x", String(center.x));
        edge.element.setAttribute("data-gptm-label-y", String(center.y));
      }
      edge.element.setAttribute("data-gptm-native-rerouted", "true");
      edge.element.setAttribute("data-gptm-self-loop", "true");
      loopLanes.set(laneKey, lane + 1);
      break;
    }
  }
  const groups = new Map(), ports = new Map();
  for (const edge of edges) for (const start of [true, false]) {
    const node = start ? edge.source : edge.target, anchor = start ? edge.points[0] : edge.points.at(-1), box = node.box;
    const normalizedX = (anchor.x - box.x - box.width / 2) / box.width;
    const normalizedY = (anchor.y - box.y - box.height / 2) / box.height;
    const side = Math.abs(normalizedX) > Math.abs(normalizedY)
      ? normalizedX > 0 ? "right" : "left" : normalizedY > 0 ? "bottom" : "top";
    const key = `${node.element.id}\0${side}`;
    if (!groups.has(key)) groups.set(key, []);
    const value = anchor[horizontalSide(side) ? "y" : "x"];
    const port = { edge, start, side, node, value, anchor: onSide(box, side, value), spacing: PORT_GAP };
    groups.get(key).push(port);
    ports.set(`${edge.element.id}:${start}`, port);
  }
  const changed = new Set();
  for (const group of groups.values()) {
    if (group.length < 2 || group.some((port) => !port.edge.compatible)) continue;
    group.sort((a, b) => a.value - b.value);
    if (!group.some((port, i) => i && port.value - group[i - 1].value < PORT_GAP)) continue;
    const { node, side } = group[0], box = node.box, horizontal = horizontalSide(side);
    const span = horizontal ? box.height : box.width, low = horizontal ? box.y : box.x;
    const margin = Math.min(12, span * 0.2), spacing = Math.min(24, (span - margin * 2) / (group.length - 1));
    group.forEach((port, index) => {
      const cross = low + span / 2 + (index - (group.length - 1) / 2) * spacing;
      port.anchor = onSide(box, side, cross);
      port.spacing = spacing;
      const previous = Number(port.edge.element.getAttribute("data-gptm-port-span")) || Infinity;
      port.edge.element.setAttribute("data-gptm-port-span", String(Math.min(previous, spacing)));
      changed.add(port.edge);
    });
  }
  const boxes = [...nodes.values()].map((node) => node.box), occupied = [];
  // 菱形/圆点关系及自环保留原路由，它们仍占空间；不能让后来标签盖在这些边上。
  for (const edge of edges.filter((edge) => !edge.compatible || edge.source === edge.target)) {
    for (let i = 1; i < edge.points.length; i++) occupied.push([edge.points[i - 1], edge.points[i]]);
  }
  const labelById = new Map([...svg.querySelectorAll("g.edgeLabel")].map((label) => [
    label.querySelector("[data-id]")?.dataset.id, label,
  ]));
  const reservedLabels = edges.filter(edge => edge.source === edge.target
    && edge.element.hasAttribute("data-gptm-label-x")).map(edge => nativeLabelBox({
    x: Number(edge.element.getAttribute("data-gptm-label-x")), y: Number(edge.element.getAttribute("data-gptm-label-y")),
  }, boundsInSvg(svg, loopLabels.get(edge.element.dataset.id))));
  const shields = [...ports.values()].filter((port) => port.edge.compatible).map((port) => {
    const arrow = port.edge.element.hasAttribute(port.start ? "marker-start" : "marker-end");
    const half = arrow ? Math.min(9, port.spacing * 0.38) : 2.5, p = port.anchor, horizontal = horizontalSide(port.side);
    // 无箭头出线只留描边间隔；把它当20单位箭头会封死上下节点之间的正常标签位置。
    const distance = arrow ? 20 : 6, out = signOf(port.side) * distance;
    const x = horizontal ? Math.min(p.x, p.x + out) : p.x - half;
    const y = horizontal ? p.y - half : Math.min(p.y, p.y + out);
    return { edge: port.edge, x, y, right: x + (horizontal ? distance : half * 2),
      bottom: y + (horizontal ? half * 2 : distance) };
  });
  const approaches = [...ports.values()].filter((port) => port.edge.compatible).map((port) => {
    const p = port.anchor, horizontal = horizontalSide(port.side), out = signOf(port.side) * 24;
    return { edge: port.edge, x: horizontal ? Math.min(p.x, p.x + out) : p.x - 2.5,
      right: horizontal ? Math.max(p.x, p.x + out) : p.x + 2.5,
      y: horizontal ? p.y - 2.5 : Math.min(p.y, p.y + out),
      bottom: horizontal ? p.y + 2.5 : Math.max(p.y, p.y + out) };
  });
  const labelSizes = new Map(edges.map((edge) => {
    const label = labelById.get(edge.element.dataset.id);
    return [edge, label?.textContent.trim() ? boundsInSvg(svg, label) : null];
  }));
  // 先给更宽的标签分配有限空隙；小标签通常能沿剩余路径移动。
  const routingOrder = edges.filter((edge) => edge.compatible)
    .sort((a, b) => (labelSizes.get(b)?.width || 0) - (labelSizes.get(a)?.width || 0));
  for (const edge of routingOrder) {
    if (edge.source === edge.target) continue;
    const a = ports.get(`${edge.element.id}:true`), b = ports.get(`${edge.element.id}:false`);
    const lead = (port) => {
      const point = { ...port.anchor }, axis = horizontalSide(port.side) ? "x" : "y";
      point[axis] += signOf(port.side) * 24;
      return point;
    };
    // 包围盒侧面只用于布局锚点；render.js 随后按精确归属求真实轮廓接触点。
    const start = lead(a), end = lead(b);
    const foreignShields = shields.filter((shield) => shield.edge !== edge);
    const barriers = [...boxes, ...foreignShields, ...reservedLabels];
    const labelBarriers = [...boxes, ...shields, ...approaches.filter((item) => item.edge !== edge), ...reservedLabels];
    const foreign = [...nodes.values()].filter((node) => node !== edge.source && node !== edge.target).map((node) => node.box);
    const completeBarriers = [...foreign, ...foreignShields, ...reservedLabels];
    const size = labelSizes.get(edge);
    const vector = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
    const directions = { start: vector(a.anchor, start), end: vector(end, b.anchor) };
    let best;
    const consider = (points, original = false) => {
      const quality = routeQuality(points);
      if (!Number.isFinite(quality.score) || !clearRoute(points, completeBarriers)) return;
      const reservation = size && labelOnRoute(svg, points, size, labelBarriers, occupied, original && edge.element);
      if (size && !reservation) return;
      const score = quality.score + (reservation?.score || 0) * 0.02;
      if (!best || score < best.score) best = { points, reservation, score, original };
    };
    // 正常原线优先保留；端口冲突、路径穿障碍或标签确实无处放才进入寻路。
    if (!changed.has(edge)) consider(edge.points, true);
    if (!best) {
      const route = orthogonalRoute(start, end, barriers, CLEARANCE, occupied, directions);
      if (route) consider(simplifyPoints([a.anchor, ...route, b.anchor]));
    }
    if (!best && size) {
      const center = { x: size.x + size.width / 2, y: size.y + size.height / 2 }, candidates = [];
      // 仅在原线与最短避障线均容不下标签时有界扩展。按整条路的长度下界选候选，
      // 水平/纵向通道都允许，不能为了水平文字强迫一条纵线绕圈。
      for (let row = -6; row <= 6; row++) for (let column = -6; column <= 6; column++) {
        const point = { x: center.x + column * 22, y: center.y + row * 18 }, box = nativeLabelBox(point, size);
        if (labelBarriers.some((b) => boxesOverlap(box, b))
            || occupied.some(([p, q]) => segmentBlocked(p, q, [box], 2))) continue;
        candidates.push({ ...point, box, score: distance(start, point) + distance(point, end) });
      }
      candidates.sort((a, b) => a.score - b.score);
      for (const candidate of candidates.slice(0, 16)) for (const horizontal of [true, false]) {
        // 自己的胶囊不是自己的障碍。只保留跨过中心的直段供文字落线，
        // 若绕胶囊外框再进入，会在短边两端各制造一个无意义的回弯。
        const first = horizontal ? { x: candidate.x - 8, y: candidate.y } : { x: candidate.x, y: candidate.y - 8 };
        const last = horizontal ? { x: candidate.x + 8, y: candidate.y } : { x: candidate.x, y: candidate.y + 8 };
        const forward = distance(start, first) + distance(end, last) <= distance(start, last) + distance(end, first);
        const enter = forward ? first : last, exit = forward ? last : first, through = vector(enter, exit);
        const before = orthogonalRoute(start, enter, barriers, CLEARANCE, occupied, { start: directions.start, end: through });
        const after = orthogonalRoute(exit, end, barriers, CLEARANCE, occupied, { start: through, end: directions.end });
        if (before && after) consider(simplifyPoints([a.anchor, ...before, ...after, b.anchor]));
      }
    }
    if (!best) {
      // 搜索失败保持上游几何，并让后续边知道它仍占用空间。
      for (let i = 1; i < edge.points.length; i++) occupied.push([edge.points[i - 1], edge.points[i]]);
      continue;
    }
    const { points, reservation } = best;
    if (!best.original) {
      writePoints(svg, edge.element, points);
      edge.element.setAttribute("data-gptm-native-rerouted", "true");
    }
    for (let i = 1; i < points.length; i++) occupied.push([points[i - 1], points[i]]);
    if (reservation) {
      reservedLabels.push(reservation.box);
      edge.element.setAttribute("data-gptm-label-x", String(reservation.x));
      edge.element.setAttribute("data-gptm-label-y", String(reservation.y));
    }
  }
  svg.setAttribute("data-gptm-native-routes", String(edges.filter((e) => e.element.hasAttribute("data-gptm-native-rerouted")).length));
}

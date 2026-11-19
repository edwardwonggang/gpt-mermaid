/* 职责：只读验证冻结状态布局的语义、中点、引线、障碍与交叉约束。
 * 调用方：state-svg及逻辑测试；依赖：纯几何segmentIntersection。
 * 红线：检查失败不能改坐标或冒充clear，条件框与状态框执行同一约束。
 */
import { segmentIntersection } from "./path-intersections.js";
const EPS = .01, LEAD = 40, GAP = 10;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function simplify(points) {
  const out = [];
  for (const p of points) {
    if (out.length && dist(out.at(-1), p) < EPS) continue;
    while (out.length > 1) {
      const a = out.at(-2), b = out.at(-1);
      if (Math.abs((b.x - a.x) * (p.y - b.y) - (b.y - a.y) * (p.x - b.x)) > EPS
          || (b.x - a.x) * (p.x - b.x) + (b.y - a.y) * (p.y - b.y) < 0) break;
      out.pop();
    }
    out.push(p);
  }
  return out;
}
function blocked(a, b, n, pad = GAP) {
  const inside = p => p.x > n.x - pad + EPS && p.x < n.x + n.width + pad - EPS
    && p.y > n.y - pad + EPS && p.y < n.y + n.height + pad - EPS;
  if (inside(a) || inside(b)) return true;
  const corners = [
    { x: n.x - pad, y: n.y - pad }, { x: n.x + n.width + pad, y: n.y - pad },
    { x: n.x + n.width + pad, y: n.y + n.height + pad }, { x: n.x - pad, y: n.y + n.height + pad },
  ];
  return corners.some((p, i) => segmentIntersection(a, b, p, corners[(i + 1) % 4])?.kind === "cross");
}
function commonPrefix(left, right) {
  let a = left[0], b = right[0], i = 1, j = 1;
  const shared = [];
  while (i < left.length && j < right.length && dist(a, b) < EPS) {
    const p = left[i], q = right[j], al = dist(a, p), bl = dist(b, q);
    const u = { x: (p.x - a.x) / al, y: (p.y - a.y) / al };
    const v = { x: (q.x - b.x) / bl, y: (q.y - b.y) / bl };
    if (dist(u, v) > EPS) break;
    const end = al < bl ? p : q;
    shared.push([a, end]);
    a = end; b = end;
    if (al <= bl + EPS) i++;
    if (bl <= al + EPS) j++;
  }
  return shared;
}
export function validateStateLayout(model) {
  if (model.status === "unsupported") return { accepted: false, unsupported: model.reason, unmatched: model.unmatched };
  const issues = [], nodes = new Map(model.nodes.map(n => [n.id, n]));
  const issue = (constraint, subject, detail) => issues.push({ constraint, subject, detail });
  const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  for (const n of model.nodes) if (![n.x, n.y, n.width, n.height].every(Number.isFinite)
    || n.width <= 0 || n.height <= 0) issue("G02", n.id, "节点尺寸或坐标无效");
  if (nodes.size !== model.nodes.length) issue("G01", "nodes", "节点ID重复");
  const ancestor = (parent, child) => {
    let node = nodes.get(child); const seen = new Set();
    while (node?.parentId) {
      if (seen.has(node.id)) { issue("G01", node.id, "容器包含环"); return false; }
      seen.add(node.id);
      if (node.parentId === parent) return true;
      node = nodes.get(node.parentId);
    }
    return false;
  };
  const segments = model.segments.filter(e => {
    if (!Array.isArray(e.points) || e.points.length < 2 || !e.points.every(validPoint)
        || !nodes.has(e.source) || !nodes.has(e.target)) {
      issue("G02", e.id, "路径或归属无效"); return false;
    }
    if (!model.edges.some(r => r.id === e.owner)) issue("G01", e.id, "未声明的关系");
    return true;
  }).map(e => ({ ...e, points: simplify(e.points) }));
  for (const edge of model.edges) {
    const pieces = segments.filter(s => s.owner === edge.id);
    if (pieces.length !== (edge.label ? 2 : 1)) issue("G01", edge.id, "显示段数量不一致");
    if (pieces[0]?.source !== edge.source || pieces.at(-1)?.target !== edge.target) issue("G01", edge.id, "关系端点不一致");
    if (edge.label) {
      if (!pieces[0] || !pieces[1] || pieces[0].target !== pieces[1].source) issue("G01", edge.id, "条件框断开");
      const label = pieces[0] && nodes.get(pieces[0].target);
      if (!label || label.kind !== "label" || label.owner !== edge.id || label.label !== edge.label) {
        issue("G04", edge.id, "条件框语义不一致");
      }
      if (pieces[0]?.arrow !== false) issue("G04", edge.id, "条件入口不能补造箭头");
    }
    if (pieces.at(-1) && pieces.at(-1).arrow !== (edge.arrow ?? true)) issue("G04", edge.id, "业务箭头丢失或补造");
  }
  const ports = [];
  for (const e of segments) {
    if (e.points.length < 2) { issue("G06", e.id, "退化路径"); continue; }
    for (const start of [true, false]) {
      const n = nodes.get(start ? e.source : e.target), p = start ? e.points[0] : e.points.at(-1);
      const q = start ? e.points[1] : e.points.at(-2);
      const centers = [
        { side: "NORTH", x: n.x + n.width / 2, y: n.y, vx: 0, vy: -1 },
        { side: "SOUTH", x: n.x + n.width / 2, y: n.y + n.height, vx: 0, vy: 1 },
        { side: "WEST", x: n.x, y: n.y + n.height / 2, vx: -1, vy: 0 },
        { side: "EAST", x: n.x + n.width, y: n.y + n.height / 2, vx: 1, vy: 0 },
      ].sort((a, b) => dist(a, p) - dist(b, p));
      const port = centers[0], lead = (q.x - p.x) * port.vx + (q.y - p.y) * port.vy;
      const normalError = Math.abs((q.x - p.x) * port.vy - (q.y - p.y) * port.vx);
      ports.push({ segment: e.id, node: n.id, side: port.side, middleError: dist(port, p), lead, normalError });
      if (dist(port, p) > EPS || normalError > EPS) issue("G02", e.id, ports.at(-1));
      if (lead < LEAD - EPS) issue("G03", e.id, ports.at(-1));
    }
    for (let i = 1; i < e.points.length; i++) {
      const a = e.points[i - 1], b = e.points[i];
      if (Math.abs(a.x - b.x) > EPS && Math.abs(a.y - b.y) > EPS) issue("G06", e.id, "斜段");
      if (i > 1) {
        const previous = e.points[i - 2];
        if ((a.x - previous.x) * (b.x - a.x) + (a.y - previous.y) * (b.y - a.y) < -EPS) {
          issue("G06", e.id, "相邻反向重走");
        }
      }
      for (const n of nodes.values()) {
        if (ancestor(n.id, e.source) || ancestor(n.id, e.target)) continue;
        if (n.id === e.source && i === 1 || n.id === e.target && i === e.points.length - 1) continue;
        if (blocked(a, b, n, n.id === e.source || n.id === e.target ? -1 : GAP)) issue("G05", e.id, n.id);
      }
      for (let j = i + 2; j < e.points.length; j++) {
        if (segmentIntersection(a, b, e.points[j - 1], e.points[j])) issue("G06", e.id, "自交或折返");
      }
    }
  }
  const boxes = [...nodes.values()];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (ancestor(a.id, b.id) || ancestor(b.id, a.id)) continue;
    if (a.x < b.x + b.width + GAP && a.x + a.width + GAP > b.x
        && a.y < b.y + b.height + GAP && a.y + a.height + GAP > b.y) issue("G05", a.id, `框与框距离不足:${b.id}`);
  }
  const intersections = [];
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
    const a = segments[i], b = segments[j], shared = [];
    if (a.source === b.source) shared.push(...commonPrefix(a.points, b.points));
    if (a.target === b.target) shared.push(...commonPrefix(a.points.slice().reverse(), b.points.slice().reverse()));
    for (let p = 1; p < a.points.length; p++) for (let q = 1; q < b.points.length; q++) {
      const hit = segmentIntersection(a.points[p - 1], a.points[p], b.points[q - 1], b.points[q]);
      if (!hit) continue;
      const onShared = shared.some(([x, y]) => Math.abs(dist(x, hit) + dist(hit, y) - dist(x, y)) < EPS);
      if (!onShared) intersections.push({ a: a.id, b: b.id, ...hit });
    }
  }
  return { logicalNodes: model.nodes.filter(n => n.kind === "state").length,
    logicalEdges: model.edges.length, labels: model.nodes.filter(n => n.kind === "label").length,
    displaySegments: segments.length, ports, issues, intersections,
    accepted: issues.length === 0 && intersections.length === 0 };
}

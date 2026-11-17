/*
 * 职责：判断线段之间的交叉、接触和共线重叠。
 * 调用方：正交寻路、最终 SVG 交叉审查；无 DOM 依赖。
 * 红线：接触不等于安全，是否为合法共享端点必须由调用方的语义身份判断。
 */
const EPS = 1e-7;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const delta = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });

export function segmentIntersection(a, b, c, d) {
  const v = delta(a, b), w = delta(c, d), offset = delta(a, c);
  const determinant = cross(v, w), length2 = v.x * v.x + v.y * v.y;
  if (length2 < EPS || w.x * w.x + w.y * w.y < EPS) return null;
  if (Math.abs(determinant) < EPS) {
    if (Math.abs(cross(offset, v)) > EPS * Math.sqrt(length2)) return null;
    const project = (p) => ((p.x - a.x) * v.x + (p.y - a.y) * v.y) / length2;
    const t0 = project(c), t1 = project(d);
    const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1));
    if (lo > hi + EPS) return null;
    const t = (lo + hi) / 2;
    return { x: a.x + t * v.x, y: a.y + t * v.y, kind: hi - lo > EPS ? "overlap" : "touch" };
  }
  const t = cross(offset, w) / determinant, u = cross(offset, v) / determinant;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return { x: a.x + t * v.x, y: a.y + t * v.y,
    kind: t > EPS && t < 1 - EPS && u > EPS && u < 1 - EPS ? "cross" : "touch" };
}

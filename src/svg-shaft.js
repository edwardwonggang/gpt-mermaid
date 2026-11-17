/* 职责：裁去统一三角箭头下的线身，避免粗描边覆盖箭头尖角。
 * 调用方：render.js 的已挂载 SVG 后处理；依赖：原生 SVG 长度测量和 computed style。
 * 红线：保持原路径、marker、ID、选择器与方向元数据，不改变 ER 基数等非三角端点。
 * 使用一次性 dash 区间与原虚线求交，不能覆盖背景色、复制路径或用包围盒冒充轮廓。
 */

// 非常短的自定义 dash 周期可能生成数百万段，不能让几何修复阻塞整个渲染队列。
const SHAFT_MAX_SEGMENTS = 16384;
const SHAFT_LENGTH_RE = /^([-+]?(?:\d*\.?\d+|\d+\.?\d*)(?:e[-+]?\d+)?)(px|%)?$/i;
const SHAFT_TRIANGLE_RE = /^\s*M\s*0[\s,]+0\s*L\s*10[\s,]+4\s*L\s*0[\s,]+8\s*Z\s*$/i;
// 虚线的相位可能正好在箭头底部留下空白；只补接头，不改变其余线段的相位。
const SHAFT_TERMINAL_CONTACT = 3;
// 浏览器dash光栅端与getPointAtLength在退化Bezier上可差约0.3单位。
// 仅让线杆进入箭头宽底部，离尖端至少保留92%深度，防止高倍缩放出现断缝。
const SHAFT_BASE_OVERLAP = 0.4;

function triangleDepth(svg, edge, endpoint) {
  const id = (edge.getAttribute(`marker-${endpoint}`) || "").match(/^url\(#([^)]+)\)$/)?.[1];
  if (!id) return 0;
  const marker = svg.getElementById(id);
  if (!marker || marker.getAttribute("markerUnits") !== "userSpaceOnUse") return 0;
  const viewBox = (marker.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
  if (viewBox.length !== 4 || viewBox.some((value, index) => value !== [0, 0, 10, 8][index])) return 0;
  const path = marker.querySelector(":scope > path");
  if (!path || !SHAFT_TRIANGLE_RE.test(path.getAttribute("d") || "")) return 0;
  const width = Number(marker.getAttribute("markerWidth"));
  return Number.isFinite(width) && width > 0 ? width : 0;
}

function normalizedViewportDiagonal(edge, svg) {
  // 百分比 dash 相对当前 SVG viewport 的归一化对角线，不相对边的长度。
  // 有 viewBox 时长度处于该用户坐标系；没有时 SVGLength.value 给出实际 viewport 长度。
  const viewport = edge.ownerSVGElement || svg;
  const box = viewport.viewBox?.baseVal;
  let width = box?.width;
  let height = box?.height;
  if (!(width > 0 && height > 0)) {
    width = viewport.width?.baseVal?.value;
    height = viewport.height?.baseVal?.value;
  }
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? Math.hypot(width, height) / Math.SQRT2
    : null;
}

function readLength(value, diagonal) {
  const match = String(value || "").trim().match(SHAFT_LENGTH_RE);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  if (match[2] === "%") return diagonal === null ? null : number * diagonal / 100;
  return number;
}

function readDash(style, diagonal, scale) {
  const raw = String(style.strokeDasharray || "none").trim();
  if (raw === "none") return { pattern: [], offset: 0 };
  const lengths = raw.split(/[\s,]+/).map((value) => readLength(value, diagonal));
  if (!lengths.length || lengths.some((value) => value === null || value < 0)) return null;
  let pattern = lengths.map((value) => value * scale);
  if (pattern.length % 2) pattern = [...pattern, ...pattern];
  const period = pattern.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(period)) return null;
  // SVG 的全零 dash 与 solid 等价，不能除零或进入零步长循环。
  if (period === 0) return { pattern: [], offset: 0 };
  const offset = readLength(style.strokeDashoffset || "0", diagonal);
  if (offset === null) return null;
  return { pattern, offset: offset * scale };
}

function clippedSegments(length, head, tail, pattern, offset) {
  const end = length - tail;
  if (head >= end) return [];
  if (!pattern.length) return [[head, end]];
  const period = pattern.reduce((sum, value) => sum + value, 0);
  const phase = ((offset % period) + period) % period;
  // 从可见区间附近开始，保留原起点确定的相位，避免长路径的隐藏部分无意义枚举。
  const firstOrigin = -phase + Math.floor((head + phase) / period) * period;
  const cycles = Math.max(0, Math.ceil((end - firstOrigin) / period));
  if (!Number.isFinite(cycles) || cycles * pattern.length > SHAFT_MAX_SEGMENTS) return null;
  const segments = [];
  for (let cycle = 0; cycle < cycles; cycle++) {
    let cursor = firstOrigin + cycle * period;
    for (let index = 0; index < pattern.length; index++) {
      const next = cursor + pattern[index];
      if (index % 2 === 0) {
        const start = Math.max(head, cursor);
        const stop = Math.min(end, next);
        if (stop > start) {
          const previous = segments[segments.length - 1];
          if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], stop);
          else segments.push([start, stop]);
        }
      }
      cursor = next;
    }
  }
  return segments;
}

function arrowCoveredLength(edge, length, depth, start) {
  if (!depth || typeof edge.getPointAtLength !== "function") return depth;
  const point = (distance) => {
    const p = edge.getPointAtLength(start ? distance : length - distance);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error("invalid SVG point");
    return p;
  };
  const tip = point(0), adjacent = point(Math.min(0.02, length));
  const magnitude = Math.hypot(adjacent.x - tip.x, adjacent.y - tip.y);
  if (!magnitude) return depth;
  const v = { x: (adjacent.x - tip.x) / magnitude, y: (adjacent.y - tip.y) / magnitude };
  const inside = (distance) => {
    const p = point(distance), dx = p.x - tip.x, dy = p.y - tip.y;
    const along = dx * v.x + dy * v.y, across = dx * v.y - dy * v.x;
    return along >= -1e-5 && along <= depth && Math.abs(across) <= along * 0.4 + 1e-4;
  };
  // 深度沿切线，弧长沿曲线，二者只在直线相等。取从尖端向外的第一次离开，
  // 避免曲线先离开再进入三角时，把本应可见的整段弧错误裁掉。
  const limit = length, steps = Math.min(16384, Math.max(16, Math.ceil(limit / 0.25)));
  let lo = 0;
  for (let i = 1; i <= steps; i++) {
    let hi = limit * i / steps;
    if (inside(hi)) { lo = hi; continue; }
    for (let j = 0; j < 22; j++) {
      const mid = (lo + hi) / 2;
      if (inside(mid)) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  return length;
}

function connectTerminalSegments(segments, length, head, tail, contact) {
  const end = length - tail;
  if (head >= end) return segments;
  const all = segments.slice();
  if (head > 0) all.push([head, Math.min(end, head + contact)]);
  if (tail > 0) all.push([Math.max(head, end - contact), end]);
  all.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const segment of all) {
    if (merged.length && segment[0] <= merged.at(-1)[1]) merged.at(-1)[1] = Math.max(merged.at(-1)[1], segment[1]);
    else merged.push(segment.slice());
  }
  return merged;
}

function encodeSegments(segments, length, scale) {
  // 起始为零长度“实段”，所以首个可见段前能表达任意长度空白。
  // 末尾空白单独大于整条路径，周期不可能在同一路径内回卷。
  const dash = [0];
  let cursor = 0;
  for (const [start, end] of segments) {
    dash.push(Math.max(0, start - cursor) / scale, (end - start) / scale);
    cursor = end;
  }
  dash.push((length + 1) / scale);
  return dash.join(" ");
}

/**
 * 在已挂载且端点/marker 校准完成的 SVG 上执行。
 * 只支持 computed style 可解析的数字、px 与百分比长度；未解析的 calc() 等保持原值，
 * 并通过返回值显式报告，不能猜长度后破坏原线型。多子路径和非缩放描边也保留原值；
 * 前者在各子路径重置 dash，后者使用不同的描边坐标系，不能套用单路径弧长。
 */
export function trimArrowShafts(svg) {
  const report = { trimmed: 0, skipped: [] };
  const edges = [...svg.querySelectorAll("[data-gptm-direction]")];
  const byId = new Map(edges.map((edge) => [edge.getAttribute("data-id"), edge]));
  for (const edge of edges) {
    const headDepth = triangleDepth(svg, edge, "start");
    // 共享末端只绘制一次 marker，但每条原始边的线杆都必须止于同一个三角底部。
    const sharedId = edge.getAttribute("data-gptm-shared-tip");
    const shared = sharedId ? byId.get(sharedId) : null;
    const tailDepth = triangleDepth(svg, shared || edge, "end");
    if (!(headDepth > 0 || tailDepth > 0)) continue;
    const skip = (reason) => report.skipped.push({ id: edge.id || "", reason });
    if (edge.localName === "path" && ((edge.getAttribute("d") || "").match(/[Mm]/g)?.length || 0) > 1) {
      skip("multiple-subpaths");
      continue;
    }
    if (typeof edge.getTotalLength !== "function") {
      skip("geometry-unavailable");
      continue;
    }
    let length;
    try {
      length = edge.getTotalLength();
    } catch {
      skip("geometry-unavailable");
      continue;
    }
    if (!Number.isFinite(length) || length <= 0) {
      skip("invalid-length");
      continue;
    }
    const declared = Number(edge.getAttribute("pathLength"));
    const scale = declared > 0 && Number.isFinite(declared) ? length / declared : 1;
    if (!Number.isFinite(scale) || scale <= 0) {
      skip("invalid-path-calibration");
      continue;
    }
    const style = getComputedStyle(edge);
    if (style.vectorEffect && style.vectorEffect !== "none") {
      skip("non-scaling-stroke");
      continue;
    }
    const dash = readDash(style, normalizedViewportDiagonal(edge, svg), scale);
    if (!dash) {
      skip("unsupported-dash-length");
      continue;
    }
    let head, tail;
    try {
      head = arrowCoveredLength(edge, length, headDepth, true);
      tail = arrowCoveredLength(edge, length, tailDepth, false);
      if (head > 0 && head < length) head = Math.max(0, head - Math.min(SHAFT_BASE_OVERLAP, head * .08));
      if (tail > 0 && tail < length) tail = Math.max(0, tail - Math.min(SHAFT_BASE_OVERLAP, tail * .08));
    } catch {
      skip("geometry-unavailable");
      continue;
    }
    let segments = clippedSegments(length, head, tail, dash.pattern, dash.offset);
    if (segments === null) {
      skip("dash-segment-budget");
      continue;
    }
    const contact = Math.max(SHAFT_TERMINAL_CONTACT, (parseFloat(style.strokeWidth) || 1.6) * 1.5);
    segments = connectTerminalSegments(segments, length, head, tail, contact);
    // 这是最终几何约束；必须压过图表 CSS 中的旧 dash/offset，避免视觉上又画回尖端。
    edge.style.setProperty("stroke-dasharray", encodeSegments(segments, length, scale), "important");
    edge.style.setProperty("stroke-dashoffset", "0", "important");
    edge.style.setProperty("stroke-linecap", "butt", "important");
    report.trimmed++;
  }
  return report;
}

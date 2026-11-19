/* 职责：加载 gpt-mermaid 运行时、应用 GPT 主题、后处理并返回净化后的 SVG。 */

import { buildFlowchartThemeCSS, buildGlobalThemeCSS } from "./defaults.js";
import { sanitizeMermaidSource, sanitizeSvgMarkup, svgSize } from "./sanitize.js";
import { fixSvgLabels, placeEdgeLabels, sequenceAnchor } from "./svg-labels.js";
import { trimArrowShafts } from "./svg-shaft.js";
import { routeFlowEdges, routeNativeEdges, nodeShape, fitSvgBounds } from "./svg-routing.js";
import { routeC4Edges } from "./svg-c4.js";
import { applyAdaptiveFlowLayout } from "./svg-adaptive.js";
import { resolveEdgeCrossings, recordCrossings } from "./svg-crossings.js";
import {
  DEFAULT_RENDER_TIMEOUT_MS,
  createSerialScheduler,
  positiveTimeout,
  throwIfAborted,
} from "./runtime-guard.js";
import { loadRuntime } from "./runtime-loader.js";
import { layoutStateSvg } from "./state-svg.js";

const FLOWCHART_RE = /^\s*(?:flowchart|graph)\b/im;
// Mermaid 的 frontmatter 必须是文档首部独立的 `---` 行；不能把 YAML
// 块标量里缩进的 `---` 当成闭合，否则会把 frontmatter 误截断。
// 这里只做图种分类，不解析或信任 frontmatter 内容；安全过滤仍由 sanitizeMermaidSource 负责。
const FRONTMATTER_FENCE_RE = /^---\s*$/;

function bodyAfterFrontmatter(lines) {
  let start = 0;
  while (start < lines.length) {
    const line = lines[start].replace(/^\uFEFF/, "");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) { start++; continue; }
    break;
  }
  if (start >= lines.length || !FRONTMATTER_FENCE_RE.test(lines[start].replace(/^\uFEFF/, ""))) {
    return lines;
  }
  for (let end = start + 1; end < lines.length; end++) {
    if (FRONTMATTER_FENCE_RE.test(lines[end])) return lines.slice(end + 1);
  }
  // 未闭合的 frontmatter 按原样处理：不要把后面的 `flowchart` 误判为
  // 文档首行，否则会把非法 YAML 送进流程图专用链路并掩盖原始错误。
  return lines;
}

export function isFlowchart(source) {
  for (const line of bodyAfterFrontmatter(String(source || "").split(/\r?\n/))) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) continue;
    return FLOWCHART_RE.test(line);
  }
  return false;
}

export function isStateDiagram(source) {
  for (const line of bodyAfterFrontmatter(String(source || "").split(/\r?\n/))) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) continue;
    return /^stateDiagram(?:-v2)?\b/.test(trimmed);
  }
  return false;
}

function ensureCssClass(node, name) {
  const current = node.getAttribute("class") || "";
  if (!current.split(/\s+/).includes(name)) node.setAttribute("class", `${current} ${name}`.trim());
}

const DIRECTION_KEYS = Object.freeze({
  right: "gptMermaidLineRight",
  down: "gptMermaidLineDown",
  left: "gptMermaidLineLeft",
  up: "gptMermaidLineUp",
});

const TRIANGLE_MARKER_RE = /(?:flowchart-v2-point(?:End|Start)(?:-margin)?|stateDiagram-barbEnd|(?:^|-)arrowhead|filled-head|stick-arrowhead|solidTopArrowHead|solidBottomArrowHead|requirement_arrowEnd|classDiagram-(?:dependency|extension)(?:Start|End)(?:-margin)?)$/;
// “高”是从底边中点到尖端、沿箭头方向的距离。SVG 中对应 x 轴，
// 不能把 markerHeight > markerWidth 当作三角形高大于底边。
const TRIANGLE_ASPECT = 1.25;
const CONNECTED_EDGE_SELECTOR = ".flowchart-link, .relation, .relationshipLine, .transition";
const PATH_NUMBER = String.raw`[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?`;

function markerReferenceId(value) {
  return String(value || "").match(/^url\(#([^)]+)\)$/)?.[1] || "";
}

function edgeDirection(element, endpoint = "end") {
  let from = null;
  let to = null;
  if (element.localName === "line") {
    const start = {
      x: Number(element.getAttribute("x1")),
      y: Number(element.getAttribute("y1")),
    };
    const end = {
      x: Number(element.getAttribute("x2")),
      y: Number(element.getAttribute("y2")),
    };
    if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) return "";
    // marker-end 画在 x2/y2，marker-start 画在 x1/y1。Mermaid 的时序图
    // 会把 line 的端点按语义方向反写，不能拿坐标先后顺序当视觉方向。
    from = endpoint === "start" ? end : start;
    to = endpoint === "start" ? start : end;
  } else if (element.localName === "polyline" || element.localName === "polygon") {
    const values = (element.getAttribute("points") || "").match(new RegExp(PATH_NUMBER, "gi"))?.map(Number) || [];
    if (values.length < 4) return "";
    const start = { x: values[0], y: values[1] };
    const end = { x: values[values.length - 2], y: values[values.length - 1] };
    const beforeEnd = values.length >= 6
      ? { x: values[values.length - 4], y: values[values.length - 3] }
      : start;
    const afterStart = values.length >= 6 ? { x: values[2], y: values[3] } : end;
    from = endpoint === "start" ? afterStart : beforeEnd;
    to = endpoint === "start" ? start : end;
  } else if (element.localName === "path" && typeof element.getTotalLength === "function") {
    try {
      const length = element.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) return "";
      const sample = Math.min(8, length / 2);
      from = element.getPointAtLength(endpoint === "start" ? sample : length - sample);
      to = element.getPointAtLength(endpoint === "start" ? 0 : length);
    } catch {
      return "";
    }
  }
  if (!from || !to) return "";
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  if (Math.abs(dx) + Math.abs(dy) < 0.01) return "";
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

function authoredStroke(element) {
  if (element.hasAttribute("data-gptm-theme-stroke")) return "";
  const inline = element.style?.getPropertyValue("stroke") || "";
  const attribute = element.getAttribute("stroke") || "";
  const value = inline || attribute;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "none") return "";
  if (!inline && ["black", "#000", "#000000", "rgb(0, 0, 0)"].includes(normalized)) return "";
  return value.trim();
}

function triangleRole(markerId, endpoint = "end") {
  const originalId = markerId.replace(/-gptm-\d+-(?:right|down|left|up)-(?:start|end)$/, "");
  if (!TRIANGLE_MARKER_RE.test(originalId)) return "";
  return /pointStart/.test(markerId) || endpoint === "start" ? "start" : "end";
}

function triangleSize(svg, edge) {
  const viewBox = (svg.getAttribute("viewBox") || "").trim().split(/[ ,]+/).map(Number);
  const width = Number.isFinite(viewBox[2]) && viewBox[2] > 0 ? viewBox[2] : Number(svg.getAttribute("width")) || 800;
  const height = Number.isFinite(viewBox[3]) && viewBox[3] > 0 ? viewBox[3] : Number(svg.getAttribute("height")) || 600;
  // 所有三角形共用同一高/底比例，只按画布尺寸做很轻微的自适应。
  const strokeWidth = parseFloat(getComputedStyle(edge).strokeWidth) || 1.6;
  const markerCount = ["start", "end"].filter((endpoint) => triangleRole(
    markerReferenceId(edge.getAttribute(`marker-${endpoint}`)), endpoint
  )).length;
  const length = edge.getTotalLength?.() || Infinity;
  const portSpan = Number(edge.getAttribute("data-gptm-port-span")) || Infinity;
  return Math.min(18, portSpan * TRIANGLE_ASPECT * 0.7, length / (markerCount + 0.5), Math.max(11, Math.max(width, height) / 100, strokeWidth * 3.5));
}

function directionalMarker(svg, edge, sourceMarker, color, direction, endpoint, markerCache) {
  const markerId = sourceMarker.id;
  const depth = triangleSize(svg, edge);
  const key = `${markerId}|${color}|${endpoint}|${depth}`;
  if (markerCache.has(key)) return markerCache.get(key);
  const clone = sourceMarker.cloneNode(true);
  const cloneId = `${markerId}-gptm-${markerCache.size}-${direction}-${endpoint}`;
  clone.id = cloneId;
  clone.style.setProperty("stroke", color);
  const role = triangleRole(markerId, endpoint);
  if (role) {
    // 统一所有图种的三角箭头：顶点固定在路径端点，底边向后展开。
    // 固定 10×8 的几何比例；仅同比缩放，禁止按图种分别拉伸。
    clone.setAttribute("viewBox", "0 0 10 8");
    clone.setAttribute("markerWidth", String(depth));
    clone.setAttribute("markerHeight", String(depth / TRIANGLE_ASPECT));
    clone.setAttribute("markerUnits", "userSpaceOnUse");
    clone.setAttribute("refX", "10");
    clone.setAttribute("refY", "4");
    clone.setAttribute("orient", role === "start" ? "auto-start-reverse" : "auto");
    for (const shape of clone.querySelectorAll("path, polygon")) shape.remove();
    const shape = clone.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
    shape.setAttribute("d", "M 0 0 L 10 4 L 0 8 Z");
    shape.style.setProperty("fill", color);
    shape.style.setProperty("stroke", "none");
    shape.style.setProperty("stroke-width", "0");
    clone.append(shape);
  } else {
    for (const shape of clone.querySelectorAll("path, polygon, polyline, line, circle")) {
      shape.style.setProperty("stroke", color);
    }
  }
  sourceMarker.parentNode?.append(clone);
  markerCache.set(key, cloneId);
  return cloneId;
}

function colorDirectionalEdges(svg, variables) {
  const markerCache = new Map();
  const connectors = new Set(svg.querySelectorAll(
    "path[marker-end], path[marker-start], line[marker-end], line[marker-start], polyline[marker-end], polyline[marker-start], " +
    ".flowchart-link, .transition, .relationshipLine, .relation, .messageLine0, .messageLine1, .arrow"
  ));
  for (const edge of connectors) {
    const endDirection = edgeDirection(edge, "end");
    const startDirection = edgeDirection(edge, "start");
    const hasStartMarker = Boolean(markerReferenceId(edge.getAttribute("marker-start")));
    const hasEndMarker = Boolean(markerReferenceId(edge.getAttribute("marker-end")));
    // 只有 marker-start 的边（如 classDiagram 继承关系）视觉上由起点箭头
    // 指示方向；若仍优先采用路径末端的反向方向，线体和箭头会变成两种颜色。
    const direction = hasEndMarker
      ? endDirection || startDirection
      : hasStartMarker
        ? startDirection || endDirection
        : endDirection || startDirection;
    if (!direction) continue;
    const authored = authoredStroke(edge);
    const color = authored || variables[DIRECTION_KEYS[direction]] || variables.lineColor;
    ensureCssClass(edge, `gptm-edge-${direction}`);
    edge.setAttribute("data-gptm-direction", direction);
    if (!authored) edge.style.setProperty("stroke", color);
    if (edge.hasAttribute("marker-start") || edge.hasAttribute("marker-end")) {
      // marker 的尖端已经压在路径末端，圆头 cap 还会再向右探出半个线宽，
      // 视觉上就像箭头顶点没有落在线段端点上。
      edge.style.setProperty("stroke-linecap", "butt");
    }
    for (const attribute of ["marker-start", "marker-end"]) {
      const markerId = markerReferenceId(edge.getAttribute(attribute));
      if (!markerId) continue;
      const marker = svg.getElementById(markerId);
      if (!marker) continue;
      const markerDirection = attribute === "marker-start" ? startDirection || direction : endDirection || direction;
      const markerColor = authored || (
        triangleRole(markerId, attribute === "marker-start" ? "start" : "end")
          ? variables[DIRECTION_KEYS[markerDirection]] || color
          // ER 基数、UML 菱形等不是箭头，跟随整条边的颜色，避免同一关系
          // 的语义标记出现与线体相反的方向色。
          : color
      );
      const cloneId = directionalMarker(svg, edge, marker, markerColor, markerDirection, attribute === "marker-start" ? "start" : "end", markerCache);
      edge.setAttribute(attribute, `url(#${cloneId})`);
    }
  }
}

function localPoint(element, atStart) {
  if (element.localName === "line") {
    return {
      x: Number(element.getAttribute(atStart ? "x1" : "x2")),
      y: Number(element.getAttribute(atStart ? "y1" : "y2")),
    };
  }
  if (element.localName === "polyline") {
    const values = (element.getAttribute("points") || "").match(new RegExp(PATH_NUMBER, "gi"))?.map(Number) || [];
    if (values.length < 4) return null;
    return atStart
      ? { x: values[0], y: values[1] }
      : { x: values[values.length - 2], y: values[values.length - 1] };
  }
  if (element.localName === "path" && typeof element.getPointAtLength === "function") {
    try {
      const point = element.getPointAtLength(atStart ? 0 : element.getTotalLength());
      return Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : null;
    } catch {
      return null;
    }
  }
  return null;
}

function toScreen(element, pointValue) {
  const matrix = element.getScreenCTM?.();
  if (!matrix || !pointValue) return null;
  const point = new DOMPoint(pointValue.x, pointValue.y).matrixTransform(matrix);
  return { x: point.x, y: point.y };
}

function toLocal(element, pointValue) {
  const matrix = element.getScreenCTM?.();
  if (!matrix || !pointValue) return null;
  const point = new DOMPoint(pointValue.x, pointValue.y).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}

function layoutPoints(edge) {
  try {
    const points = JSON.parse(atob(edge.getAttribute("data-points") || ""));
    return Array.isArray(points) && points.length >= 2
      && points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) ? points : null;
  } catch {
    return null;
  }
}

function nodeOutlines(svg) {
  return [...svg.querySelectorAll("g.node, g.cluster, g.statediagram-cluster, g.edgeLabel[data-gptm-label-owner]")].map((node) => {
    const container = nodeShape(node) || node.querySelector("g.label rect.background,rect.labelBkg");
    if (!container) return null;
    const shape = container instanceof SVGGeometryElement ? container : container.querySelector("path,rect,polygon,circle,ellipse");
    if (!shape || typeof shape.isPointInFill !== "function") return null;
    const geometries = container instanceof SVGGeometryElement ? [container]
      : [...container.querySelectorAll("path,rect,polygon,circle,ellipse")];
    const box = shape.getBoundingClientRect();
    const painted = geometries.map((geometry) => {
      const style = getComputedStyle(geometry);
      return { geometry, fill: style.fill !== "none", stroke: style.stroke !== "none" };
    });
    const contains = (point) => painted.some(({ geometry, fill, stroke }) => {
      const local = toLocal(geometry, point);
      if (!local) return false;
      const probe = new DOMPoint(local.x, local.y);
      return (fill && geometry.isPointInFill(probe)) || (stroke && geometry.isPointInStroke(probe));
    });
    const area = (point) => geometries.some((geometry) => {
      const local = toLocal(geometry, point);
      return local && geometry.isPointInFill(new DOMPoint(local.x, local.y));
    });
    const fullBox = container.getBoundingClientRect();
    return box.width > 0 && box.height > 0 ? { node, shape, box: fullBox, contains, area } : null;
  }).filter(Boolean);
}

function boundaryDistance(point, box) {
  const outside = Math.hypot(
    Math.max(box.left - point.x, 0, point.x - box.right),
    Math.max(box.top - point.y, 0, point.y - box.bottom)
  );
  return outside || Math.min(point.x - box.left, box.right - point.x, point.y - box.top, box.bottom - point.y);
}

function contourIntersection(anchor, adjacent, outlines, authoritative = false) {
  // 布局器的完整端点才是归属证据。只允许其所在边界的图形参与求交，
  // 禁止用 28px 最近节点猜连接对象，尤其不能误吸附到簇或边标签。
  const magnitude = Math.hypot(anchor.x - adjacent.x, anchor.y - adjacent.y);
  if (!magnitude) return null;
  const vector = { x: (anchor.x - adjacent.x) / magnitude, y: (anchor.y - adjacent.y) / magnitude };
  const candidates = outlines.filter(({ box, contains }) => {
    if (authoritative) return true;
    if (boundaryDistance(anchor, box) < 1.5) return true;
    return !contains({ x: anchor.x - vector.x * 2, y: anchor.y - vector.y * 2 })
      && contains({ x: anchor.x + vector.x * 2, y: anchor.y + vector.y * 2 });
  }).sort((a, b) => a.box.width * a.box.height - b.box.width * b.box.height);
  for (const { box, contains, area } of candidates) {
    // 尖端接触描边外缘而非描边中心；否则节点后绘制的半个描边会盖住
    // 三角形最后一小截，最大放大后仍看成截平的头。
    // 即使透明 fill:none，闭合轮廓仍有几何内部。用它定位近侧，不允许
    // 低密度采样跳过细描边而误命中节点的远侧。
    const position = (distance) => ({ x: anchor.x + vector.x * distance, y: anchor.y + vector.y * distance });
    const inside = (distance) => area(position(distance));
    const reach = Math.max(4, Math.abs(vector.x) * box.width + Math.abs(vector.y) * box.height);
    let outside = -2;
    if (inside(outside)) continue;
    let hit = null;
    // 在完整轮廓上求交，圆角、圆、椭圆、多边形及数据库轮廓都共用浏览器
    // 的 SVG 几何，不另造“矩形包围盒等于形状”的错误假设。
    for (let step = 0; step <= 96; step++) {
      const distance = -2 + (reach + 2) * step / 96;
      if (inside(distance)) { hit = distance; break; }
      outside = distance;
    }
    if (hit === null) continue;
    for (let iteration = 0; iteration < 20; iteration++) {
      const middle = (outside + hit) / 2;
      if (inside(middle)) hit = middle;
      else outside = middle;
    }
    const centerBoundary = hit;
    outside = -2;
    hit = centerBoundary;
    if (contains(position(centerBoundary))) {
      for (let iteration = 0; iteration < 24; iteration++) {
        const middle = (outside + hit) / 2;
        if (contains(position(middle))) hit = middle;
        else outside = middle;
      }
    }
    return position(hit);
  }
  return null;
}

function rewritePathEndpoint(path, atStart, local) {
  const data = path.getAttribute("d") || "";
  if (atStart) {
    const next = data.replace(
      new RegExp(`^(\\s*[Mm]\\s*)(${PATH_NUMBER})(?:\\s*,\\s*|\\s+)(${PATH_NUMBER})`),
      (_match, command, _x, _y) => `${command}${local.x} ${local.y}`
    );
    if (next !== data) path.setAttribute("d", next);
    return;
  }
  const next = data.replace(
    new RegExp(`(${PATH_NUMBER})(\\s*,\\s*|\\s+)(${PATH_NUMBER})(\\s*)$`),
    (_match, _x, separator, _y, tail) => `${local.x}${separator}${local.y}${tail}`
  );
  if (next !== data) path.setAttribute("d", next);
}

function repairEdgeConnections(svg, onlyElement = null) {
  const outlines = nodeOutlines(svg);
  const elements = onlyElement
    ? (onlyElement.matches?.(`${CONNECTED_EDGE_SELECTOR}, [data-gptm-source]`) ? [onlyElement] : [])
    : svg.querySelectorAll(`${CONNECTED_EDGE_SELECTOR}, [data-gptm-source]`);
  for (const edge of elements) {
    const points = layoutPoints(edge);
    if (!points) continue;
    for (const atStart of [true, false]) {
      // 非三角形标记保留上游的基数/菱形/lollipop 距离契约。
      const attribute = atStart ? "marker-start" : "marker-end";
      const markerId = markerReferenceId(edge.getAttribute(attribute));
      if (markerId && !triangleRole(markerId, atStart ? "start" : "end")) continue;
      const index = atStart ? 0 : points.length - 1;
      const other = atStart ? 1 : points.length - 2;
      const anchor = toScreen(edge, points[index]);
      const adjacent = toScreen(edge, points[other]);
      if (!anchor || !adjacent) continue;
      const ownerId = edge.getAttribute(atStart ? "data-gptm-source" : "data-gptm-target");
      const known = ownerId && outlines.filter((outline) => outline.node.id === ownerId);
      const target = contourIntersection(anchor, adjacent, known?.length ? known : outlines, Boolean(known?.length));
      if (!target) continue;
      const snappedLocal = toLocal(edge, target);
      if (!snappedLocal) continue;
      if (edge.localName === "line") {
        edge.setAttribute(atStart ? "x1" : "x2", String(snappedLocal.x));
        edge.setAttribute(atStart ? "y1" : "y2", String(snappedLocal.y));
      } else if (edge.localName === "polyline") {
        const values = (edge.getAttribute("points") || "").match(new RegExp(PATH_NUMBER, "gi"))?.map(Number) || [];
        if (values.length < 4) continue;
        if (atStart) {
          values[0] = snappedLocal.x;
          values[1] = snappedLocal.y;
        } else {
          values[values.length - 2] = snappedLocal.x;
          values[values.length - 1] = snappedLocal.y;
        }
        edge.setAttribute("points", values.join(","));
      } else {
        rewritePathEndpoint(edge, atStart, snappedLocal);
      }
    }
  }
}

function repairSequenceConnections(svg) {
  for (const edge of svg.querySelectorAll('[data-et="message"]')) {
    for (const atStart of [true, false]) {
      const point = localPoint(edge, atStart);
      if (!point) continue;
      let adjacent;
      if (edge.localName === "path") {
        const length = edge.getTotalLength();
        adjacent = edge.getPointAtLength(atStart ? Math.min(2, length) : Math.max(0, length - 2));
      } else {
        adjacent = localPoint(edge, !atStart);
      }
      if (!adjacent) continue;
      const anchor = sequenceAnchor(
        svg, edge.getAttribute(atStart ? "data-from" : "data-to"), point.y, point.x, adjacent.x
      );
      if (!anchor) continue;
      if (edge.localName === "line") {
        edge.setAttribute(atStart ? "x1" : "x2", String(anchor.border));
      } else if (edge.localName === "path") {
        rewritePathEndpoint(edge, atStart, { x: anchor.border, y: point.y });
      }
    }
  }
}

async function attachForGeometry(svg, callback) {
  if (typeof document === "undefined" || !document.body) return null;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;left:-100000px;top:0;width:max-content;height:max-content;pointer-events:none;";
  // 先净化再挂载，测量阶段也不能让上游脚本/foreignObject/远端资源进入文档。
  const cleanDoc = new DOMParser().parseFromString(
    sanitizeSvgMarkup(new XMLSerializer().serializeToString(svg)), "image/svg+xml"
  );
  const live = document.importNode(cleanDoc.documentElement, true);
  host.append(live);
  document.body.append(host);
  try {
    return await callback(live);
  } finally {
    host.remove();
  }
}

async function postProcessSvg(svgMarkup, variables, graph, config = {}) {
  const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const svg = doc.documentElement;
  if (doc.querySelector("parsererror") || svg?.localName !== "svg") return svgMarkup;

  // 某些版本的 Mermaid 不会给判定框附加类名；用圆角矩形节点中常见的
  // labelPadding 差异无法可靠区分，因此优先保留上游类名，缺失时由
  // gpt-mermaid 的 question 补丁负责添加。
  for (const node of svg.querySelectorAll("g.node")) {
    const rect = node.querySelector(":scope > rect.basic.label-container");
    if (!rect) continue;
    const rx = Number(rect.getAttribute("rx"));
    if (Number.isFinite(rx) && rx > 0) {
      rect.setAttribute("rx", String(Math.max(12, rx)));
      rect.setAttribute("ry", String(Math.max(12, rx)));
    }
  }

  // 边标签：与 ChatGPT 一样使用无框大圆角胶囊。
  for (const labelGroup of svg.querySelectorAll("g.edgeLabel g.label")) {
    const rect = labelGroup.querySelector("rect.background");
    if (!rect) continue;
    const width = Number(rect.getAttribute("width"));
    const height = Number(rect.getAttribute("height"));
    const x = Number(rect.getAttribute("x"));
    const y = Number(rect.getAttribute("y"));
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) continue;
    const nextWidth = width + 16;
    const nextHeight = Math.max(26, height + 6);
    rect.setAttribute("x", String(x - (nextWidth - width) / 2));
    rect.setAttribute("y", String(y - (nextHeight - height) / 2));
    rect.setAttribute("width", String(nextWidth));
    rect.setAttribute("height", String(nextHeight));
    rect.setAttribute("rx", "13");
    rect.setAttribute("ry", "13");
    rect.style.removeProperty("stroke");
  }

  // 非流程图图种的柔和化：把上游硬编码的亮蓝描边和蓝色分割线
  // 替换为主题里的低饱和色。
  for (const pathEl of svg.querySelectorAll("g.outer-path path, g.divider path")) {
    if (pathEl.getAttribute("fill") === "#e5f2ff") pathEl.setAttribute("fill", variables.flowchartNodeColor);
    if (pathEl.getAttribute("stroke") === "#339cff") {
      pathEl.setAttribute("stroke", pathEl.closest(".divider") ? variables.flowchartLineColor : variables.flowchartNodeBorderColor);
      pathEl.setAttribute("stroke-width", "1");
    }
  }
  for (const marker of svg.querySelectorAll('marker[id$="-barbEnd"] path')) {
    marker.setAttribute("fill", variables.lineColor);
    marker.setAttribute("stroke", variables.lineColor);
  }
  for (const marker of svg.querySelectorAll('marker[id$="-sequencenumber"] circle')) {
    marker.setAttribute("fill", variables.lineColor);
    marker.setAttribute("stroke", "#ffffff");
    marker.setAttribute("stroke-width", "1");
  }
  for (const element of svg.querySelectorAll("[filter]")) {
    if (/drop-shadow/i.test(element.getAttribute("filter") || "")) element.removeAttribute("filter");
  }

  for (const node of svg.querySelectorAll("g.node")) {
    if (node.classList.contains("mermaid-decision")) ensureCssClass(node, "mgpt-decision");
  }
  // 连线贴边需要真实浏览器的布局坐标；在不支持 DOM 测量的环境里保持
  // 原 SVG，不能因为无法测量而丢掉整张图。
  const measured = await attachForGeometry(svg, async (live) => {
    fixSvgLabels(live, variables);
    if (graph?.state) {
      await layoutStateSvg(live, graph.state, graph.layout, variables, config.signal);
      repairEdgeConnections(live);
    } else {
    if (graph?.edges) {
      applyAdaptiveFlowLayout(live, graph, config.adaptiveLayout);
      routeFlowEdges(live, graph);
    }
    routeC4Edges(live, graph, variables);
    routeNativeEdges(live);
    repairEdgeConnections(live);
    repairSequenceConnections(live);
    placeEdgeLabels(live);
    resolveEdgeCrossings(live, repairEdgeConnections);
    if (live.classList?.contains("statediagram")) {
      // 通用交叉器负责发现并清掉全局冲突；state 最终几何必须再由专用
      // 正交路由器写回，避免其斜线候选成为最终可见路径。
      routeNativeEdges(live);
      repairEdgeConnections(live);
      placeEdgeLabels(live);
    }
    }
    if (graph || Number(live.getAttribute("data-gptm-native-routes")) > 0
        || live.hasAttribute("data-gptm-planar-layout")
        || Number(live.getAttribute("data-gptm-spacing-factor")) > 1) fitSvgBounds(live);
    colorDirectionalEdges(live, variables);
    const shafts = trimArrowShafts(live);
    live.setAttribute("data-gptm-trimmed-shafts", String(shafts.trimmed));
    live.setAttribute("data-gptm-shaft-skips", String(shafts.skipped.length));
    recordCrossings(live);
    return new XMLSerializer().serializeToString(live);
  });
  return measured || new XMLSerializer().serializeToString(svg);
}

// 下载可共享同一实例；串行锁与初始化缓存也必须跟随实例，不能各 renderer 自管。
const runtimeStates = new WeakMap();

function runtimeState(runtime) {
  let state = runtimeStates.get(runtime);
  if (!state) {
    state = { queue: createSerialScheduler(), configKey: null };
    runtimeStates.set(runtime, state);
  }
  return state;
}

export function createRenderer(baseUrl = globalThis.document?.baseURI) {
  let sequence = 0;

  function runtime(config = {}, signal) {
    return loadRuntime(config, baseUrl, signal);
  }

  function initialize(mermaid, config, flowchart, stateDiagram) {
    const layout = flowchart ? "elk" : "dagre";
    const nextKey = JSON.stringify({ preset: config.preset, themeVariables: config.themeVariables,
      isDark: config.isDark, layout, state: stateDiagram ? "wide" : "default" });
    const state = runtimeState(mermaid);
    if (state.configKey === nextKey) return;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "base",
      themeVariables: config.themeVariables,
      layout,
      themeCSS: flowchart ? buildFlowchartThemeCSS(config.themeVariables) : buildGlobalThemeCSS(config.themeVariables),
      darkMode: false,
      fontFamily: config.fontFamily,
      htmlLabels: false,
      look: "classic",
      flowchart: {
        useMaxWidth: false,
        curve: "basis",
        minNodeWidth: 0,
        wrappingWidth: 200,
        subGraphTitleMargin: { top: 8, bottom: 12 },
      },
      sequence: { useMaxWidth: false },
      gantt: { useMaxWidth: false },
      journey: { useMaxWidth: false },
      class: { useMaxWidth: false },
      // 状态图默认 wrappingWidth 约 120，会把 WAIT_CONDITION 这类状态名
      // 强行拆行；放宽到 360 后由节点宽度自然决定是否换行。
      state: stateDiagram
        ? { useMaxWidth: false, wrappingWidth: 360, nodeSpacing: 140, rankSpacing: 90 }
        : { useMaxWidth: false, wrappingWidth: 360 },
      er: { useMaxWidth: false },
      pie: { useMaxWidth: false },
      quadrantChart: { useMaxWidth: false },
      xyChart: { useMaxWidth: false },
      requirement: { useMaxWidth: false },
      mindmap: { useMaxWidth: false },
      kanban: { useMaxWidth: false },
      timeline: { useMaxWidth: false },
      gitGraph: { useMaxWidth: false },
      c4: { useMaxWidth: false },
      sankey: { useMaxWidth: false },
      block: { useMaxWidth: false },
      packet: { useMaxWidth: false },
      architecture: { useMaxWidth: false },
      radar: { useMaxWidth: false },
    });
    state.configKey = nextKey;
  }

  async function renderSvg(rawSource, config = {}) {
    const source = sanitizeMermaidSource(rawSource);
    if (!source) throw new Error("gpt-mermaid: diagram source is empty or contains blocked directives");
    const timeoutMs = positiveTimeout(
      config.renderTimeoutMs ?? config.timeoutMs,
      DEFAULT_RENDER_TIMEOUT_MS,
    );
    // 下载、排队、执行分别计时，预加载与 renderSvg 消费同一下载记录。
    const mermaid = await runtime(config, config.signal);
    const renderQueue = runtimeState(mermaid).queue;
    return renderQueue.schedule(async (signal) => {
      throwIfAborted(signal);
      const flowchart = isFlowchart(source);
      const stateDiagram = isStateDiagram(source);
      initialize(mermaid, config, flowchart, stateDiagram);
      const id = `mgpt-${Date.now().toString(36)}-${++sequence}`;
      const result = await mermaid.render(id, source);
      throwIfAborted(signal);
      if (!result?.svg) throw new Error("gpt-mermaid: renderer returned no SVG");
      let graph;
      if (stateDiagram && result.gptMermaidStateModel) {
        graph = { state: result.gptMermaidStateModel, layout: mermaid.gptMermaidLayout };
      } else if (mermaid.mermaidAPI?.getDiagramFromText && (flowchart || /^\s*C4\w+/m.test(source))) {
        const diagram = await mermaid.mermaidAPI.getDiagramFromText(source);
        throwIfAborted(signal);
        if (flowchart && diagram.db.getData) graph = { ...diagram.db.getData(), direction: diagram.db.getDirection() };
        else if (diagram.db.getRels) graph = { c4Nodes: diagram.db.getC4ShapeArray(), c4Relations: diagram.db.getRels() };
      }
      const themeCSS = flowchart ? buildFlowchartThemeCSS(config.themeVariables) : buildGlobalThemeCSS(config.themeVariables);
      // 上游 runtime 已获取 themeCSS；这里重新把非流程图主题文件也写入
      // 一个内联 style，兼容不支持 mermaid.initialize themeCSS 的旧构建。
      let svg = result.svg;
      if (!flowchart && themeCSS && !svg.includes("mgpt-global-theme")) {
        const style = `<style id="mgpt-global-theme">${themeCSS}</style>`;
        svg = svg.replace(/<svg\b[^>]*>/, (tag) => `${tag}${style}`);
      }
      const processed = await postProcessSvg(svg, config.themeVariables, graph, { ...config, signal });
      throwIfAborted(signal);
      const clean = sanitizeSvgMarkup(processed);
      const size = svgSize(clean);
      const root = new DOMParser().parseFromString(clean, "image/svg+xml").documentElement;
      return {
        svg: clean,
        width: size.width,
        height: size.height,
        source,
        routing: {
          status: root.getAttribute("data-gptm-routing-status") || "not-applicable",
          checkedEdges: Number(root.getAttribute("data-gptm-checked-edges")) || 0,
          crossings: Number(root.getAttribute("data-gptm-crossings")) || 0,
          crossingsBefore: Number(root.getAttribute("data-gptm-crossings-before")) || 0,
          spacingFactor: Number(root.getAttribute("data-gptm-spacing-factor")) || 1,
          reason: root.getAttribute("data-gptm-routing-reason") || "",
        },
      };
    }, {
      signal: config.signal,
      timeoutMs,
      timeoutMessage: "gpt-mermaid: render timed out",
    });
  }

  function load(config = {}) {
    return runtime(config, config.signal);
  }

  return { renderSvg, load, postProcessSvg };
}

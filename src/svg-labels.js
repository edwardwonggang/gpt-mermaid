/*
 * 职责：校准节点标题、边标签、旅程图文字和时序图序号。
 * 调用方：render.js 的净化后离屏 SVG 测量；依赖：浏览器 SVG 几何。
 * 红线：不改 ER 属性列、类图成员的合法左对齐；这些列由布局器独立定位。
 */
import { boundsInSvg, fromSvg, inSvg, readPoints } from "./svg-routing.js";

function shift(element, x, y) {
  if (Math.abs(x) + Math.abs(y) < 0.001) return;
  element.setAttribute("transform", `translate(${x}, ${y}) ${element.getAttribute("transform") || ""}`.trim());
}

function centerTitles(svg) {
  for (const node of svg.querySelectorAll("g.node")) {
    const labels = [...node.querySelectorAll(":scope > g.label")];
    const label = labels.find((item) => item.classList.contains("name"))
      || (labels.length === 1 ? labels[0] : null);
    const shape = node.querySelector(":scope > .label-container, :scope > .outer-path");
    if (!label || !shape || !label.textContent.trim()) continue;
    const texts = [...label.querySelectorAll("text")].filter((text) => text.textContent.trim());
    if (!texts.length) continue;
    const box = shape.getBoundingClientRect();
    const textBoxes = texts.map((text) => text.getBoundingClientRect());
    const left = Math.min(...textBoxes.map((item) => item.left));
    const right = Math.max(...textBoxes.map((item) => item.right));
    const inverse = node.getScreenCTM()?.inverse();
    if (!inverse) continue;
    const center = new DOMPoint((left + right) / 2, textBoxes[0].top).matrixTransform(inverse);
    const target = new DOMPoint(box.left + box.width / 2, box.top).matrixTransform(inverse);
    // 只平移整个标题，保留 tspan 的换行、锚点与子变换，避免双重减去文字宽度。
    shift(label, target.x - center.x, 0);
  }
}

function journeyLabels(svg, variables) {
  for (const text of svg.querySelectorAll("text.journey-section, text.task")) {
    // 上游 rect 与 text 共用 section-type-N；系列色规则会把标题涂成背景色。
    text.style.setProperty("fill", variables.textColor, "important");
    text.style.setProperty("font-family", variables.fontFamily);
    text.style.setProperty("font-weight", "600");
    for (const span of text.querySelectorAll("tspan")) span.style.setProperty("fill", variables.textColor, "important");
  }
}

function c4Labels(svg) {
  for (const node of svg.querySelectorAll(".c4-shape")) {
    const background = node.querySelector(".label-container rect, .label-container");
    const rgb = background && getComputedStyle(background).fill.match(/[\d.]+/g)?.map(Number);
    if (!rgb || rgb.length < 3) continue;
    const luminance = rgb.slice(0, 3).map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    // 深蓝使用白色，外部系统的中灰使用深色；统一看实际背景，不按图种猜。
    const fill = luminance < 0.18 ? "#ffffff" : "#172b4d";
    for (const text of node.querySelectorAll("text, tspan")) text.style.setProperty("fill", fill, "important");
  }
}

function overlaps(a, b, gap = 5) {
  return a.x < b.right + gap && a.right > b.x - gap && a.y < b.bottom + gap && a.bottom > b.y - gap;
}

export function placeEdgeLabels(svg) {
  const paths = new Map([...svg.querySelectorAll("[data-id]")].filter((p) => p instanceof SVGGeometryElement)
    .map((p) => [p.dataset.id, p]));
  const nodes = [...svg.querySelectorAll("g.node > .label-container, g.node > .outer-path")].map((n) => boundsInSvg(svg, n));
  const occupied = [];
  for (const label of svg.querySelectorAll("g.edgeLabel")) {
    const id = label.querySelector("[data-id]")?.dataset.id || label.dataset.id;
    const edge = paths.get(id);
    if (!edge) continue;
    const box = boundsInSvg(svg, label), old = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (box.width === 0 || box.height === 0) continue;
    const length = edge.getTotalLength(), candidates = [];
    if (!Number.isFinite(length) || length < 1) continue;
    const add = (offset) => {
      const point = inSvg(svg, edge, edge.getPointAtLength(offset));
      const proposed = { x: point.x - box.width / 2, y: point.y - box.height / 2,
        right: point.x + box.width / 2, bottom: point.y + box.height / 2 };
      const a = inSvg(svg, edge, edge.getPointAtLength(Math.max(0, offset - 4)));
      const b = inSvg(svg, edge, edge.getPointAtLength(Math.min(length, offset + 4)));
      const diagonal = Math.min(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      const collision = [...nodes, ...occupied].filter((n) => overlaps(proposed, n)).length;
      // 端点附近必须给箭头留空间；优先保留原标签所在段而非挪到另一条分支。
      const nearEnd = Math.min(offset, length - offset) < Math.max(box.width, box.height) / 2 + 16;
      candidates.push({ point, proposed, score: collision * 1e6 + (nearEnd ? 1e4 : 0)
        + diagonal * 20 + Math.hypot(point.x - old.x, point.y - old.y) });
    };
    const steps = Math.min(1000, Math.max(20, Math.ceil(length / 5)));
    for (let i = 1; i < steps; i++) add(length * i / steps);
    const points = readPoints(edge);
    if (points) {
      // 采样之外再投影原中心，消除采样步长造成的可见沿线跳动。
      let bestOffset = 0, bestDistance = Infinity;
      for (let i = 0; i <= steps; i++) {
        const offset = length * i / steps, p = inSvg(svg, edge, edge.getPointAtLength(offset));
        const d = Math.hypot(p.x - old.x, p.y - old.y);
        if (d < bestDistance) { bestDistance = d; bestOffset = offset; }
      }
      let lo = Math.max(0, bestOffset - length / steps), hi = Math.min(length, bestOffset + length / steps);
      for (let i = 0; i < 20; i++) {
        const l = lo + (hi - lo) / 3, r = hi - (hi - lo) / 3;
        const a = inSvg(svg, edge, edge.getPointAtLength(l)), b = inSvg(svg, edge, edge.getPointAtLength(r));
        if (Math.hypot(a.x - old.x, a.y - old.y) < Math.hypot(b.x - old.x, b.y - old.y)) hi = r; else lo = l;
      }
      add((lo + hi) / 2);
    }
    candidates.sort((a, b) => a.score - b.score);
    const target = candidates[0];
    if (!target) continue;
    const before = fromSvg(svg, label.parentElement, old), after = fromSvg(svg, label.parentElement, target.point);
    shift(label, after.x - before.x, after.y - before.y);
    label.setAttribute("data-gptm-label-edge", edge.id);
    occupied.push(target.proposed);
  }
}

export function sequenceAnchor(svg, actorId, y, referenceX, towardsX) {
  const lifeline = [...svg.querySelectorAll('[data-et="life-line"]')]
    .find((line) => line.getAttribute("data-id") === actorId);
  if (!lifeline) return null;
  const x = Number(lifeline.getAttribute("x1"));
  const activations = [...svg.querySelectorAll('rect[class^="activation"]')].filter((rect) => {
    const box = rect.getBBox();
    return y >= box.y - 0.1 && y <= box.y + box.height + 0.1
      && Math.abs(box.x + box.width / 2 - x) <= box.width * 1.5;
  }).sort((a, b) => {
    const aBox = a.getBBox();
    const bBox = b.getBBox();
    return Math.abs(aBox.x + aBox.width / 2 - referenceX) - Math.abs(bBox.x + bBox.width / 2 - referenceX);
  });
  const activation = activations[0]?.getBBox();
  if (!activation) return { center: x, border: x };
  const center = activation.x + activation.width / 2;
  return { center, border: towardsX >= center ? activation.x + activation.width : activation.x };
}

function sequenceNumbers(svg, variables) {
  for (const text of svg.querySelectorAll("text.sequenceNumber")) {
    const markerLine = text.previousElementSibling;
    const message = markerLine?.previousElementSibling;
    if (markerLine?.localName !== "line" || message?.getAttribute("data-et") !== "message") continue;
    const x = Number(markerLine.getAttribute("x1"));
    const y = Number(markerLine.getAttribute("y1"));
    const source = sequenceAnchor(svg, message.getAttribute("data-from"), y, x, x);
    if (!source) continue;
    markerLine.setAttribute("x1", String(source.center));
    markerLine.setAttribute("x2", String(source.center));
    text.setAttribute("x", String(source.center));
    for (const span of text.querySelectorAll("tspan[x]")) span.setAttribute("x", String(source.center));
    text.style.setProperty("fill", variables.sequenceNumberColor || "#ffffff");
    text.style.setProperty("font-weight", "600");
    const box = text.getBBox();
    shift(text, source.center - (box.x + box.width / 2), y - (box.y + box.height / 2));
  }
}

export function fixSvgLabels(svg, variables) {
  centerTitles(svg);
  journeyLabels(svg, variables);
  sequenceNumbers(svg, variables);
  c4Labels(svg);
}

/*
 * 职责：校准节点标题、边标签、旅程图文字和时序图序号。
 * 调用方：render.js 的净化后离屏 SVG 测量；依赖：浏览器 SVG 几何。
 * 红线：不改 ER 属性列、类图成员的合法左对齐；这些列由布局器独立定位。
 */
import { boundsInSvg, fromSvg, inSvg, readPoints } from "./svg-routing.js";

// 与 render.js 的统一三角家族保持一致；这里单独导出，避免标签避让再次漏掉
// requirement、filled-head 或时序图专用 marker。
const TRIANGLE_MARKER_FAMILY_RE = /(?:point(?:Start|End)(?:-margin)?|barbEnd|(?:^|-)arrowhead|filled-head|stick-arrowhead|solidTopArrowHead|solidBottomArrowHead|requirement_arrowEnd|classDiagram-(?:dependency|extension)(?:Start|End)(?:-margin)?)/;

export function isTriangleMarkerReference(value) {
  return TRIANGLE_MARKER_FAMILY_RE.test(String(value || ""));
}

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

function journeyTextMeasurer(text) {
  const style = getComputedStyle(text);
  const fallback = (value) => Math.max(1, Array.from(String(value)).length * (parseFloat(style.fontSize) || 14) * 0.58);
  if (typeof document === "undefined") return fallback;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return fallback;
    context.font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].filter(Boolean).join(" ");
    return (value) => {
      try {
        const width = context.measureText(String(value)).width;
        return Number.isFinite(width) ? width : fallback(value);
      } catch {
        return fallback(value);
      }
    };
  } catch {
    return fallback;
  }
}

/**
 * 纯函数换行器：measure 由浏览器字体测量或测试桩提供。
 * maxLines 有上限时，最后一轮把剩余内容并入末行，交给 textLength 做横向压缩，
 * 这样超长英文即使用户输入不可控也不会漏字。
 */
export function wrapJourneyText(input, maxWidth, measure, maxLines = 4) {
  const text = String(input ?? "").trim().replace(/\s+/g, " ");
  if (!text) return [];
  const width = Number(maxWidth);
  if (!(width > 0) || typeof measure !== "function") return [text];

  const fits = (value) => {
    try { return measure(value) <= width; } catch { return false; }
  };
  const splitWord = (word) => {
    const chunks = [];
    let chunk = "";
    for (const character of Array.from(word)) {
      const next = chunk + character;
      if (chunk && !fits(next)) {
        chunks.push(chunk);
        chunk = character;
      } else {
        chunk = next;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  };

  const lines = [];
  let current = "";
  let currentBreak = "";
  const flush = () => {
    if (current) lines.push({ text: current, breakBefore: currentBreak });
    current = "";
    currentBreak = "";
  };

  for (const word of text.split(" ")) {
    if (!word) continue;
    if (fits(word)) {
      if (!current) {
        current = word;
        currentBreak = lines.length ? " " : "";
        continue;
      }
      const candidate = `${current} ${word}`;
      if (fits(candidate)) {
        current = candidate;
        continue;
      }
      flush();
      current = word;
      currentBreak = " ";
      continue;
    }

    // 单个词本身就超宽时按字符切分；只有词间的切点保留空格。
    flush();
    const chunks = splitWord(word);
    const wordBreak = lines.length ? " " : "";
    for (let index = 0; index < chunks.length; index++) {
      if (index === chunks.length - 1) {
        current = chunks[index];
        currentBreak = index === 0 ? wordBreak : "";
      } else {
        lines.push({ text: chunks[index], breakBefore: index === 0 ? wordBreak : "" });
      }
    }
  }
  flush();

  const limit = Number(maxLines);
  if (Number.isFinite(limit) && limit > 0 && lines.length > limit) {
    const tailLines = lines.slice(limit - 1);
    const tail = tailLines.map((line, index) => `${index ? line.breakBefore : ""}${line.text}`).join("");
    lines.length = limit - 1;
    lines.push({ text: tail, breakBefore: tailLines[0].breakBefore });
  }
  return lines.map((line) => line.text);
}

function fitJourneyTask(text, variables) {
  if (!text.classList.contains("task")) return;
  const group = text.closest("switch")?.parentElement;
  const rect = group?.querySelector(":scope > rect");
  if (!rect) return;
  const rectBox = rect.getBBox();
  const textBox = text.getBBox();
  if (!(rectBox.width > 0 && rectBox.height > 0)) return;
  // 上游已经放得下时保持原样，避免无谓改写正常短标签。
  if (textBox.x >= rectBox.x - 1 && textBox.x + textBox.width <= rectBox.x + rectBox.width + 1
      && textBox.y >= rectBox.y - 1 && textBox.y + textBox.height <= rectBox.y + rectBox.height + 1) return;

  const style = getComputedStyle(text);
  const originalFontSize = parseFloat(style.fontSize) || 14;
  const maxWidth = Math.max(1, rectBox.width - 10);
  const maxHeight = Math.max(1, rectBox.height - 8);
  const measure = journeyTextMeasurer(text);
  const lines = wrapJourneyText(text.textContent, maxWidth, measure, 4);
  if (!lines.length) return;

  const lineHeight = Math.max(1, Math.min(originalFontSize * 1.25, maxHeight / lines.length));
  const fontSize = Math.max(5, Math.min(originalFontSize, lineHeight / 1.25));
  text.style.setProperty("font-size", `${fontSize}px`, "important");
  const measureFitted = journeyTextMeasurer(text);
  const centerX = rectBox.x + rectBox.width / 2;
  const centerY = rectBox.y + rectBox.height / 2;
  const firstY = centerY - (lines.length - 1) * lineHeight / 2;
  text.setAttribute("x", String(centerX));
  text.setAttribute("y", String(centerY));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  while (text.firstChild) text.removeChild(text.firstChild);
  for (let index = 0; index < lines.length; index++) {
    const span = document.createElementNS(text.namespaceURI, "tspan");
    span.setAttribute("x", String(centerX));
    span.setAttribute("y", String(firstY + index * lineHeight));
    span.textContent = lines[index];
    // 用与换行相同的测量值锁住每行宽度；短行不拉伸，超长行在行内压缩。
    const measured = Math.min(maxWidth, Math.max(1, measureFitted(lines[index])));
    span.setAttribute("textLength", String(measured));
    span.setAttribute("lengthAdjust", "spacingAndGlyphs");
    span.style.setProperty("fill", variables.textColor, "important");
    text.append(span);
  }
}

function journeyLabels(svg, variables) {
  for (const text of svg.querySelectorAll("text.journey-section, text.task")) {
    // 上游 rect 与 text 共用 section-type-N；系列色规则会把标题涂成背景色。
    text.style.setProperty("fill", variables.textColor, "important");
    text.style.setProperty("font-family", variables.fontFamily);
    text.style.setProperty("font-weight", "600");
    for (const span of text.querySelectorAll("tspan")) span.style.setProperty("fill", variables.textColor, "important");
    fitJourneyTask(text, variables);
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

function arrowRegions(svg, edges) {
  const regions = [];
  const view = svg.viewBox.baseVal, canvas = Math.max(view.width, view.height);
  for (const edge of edges) for (const start of [true, false]) {
    const ref = edge.getAttribute(start ? "marker-start" : "marker-end");
    if (!ref || !isTriangleMarkerReference(ref)) continue;
    const length = edge.getTotalLength();
    if (!length) continue;
    const p = inSvg(svg, edge, edge.getPointAtLength(start ? 0 : length));
    const q = inSvg(svg, edge, edge.getPointAtLength(start ? Math.min(.02, length) : Math.max(0, length - .02)));
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (!d) continue;
    const port = Number(edge.getAttribute("data-gptm-port-span")) || Infinity;
    // 在着色生成最终marker之前预留其最大实际深度，不只避让箭头中心线。
    const depth = Math.min(18, port * 1.25 * .7, Math.max(11, canvas / 100)) + 2;
    const vx = (q.x - p.x) / d, vy = (q.y - p.y) / d, half = depth / 2.5;
    const points = [p, { x: p.x + vx * depth + vy * half, y: p.y + vy * depth - vx * half },
      { x: p.x + vx * depth - vy * half, y: p.y + vy * depth + vx * half }];
    regions.push({ x: Math.min(...points.map(p=>p.x)), y: Math.min(...points.map(p=>p.y)),
      right: Math.max(...points.map(p=>p.x)), bottom: Math.max(...points.map(p=>p.y)) });
  }
  return regions;
}

export function placeEdgeLabels(svg) {
  const stateDiagram = Boolean(svg.querySelector("path.transition"));
  const paths = new Map([...svg.querySelectorAll("[data-id]")].filter((p) => p instanceof SVGGeometryElement)
    .map((p) => [p.dataset.id, p]));
  const nodes = [...svg.querySelectorAll("g.node > .label-container, g.node > .outer-path")].map((n) => boundsInSvg(svg, n));
  const lines = [...paths.values()].map((edge) => {
    const length = edge.getTotalLength(), steps = Math.min(2000, Math.max(2, Math.ceil(length / 3)));
    const points = Array.from({ length: steps + 1 }, (_, i) => inSvg(svg, edge, edge.getPointAtLength(length * i / steps)));
    return { edge, points };
  });
  const arrows = arrowRegions(svg, [...paths.values()]);
  const occupied = [];
  const labels = [...svg.querySelectorAll("g.edgeLabel")];
  const available = (label) => {
    const id = label.querySelector("[data-id]")?.dataset.id || label.dataset.id, edge = paths.get(id);
    if (!edge) return Infinity;
    if (edge.hasAttribute("data-gptm-label-x")) return -Infinity;
    const box = boundsInSvg(svg, label);
    return edge.getTotalLength() - Math.max(box.width, box.height);
  };
  // 先放固定通道与空间最紧的短边标签，避免长边抢占唯一可行位置。
  const space = new Map(labels.map((label) => [label, available(label)]));
  const labelBoxes = new Map(labels.map((label) => [label, boundsInSvg(svg, label)]));
  // 宽标签更受线段长度限制，先占位；同宽时再放可用空间更小者。
  labels.sort((a, b) => stateDiagram
    ? (labelBoxes.get(b).width - labelBoxes.get(a).width) || (space.get(a) - space.get(b))
    : space.get(a) - space.get(b));
  for (const label of labels) {
    const id = label.querySelector("[data-id]")?.dataset.id || label.dataset.id;
    const edge = paths.get(id);
    if (!edge) continue;
    const box = labelBoxes.get(label), old = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (box.width === 0 || box.height === 0) continue;
    if (edge.hasAttribute("data-gptm-label-x") && edge.hasAttribute("data-gptm-label-y")) {
      const target = { x: Number(edge.getAttribute("data-gptm-label-x")), y: Number(edge.getAttribute("data-gptm-label-y")) };
      const proposed = { x: target.x - box.width / 2, y: target.y - box.height / 2, right: target.x + box.width / 2, bottom: target.y + box.height / 2 };
      if (![...arrows, ...nodes, ...occupied].some(region => overlaps(proposed, region, 2))) {
        const before = fromSvg(svg, label.parentElement, old), after = fromSvg(svg, label.parentElement, target);
        shift(label, after.x - before.x, after.y - before.y);
        label.setAttribute("data-gptm-label-edge", edge.id);
        occupied.push({ ...proposed, label: true });
        continue;
      }
      edge.removeAttribute("data-gptm-label-x"); edge.removeAttribute("data-gptm-label-y");
    }
    const length = edge.getTotalLength(), candidates = [];
    if (!Number.isFinite(length) || length < 1) continue;
    const add = (offset) => {
      const point = inSvg(svg, edge, edge.getPointAtLength(offset));
      const proposed = { x: point.x - box.width / 2, y: point.y - box.height / 2,
        right: point.x + box.width / 2, bottom: point.y + box.height / 2 };
      const a = inSvg(svg, edge, edge.getPointAtLength(Math.max(0, offset - 4)));
      const b = inSvg(svg, edge, edge.getPointAtLength(Math.min(length, offset + 4)));
      const diagonal = Math.min(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      const collision = nodes.filter((n) => overlaps(proposed, n)).length
        + occupied.filter((n) => overlaps(proposed, n, stateDiagram ? 1 : 5)).length;
      const arrowCollision = arrows.filter((n) => overlaps(proposed, n, 2)).length;
      const foreign = lines.filter((line) => line.edge !== edge
        && line.points.some((p) => stateDiagram
          ? p.x > proposed.x + 0.5 && p.x < proposed.right - 0.5
            && p.y > proposed.y + 0.5 && p.y < proposed.bottom - 0.5
          : p.x > proposed.x - 2 && p.x < proposed.right + 2
            && p.y > proposed.y - 2 && p.y < proposed.bottom + 2)).length;
      // 端点附近必须给箭头留空间；优先保留原标签所在段而非挪到另一条分支。
      const nearEnd = Math.min(offset, length - offset) < Math.max(box.width, box.height) / 2 + 16;
      candidates.push({ point, proposed, score: collision * 1e6 + arrowCollision * 1e6 + foreign * 1e5 + (nearEnd ? 1e4 : 0)
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
    occupied.push({ ...target.proposed, label: true });
  }
  // 初放按顺序完成后再做有界冲突消解。只在冲突数明确下降时沿各自边移动，
  // 因此标签中心仍在线上，也不会为了避让另一个标签而牺牲所属边。
  const placed = (stateDiagram ? labels : []).map((label) => {
    const id = label.querySelector("[data-id]")?.dataset.id || label.dataset.id;
    return { label, edge: paths.get(id), box: boundsInSvg(svg, label) };
  }).filter((item) => item.edge && item.label.textContent.trim());
  const boxConflict = (a, b) => a.x < b.right + 1 && a.right > b.x - 1
    && a.y < b.bottom + 1 && a.bottom > b.y - 1;
  for (let pass = 0; pass < 2; pass++) {
    let changed = false;
    for (const item of placed) {
      const conflicts = placed.filter((other) => other !== item && boxConflict(item.box, other.box)).length;
      if (!conflicts) continue;
      const length = item.edge.getTotalLength(), steps = Math.min(1200, Math.max(20, Math.ceil(length / 4)));
      const old = { x: (item.box.x + item.box.right) / 2, y: (item.box.y + item.box.bottom) / 2 };
      let best = null;
      for (let index = 1; index < steps; index++) {
        const point = inSvg(svg, item.edge, item.edge.getPointAtLength(length * index / steps));
        const proposed = { x: point.x - item.box.width / 2, y: point.y - item.box.height / 2,
          right: point.x + item.box.width / 2, bottom: point.y + item.box.height / 2 };
        if (nodes.some((box) => overlaps(proposed, box)) || arrows.some((box) => overlaps(proposed, box, 2))) continue;
        const nextConflicts = placed.filter((other) => other !== item && boxConflict(proposed, other.box)).length;
        if (nextConflicts >= conflicts) continue;
        const foreign = lines.filter((line) => line.edge !== item.edge
          && line.points.some((p) => p.x > proposed.x + 0.5 && p.x < proposed.right - 0.5
            && p.y > proposed.y + 0.5 && p.y < proposed.bottom - 0.5)).length;
        const score = nextConflicts * 1e6 + foreign * 1e5 + Math.hypot(point.x - old.x, point.y - old.y);
        if (!best || score < best.score) best = { point, proposed, score };
      }
      if (!best) continue;
      const before = fromSvg(svg, item.label.parentElement, old);
      const after = fromSvg(svg, item.label.parentElement, best.point);
      shift(item.label, after.x - before.x, after.y - before.y);
      item.box = best.proposed;
      item.label.setAttribute("data-gptm-label-edge", item.edge.id);
      changed = true;
    }
    if (!changed) break;
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

/*
 * 职责：用 C4 结构化关系恢复边归属，并为穿节点的关系提供正交避障。
 * 调用方：render.js；依赖：svg-routing.js 的同一套坐标和路径算法。
 * 红线：关系数组与实际端点几何双重校验，不能按文字相似度或最近节点猜关系。
 */
import { asPath, boundsInSvg, fromSvg, inSvg, orthogonalRoute, segmentBlocked, writePoints } from "./svg-routing.js";
const NS = "http://www.w3.org/2000/svg";

export function routeC4Edges(svg, graph, variables) {
  if (!graph?.c4Relations) return;
  const nodes = new Map(graph.c4Nodes.map((model) => {
    const element = svg.getElementById(`${svg.id}-${model.alias}`) || svg.getElementById(model.alias);
    const shape = element?.querySelector(".label-container");
    return [model.alias, element && shape ? { element, box: boundsInSvg(svg, shape) } : null];
  }).filter(([, node]) => node));
  const elements = [...svg.querySelectorAll("path[marker-end],line[marker-end]")].filter((p) => !p.closest("defs,marker"));
  if (elements.length !== graph.c4Relations.length) return;
  const boundaryTitles = [...svg.querySelectorAll("g > text")].filter((text) =>
    !text.closest(".node") && text.parentElement.querySelector(":scope > rect") && text.textContent.trim()
  ).map((text) => boundsInSvg(svg, text));
  let rerouted = 0;
  elements.forEach((original, index) => {
    const model = graph.c4Relations[index], source = nodes.get(model.from), target = nodes.get(model.to);
    if (!source || !target) return;
    const length = original.getTotalLength();
    const start = inSvg(svg, original, original.getPointAtLength(0)), end = inSvg(svg, original, original.getPointAtLength(length));
    const boundaryDistance = (p, b) => Math.min(Math.abs(p.x - b.x), Math.abs(p.x - b.right), Math.abs(p.y - b.y), Math.abs(p.y - b.bottom));
    if (boundaryDistance(start, source.box) > 3 || boundaryDistance(end, target.box) > 3) return;
    const obstacles = [...nodes.values()].filter((n) => n !== source && n !== target).map((n) => n.box).concat(boundaryTitles);
    const samples = Array.from({ length: 41 }, (_, i) => inSvg(svg, original, original.getPointAtLength(length * i / 40)));
    let points = [start, end];
    if (samples.slice(1).some((p, i) => segmentBlocked(samples[i], p, obstacles, 5))) {
      const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
      const a = center(source.box), b = center(target.box), horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
      const direction = horizontal ? Math.sign(b.x - a.x) : Math.sign(b.y - a.y);
      const port = (node, point, outward) => horizontal
        ? { x: outward > 0 ? node.box.right : node.box.x, y: point.y }
        : { x: point.x, y: outward > 0 ? node.box.bottom : node.box.y };
      const p = port(source, a, direction), q = port(target, b, -direction);
      const axis = horizontal ? "x" : "y";
      const lead = { ...p, [axis]: p[axis] + direction * 12 };
      const tail = { ...q, [axis]: q[axis] - direction * 12 };
      const route = orthogonalRoute(lead, tail, [...nodes.values()].map((n) => n.box).concat(boundaryTitles), 20);
      if (!route) return;
      points = [p, ...route, q];
      rerouted++;
    } else if (original.localName === "path") {
      // 未穿框的曲线不改为直线，保留原图的关系布局。
      points = null;
    }
    const text = original.nextElementSibling?.localName === "text" ? original.nextElementSibling : null;
    const edge = asPath(original), id = `c4-relation-${index}`;
    if (points) writePoints(svg, edge, points);
    else edge.setAttribute("data-points", btoa(JSON.stringify(samples.map((p) => {
      const local = fromSvg(svg, edge, p);
      return { x: local.x, y: local.y };
    }))));
    edge.id = `${svg.id}-${id}`;
    edge.dataset.id = id;
    edge.setAttribute("data-gptm-source", source.element.id);
    edge.setAttribute("data-gptm-target", target.element.id);
    edge.setAttribute("data-gptm-theme-stroke", "true");
    edge.style.setProperty("fill", "none");
    edge.style.setProperty("stroke-width", "1.6px");
    if (!text) return;
    const label = svg.ownerDocument.createElementNS(NS, "g");
    label.setAttribute("class", "edgeLabel");
    label.dataset.id = id;
    const background = svg.ownerDocument.createElementNS(NS, "rect");
    const box = text.getBBox();
    background.setAttribute("class", "labelBkg");
    for (const [key, value] of Object.entries({ x: box.x - 8, y: box.y - 4, width: box.width + 16, height: box.height + 8, rx: 13, ry: 13 })) {
      background.setAttribute(key, String(value));
    }
    background.style.fill = variables.flowchartEdgeLabelColor;
    text.before(label); label.append(background, text);
  });
  svg.setAttribute("data-gptm-c4-rerouted", String(rerouted));
}

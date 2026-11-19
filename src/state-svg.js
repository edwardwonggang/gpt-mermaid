/* 职责：测量同次解析的状态图、求解统一布局并一次绘制，保留上游文字和特殊形状。
 * 调用方：render.js；依赖：state-layout、state-constraints和已净化的离屏SVG。
 * 红线：标签是关系显示对象，不增加业务状态；最终绘制后禁止再次路由或挪标签。
 */
import { solveStateLayout } from "./state-layout.js";
import { validateStateLayout } from "./state-constraints.js";
import { boundsInSvg, nodeShape, simplifyPoints, roundedPath } from "./svg-routing.js";
import { throwIfAborted } from "./runtime-guard.js";
import { STATE_CORNER_RADIUS } from "./state-ports.js";

const NS = "http://www.w3.org/2000/svg";
const DIRECTION = { TB: "DOWN", TD: "DOWN", BT: "UP", LR: "RIGHT", RL: "LEFT" };

function placement(svg, element) {
  const m = svg.getScreenCTM().inverse().multiply(element.getScreenCTM());
  return `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
}

function textLabel(doc, value, x, y, font, fill) {
  const text = doc.createElementNS(NS, "text");
  text.setAttribute("x", x); text.setAttribute("y", y);
  text.setAttribute("text-anchor", "middle"); text.setAttribute("dominant-baseline", "central");
  text.setAttribute("font-family", font); text.setAttribute("font-size", "14");
  text.setAttribute("font-weight", "600"); text.setAttribute("fill", fill);
  text.textContent = value;
  return text;
}

function freezeGeometry(model) {
  for (const n of model.nodes) Object.freeze(n);
  for (const e of model.segments) {
    e.points.forEach(Object.freeze); Object.freeze(e.points); Object.freeze(e);
  }
  Object.freeze(model.nodes); Object.freeze(model.segments);
  return Object.freeze(model);
}

export async function layoutStateSvg(svg, semantic, layout, variables, signal) {
  if (typeof layout !== "function" || !semantic?.nodes || !semantic?.edges) {
    throw new Error("gpt-mermaid: state layout capability unavailable");
  }
  throwIfAborted(signal);
  const doc = svg.ownerDocument;
  const originalNodes = new Map([...svg.querySelectorAll("g[data-id]")].filter(n =>
    n.classList.contains("node") || n.classList.contains("statediagram-cluster") || n.classList.contains("cluster"))
    .map(n => [n.dataset.id, n]));
  const originalEdges = new Map([...svg.querySelectorAll("path.transition[data-id]")].map(e => [e.dataset.id, e]));
  const originalLabels = new Map([...svg.querySelectorAll("g.edgeLabel")].map(l => [
    l.querySelector("[data-id]")?.dataset.id || l.dataset.id, l,
  ]));
  const views = new Map();
  const nodes = semantic.nodes.map(n => {
    if (n.shape === "noteGroup") return { ...n, width: 1, height: 1 };
    // 并行区域是语义容器，上游未必绘制独立轮廓；尺寸由内部布局计算，不能用旧框猜。
    if (n.shape === "divider") return { ...n, width: 80, height: 48 };
    const element = originalNodes.get(n.id), shape = element && nodeShape(element);
    if (!element || !shape) throw new Error(`gpt-mermaid: missing state geometry: ${n.id}`);
    const box = boundsInSvg(svg, shape);
    views.set(n.id, { element: element.cloneNode(true), box, transform: placement(svg, element) });
    if (n.isGroup) {
      const title = element.querySelector(".cluster-label,.label,.nodeLabel");
      const size = title ? boundsInSvg(svg, title) : { width: 80, height: 20 };
      return { ...n, width: Math.max(80, size.width + 32), height: 48 };
    }
    return { ...n, width: box.width, height: box.height,
      // 主题CSS能覆盖rx/ry属性；容量必须使用浏览器真正画出的圆角。
      cornerRadius: shape.localName === "rect" ? Math.max(parseFloat(getComputedStyle(shape).rx)||0,
        parseFloat(getComputedStyle(shape).ry)||0,Number(shape.getAttribute("rx")||0)) : 0 };
  });
  const edges = semantic.edges.map(e => {
    if (!originalEdges.has(e.id)) throw new Error(`gpt-mermaid: missing state relation: ${e.id}`);
    const element = originalLabels.get(e.id);
    if (e.label && !element) throw new Error(`gpt-mermaid: missing state label: ${e.id}`);
    const box = element ? boundsInSvg(svg, element) : { width: 0, height: 0 };
    if (e.label) views.set(`${e.id}:label`, { element: element.cloneNode(true), box, transform: placement(svg, element) });
    return { ...e, width: box.width, height: box.height };
  });
  const solve = arrowDepth => solveStateLayout({ nodes, edges, arrowDepth }, DIRECTION[semantic.direction] || "DOWN", async graph => {
    throwIfAborted(signal);
    const result = await layout(graph);
    throwIfAborted(signal);
    return result;
  });
  let candidate = await solve(11);
  // 最终着色按完整画布把三角放大至最多18；复合图内部也须使用同一上界，
  // 避免外层变大后内部节点仍只预留小箭头的直段。最多整体重算一次。
  if (Math.max(candidate.width,candidate.height)>1100) candidate = await solve(18);
  const quality = validateStateLayout(candidate);
  if (quality.unsupported || quality.issues?.length) {
    const error = new Error(`gpt-mermaid: state layout ${quality.unsupported || "constraint-conflict"}`);
    error.violations = quality.issues || quality.unmatched;
    throw error;
  }
  const model = freezeGeometry(candidate);
  const drawing = doc.createElementNS(NS, "g"), containers = doc.createElementNS(NS, "g");
  const paths = doc.createElementNS(NS, "g"), objects = doc.createElementNS(NS, "g");
  drawing.append(containers, paths, objects);
  const rendered = new Map();
  for (const n of model.nodes) {
    let element;
    if (n.isGroup) {
      element = doc.createElementNS(NS, "g");
      const old = views.get(n.id)?.element;
      element.id = old?.id || `${svg.id}-container-${rendered.size}`;
      element.setAttribute("class", "statediagram-cluster");
      const shape = doc.createElementNS(NS, "rect");
      for (const [k, v] of Object.entries({ x: n.x, y: n.y, width: n.width, height: n.height,
        rx: 12, fill: n.shape === "divider" ? "none" : variables.clusterBkg || "#f7f9fc",
        stroke: variables.flowchartNodeBorderColor, "stroke-width": 1.5 })) shape.setAttribute(k, v);
      if (n.shape === "divider") shape.setAttribute("stroke-dasharray", "5 5");
      element.append(shape);
      if (n.shape !== "divider") element.append(textLabel(doc, n.label, n.x + n.width / 2, n.y + 18,
        variables.fontFamily, variables.flowchartTextColor));
      containers.append(element);
    } else {
      const view = views.get(n.id);
      if (!view) throw new Error(`gpt-mermaid: missing visual model: ${n.id}`);
      element = view.element;
      const dw = n.width-view.box.width, dh = n.height-view.box.height;
      if (dw > .01 || dh > .01) {
        const shape = nodeShape(element) || element.querySelector("g.label rect.background,rect.labelBkg");
        if (shape?.localName !== "rect") throw new Error(`gpt-mermaid: unsupported shape capacity:${n.id}`);
        // 只扩大框，文字保持原字号与局部中心；不能缩放整个g来换取端口容量。
        shape.setAttribute("x", Number(shape.getAttribute("x") || 0)-dw/2);
        shape.setAttribute("y", Number(shape.getAttribute("y") || 0)-dh/2);
        shape.setAttribute("width", Number(shape.getAttribute("width"))+dw);
        shape.setAttribute("height", Number(shape.getAttribute("height"))+dh);
      }
      element.setAttribute("transform", `translate(${n.x - view.box.x + dw/2},${n.y - view.box.y + dh/2}) ${view.transform}`);
      if (n.kind === "label") {
        element.id = `${svg.id}-condition-${rendered.size}`;
        element.dataset.gptmLabelOwner = n.owner;
      }
      objects.append(element);
    }
    element.dataset.id = n.id;
    element.dataset.gptmLayoutObject = n.kind;
    if (n.parentId) element.dataset.gptmParent = n.parentId;
    rendered.set(n.id, element);
  }
  for (const relation of edges) {
    const segments = model.segments.filter(s => s.owner === relation.id);
    const routes = segments.map(s => simplifyPoints(s.points));
    for (const [index, segment] of segments.entries()) {
    const path = originalEdges.get(relation.id).cloneNode(false);
    path.id = `${path.id}-segment-${index}`;
    path.dataset.id = segment.id;
    path.dataset.source = segment.source;
    path.dataset.target = segment.target;
    path.dataset.gptmEdgeOwner = relation.id;
    path.dataset.gptmLogicalSource = relation.source;
    path.dataset.gptmLogicalTarget = relation.target;
    const route = routes[index];
    path.removeAttribute("transform");
    path.setAttribute("d", roundedPath(route, STATE_CORNER_RADIUS));
    path.setAttribute("data-points", btoa(JSON.stringify(route)));
    path.dataset.gptmSource = rendered.get(segment.source).id;
    path.dataset.gptmTarget = rendered.get(segment.target).id;
    path.dataset.gptmNativeRerouted = "true";
    if (!segment.arrow) path.removeAttribute("marker-end");
    if (relation.source === relation.target && index === 0) path.dataset.gptmSelfLoop = "true";
    if (relation.label) {
      const label = rendered.get(`${relation.id}:label`);
      if (index === 0) label.dataset.gptmLabelEdge = path.id;
      label.dataset.gptmLabelPorts = JSON.stringify({ incoming: routes[0].at(-1), outgoing: routes[1][0] });
    }
    paths.append(path);
    }
  }
  // defs/style/标题保持；旧布局图元一次替换，之后只允许着色、裁线与只读验收。
  const definitions = [...svg.querySelectorAll("defs")].map(d => d.cloneNode(true));
  const markerDefinitions = [...svg.querySelectorAll("marker")].filter(m => !m.closest("defs"))
    .map(m => m.cloneNode(true));
  for (const child of [...svg.children]) if (child.localName === "g") child.remove();
  for (const definition of definitions) {
    const missing = [...definition.children].filter(child => !child.id || !svg.getElementById(child.id));
    if (missing.length) {
      const defs = doc.createElementNS(NS, "defs"); defs.append(...missing); svg.append(defs);
    }
  }
  if (markerDefinitions.length) {
    const defs = doc.createElementNS(NS, "defs");
    defs.append(...markerDefinitions.filter(m => !svg.getElementById(m.id)));
    svg.append(defs);
  }
  svg.append(drawing);
  svg.setAttribute("viewBox", `0 0 ${model.width} ${model.height}`);
  svg.setAttribute("width", model.width); svg.setAttribute("height", model.height);
  svg.dataset.gptmStateLayout = "constraint-model";
  svg.dataset.gptmNativeRoutes = String(model.segments.length);
  svg.dataset.gptmLogicalEdges = String(edges.length);
  svg.dataset.gptmStateNodes = String(nodes.filter(n => n.shape !== "noteGroup").length);
  svg.dataset.gptmStateLabels = String(edges.filter(e => e.label).length);
  svg.dataset.gptmStatePorts = String(quality.ports.length);
  svg.dataset.gptmStateConstraints = quality.accepted ? "satisfied" : "crossings";
  return quality;
}

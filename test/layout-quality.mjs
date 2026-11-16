/* 职责：在现有浏览器中验证截图反馈的标签、端口、自环、避障与折返，不另开会话。 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

export async function verifyLayoutQuality(page, output) {
  await fs.mkdir(output, { recursive: true });
  const report = await page.evaluate(async () => {
    const selected = [...new Map([...GPT_MERMAID_LAB_CASES, ...GPT_MERMAID_STRESS_CASES]
      .filter((s) => s.type === "flowchart" || s.type === "C4Context").map((s) => [s.id, s])).values()];
    const results = [];
    for (const item of selected) {
      const result = await GPTMermaid.renderSvg(item.source);
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-100000px;top:0;width:max-content;";
      host.innerHTML = result.svg; document.body.append(host);
      try {
        const svg = host.querySelector("svg"), inverse = svg.getScreenCTM().inverse();
        const rootPoint = (el, p) => new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM()).matrixTransform(inverse);
        const box = (el) => { const b = el.getBBox(), a = rootPoint(el, b), c = rootPoint(el, { x: b.x + b.width, y: b.y + b.height });
          return { x: a.x, y: a.y, right: c.x, bottom: c.y, width: c.x - a.x, height: c.y - a.y }; };
        const nodes = [...svg.querySelectorAll("g.node")].map((node) => {
          const container = node.querySelector(":scope > .label-container, :scope > .outer-path");
          if (!container) return null;
          const shapes = container instanceof SVGGeometryElement ? [container]
            : [...container.querySelectorAll("rect,path,circle,ellipse,polygon")];
          return { id: node.id, node, shapes, box: box(container) };
        }).filter(Boolean);
        const edges = [...svg.querySelectorAll("[data-gptm-source]")];
        const collisions = [], ports = [], loops = [], labels = [];
        for (const edge of edges) {
          const len = edge.getTotalLength(), source = edge.dataset.gptmSource, target = edge.dataset.gptmTarget;
          const first = rootPoint(edge, edge.getPointAtLength(0)), last = rootPoint(edge, edge.getPointAtLength(len));
          ports.push({ edge: edge.dataset.id, source, target, first: { x: first.x, y: first.y }, last: { x: last.x, y: last.y },
            marker: Boolean(edge.getAttribute("marker-end")), shared: edge.dataset.gptmSharedTip });
          if (edge.dataset.gptmSelfLoop) {
            const b = box(edge), n = nodes.find((n) => n.id === source).box;
            loops.push({ gap: Math.hypot(first.x - last.x, first.y - last.y),
              reach: Math.max(n.x - b.x, n.y - b.y, b.right - n.right, b.bottom - n.bottom) });
          }
          const candidates = nodes.filter((n) => n.id !== source && n.id !== target);
          const steps = Math.max(2, Math.ceil(len / 3));
          for (let i = 1; i < steps; i++) {
            const p = rootPoint(edge, edge.getPointAtLength(len * i / steps));
            for (const n of candidates) {
              const b = n.box;
              if (p.x <= b.x + 0.5 || p.x >= b.right - 0.5 || p.y <= b.y + 0.5 || p.y >= b.bottom - 0.5) continue;
              if (n.shapes.some((shape) => {
                const point = new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM()).matrixTransform(shape.getScreenCTM().inverse());
                return shape.isPointInFill(point);
              })) {
                if (!collisions.some((c) => c.edge === edge.dataset.id && c.node === n.id)) collisions.push({ edge: edge.dataset.id, node: n.id });
              }
            }
          }
        }
        for (const label of svg.querySelectorAll("[data-gptm-label-edge]")) {
          const b = box(label), center = { x: (b.x + b.right) / 2, y: (b.y + b.bottom) / 2 };
          const edge = svg.getElementById(label.dataset.gptmLabelEdge), len = edge.getTotalLength();
          let nearest = Infinity;
          const steps = Math.ceil(len / 0.4);
          for (let i = 0; i <= steps; i++) {
            const p = rootPoint(edge, edge.getPointAtLength(len * i / steps));
            nearest = Math.min(nearest, Math.hypot(p.x - center.x, p.y - center.y));
          }
          labels.push({ text: label.textContent, distance: nearest,
            overlapsNode: nodes.some((n) => b.x < n.box.right && b.right > n.box.x && b.y < n.box.bottom && b.bottom > n.box.y) });
        }
        const c4 = [...svg.querySelectorAll(".c4-shape")].map((node) => {
          const background = node.querySelector(".label-container rect,.label-container");
          const rgb = (el) => getComputedStyle(el).fill.match(/[\d.]+/g).slice(0, 3).map(Number);
          const luminance = (values) => values.map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
          const bg = luminance(rgb(background));
          const ratios = [...node.querySelectorAll("text,tspan")].map((t) => { const fg = luminance(rgb(t));
            return (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05); });
          return Math.min(...ratios);
        });
        results.push({ id: item.id, width: result.width, height: result.height, nodes: nodes.length, edges: edges.length,
          labels, collisions, ports, loops, c4, adaptive: svg.dataset.gptmAdaptive, reason: svg.dataset.gptmAdaptiveReason,
          shared: Number(svg.dataset.gptmSharedArrows || 0), jogs: Number(svg.dataset.gptmSimplifiedJogs || 0), svg: result.svg });
      } finally { host.remove(); }
    }
    return results;
  });
  for (const item of report) {
    await fs.writeFile(path.join(output, `${item.id}.svg`), item.svg);
    delete item.svg;
  }
  await fs.writeFile(path.join(output, "layout-quality.json"), JSON.stringify(report, null, 2));
  for (const item of report) {
    assert.equal(item.collisions.length, 0, `${item.id} 连线穿过非目标节点：${JSON.stringify(item.collisions)}`);
    for (const label of item.labels) {
      assert(label.distance < 0.25, `${item.id} 标签不在线上：${JSON.stringify(label)}`);
      assert(!label.overlapsNode, `${item.id} 标签覆盖节点：${JSON.stringify(label)}`);
    }
    for (const loop of item.loops) assert(loop.gap >= 20 && loop.reach >= 38, `${item.id} 自环间距不足：${JSON.stringify(loop)}`);
    for (const contrast of item.c4) assert(contrast >= 4.5, `${item.id} C4 对比度 ${contrast}`);
    const shared = new Map();
    for (const port of item.ports.filter((p) => p.shared)) {
      const previous = shared.get(port.shared);
      if (previous) assert(Math.hypot(previous.last.x - port.last.x, previous.last.y - port.last.y) < 0.1, `${item.id} 汇入端点不一致`);
      else shared.set(port.shared, port);
    }
  }
  assert(report.some((r) => r.adaptive === "applied"), "未覆盖真实折返");
  assert(report.some((r) => r.shared > 0) && report.some((r) => r.jogs > 0), "未覆盖共享箭头和短折弯");
  console.log(`布局验收：${report.length} 图，${report.reduce((n, r) => n + r.labels.length, 0)} 个边标签，穿框/自环/对比度/折返断言通过`);
  return report;
}

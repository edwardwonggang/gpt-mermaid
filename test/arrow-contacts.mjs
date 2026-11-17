/* 职责：在最终SVG中独立检查三角填充遮挡、尖端贴边、线杆到达三角底部。
 * 调用方：E2E同一浏览器；不把线路相交检测或控制点当作本项验收证据。
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { assertBaseGeometryCounts } from "./geometry-expectations.mjs";

export async function auditArrowContacts(page, output, enforce = true, expectations = null) {
  const report = await page.evaluate(() => {
    const records = [...GPTMermaid.ui.uiState(document).records].filter((r) => r.result);
    const results = [];
    for (const record of records) {
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-100000px;top:0;width:max-content";
      host.innerHTML = record.result.svg; document.body.append(host);
      try {
        const svg = host.querySelector("svg"), inverse = svg.getScreenCTM().inverse();
        const root = (e, p) => new DOMPoint(p.x, p.y).matrixTransform(e.getScreenCTM()).matrixTransform(inverse);
        const local = (e, p) => new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM()).matrixTransform(e.getScreenCTM().inverse());
        const shapes = [...new Set([...svg.querySelectorAll("g.node > .label-container,g.node > .outer-path,g.node > g:not(.label),g.node > rect,g.node > path,g.node > circle,g.node > ellipse,g.node > polygon,g.edgeLabel rect.background,g.edgeLabel rect.labelBkg")]
          .flatMap((c) => c instanceof SVGGeometryElement ? [c] : [...c.querySelectorAll("path,rect,circle,ellipse,polygon")]))];
        const painted = shapes.map((shape) => {
          const s = getComputedStyle(shape), b = shape.getBBox(), a = root(shape, b), c = root(shape, { x: b.x + b.width, y: b.y + b.height });
          return { shape, fill: s.fill !== "none", stroke: s.stroke !== "none",
            box: { x: a.x - 2, y: a.y - 2, right: c.x + 2, bottom: c.y + 2 } };
        });
        const issues = [];
        let triangles = 0;
        for (const edge of svg.querySelectorAll("[data-gptm-direction]")) for (const start of [true, false]) {
          const id = edge.getAttribute(start ? "marker-start" : "marker-end")?.match(/#([^)]+)/)?.[1];
          const marker = id && svg.getElementById(id);
          if (marker?.querySelector("path")?.getAttribute("d") !== "M 0 0 L 10 4 L 0 8 Z") continue;
          triangles++;
          const length = edge.getTotalLength(), tip = root(edge, edge.getPointAtLength(start ? 0 : length));
          const adjacent = root(edge, edge.getPointAtLength(start ? Math.min(0.02, length) : Math.max(0, length - 0.02)));
          const magnitude = Math.hypot(tip.x - adjacent.x, tip.y - adjacent.y);
          const v = { x: (tip.x - adjacent.x) / magnitude, y: (tip.y - adjacent.y) / magnitude };
          const depth = Number(marker.getAttribute("markerWidth")), half = Number(marker.getAttribute("markerHeight")) / 2;
          const coordinate = (along, across = 0) => ({ x: tip.x - v.x * along - v.y * across,
            y: tip.y - v.y * along + v.x * across });
          const blocked = new Set();
          // 避开最尖端数值噪声，三角内部不得与节点/胶囊真实填充或描边相交。
          for (const fraction of [0.12, 0.3, 0.6, 0.9]) for (const across of [-0.7, 0, 0.7]) {
            const p = coordinate(depth * fraction, half * fraction * across);
            for (const { shape, fill, stroke, box } of painted) {
              if (p.x < box.x || p.x > box.right || p.y < box.y || p.y > box.bottom) continue;
              const q = local(shape, p);
              if (fill && shape.isPointInFill(q) || stroke && shape.isPointInStroke(q)) {
                blocked.add(shape.closest("g.node")?.id || shape.closest("g.edgeLabel")?.textContent);
              }
            }
          }
          let connected = false;
          // 短曲线可从三角侧边进入，接触点不必恰好是底边中点；
          // 独立扫实际三角外侧并读取可见描边，不能只验证路径端点存在。
          for (let step = 0; step <= 60 && !connected; step++) {
            const t = step / 60;
            for (const p of [coordinate(depth + 0.15, half * (2 * t - 1)),
              coordinate(depth * t, half * t + 0.15), coordinate(depth * t, -half * t - 0.15)]) {
              if (t >= 0.15 && edge.isPointInStroke(local(edge, p))) { connected = true; break; }
            }
          }
          const owner = svg.getElementById(edge.getAttribute(start ? "data-gptm-source" : "data-gptm-target"));
          let attached = null;
          if (owner) {
            const candidates = painted.filter((p) => p.shape.closest("g.node") === owner);
            const inside = { x: tip.x + v.x * 1.5, y: tip.y + v.y * 1.5 };
            attached = candidates.some(({ shape }) => shape.isPointInFill(local(shape, inside)) || shape.isPointInStroke(local(shape, inside)));
          }
          if (blocked.size || !connected || attached === false) issues.push({
            edge: edge.dataset.id || edge.id, start, blocked: [...blocked], connected, attached, depth,
            path: edge.getAttribute("d"), dash: getComputedStyle(edge).strokeDasharray,
          });
        }
        results.push({ id: record.figure.closest(".sample")?.dataset.sampleId, triangles, issues });
      } finally { host.remove(); }
    }
    return results;
  });
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, "arrow-contacts.json"), JSON.stringify(report, null, 2));
  if (enforce) {
    for (const item of report) assert.equal(item.issues.length, 0, `${item.id}: ${JSON.stringify(item.issues)}`);
    if (expectations) assertBaseGeometryCounts(report, "箭头接触验收");
  }
  return report;
}

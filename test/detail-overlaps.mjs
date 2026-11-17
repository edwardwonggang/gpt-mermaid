/* 职责：在现有浏览器中检查箭头交叠、其它线杆穿入箭头以及胶囊实际填充交叠。 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { assertBaseGeometryCounts } from "./geometry-expectations.mjs";

export async function auditDetailOverlaps(page, output, enforce = true, expectations = null) {
  const report = await page.evaluate(() => {
    const records = [...GPTMermaid.ui.uiState(document).records].filter((r) => r.result);
    const results = [];
    const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const inside = (p, t) => {
      const signs = t.map((a, i) => cross(a, t[(i + 1) % 3], p));
      return signs.every((x) => x > 0.05) || signs.every((x) => x < -0.05);
    };
    for (const record of records) {
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-100000px;top:0;width:max-content";
      host.innerHTML = record.result.svg; document.body.append(host);
      try {
        const svg = host.querySelector("svg"), inverse = svg.getScreenCTM().inverse();
        const root = (el, p) => new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM()).matrixTransform(inverse);
        const local = (el, p) => new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM()).matrixTransform(el.getScreenCTM().inverse());
        const box = (el) => {
          const b = el.getBBox(), a = root(el, b), c = root(el, { x: b.x + b.width, y: b.y + b.height });
          return { x: a.x, y: a.y, right: c.x, bottom: c.y };
        };
        const edges = [...svg.querySelectorAll("[data-gptm-direction]")], triangles = [];
        for (const edge of edges) {
          const length = edge.getTotalLength();
          for (const start of [false, true]) {
            const ref = edge.getAttribute(start ? "marker-start" : "marker-end");
            const marker = ref && svg.getElementById(ref.match(/#([^)]+)/)?.[1]);
            if (marker?.querySelector("path")?.getAttribute("d") !== "M 0 0 L 10 4 L 0 8 Z") continue;
            const tip = root(edge, edge.getPointAtLength(start ? 0 : length));
            const previous = root(edge, edge.getPointAtLength(start ? Math.min(0.02, length) : Math.max(0, length - 0.02)));
            const magnitude = Math.hypot(tip.x - previous.x, tip.y - previous.y);
            if (!magnitude) continue;
            const v = { x: (tip.x - previous.x) / magnitude, y: (tip.y - previous.y) / magnitude };
            const width = Number(marker.getAttribute("markerWidth")), height = Number(marker.getAttribute("markerHeight"));
            triangles.push({ id: edge.dataset.id || edge.id, element: edge, shared: edge.dataset.gptmSharedTip, points: [tip,
              { x: tip.x - v.x * width + v.y * height / 2, y: tip.y - v.y * width - v.x * height / 2 },
              { x: tip.x - v.x * width - v.y * height / 2, y: tip.y - v.y * width + v.x * height / 2 }] });
          }
        }
        const arrows = [], shafts = [], labels = [], foreignLabels = [];
        triangles.forEach((a, index) => {
          for (const b of triangles.slice(index + 1)) {
            let hit = false;
            for (const t of [a, b]) for (let j = 1; j < 10; j++) for (let k = 1; k < 10 - j; k++) {
              const p = { x: t.points[0].x * (1 - (j + k) / 10) + t.points[1].x * j / 10 + t.points[2].x * k / 10,
                y: t.points[0].y * (1 - (j + k) / 10) + t.points[1].y * j / 10 + t.points[2].y * k / 10 };
              if (inside(p, (t === a ? b : a).points)) hit = true;
            }
            if (hit) arrows.push({ a: a.id, b: b.id });
          }
          const region = { x: Math.min(...a.points.map((p) => p.x)), right: Math.max(...a.points.map((p) => p.x)),
            y: Math.min(...a.points.map((p) => p.y)), bottom: Math.max(...a.points.map((p) => p.y)) };
          for (const edge of edges) {
            if (edge === a.element || a.shared && a.shared === edge.dataset.gptmSharedTip) continue;
            const b = box(edge);
            if (b.right < region.x || b.x > region.right || b.bottom < region.y || b.y > region.bottom) continue;
            const length = edge.getTotalLength(), steps = Math.ceil(length);
            for (let j = 1; j < steps; j++) {
              const p = edge.getPointAtLength(length * j / steps);
              if (inside(root(edge, p), a.points) && edge.isPointInStroke(p)) {
                shafts.push({ arrow: a.id, shaft: edge.dataset.id || edge.id });
                break;
              }
            }
          }
        });
        const capsules = [...svg.querySelectorAll("g.edgeLabel")].filter((e) => e.textContent.trim()).map((element) => ({
          element, text: element.textContent, box: box(element), shape: element.querySelector("rect.background,rect.labelBkg"),
          owner: element.dataset.gptmLabelEdge,
        })).filter((l) => l.shape);
        capsules.forEach((a, index) => {
          for (const b of capsules.slice(index + 1)) {
            const x = Math.max(a.box.x, b.box.x), y = Math.max(a.box.y, b.box.y);
            const right = Math.min(a.box.right, b.box.right), bottom = Math.min(a.box.bottom, b.box.bottom);
            let hit = false;
            for (let px = x; px < right && !hit; px += 0.3) for (let py = y; py < bottom; py += 0.3) {
              if ([a, b].every((l) => {
                const p = local(l.shape, { x: px, y: py });
                return l.shape.isPointInFill(p) || l.shape.isPointInStroke(p);
              })) { hit = true; break; }
            }
            if (hit) labels.push({ a: a.text, b: b.text });
          }
          for (const edge of edges) {
            if (!a.owner || edge.id === a.owner) continue;
            const b = box(edge);
            if (b.right < a.box.x || b.x > a.box.right || b.bottom < a.box.y || b.y > a.box.bottom) continue;
            const length = edge.getTotalLength(), steps = Math.ceil(length);
            for (let j = 1; j < steps; j++) {
              const p = edge.getPointAtLength(length * j / steps), q = root(edge, p);
              if (q.x <= a.box.x + 1 || q.x >= a.box.right - 1 || q.y <= a.box.y + 1 || q.y >= a.box.bottom - 1) continue;
              if (a.shape.isPointInFill(local(a.shape, q)) && edge.isPointInStroke(p)) {
                foreignLabels.push({ label: a.text, edge: edge.dataset.id || edge.id });
                break;
              }
            }
          }
        });
        results.push({ id: record.figure.closest(".sample")?.dataset.sampleId, triangles: triangles.length, arrows, shafts, labels, foreignLabels });
      } finally { host.remove(); }
    }
    return results;
  });
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, "detail-overlaps.json"), JSON.stringify(report, null, 2));
  if (enforce) {
    for (const item of report) for (const kind of ["arrows", "shafts", "labels", "foreignLabels"]) {
      assert.equal(item[kind].length, 0, `${item.id} ${kind}: ${JSON.stringify(item[kind])}`);
    }
    if (expectations) assertBaseGeometryCounts(report, "细节交叠验收");
  }
  return report;
}

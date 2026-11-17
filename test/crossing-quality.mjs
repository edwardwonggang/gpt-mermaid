/* 职责：在E2E既有浏览器中独立采样最终SVG，验证通用交叉报告及改名/方向变体。 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

export async function verifyCrossingQuality(page, output) {
  const report = await page.evaluate(async () => {
    const records = [...GPTMermaid.ui.uiState(document).records].filter((r) => r.result);
    const gallery = records.map((r) => ({ id: r.figure.closest(".sample").dataset.sampleId, ...r.result.routing }));
    const samples = records.filter((r) => ["state", "stress-state-choice", "stress-flow-td-feedback",
      "stress-c4-context", "stress-c4-boundary"].includes(r.figure.closest(".sample").dataset.sampleId))
      .map((r) => ({ id: r.figure.closest(".sample").dataset.sampleId, result: r.result }));
    for (const direction of ["TB", "BT", "LR", "RL"]) {
      const result = await GPTMermaid.renderSvg(`stateDiagram-v2
direction ${direction}
[*] --> Alpha
Alpha --> Await_Response: launch
Await_Response --> Completed: success
Await_Response --> Recovery: failure
Recovery --> Await_Response: resume
Completed --> [*]`);
      samples.push({ id: `renamed-state-${direction}`, result });
    }
    const cross = (a, b) => a.x * b.y - a.y * b.x;
    const intersections = (a, b, c, d) => {
      const u = { x: b.x - a.x, y: b.y - a.y }, v = { x: d.x - c.x, y: d.y - c.y };
      const w = { x: c.x - a.x, y: c.y - a.y }, determinant = cross(u, v);
      if (Math.abs(determinant) < 1e-7) return false;
      const t = cross(w, v) / determinant, s = cross(w, u) / determinant;
      return t > 1e-6 && t < 1 - 1e-6 && s > 1e-6 && s < 1 - 1e-6;
    };
    const verified = [];
    for (const { id, result } of samples) {
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-100000px;top:0;width:max-content";
      host.innerHTML = result.svg; document.body.append(host);
      try {
        const svg = host.querySelector("svg"), inverse = svg.getScreenCTM().inverse();
        const paths = [...svg.querySelectorAll(".flowchart-link,.transition,.relation,.relationshipLine,[data-gptm-source]")]
          .filter((e) => typeof e.getTotalLength === "function").map((edge) => {
            const length = edge.getTotalLength(), count = Math.max(2, Math.ceil(length / 1.3)), points = [];
            for (let i = 0; i <= count; i++) {
              const p = edge.getPointAtLength(length * i / count);
              const root = new DOMPoint(p.x, p.y).matrixTransform(edge.getScreenCTM()).matrixTransform(inverse);
              while (points.length >= 2) {
                const a = points.at(-2), b = points.at(-1);
                if (Math.abs((b.x - a.x) * (root.y - b.y) - (b.y - a.y) * (root.x - b.x)) > 0.001) break;
                points.pop();
              }
              points.push({ x: root.x, y: root.y });
            }
            return { id: edge.dataset.id || edge.id, points };
          });
        const crossings = [];
        for (let i = 0; i < paths.length; i++) for (let j = i + 1; j < paths.length; j++) {
          const a = paths[i], b = paths[j];
          let hit = false;
          for (let k = 1; k < a.points.length && !hit; k++) for (let l = 1; l < b.points.length; l++) {
            if (intersections(a.points[k - 1], a.points[k], b.points[l - 1], b.points[l])) { hit = true; break; }
          }
          if (hit) crossings.push([a.id, b.id]);
        }
        verified.push({ id, routing: result.routing, crossings });
      } finally { host.remove(); }
    }
    return { gallery, verified };
  });
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, "crossing-quality.json"), JSON.stringify(report, null, 2));
  for (const sample of report.verified) {
    assert.equal(sample.routing.status, "clear", `${sample.id} 尚有未解交叉`);
    assert.equal(sample.crossings.length, 0, `${sample.id} 最终SVG独立采样发现交叉: ${JSON.stringify(sample.crossings)}`);
  }
  for (const sample of report.gallery) {
    assert(sample.status !== "clear" || sample.crossings === 0, `${sample.id} 不能假报无交叉`);
    assert(sample.checkedEdges > 0 || sample.status === "not-applicable", `${sample.id} 未检查不能假报通过`);
  }
  const dense = report.gallery.find((r) => r.id === "stress-flow-lr-dense");
  assert.equal(dense.reason, "non-planar-edge-bound");
  assert(dense.crossings > 0);
  return report;
}

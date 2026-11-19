/* 职责：在E2E既有浏览器中独立采样最终SVG，验证通用交叉报告及改名/方向变体。 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { inspectStatePorts } from "./state-ports.mjs";

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
      return t > 1e-6 && t < 1 - 1e-6 && s > 1e-6 && s < 1 - 1e-6
        ? { x: a.x + t * u.x, y: a.y + t * u.y } : null;
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
              const raw = new DOMPoint(p.x, p.y).matrixTransform(edge.getScreenCTM()).matrixTransform(inverse);
              // getPointAtLength 的浮点噪声会把同一 y=32 的公共直线采成32.000006，
              // 再误报穿越。仅量化到万分之一SVG单位，仍远小于可见几何误差。
              const root = { x: Math.round(raw.x * 1e4) / 1e4, y: Math.round(raw.y * 1e4) / 1e4 };
              while (points.length >= 2) {
                const a = points.at(-2), b = points.at(-1);
                if (Math.abs((b.x - a.x) * (root.y - b.y) - (b.y - a.y) * (root.x - b.x)) > 0.001) break;
                points.pop();
              }
              points.push({ x: root.x, y: root.y });
            }
            return { id: edge.dataset.id || edge.id, points, source:edge.dataset.gptmSource,
              target:edge.dataset.gptmTarget,shared:edge.dataset.gptmSharedTip,sharedStart:edge.dataset.gptmSharedStart };
          });
        const crossings = [], hits = [];
        for (let i = 0; i < paths.length; i++) for (let j = i + 1; j < paths.length; j++) {
          const a = paths[i], b = paths[j];
          let hit = false;
          for (let k = 1; k < a.points.length && !hit; k++) for (let l = 1; l < b.points.length; l++) {
            const point = intersections(a.points[k - 1], a.points[k], b.points[l - 1], b.points[l]);
            if (point) {
              hits.push({a:a.id,b:b.id,point,sourceA:a.source,sourceB:b.source,
                targetA:a.target,targetB:b.target,sharedA:a.shared,sharedB:b.shared,
                sharedStartA:a.sharedStart,sharedStartB:b.sharedStart});
              hit = true; break;
            }
          }
          if (hit) crossings.push([a.id, b.id]);
        }
        verified.push({ id, routing: result.routing, crossings, hits,
          ...(crossings.length || id.includes("state") ? {svg:result.svg}: {}) });
      } finally { host.remove(); }
    }
    return { gallery, verified };
  });
  await fs.mkdir(output, { recursive: true });
  for (const sample of report.verified.filter(s=>s.svg)) {
    if (sample.id.includes("state")) {
      sample.ports = await page.evaluate(inspectStatePorts, sample.svg);
    }
    if (sample.crossings.length) await fs.writeFile(path.join(output, `${sample.id}-crossing.svg`), sample.svg);
    delete sample.svg;
  }
  await fs.writeFile(path.join(output, "crossing-quality.json"), JSON.stringify(report, null, 2));
  for (const sample of report.verified) {
    assert.equal(sample.routing.status, "clear", `${sample.id} 尚有未解交叉`);
    assert.equal(sample.crossings.length, 0, `${sample.id} 最终SVG独立采样发现交叉: ${JSON.stringify(sample.crossings)}`);
    if (sample.ports) {
      assert.equal(sample.ports.length, sample.routing.checkedEdges, `${sample.id} 端口检查不能遗漏边`);
      for (const edge of sample.ports) for (const port of edge.endpoints) {
        assert(edge.sharedArrowValid && port.middleError < .1 && port.contourGap < 1.2
          && port.controlLead >= 39.9 && port.normalError < .1,
        `${sample.id} ${edge.id} 未满足中点及法向引线：${JSON.stringify(port)}`);
      }
    }
  }
  for (const sample of report.gallery) {
    assert(sample.status !== "clear" || sample.crossings === 0, `${sample.id} 不能假报无交叉`);
    assert(sample.checkedEdges > 0 || sample.status === "not-applicable", `${sample.id} 未检查不能假报通过`);
  }
  assert.equal(report.gallery.length, 100, `交叉基准图数量变化：${report.gallery.length}`);
  const statusCounts = report.gallery.reduce((counts, sample) => {
    counts[sample.status] = (counts[sample.status] || 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(statusCounts, {
    clear: 49,
    "not-applicable": 50,
    unresolved: 1,
  }, `交叉状态分布变化：${JSON.stringify(statusCounts)}`);
  for (const id of ["stress-flow-lr-dense", "stress-flow-lr-parallel-edges", "stress-er-network"]) {
    const sample = report.gallery.find(r => r.id === id);
    assert.equal(sample.status, "clear", `${id} 可平面的既有故障应被解决`);
  }
  const hierarchy = report.gallery.find((sample) => sample.id === "stress-class-hierarchy");
  assert(hierarchy, "缺少 stress-class-hierarchy 复杂类图");
  assert.equal(hierarchy.status, "unresolved", "复杂类图必须保持真实 unresolved 状态");
  assert.equal(hierarchy.reason, "search-budget", "复杂类图未解原因变化");
  assert(hierarchy.crossings > 0, "复杂类图必须保留真实未解交叉");
  assert.equal(hierarchy.checkedEdges, 36, "复杂类图已检查边数变化");
  assert.equal(report.verified.length, 9, `独立采样数量变化：${report.verified.length}`);
  assert.deepEqual(
    report.verified.map((sample) => sample.id).sort(),
    ["state", "stress-flow-td-feedback", "stress-state-choice", "stress-c4-context",
      "stress-c4-boundary", "renamed-state-BT", "renamed-state-LR", "renamed-state-RL", "renamed-state-TB"].sort(),
    "独立采样图种清单变化",
  );
  return report;
}

import assert from "node:assert/strict";

/*
 * 职责：集中保存浏览器几何验收的基线计数，避免各脚本各自维护而漂移。
 * 调用方：arrow-contacts.mjs、detail-overlaps.mjs、e2e.mjs、webkit-mobile.mjs。
 * 红线：这些数字只描述当前 100 张基准图；实用变体的额外图不能套用本表。
 */
export const BASE_GEOMETRY_EXPECTATIONS = Object.freeze({
  sampleCount: 100,
  // 固定中点汇入共用一个三角；状态图逻辑边数量和共享末段另由 state-ports 验收。
  totalTriangles: 446,
  keyTriangles: Object.freeze({
    "flow-minimal": 1,
    "flow-branch": 3,
    "flow-complex": 9,
    "flow-shapes": 7,
    "flow-both": 4,
    state: 6,
    "stress-state-composite": 11,
    "stress-state-parallel": 9,
    "stress-state-choice": 7,
    "stress-state-fork-join": 7,
    "stress-state-notes": 3,
    "stress-state-long": 14,
    sequence: 4,
    class: 3,
    "stress-flow-td-long-chain": 16,
    "stress-flow-lr-extreme-chain": 14,
    "stress-flow-lr-dense": 15,
    "stress-flow-lr-grid": 18,
    "stress-class-hierarchy": 36,
    "stress-sequence-wide": 20,
    "stress-timeline-wide": 17,
  }),
});

export function assertBaseGeometryCounts(report, label) {
  assert.equal(report.length, BASE_GEOMETRY_EXPECTATIONS.sampleCount,
    `${label} 基准图数量变化：${report.length}`);
  assert.equal(
    report.reduce((total, item) => total + item.triangles, 0),
    BASE_GEOMETRY_EXPECTATIONS.totalTriangles,
    `${label} 三角总数变化`,
  );
  const byId = new Map(report.map((item) => [item.id, item]));
  for (const [id, expected] of Object.entries(BASE_GEOMETRY_EXPECTATIONS.keyTriangles)) {
    const item = byId.get(id);
    assert(item, `${label} 缺少关键图 ${id}`);
    assert.equal(item.triangles, expected, `${label} ${id} 三角数变化`);
  }
}

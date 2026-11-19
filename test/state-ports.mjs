/* 职责：提供兼容旧 E2E 数组结构的独立端口报告。
 * 调用方：page.evaluate；依赖：最终 SVG 验收器的同一套采样与纯数据门禁。
 * 红线：不复制几何算法；middleError/controlLead 仅供观测，不恢复唯一中点或40/32约束。
 */
import { inspectStateLayout } from "./state-layout-geometry.mjs";

// page.evaluate 不传递模块闭包，因此导出时嵌入静态函数，而不是在浏览器寻找导入变量。
export const inspectStatePorts = new Function(`return function inspectStatePorts(markup) {
  const report = (${inspectStateLayout.toString()})(markup);
  // 浏览器序列化会丢掉数组上的非索引属性；空数组不能靠 every() 被误认作通过。
  if (!report.edges.length) throw new Error("gpt-mermaid: empty-edge-set");
  const rows = report.edges.map(edge => ({
    id: edge.id, source: edge.source, target: edge.target,
    sharedArrowValid: !edge.sharedStart && !edge.sharedTip,
    endpoints: report.ports.filter(port => port.edge === edge.id),
    markerStart: edge.markerStart, markerEnd: edge.markerEnd,
    portGroups: report.portGroups.filter(group => group.orderedPorts.some(id => id.startsWith(edge.id + ":"))),
    issues: report.issues.filter(issue => issue.edge === edge.id || issue.id === edge.id
      || issue.a === edge.id || issue.b === edge.id || issue.owner === edge.source || issue.owner === edge.target),
    accepted: report.accepted,
    markerCount: report.markerCount, expectedMarkerCount: report.expectedMarkerCount
  }));
  rows.issues = report.issues;
  rows.accepted = report.accepted;
  return rows;
}`)();

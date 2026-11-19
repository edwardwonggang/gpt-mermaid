/* 职责：为每条状态关系的连接端分配独立端口、直段预算与真实框容量。
 * 调用方：state-model、state-constraints；依赖：实测节点尺寸与形状能力。
 * 红线：不同连接端不能合用port；只增大框，不缩放文字；圆/菱形只使用合法轴向极点。
 */
import { READING_LAYOUT } from "./layout-style.js";
export const STATE_PORT_SIDES = ["NORTH", "EAST", "SOUTH", "WEST"];
export const STATE_PORT_GAP = 18;
export const STATE_CORNER_RADIUS = READING_LAYOUT.cornerRadius;
export const STATE_VISIBLE_LEAD = READING_LAYOUT.visibleLead;
// 圆角切入4 + 描边余量1；目标另预留实际箭头，保证真实可见线杆至少16。
export const statePortLead = (arrow, depth = 11) => STATE_VISIBLE_LEAD + STATE_CORNER_RADIUS + 1 + (arrow ? depth : 0);
export const stateCardinalOnly = n => /^(stateStart|stateEnd|choice|choiceState)$/.test(n.shape);
// 箭头最大深度18、底宽14.4；两边各预留9，涵盖半底宽、描边和净距。
export const stateCornerInset = n => stateCardinalOnly(n) ? 0 : (n.cornerRadius ?? (n.kind === "label" ? 13 : 12)) + 9;
export function stateSidePoint(n, side, offset = 0) {
  return { x: side === "WEST" ? 0 : side === "EAST" ? n.width : n.width / 2 + offset,
    y: side === "NORTH" ? 0 : side === "SOUTH" ? n.height : n.height / 2 + offset };
}

export function allocateStatePorts(model, selected, hints = new Map()) {
  const nodes = new Map(model.nodes.map(n => [n.id, { ...n, arrowDepth: model.arrowDepth || 11,
    ports: [], padding: Object.fromEntries(STATE_PORT_SIDES.map(s => [s, 0])) }]));
  const ends = new Map();
  for (const e of model.segments) for (const end of ["source", "target"]) {
    const n = nodes.get(e[end]), side = selected[e.id][end], id = `${e.id}:${end}`;
    const entry = { id, segment: e.id, owner: e.owner, end, side,
      lead: statePortLead(end === "target" && e.arrow, n.arrowDepth), hint: hints.get(id) ?? 0 };
    n.ports.push(entry); ends.set(id, entry);
  }
  for (const n of nodes.values()) {
    for (const side of STATE_PORT_SIDES) {
      const ports = n.ports.filter(p => p.side === side).sort((a,b) => a.hint-b.hint || a.id.localeCompare(b.id));
      if (!ports.length) continue;
      if (stateCardinalOnly(n) && ports.length > 1) throw new Error(`unsupported: state-port-capacity:${n.id}:${side}`);
      const dim = side === "NORTH" || side === "SOUTH" ? "width" : "height";
      if (!stateCardinalOnly(n)) {
        const radius = n.cornerRadius ?? (n.kind === "label" ? 13 : 12);
        const footprint = ports.some(p=>p.end==="target"&&model.segments.find(e=>e.id===p.segment).arrow)
          ? n.arrowDepth*.4+1 : 1;
        n[dim] = Math.max(n[dim], 2*(radius+footprint)+(ports.length-1)*STATE_PORT_GAP);
      }
      ports.forEach((p, index) => { p.offset = (index - (ports.length - 1) / 2) * STATE_PORT_GAP; });
      n.padding[side] = Math.max(...ports.map(p => p.lead));
    }
    if (n.envelope) {
      n.envelope = { ...n.envelope, width: n.envelope.width + n.width - model.nodes.find(m=>m.id===n.id).width,
        height: n.envelope.height + n.height - model.nodes.find(m=>m.id===n.id).height };
    }
    for (const p of n.ports) Object.assign(p, stateSidePoint(n, p.side, p.offset));
  }
  return { nodes, ends };
}

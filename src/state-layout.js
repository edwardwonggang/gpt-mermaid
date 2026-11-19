/* 职责：按状态层级从内向外布局，注释与所属状态共同占位。
 * 调用方：state-svg；依赖：state-model的单层布局。
 * 红线：父容器不可消失，缺少门户的跨层关系明确返回unsupported，不丢边。
 */
import { solveStateScope } from "./state-model.js";
export async function solveStateLayout(input, direction = "DOWN", layout) {
  const containers = new Map(input.nodes.filter(n => n.shape === "noteGroup").map(n => [n.id, n]));
  input = { ...input, nodes: input.nodes.filter(n => !containers.has(n.id)).map(n => {
    const noteGroup = containers.get(n.parentId);
    if (!noteGroup) return n;
    const connector = input.edges.find(e => e.note && (e.source === n.id || e.target === n.id));
    const ownerId = connector && (connector.source === n.id ? connector.target : connector.source);
    return { ...n, parentId: input.nodes.find(n => n.id === ownerId)?.parentId, noteOwner: ownerId };
  }) };
  const notes = input.nodes.filter(n => n.noteOwner), noteEdges = input.edges.filter(e => e.note);
  const associated = new Map();
  for (const note of notes) {
    if (!associated.has(note.noteOwner)) associated.set(note.noteOwner, []);
    associated.get(note.noteOwner).push(note);
  }
  input = { ...input, nodes: input.nodes.filter(n => !n.noteOwner).map(n => {
    const decorations = associated.get(n.id) || [];
    if (!decorations.length) return n;
    const left = decorations.filter(x => x.position === "left of"), right = decorations.filter(x => x.position !== "left of");
    const leftWidth = left.length ? Math.max(...left.map(x => x.width)) + 90 : 0;
    const rightWidth = right.length ? Math.max(...right.map(x => x.width)) + 90 : 0;
    const sideHeight = list => list.reduce((sum, x) => sum + x.height + 20, -20);
    const height = Math.max(n.height, sideHeight(left), sideHeight(right));
    return { ...n, envelope: { width: n.width + leftWidth + rightWidth, height, dx: leftWidth,
      dy: (height - n.height) / 2, blockedSides: [...(left.length ? ["WEST"] : []), ...(right.length ? ["EAST"] : [])] } };
  }), edges: input.edges.filter(e => !e.note) };
  const byId = new Map(input.nodes.map(n => [n.id, n]));
  for (const n of input.nodes) {
    const seen = new Set(); let current = n;
    while (current?.parentId) {
      if (seen.has(current.id)) throw new Error("constraint-conflict: containment-cycle");
      seen.add(current.id); current = byId.get(current.parentId);
    }
  }
  const roots = input.nodes.filter(n => !n.parentId);
  const used = new Set(), groups = new Map();
  const solveScope = async parent => {
    const children = input.nodes.filter(n => (n.parentId || null) === parent);
    for (const node of children.filter(n => n.isGroup)) {
      const inner = await solveScope(node.id);
      groups.set(node.id, inner);
    }
    const measured = children.map(n => {
      const inner = groups.get(n.id);
      return inner ? { ...n, width: Math.max(n.width, inner.width + 32), height: inner.height + 64 } : n;
    });
    const ids = new Set(children.map(n => n.id));
    const edges = input.edges.filter(e => ids.has(e.source) && ids.has(e.target));
    edges.forEach(e => used.add(e.id));
    const local = await solveStateScope({ nodes: measured, edges, arrowDepth:input.arrowDepth }, direction, layout);
    const nodes = [], segments = [...local.segments];
    for (const n of local.nodes) {
      nodes.push({ ...n, parentId: parent || undefined });
      const inner = groups.get(n.id);
      if (!inner) continue;
      const dx = n.x + 16 + (n.width - inner.width - 32) / 2, dy = n.y + 48;
      nodes.push(...inner.nodes.map(c => ({ ...c, x: c.x + dx, y: c.y + dy })));
      segments.push(...inner.segments.map(e => ({
        ...e, points: e.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
      })));
    }
    return { ...local, nodes, segments };
  };
  if (!roots.length && input.nodes.length) throw new Error("constraint-conflict: containment-cycle");
  for (const n of input.nodes) if (n.parentId && !byId.has(n.parentId)) throw new Error("unsupported: missing-parent");
  const result = await solveScope(null);
  const unmatched = input.edges.filter(e => !used.has(e.id));
  if (unmatched.length) return { status: "unsupported", reason: "cross-hierarchy-portals-required",
    unmatched: unmatched.map(e => e.id) };
  for (const note of notes) {
    const owner = result.nodes.find(n => n.id === note.noteOwner), right = note.position !== "left of";
    const placed = { ...note, kind: "note", x: right ? owner.x + owner.width + 90 : owner.x - 90 - note.width,
      y: owner.y + (owner.height - note.height) / 2, parentId: owner.parentId };
    result.nodes.push(placed);
    const edge = noteEdges.find(e => e.source === note.id || e.target === note.id), sourceIsNote = edge.source === note.id;
    const p = { x: right ? owner.x + owner.width : owner.x, y: owner.y + owner.height / 2 };
    const q = { x: right ? placed.x : placed.x + placed.width, y: placed.y + placed.height / 2 };
    result.segments.push({ ...edge, owner: edge.id, points: sourceIsNote ? [q, p] : [p, q] });
  }
  return { ...result, edges: [...input.edges, ...noteEdges] };
}

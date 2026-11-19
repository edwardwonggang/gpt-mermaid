/* 职责：状态和条件框的中点端口、引线预留与布局候选。
 * 调用方：state-layout；依赖：固定runtime注入的布局能力。
 * 红线：反馈边按业务关系识别，两段显示关系保留同一owner及原方向。
 */
import { validateStateLayout } from "./state-constraints.js";
export const STATE_LAYOUT_LEAD = 40;
const LEAD = STATE_LAYOUT_LEAD;
const SIDES = ["NORTH", "EAST", "SOUTH", "WEST"];
const center = (n, side) => ({
  x: side === "WEST" ? 0 : side === "EAST" ? n.width : n.width / 2,
  y: side === "NORTH" ? 0 : side === "SOUTH" ? n.height : n.height / 2,
});
export function expandModel(input) {
  const order = [], visited = new Set(), active = new Set(), feedbackEdges = new Set();
  const visit = id => {
    if (visited.has(id)) return;
    visited.add(id); active.add(id);
    for (const edge of input.edges.filter(e => e.source === id)) {
      if (active.has(edge.target)) feedbackEdges.add(edge.id);
      else visit(edge.target);
    }
    active.delete(id); order.unshift(id);
  };
  for (const n of input.nodes.filter(n => n.shape === "stateStart")) visit(n.id);
  for (const n of input.nodes) visit(n.id);
  const rank = new Map(order.map((id, i) => [id, i]));
  const nodes = input.nodes.map(n => ({ ...n, kind: "state" }));
  const segments = [];
  for (const edge of input.edges) {
    const feedback = feedbackEdges.has(edge.id), loop = edge.source === edge.target;
    if (edge.label) {
      const id = `${edge.id}:label`;
      nodes.push({ id, kind: "label", owner: edge.id, label: edge.label, width: edge.width, height: edge.height });
      segments.push({ id: `${edge.id}:in`, owner: edge.id, source: edge.source, target: id, arrow: false, feedback: loop ? false : feedback, loop });
      segments.push({ id: `${edge.id}:out`, owner: edge.id, source: id, target: edge.target, arrow: edge.arrow ?? true, feedback, loop });
    } else segments.push({ ...edge, owner: edge.id, arrow: edge.arrow ?? true, feedback, loop });
  }
  const sortRank = n => n.kind === "state" ? rank.get(n.id) * 2 : (() => {
    const e = input.edges.find(e => e.id === n.owner);
    return rank.get(e.source) + rank.get(e.target);
  })();
  nodes.sort((a, b) => sortRank(a) - sortRank(b));
  return { nodes, segments, edges: input.edges };
}
const options = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.randomSeed": "1",
  "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
  "elk.layered.feedbackEdges": "true",
  "elk.spacing.nodeNode": "32",
  "elk.layered.spacing.nodeNodeBetweenLayers": "50",
  "elk.spacing.edgeNode": "20",
  "elk.layered.spacing.edgeNodeBetweenLayers": "20",
  "elk.spacing.edgeEdge": "16",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "16",
};
function graphFor(model, portSides, direction) {
  return {
    id: "root", layoutOptions: { ...options, "elk.direction": direction || "DOWN" },
    children: model.nodes.map(n => {
      const node = { id: n.id, width: (n.envelope?.width || n.width) + LEAD * 2,
        height: (n.envelope?.height || n.height) + LEAD * 2 };
      if (portSides) {
        node.layoutOptions = { "elk.portConstraints": "FIXED_POS" };
        node.ports = SIDES.map(side => {
          const p = center(node, side);
          if (n.envelope) {
            if (side === "NORTH" || side === "SOUTH") p.x = LEAD + n.envelope.dx + n.width / 2;
            else p.y = LEAD + n.envelope.dy + n.height / 2;
          }
          return { id: `${n.id}:${side}`, ...p, width: 0, height: 0, layoutOptions: { "elk.port.side": side } };
        });
      }
      return node;
    }),
    edges: model.segments.map(e => {
      const from = portSides ? `${e.source}:${portSides[e.id].source}` : e.source;
      const to = portSides ? `${e.target}:${portSides[e.id].target}` : e.target;
      return { id: e.id, sources: [e.feedback ? to : from], targets: [e.feedback ? from : to] };
    }),
  };
}
function sideOf(node, p) {
  return SIDES.slice().sort((a, b) => {
    const point = side => ({ x: node.x + center(node, side).x, y: node.y + center(node, side).y });
    const q = point(a), r = point(b);
    // 距离边界判边，不因上游自由端口沿边偏移而误判相邻侧。
    const gap = (side, x) => side === "EAST" || side === "WEST" ? Math.abs(x.x - p.x) : Math.abs(x.y - p.y);
    return gap(a, q) - gap(b, r);
  })[0];
}
export async function solveStateScope(input, direction, layout) {
  const model = expandModel(input);
  const free = await layout(graphFor(model, null, direction));
  const freeNodes = new Map(free.children.map(n => [n.id, n]));
  const bySegment = new Map(model.segments.map(e => [e.id, e]));
  const sides = Object.fromEntries(free.edges.map((edge, i) => {
    const s = edge.sections[0], m = bySegment.get(edge.id);
    const rotation = { DOWN: 0, LEFT: 1, UP: 2, RIGHT: 3 }[direction || "DOWN"];
    const rotate = side => SIDES[(SIDES.indexOf(side) + rotation) % 4];
    if (m.loop) {
      if (m.source === m.target) return [edge.id, { source: rotate("EAST"), target: rotate("NORTH") }];
      return [edge.id, m.arrow ? { source: rotate("NORTH"), target: rotate("NORTH") }
        : { source: rotate("EAST"), target: rotate("WEST") }];
    }
    if (m.feedback) {
      const node = id => model.nodes.find(n => n.id === id);
      return [edge.id, { source: rotate(node(m.source).kind === "label" ? "NORTH" : "EAST"),
        target: rotate(node(m.target).kind === "label" ? "SOUTH" : "EAST") }];
    }
    return [edge.id, { source: sideOf(freeNodes.get(m.source), s.startPoint),
      target: sideOf(freeNodes.get(m.target), s.endPoint) }];
  }));
  for (const e of model.segments) for (const start of [true, false]) {
    const n = model.nodes.find(n => n.id === (start ? e.source : e.target));
    const key = start ? "source" : "target";
    if (!n.envelope?.blockedSides.includes(sides[e.id][key])) continue;
    const forward = { DOWN: ["SOUTH", "NORTH"], UP: ["NORTH", "SOUTH"],
      RIGHT: ["EAST", "WEST"], LEFT: ["WEST", "EAST"] }[direction || "DOWN"];
    sides[e.id][key] = [forward[start ? 0 : 1], ...SIDES].find(s => !n.envelope.blockedSides.includes(s));
  }
  const candidateFor = async selected => {
  const fixed = await layout(graphFor(model, selected, direction));
  const nodes = new Map(fixed.children.map(n => {
    const inputNode = model.nodes.find(m => m.id === n.id);
    return [n.id, { ...inputNode, x: n.x + LEAD + (inputNode.envelope?.dx || 0),
      y: n.y + LEAD + (inputNode.envelope?.dy || 0) }];
  }));
  const port = (node, side) => ({ x: node.x + center(node, side).x, y: node.y + center(node, side).y });
  const fixedEdges = new Map(fixed.edges.map(e => [e.id, e]));
  const segments = model.segments.map(m => {
    const e = fixedEdges.get(m.id), s = e.sections[0], endpoints = selected[e.id];
    const route = [s.startPoint, ...(s.bendPoints || []), s.endPoint];
    if (m.feedback) route.reverse();
    return { ...m, sides: endpoints, points: [
      port(nodes.get(m.source), endpoints.source), ...route, port(nodes.get(m.target), endpoints.target),
    ] };
  });
  return { width: fixed.width, height: fixed.height, nodes: [...nodes.values()], segments, edges: input.edges, sides:selected };
  };
  let best = await candidateFor(sides), quality = validateStateLayout(best);
  if (quality.accepted) return best;
  const score = (result, report) => [report.issues.length, report.intersections.length,
    result.segments.reduce((sum,e)=>sum+e.points.length,0),result.width*result.height];
  const better = (a,b) => a.some((v,i)=>v<b[i]&&a.slice(0,i).every((x,j)=>x===b[j]));
  let bestScore = score(best, quality);
  // 有限整体候选：变更的是环路/反馈通道方向，全部几何重新求解并验收，不修改成品路径。
  for (const loopTurn of [0,1,2,3]) for (const mirror of [false,true]) {
    if (!loopTurn && !mirror) continue;
    const selected = structuredClone(sides);
    for (const edge of model.segments) {
      if (edge.loop) for (const end of ["source","target"]) {
        selected[edge.id][end] = SIDES[(SIDES.indexOf(sides[edge.id][end])+loopTurn)%4];
      } else if (edge.feedback && mirror) {
        const transverse = ["LEFT","RIGHT"].includes(direction) ? ["NORTH","SOUTH"] : ["EAST","WEST"];
        for (const end of ["source","target"]) {
          const index = transverse.indexOf(selected[edge.id][end]);
          if (index >= 0) selected[edge.id][end] = transverse[1-index];
        }
      }
    }
    const result = await candidateFor(selected), report = validateStateLayout(result);
    if (report.accepted) return result;
    const next = score(result,report);
    if (better(next,bestScore)) { best=result;bestScore=next; }
  }
  return best;
}

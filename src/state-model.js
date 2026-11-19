/* 职责：状态和条件框的独立端口、局部占位与有限整体布局候选。
 * 调用方：state-layout；依赖：固定runtime注入的布局能力。
 * 红线：反馈边按业务关系识别，两段显示关系保留同一owner及原方向。
 */
import { validateStateLayout } from "./state-constraints.js";
import { allocateStatePorts, STATE_PORT_SIDES as SIDES, stateSidePoint as center,
  statePortLead, stateCardinalOnly } from "./state-ports.js";
export const STATE_LAYOUT_LEAD = statePortLead(false);
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
  return { nodes, segments, edges: input.edges, arrowDepth: input.arrowDepth || 11 };
}
const options = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.randomSeed": "1",
  "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
  "elk.layered.feedbackEdges": "true",
  "elk.spacing.nodeNode": "20",
  "elk.layered.spacing.nodeNodeBetweenLayers": "3",
  "elk.spacing.edgeNode": "10",
  "elk.layered.spacing.edgeNodeBetweenLayers": "3",
  "elk.spacing.edgeEdge": "16",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "16",
};
function graphFor(model, allocation, direction) {
  return {
    id: "root", layoutOptions: { ...options, "elk.direction": direction || "DOWN" },
    children: model.nodes.map(original => {
      const n = allocation?.nodes.get(original.id) || original;
      const pad = n.padding || { NORTH: 21, SOUTH: 21, EAST: 0, WEST: 0 };
      const node = { id: n.id, width: (n.envelope?.width || n.width) + pad.WEST + pad.EAST,
        height: (n.envelope?.height || n.height) + pad.NORTH + pad.SOUTH };
      if (allocation) {
        node.layoutOptions = { "elk.portConstraints": "FIXED_POS" };
        node.ports = n.ports.map(p => {
          const horizontal = p.side === "NORTH" || p.side === "SOUTH";
          const x = horizontal ? pad.WEST + (n.envelope?.dx || 0) + p.x : p.side === "WEST" ? 0 : node.width;
          const y = horizontal ? p.side === "NORTH" ? 0 : node.height : pad.NORTH + (n.envelope?.dy || 0) + p.y;
          return { id: p.id, x, y, width: 0, height: 0, layoutOptions: { "elk.port.side": p.side } };
        });
      }
      return node;
    }),
    edges: model.segments.map(e => {
      const from = allocation ? `${e.id}:source` : e.source;
      const to = allocation ? `${e.id}:target` : e.target;
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
  const vertical = !["LEFT","RIGHT"].includes(direction), axis = vertical ? "y" : "x";
  const feedback = model.edges.filter(e=>model.segments.some(s=>s.owner===e.id&&s.feedback&&!s.loop))
    .map(e=>({...e,span:Math.abs(freeNodes.get(e.source)[axis]-freeNodes.get(e.target)[axis])}))
    .sort((a,b)=>b.span-a.span || a.id.localeCompare(b.id));
  const channelSide = new Map(feedback.map((e,i)=>[e.id, feedback.length>1&&i===0 ? -1:1]));
  const hints = new Map();
  const sides = Object.fromEntries(free.edges.map((edge, i) => {
    const s = edge.sections[0], m = bySegment.get(edge.id);
    const start = m.feedback ? s.endPoint : s.startPoint, end = m.feedback ? s.startPoint : s.endPoint;
    for (const [key,p] of [["source",start],["target",end]]) {
      const side = sideOf(freeNodes.get(m[key]), p);
      hints.set(`${m.id}:${key}`, side === "NORTH" || side === "SOUTH" ? p.x : p.y);
    }
    const rotation = { DOWN: 0, LEFT: 1, UP: 2, RIGHT: 3 }[direction || "DOWN"];
    const rotate = side => SIDES[(SIDES.indexOf(side) + rotation) % 4];
    if (m.loop) {
      if (m.source === m.target) return [edge.id, { source: rotate("EAST"), target: rotate("NORTH") }];
      return [edge.id, m.arrow ? { source: rotate("EAST"), target: rotate("NORTH") }
        : { source: rotate("EAST"), target: rotate("WEST") }];
    }
    if (m.feedback) return [edge.id, { source: rotate("NORTH"), target: rotate("SOUTH") }];
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
  const candidateFor = async (selected, ordering, poleTurn = 0) => {
  // 非矩形只允许轴向极点；按初次路由的方向把多连接端分散到其它合法侧。
  for (const n of model.nodes.filter(stateCardinalOnly)) {
    const occupied = new Set();
    for (const e of model.segments) for (const end of ["source","target"]) if (e[end] === n.id) {
      const desired = selected[e.id][end];
      const fallback = [1,3,2].map(delta=>SIDES[(SIDES.indexOf(desired)+delta+poleTurn)%4]);
      const side = [desired,...fallback,...SIDES].find(s=>!occupied.has(s));
      if (!side) throw new Error(`unsupported: state-port-capacity:${n.id}`);
      selected[e.id][end] = side; occupied.add(side);
    }
  }
  const selectedHints = new Map(hints);
  if (ordering) for (const m of model.segments) {
    for (const end of ["source","target"]) {
      if (model.nodes.find(n=>n.id===m[end]).kind !== "state") continue;
      const side = channelSide.get(m.owner);
      const hint = side ? (ordering===1 ? side : ordering===2 ? -side : ordering===3 ? 1 : -1)*1e6
        + feedback.find(e=>e.id===m.owner).span : selectedHints.get(`${m.id}:${end}`);
      selectedHints.set(`${m.id}:${end}`, hint);
    }
  }
  const allocation = allocateStatePorts(model, selected, selectedHints);
  const fixed = await layout(graphFor(model, allocation, direction));
  const nodes = new Map(fixed.children.map(n => {
    const inputNode = allocation.nodes.get(n.id);
    return [n.id, { ...inputNode, x: n.x + inputNode.padding.WEST + (inputNode.envelope?.dx || 0),
      y: n.y + inputNode.padding.NORTH + (inputNode.envelope?.dy || 0) }];
  }));
  const port = (node, id) => { const p = allocation.ends.get(id); return { x: node.x + p.x, y: node.y + p.y }; };
  const fixedEdges = new Map(fixed.edges.map(e => [e.id, e]));
  const segments = model.segments.map(m => {
    const e = fixedEdges.get(m.id), s = e.sections[0], endpoints = selected[e.id];
    const route = [s.startPoint, ...(s.bendPoints || []), s.endPoint];
    if (m.feedback) route.reverse();
    return { ...m, sides: endpoints, points: [
      port(nodes.get(m.source), `${m.id}:source`), ...route, port(nodes.get(m.target), `${m.id}:target`),
    ] };
  });
  return { width: fixed.width, height: fixed.height, nodes: [...nodes.values()], segments, edges: input.edges, sides:selected };
  };
  let best = await candidateFor(structuredClone(sides),1), quality = validateStateLayout(best);
  const lanePenalty = result => feedback.reduce((sum,e)=>{
    const byId = new Map(result.nodes.map(n=>[n.id,n])), a=byId.get(e.source),b=byId.get(e.target);
    const label=byId.get(`${e.id}:label`);
    if (!label) return sum;
    const cross = n => vertical ? n.x+n.width/2 : n.y+n.height/2;
    return sum + (Math.sign(cross(label)-(cross(a)+cross(b))/2) === channelSide.get(e.id) ? 0:1);
  },0);
  const score = (result, report) => [report.issues.length, report.intersections.length,
    lanePenalty(result), result.width*result.height, result.segments.reduce((sum,e)=>sum+e.points.length,0)];
  const better = (a,b) => a.some((v,i)=>v<b[i]&&a.slice(0,i).every((x,j)=>x===b[j]));
  let bestScore = score(best, quality);
  // 有限整体候选：变更的是环路/反馈通道方向，全部几何重新求解并验收，不修改成品路径。
  const loopTurns = model.segments.some(e=>e.loop) ? [0,1,2,3] : [0];
  const orderings = feedback.length ? [1,0,2,3,4] : [1];
  const alternatives = loopTurns.flatMap(loopTurn=>orderings.map(ordering=>({loopTurn,ordering,poleTurn:0})));
  const loopOwners=[...new Set(model.segments.filter(e=>e.loop).map(e=>e.owner))];
  if(loopOwners.length>1) for(const loopTurn of loopTurns) alternatives.push({loopTurn,ordering:1,poleTurn:0,spreadLoops:true});
  if (model.nodes.some(n=>stateCardinalOnly(n)&&model.segments.filter(e=>e.source===n.id||e.target===n.id).length>1))
    for (const poleTurn of [1,2,3]) alternatives.push({loopTurn:0,ordering:1,poleTurn});
  for (const {loopTurn,ordering,poleTurn,spreadLoops} of alternatives) {
    if (!loopTurn && ordering===1 && !poleTurn && !spreadLoops) continue;
    const selected = structuredClone(sides);
    for (const edge of model.segments) {
      if (edge.loop) for (const end of ["source","target"]) {
        selected[edge.id][end] = SIDES[(SIDES.indexOf(sides[edge.id][end])+loopTurn
          +(spreadLoops?loopOwners.indexOf(edge.owner):0))%4];
      }
    }
    const result = await candidateFor(selected,ordering,poleTurn), report = validateStateLayout(result);
    const next = score(result,report);
    if (better(next,bestScore)) { best=result;bestScore=next; }
  }
  return best;
}

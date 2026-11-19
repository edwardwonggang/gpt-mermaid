/* 职责：定义组件统一的阅读布局策略与图种适配，不参与语义解析或SVG绘制。
 * 调用方：render、state-model、state-ports；依赖：无。
 * 红线：图种保持自己的时间/层级语义，不使用全局nodeSpacing覆盖所有引擎。
 */
export const READING_LAYOUT = Object.freeze({
  id: "balanced-reading-v1",
  nodeGap: 20,
  stateLayerGap: 3,
  edgeClearance: 10,
  laneGap: 16,
  visibleLead: 16,
  cornerRadius: 4,
  placement: "BRANDES_KOEPF",
  alignment: "BALANCED",
  readingWeights: Object.freeze({ branchBalance: .6, terminalProximity: .8 }),
});

export function runtimeLayoutOptions(flowchart, stateDiagram) {
  return {
    // 流程关系采用均衡分支。时间轴、类成员、ER基数、统计坐标使用原图种的结构规则。
    ...(flowchart ? { elk: { nodePlacementStrategy: READING_LAYOUT.placement,
      nodePlacementAlignment: READING_LAYOUT.alignment, mergeEdges: false } } : {}),
    state: { useMaxWidth: false, wrappingWidth: 360,
      ...(stateDiagram ? { nodeSpacing: READING_LAYOUT.nodeGap, rankSpacing: 50 } : {}) },
  };
}

export function stateReadingMetrics(model, direction) {
  const vertical = !["LEFT","RIGHT"].includes(direction);
  const cross = n => vertical ? n.x+n.width/2 : n.y+n.height/2;
  const nodes = new Map(model.nodes.filter(n=>n.kind==="state").map(n=>[n.id,n]));
  const feedback = new Set(model.segments.filter(e=>e.feedback||e.loop).map(e=>e.owner));
  const edges = model.edges.filter(e=>!feedback.has(e.id)&&nodes.has(e.source)&&nodes.has(e.target));
  const units = [...nodes.values()].map(n=>vertical?n.width:n.height).sort((a,b)=>a-b);
  const unit = Math.max(1,units[Math.floor(units.length/2)]||1);
  const outgoing = new Map([...nodes.keys()].map(id=>[id,edges.filter(e=>e.source===id)]));
  const incoming = new Map([...nodes.keys()].map(id=>[id,edges.filter(e=>e.target===id)]));
  const mean = list => list.reduce((a,b)=>a+b,0)/Math.max(1,list.length);
  const branchImbalance=mean([...nodes.keys()].flatMap(id=>{
    const next=outgoing.get(id);
    return next.length>1 ? [Math.abs(cross(nodes.get(id))-mean(next.map(e=>cross(nodes.get(e.target)))))/unit]:[];
  }));
  // 主干以无反馈图中最长的结构链衡量，不猜“成功/失败”标签，不强行挑一个业务分支。
  const memo=new Map(),active=new Set();
  const depth=id=>{
    if(memo.has(id))return memo.get(id);
    if(active.has(id))return 0;
    active.add(id);const value=1+Math.max(0,...outgoing.get(id).map(e=>depth(e.target)));
    active.delete(id);memo.set(id,value);return value;
  };
  const longest=edges.filter(e=>depth(e.source)===depth(e.target)+1);
  const lateralTravel=mean(longest.map(e=>Math.abs(cross(nodes.get(e.source))-cross(nodes.get(e.target)))/unit));
  const terminals=[...nodes.keys()].filter(id=>outgoing.get(id).length===0&&incoming.get(id).length);
  const terminalDrift=mean(terminals.map(id=>Math.abs(cross(nodes.get(id))
    -mean(incoming.get(id).map(e=>cross(nodes.get(e.source)))))/unit));
  return { lateralTravel, branchImbalance, terminalDrift,
    readingCost:lateralTravel+branchImbalance*READING_LAYOUT.readingWeights.branchBalance
      +terminalDrift*READING_LAYOUT.readingWeights.terminalProximity };
}

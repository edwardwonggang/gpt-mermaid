/* 职责：在统一布局模型中压缩主轴空白，联合保留框尺寸、法向引线及通道净距。
 * 调用方：state-model；依赖：纯几何与已分配的节点/端口。
 * 红线：同一坐标映射同时作用全部节点与路径；不能单独挪标签、改拓扑或缩文字。
 */
import { simplifyPoints } from "./svg-routing.js";
import { statePortLead } from "./state-ports.js";
import { READING_LAYOUT } from "./layout-style.js";

export function compactStateSpacing(model,direction) {
  const axis=["LEFT","RIGHT"].includes(direction)?"x":"y",other=axis==="x"?"y":"x";
  const dimension=axis==="x"?"width":"height",breadth=axis==="x"?"height":"width";
  const segments=model.segments.map(e=>({...e,points:simplifyPoints(e.points)}));
  const boxes=model.nodes.map(n=>({node:n,start:n[axis]-(n.envelope?.[axis==="x"?"dx":"dy"]||0),
    size:n.envelope?.[dimension]||n[dimension],cross:n[other]-(n.envelope?.[axis==="x"?"dy":"dx"]||0),
    breadth:n.envelope?.[breadth]||n[breadth]}));
  const key=v=>Math.round(v*1e6)/1e6;
  const stations=[...new Set([0,model[dimension],...boxes.flatMap(b=>[b.start,b.start+b.size]),
    ...model.nodes.flatMap(n=>[n[axis],n[axis]+n[dimension]]),
    ...segments.flatMap(e=>e.points.map(p=>p[axis]))].map(key))].sort((a,b)=>a-b);
  const indices=new Map(stations.map((v,i)=>[v,i])),requirements=stations.map(()=>[]);
  const requireGap=(a,b,gap)=>{
    if(b<a)[a,b]=[b,a];
    const i=indices.get(key(a)),j=indices.get(key(b));
    if(i!==undefined&&j>i)requirements[j].push([i,Math.min(gap,stations[j]-stations[i])]);
  };
  const groupOf=[0],groupStarts=[stations[0]],offsets=[0];
  for(let i=1;i<stations.length;i++){
    const a=stations[i-1],b=stations[i];
    // 框和文字所在区间原长度锁定，非对象区才可压缩。
    const locked=boxes.some(n=>a<n.start+n.size-1e-5&&b>n.start+1e-5);
    if(!locked)groupStarts.push(b);
    groupOf[i]=groupStarts.length-1;offsets[i]=b-groupStarts.at(-1);
    requirements[i].push([i-1,locked?b-a:Math.min(.01,b-a)]);
  }
  const byId=new Map(model.nodes.map(n=>[n.id,n])),transverse=[];
  for(const edge of segments){
    for(let i=1;i<edge.points.length;i++){
      const a=edge.points[i-1],b=edge.points[i];
      if(Math.abs(a[axis]-b[axis])>.001){
        let gap=READING_LAYOUT.edgeClearance+2*READING_LAYOUT.cornerRadius;
        if(i===1)gap=Math.max(gap,statePortLead(false,byId.get(edge.source).arrowDepth));
        if(i===edge.points.length-1)gap=Math.max(gap,statePortLead(edge.arrow,byId.get(edge.target).arrowDepth));
        requireGap(a[axis],b[axis],gap);
      }else transverse.push({at:a[axis],lo:Math.min(a[other],b[other]),hi:Math.max(a[other],b[other]),owner:edge.owner});
    }
  }
  for(const a of boxes)for(const b of boxes){
    if(a.start+a.size<=b.start+.001&&a.cross<b.cross+b.breadth&&b.cross<a.cross+a.breadth)
      requireGap(a.start+a.size,b.start,READING_LAYOUT.edgeClearance);
  }
  for(const line of transverse){
    for(const b of boxes)if(line.lo<b.cross+b.breadth&&line.hi>b.cross){
      if(line.at<b.start)requireGap(line.at,b.start,READING_LAYOUT.edgeClearance);
      else if(line.at>b.start+b.size)requireGap(b.start+b.size,line.at,READING_LAYOUT.edgeClearance);
    }
    for(const otherLine of transverse)if(line.owner!==otherLine.owner&&line.at<otherLine.at
      &&line.lo<otherLine.hi&&otherLine.lo<line.hi)requireGap(line.at,otherLine.at,READING_LAYOUT.laneGap);
  }
  // 同一对象覆盖的站位组成刚性组：只设最小高度会被别的跨区约束拉长，
  // 让框本身没变但内部端口偏移。组内偏移固定，统一平移整组。
  const groupRequirements=groupStarts.map(()=>[]);
  for(let j=1;j<stations.length;j++)for(const [i,gap] of requirements[j])
    if(groupOf[i]!==groupOf[j])groupRequirements[groupOf[j]].push([groupOf[i],gap+offsets[i]-offsets[j]]);
  const bases=[stations[0]];
  for(let j=1;j<groupStarts.length;j++)bases[j]=Math.max(...groupRequirements[j].map(([i,gap])=>bases[i]+gap));
  const positions=stations.map((_,i)=>key(bases[groupOf[i]]+offsets[i]));
  const mapped=value=>{
    const exact=indices.get(key(value));
    if(exact!==undefined)return positions[exact];
    const upper=stations.findIndex(v=>v>value);
    if(upper<1)return value+(positions.at(-1)-stations.at(-1));
    const low=upper-1,t=(value-stations[low])/(stations[upper]-stations[low]);
    return positions[low]+t*(positions[upper]-positions[low]);
  };
  return {...model,[dimension]:mapped(model[dimension]),nodes:model.nodes.map(n=>({...n,[axis]:mapped(n[axis])})),
    segments:segments.map(e=>({...e,points:e.points.map(p=>({...p,[axis]:mapped(p[axis])}))})),
    spacing:{axis,before:model[dimension],after:mapped(model[dimension])}};
}

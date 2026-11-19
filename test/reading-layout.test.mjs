/* 职责：独立检验阅读选优、整框空间压缩及图种策略隔离。
 * 调用方：node:test；依赖：纯布局模块；不启动浏览器、不从输出反推预期。
 */
import test from "node:test";
import assert from "node:assert/strict";
import {stateReadingMetrics,runtimeLayoutOptions} from "../src/layout-style.js";
import {compactStateSpacing} from "../src/state-spacing.js";
import {validateStateLayout} from "../src/state-constraints.js";
const node=(id,x,y,width=80,height=40)=>({id,kind:"state",shape:"rect",x,y,width,height,cornerRadius:4});
function graph(xs){
  const nodes=xs.map((x,i)=>node(`n${i}`,x,i*160));
  const edges=nodes.slice(1).map((n,i)=>({id:`e${i}`,source:nodes[i].id,target:n.id,arrow:true}));
  return {nodes,edges,segments:edges.map(e=>({...e,owner:e.id,feedback:false}))};
}
test("同样完整的图优先选择连续主干、平衡分支及靠近主流程的终点",()=>{
  const scattered=graph([0,0,260,80,80,0]),balanced=graph([130,80,240,170,190,170]);
  for(const g of [scattered,balanced]){
    g.edges.push({id:"branch",source:"n0",target:"n2",arrow:true});
    g.segments.push({...g.edges.at(-1),owner:"branch"});
  }
  const a=stateReadingMetrics(scattered,"DOWN"),b=stateReadingMetrics(balanced,"DOWN");
  assert(b.branchImbalance<a.branchImbalance);assert(b.terminalDrift<a.terminalDrift);
  assert(b.lateralTravel<a.lateralTravel);assert(b.readingCost<a.readingCost);
  const renamed=structuredClone(balanced);
  const rename=id=>`语义无关-${id}`;
  renamed.nodes.forEach(n=>n.id=rename(n.id));
  for(const e of [...renamed.edges,...renamed.segments]){e.source=rename(e.source);e.target=rename(e.target);}
  assert.deepEqual(stateReadingMetrics(renamed,"DOWN"),b);
});
test("同一视觉策略不将状态间距套到时序、ER和其它语义图",()=>{
  assert.equal(runtimeLayoutOptions(true,false).elk.nodePlacementAlignment,"BALANCED");
  assert.equal(runtimeLayoutOptions(false,false).elk,undefined);
  for(const options of [runtimeLayoutOptions(true,false),runtimeLayoutOptions(false,true),runtimeLayoutOptions(false,false)]){
    assert.equal(options.nodeSpacing,undefined);assert.equal(options.rankSpacing,undefined);
    assert.equal(options.sequence,undefined);assert.equal(options.er,undefined);
  }
});
function straight(){
  const edges=[{id:"e",source:"a",target:"b",arrow:true}];
  return {width:120,height:500,nodes:[node("a",20,20),node("b",20,400)],edges,
    segments:[{...edges[0],owner:"e",points:[{x:60,y:60},{x:60,y:400}]}]};
}
test("共享直走廊压缩为足够引线，不缩文字框、不改关系、不修改输入",()=>{
  const input=straight(),before=structuredClone(input);
  const compact=compactStateSpacing(input,"DOWN");
  assert(compact.height<input.height/2);
  assert.deepEqual(compact.nodes.map(n=>[n.width,n.height]),input.nodes.map(n=>[n.width,n.height]));
  assert.deepEqual(compact.edges,input.edges);assert.deepEqual(input,before);
  assert.equal(validateStateLayout(compact).accepted,true);
  assert.deepEqual(compactStateSpacing(compact,"DOWN"),{...compact,spacing:{...compact.spacing,before:compact.height}});
});
test("跨对象约束不能伸缩框内坐标，内部端口与原框距离严格保持",()=>{
  const input=straight();
  input.nodes.push(node("side",160,380,100,70));
  input.segments[0].points=[{x:60,y:60},{x:60,y:200},{x:145,y:200},{x:145,y:350},{x:60,y:350},{x:60,y:400}];
  const compact=compactStateSpacing(input,"DOWN");
  assert.equal(validateStateLayout(compact).accepted,true);
  for(const n of compact.nodes)assert.equal(n.height,input.nodes.find(o=>o.id===n.id).height);
  assert.equal(compact.segments[0].points.at(-1).y,compact.nodes.find(n=>n.id==="b").y);
});
test("横向图以同样坐标策略压缩，不因旋转改变端口关系",()=>{
  const input=straight();input.width=500;input.height=120;
  input.nodes=input.nodes.map(n=>({...n,x:n.y,y:n.x,width:n.height,height:n.width}));
  input.segments[0].points=input.segments[0].points.map(p=>({x:p.y,y:p.x}));
  const result=compactStateSpacing(input,"RIGHT");assert(result.width<250);
  assert.equal(validateStateLayout(result).accepted,true);
});

/* 职责：在已有浏览器内验证独立端口的方向/文字/自环/稠密变体。
 * 调用方：e2e；依赖：真实发布包、最终SVG独立检查器。
 * 红线：不靠节点名选择路由，不开第二浏览器、不改用户数据；完整关系数量须读回。
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { inspectStateLayout } from "./state-layout-geometry.mjs";
const SOURCE = `stateDiagram-v2
[*] --> Boot
Boot --> Off: disabled
Boot --> Waiting: ready but incomplete
Off --> Waiting: enable
Waiting --> Positive: due
Positive --> Negative: success
Positive --> Waiting: retry positive
Negative --> Complete: done
Negative --> Waiting: retry negative
Complete --> Off: disable`;
export async function verifyStateIndependentVariants(page, output) {
  await fs.mkdir(output,{recursive:true});
  const variants = ["TB","BT","LR","RL"].flatMap(direction => ["Arial, sans-serif","Georgia, serif"].map(font =>
    ({id:`ports-${direction}-${font.startsWith("Arial")?"sans":"serif"}`,source:SOURCE.replace("stateDiagram-v2",`stateDiagram-v2\ndirection ${direction}`),font,expected:10})));
  variants.push(
    {id:"two-labelled-loops",expected:5,source:"stateDiagram-v2\n[*] --> A\nA --> A: again\nA --> A: retry\nA --> B: finish\nB --> A: back"},
    {id:"two-plain-loops",expected:4,source:"stateDiagram-v2\n[*] --> A\nA --> A\nA --> A\nA --> B"},
    {id:"seven-branches",expected:8,source:"stateDiagram-v2\n[*] --> Hub\n"+Array.from({length:7},(_,i)=>`Hub --> Leaf${i}: branch ${i}`).join("\n")},
  );
  const reports=[];
  for(const item of variants){
    const rendered=await page.evaluate(async item=>GPTMermaid.renderSvg(item.source,{fontFamily:item.font||"Arial, sans-serif"}),item);
    const geometry=await page.evaluate(inspectStateLayout,rendered.svg);
    await fs.writeFile(path.join(output,`${item.id}.svg`),rendered.svg);
    await fs.writeFile(path.join(output,`${item.id}.json`),JSON.stringify(geometry,null,2));
    assert.equal(geometry.logicalEdges,item.expected,`${item.id} 关系完整`);
    assert.equal(geometry.markerCount,item.expected,`${item.id} 独立箭头完整`);
    assert.deepEqual(geometry.issues,[],`${item.id} 最终几何`);
    reports.push({id:item.id,width:rendered.width,height:rendered.height,edges:item.expected,issues:geometry.issues});
  }
  await fs.writeFile(path.join(output,"report.json"),JSON.stringify(reports,null,2));
  return reports;
}

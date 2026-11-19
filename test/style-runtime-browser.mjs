/* 职责：在已有浏览器内核验组件主题/字体配置的真实传播和图种隔离。
 * 调用方：e2e/WebKit；依赖：公开API和computed style。
 * 红线：不凭配置回执证明画面生效，不创建新上下文，结束恢复默认配置。
 */
import assert from "node:assert/strict";
export async function verifyStyleRuntime(page){
  const report=await page.evaluate(async()=>{
    const initial=GPTMermaid.configure({});
    const sources=[
      ["state","stateDiagram-v2\n[*] --> Reading\nReading --> Finished: continue"],
      ["flow","flowchart LR\nReading --> Finished"],
      ["sequence","sequenceDiagram\nReading->>Finished: message"],
      ["class","classDiagram\nclass Reading\nclass Finished\nReading --> Finished"],
      ["er","erDiagram\nREADING ||--o{ FINISHED : records"],
    ],results=[];
    try{
      for(const [preset,fontFamily] of [["gpt","Arial, sans-serif"],["tokyo","Georgia, serif"],["gpt","Arial, sans-serif"]]){
        GPTMermaid.configure({preset,fontFamily});
        for(const [type,source] of sources){
          const r=await GPTMermaid.renderSvg(source),host=document.createElement("div");
          host.innerHTML=r.svg;document.body.append(host);
          const texts=[...host.querySelectorAll("text")].filter(e=>e.textContent.trim());
          const shape=host.querySelector("g.node rect,g.node path,.actor");
          results.push({type,preset,fontFamily,fonts:[...new Set(texts.map(t=>getComputedStyle(t).fontFamily))],
            fill:shape?getComputedStyle(shape).fill:null,width:r.width,height:r.height});
          host.remove();
        }
      }
    }finally{GPTMermaid.configure(initial);}
    return results;
  });
  for(const row of report){
    const family=row.fontFamily.split(",")[0];
    assert(row.fonts.length&&row.fonts.every(f=>f.includes(family)),`${row.type}/${row.preset} 最终字体未生效:${row.fonts}`);
    if(row.type==="state"||row.type==="flow")assert.equal(row.fill,row.preset==="tokyo"?"rgb(36, 40, 59)":"rgb(229, 243, 255)");
  }
  return report;
}

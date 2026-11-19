/* 职责：直接量最终SVG的阅读布局，不依赖求解器评分或节点名称。
 * 调用方：e2e与主站验收；依赖：SVG浏览器测量API。
 * 红线：字号、画布与节点分别度量，不能用显示缩放冒充几何改善。
 */
export function inspectStateReading(markup){
  const host=document.createElement("div");host.style.cssText="position:absolute;left:-100000px;top:0";
  host.innerHTML=markup;document.body.append(host);
  try{
    const svg=host.querySelector("svg"),inverse=svg.getScreenCTM().inverse();
    const nodes=[...svg.querySelectorAll('[data-gptm-layout-object="state"]')].map(n=>{
      const s=n.querySelector(":scope > rect,:scope > circle,:scope > .label-container,:scope > .outer-path");
      const b=s.getBBox(),p=new DOMPoint(b.x,b.y).matrixTransform(s.getScreenCTM()).matrixTransform(inverse);
      const q=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(s.getScreenCTM()).matrixTransform(inverse);
      const t=n.querySelector("text");
      return{id:n.dataset.id,x:(p.x+q.x)/2,y:(p.y+q.y)/2,width:q.x-p.x,height:q.y-p.y,
        font:t?getComputedStyle(t).fontFamily:null,fontSize:t?getComputedStyle(t).fontSize:null};
    });
    const bounds=(svg.getAttribute("viewBox")||"").split(/[ ,]+/).map(Number);
    return{width:bounds[2],height:bounds[3],nodes};
  }finally{host.remove();}
}

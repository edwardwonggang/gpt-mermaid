/* 职责：独立读取最终SVG的分段路径，验证状态框和条件框的实际中点、法向直段及避障。
 * 调用方：状态图E2E；只依赖浏览器几何API，不读取布局器的通过标记。
 * 红线：每条逻辑边、条件框与显示段必须完整；实际d与元数据不一致不能通过。
 */
export function inspectStateLayout(markup) {
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-100000px;top:0;width:max-content";
  host.innerHTML = markup; document.body.append(host);
  try {
    const svg = host.querySelector("svg"), rootMatrix = svg.getScreenCTM().inverse();
    const root = (el, p) => new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM()).matrixTransform(rootMatrix);
    const local = (el, p) => new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM()).matrixTransform(el.getScreenCTM().inverse());
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const box = el => {
      const b = el.getBBox(), a = root(el, b), z = root(el, { x: b.x + b.width, y: b.y + b.height });
      return { x: a.x, y: a.y, right: z.x, bottom: z.y, width: z.x - a.x, height: z.y - a.y };
    };
    const objects = new Map([...svg.querySelectorAll("[data-gptm-layout-object]")].map(node => {
      const shape = node.querySelector(":scope > .label-container,:scope > .outer-path,:scope > rect,:scope > circle,:scope > path,:scope > polygon")
        || [...node.children].find(e => e.localName === "g" && !e.classList.contains("label")
          && e.querySelector("path,rect,circle,ellipse,polygon"))
        || (node.classList.contains("edgeLabel") ? node : null);
      return [node.dataset.id, { node, shape, bounds: shape && box(shape) }];
    }));
    const paths = [...svg.querySelectorAll("path.transition[data-source]")], edges = [], ports = [], issues = [], labels = [];
    const ancestors = id => {
      const ids = new Set(); let current = objects.get(id)?.node;
      while (current?.dataset.gptmParent) {
        ids.add(current.dataset.gptmParent); current = objects.get(current.dataset.gptmParent)?.node;
      }
      return ids;
    };
    for (const path of paths) {
      const id = path.dataset.id, logical = path.dataset.gptmEdgeOwner || id;
      // 本库绘制器使用绝对M分开可见段，禁止让隐藏的标签内线路参与验收。
      const parts = path.getAttribute("d").trim().split(/(?=M)/).filter(Boolean);
      const expected = 1;
      if (parts.length !== expected) issues.push({ id, reason: "display-segment-count", parts: parts.length, expected });
      const endpoints = [[path.dataset.source, path.dataset.target]];
      const ignored = new Set([...ancestors(path.dataset.source), ...ancestors(path.dataset.target)]);
      const ranges = [];
      parts.forEach((d, index) => {
        const el = path.cloneNode(false);
        el.removeAttribute("id"); el.removeAttribute("marker-start"); el.removeAttribute("marker-end");
        el.setAttribute("d", d); svg.append(el);
        try {
          const length = el.getTotalLength(), ownerIds = endpoints[index] || [];
          for (const start of [true, false]) {
            const owner = objects.get(ownerIds[start ? 0 : 1]);
            if (!owner?.bounds) { issues.push({ id, reason: "missing-owner" }); continue; }
            const b = owner.bounds, tip = root(el, el.getPointAtLength(start ? 0 : length));
            const choices = [
              { side: "top", x: (b.x+b.right)/2, y:b.y, vx:0, vy:-1 },
              { side: "bottom", x: (b.x+b.right)/2, y:b.bottom, vx:0, vy:1 },
              { side: "left", x:b.x, y:(b.y+b.bottom)/2, vx:-1, vy:0 },
              { side: "right", x:b.right, y:(b.y+b.bottom)/2, vx:1, vy:0 },
            ].sort((a,b)=>dist(a,tip)-dist(b,tip));
            const p = choices[0]; let normalError = 0;
            for (const offset of [4,12,24,32]) {
              const q = root(el,el.getPointAtLength(start ? offset : length-offset));
              normalError = Math.max(normalError, Math.hypot(q.x-tip.x-p.vx*offset,q.y-tip.y-p.vy*offset));
            }
            const result = { edge:id, segment:index, owner:owner.node.dataset.id, start, side:p.side,
              middleError:Math.abs(p.vx ? tip.y-p.y : tip.x-p.x),contourGap:dist(p,tip),normalError };
            ports.push(result);
            if(result.middleError>.1||result.contourGap>1.3||normalError>.1)issues.push({...result,reason:"port-contract"});
          }
          const steps=Math.ceil(length/1.5),samples=[];
          for(let i=0;i<=steps;i++) {
            const p=root(el,el.getPointAtLength(length*i/steps)); samples.push({x:p.x,y:p.y});
            for(const [nodeId,o] of objects) {
              if(!o.bounds||ownerIds.includes(nodeId)||ignored.has(nodeId))continue;
              const b=o.bounds;
              if(p.x>b.x+.5&&p.x<b.right-.5&&p.y>b.y+.5&&p.y<b.bottom-.5) {
                if(!issues.some(x=>x.edge===id&&x.node===nodeId))issues.push({edge:id,node:nodeId,reason:"foreign-object"});
              }
            }
          }
          ranges.push(samples);
        } finally { el.remove(); }
      });
      edges.push({id,logical,source:path.dataset.source,target:path.dataset.target,segments:parts.length,ranges});
    }
    for(const label of [...objects.values()].filter(o=>o.node.dataset.gptmLabelOwner)) {
      const value={edge:label.node.dataset.gptmLabelOwner,text:label.node.textContent.trim(),
        ports:ports.filter(p=>p.owner===label.node.dataset.id)};
      labels.push(value);
      if(value.ports.length!==2)issues.push({id:value.edge,reason:"condition-port-count"});
    }
    return {nodes:[...objects.values()].filter(o=>o.node.dataset.gptmLayoutObject!=="label").length,
      logicalEdges:new Set(edges.map(e=>e.logical)).size,displaySegments:edges.length,labels,ports,issues,edges};
  } finally { host.remove(); }
}

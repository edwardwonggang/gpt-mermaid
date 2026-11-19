/* 职责：独立测量最终状态图的边中点与可见法向直线段，不使用路由器的成功标记。
 * 调用方：浏览器 E2E；依赖：最终 SVG 的实际路径、结构化端点身份。
 * 红线：圆角前的真实直线和控制折线分别验证，空边集不算通过。
 */
export function inspectStatePorts(markup) {
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-100000px;top:0;width:max-content";
  host.innerHTML = markup; document.body.append(host);
  try {
    const svg = host.querySelector("svg"), inverse = svg.getScreenCTM().inverse();
    const root = (element, point) => new DOMPoint(point.x, point.y)
      .matrixTransform(element.getScreenCTM()).matrixTransform(inverse);
    const nodes = new Map([...svg.querySelectorAll("g.node[data-id],g.statediagram-cluster[data-id]")].map(node => {
      const shape = node.querySelector(":scope > .label-container,:scope > .outer-path,:scope > rect,:scope > circle,:scope > polygon,:scope > path")
        || [...node.children].find(child => child.localName === "g" && !child.classList.contains("label")
          && child.querySelector("path,rect,circle,ellipse,polygon"));
      if (!shape) return [node.dataset.id, null];
      const box = shape.getBBox(), p = root(shape, box), q = root(shape, { x: box.x + box.width, y: box.y + box.height });
      return [node.dataset.id, { x: p.x, y: p.y, right: q.x, bottom: q.y }];
    }));
    return [...svg.querySelectorAll("path.transition[data-source]")].map(edge => {
      const length = edge.getTotalLength();
      const controls = JSON.parse(atob(edge.dataset.points)).map(p => root(edge, p));
      const endpoints = [true, false].map(start => {
        const box = nodes.get(start ? edge.dataset.source : edge.dataset.target);
        if (!box) return { start, missingOwner: true };
        const tip = root(edge, edge.getPointAtLength(start ? 0 : length));
        const centers = [
          { side: "top", x: (box.x + box.right) / 2, y: box.y, vx: 0, vy: -1 },
          { side: "bottom", x: (box.x + box.right) / 2, y: box.bottom, vx: 0, vy: 1 },
          { side: "left", x: box.x, y: (box.y + box.bottom) / 2, vx: -1, vy: 0 },
          { side: "right", x: box.right, y: (box.y + box.bottom) / 2, vx: 1, vy: 0 },
        ];
        centers.sort((a, b) => Math.hypot(a.x - tip.x, a.y - tip.y) - Math.hypot(b.x - tip.x, b.y - tip.y));
        const port = centers[0], middleError = Math.abs(port.vx ? tip.y - port.y : tip.x - port.x);
        let normalError = 0;
        for (const distance of [4, 12, 24, 32]) {
          const p = root(edge, edge.getPointAtLength(start ? distance : length - distance));
          normalError = Math.max(normalError, Math.hypot(p.x - tip.x - port.vx * distance, p.y - tip.y - port.vy * distance));
        }
        const p = start ? controls[0] : controls.at(-1), q = start ? controls[1] : controls.at(-2);
        return { start, side: port.side, middleError, normalError,
          contourGap: Math.hypot(tip.x - port.x, tip.y - port.y),
          controlLead: Math.hypot(p.x - q.x, p.y - q.y) };
      });
      const ownerId = edge.dataset.gptmSharedTip;
      const owner = ownerId && [...svg.querySelectorAll("path.transition")].find(e => e.dataset.id === ownerId);
      let sharedArrowValid = true;
      if (ownerId) {
        const otherLength = owner?.getTotalLength();
        sharedArrowValid = Boolean(owner?.hasAttribute("marker-end"));
        for (const offset of [0, 4, 12, 24, 32]) {
          if (!sharedArrowValid) break;
          const p = root(edge, edge.getPointAtLength(length - offset));
          const q = root(owner, owner.getPointAtLength(otherLength - offset));
          if (Math.hypot(p.x - q.x, p.y - q.y) > .1) sharedArrowValid = false;
        }
        sharedArrowValid &&= owner.dataset.target === edge.dataset.target;
      }
      return { id: edge.dataset.id, source: edge.dataset.source, target: edge.dataset.target,
        sharedArrowValid, endpoints };
    });
  } finally { host.remove(); }
}

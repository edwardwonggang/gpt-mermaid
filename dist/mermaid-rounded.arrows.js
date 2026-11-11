/**
 * mermaid-rounded.arrows.js —— 多条边汇入同一节点时合并成一根干线
 *
 * 目标：`A --> C` 和 `B --> C` 这种汇合，不要几条线各带一个箭头并排挤在节点上方，
 *      而是**线也合成一根**：各条边先沿轴向收到同一条线上，再一起进节点，
 *      拐角保持直角，只留一个箭头。
 *
 * 【为什么这样做】
 * 上一版只把终点挪到同一点，没动它前面那个角点，于是：
 *   · 原本 竖直→竖直 的一段被拽成斜线；
 *   · 末段方向变了，marker 自动旋转，箭头就歪了；
 *   · 还对 svg 字符串做了 DOMParser→XMLSerializer 往返，foreignObject 里的 XHTML
 *     闭合标签被破坏，整张图解析报错。
 * 正确做法是把「角点」和「终点」一起搬到同一条轴线上：
 *   TD：末段竖直 → 把倒数第二个点(角点)和终点的 x 都改成锚点 x，横段自然延长，
 *       竖段仍重合 → 天然一根干线，且不产生斜线。
 *   LR：末段水平 → 同理改 y。
 *
 * 用法：
 *   1) 自动：放在 mermaid 之后引入（MutationObserver 监听 svg 插入）
 *   2) 手动：window.mermaidRoundedFixArrows(svgOrContainer)
 */
(function () {
  var cfg = (window.__MR_ARROWS = window.__MR_ARROWS || {});
  if (cfg.enabled == null) cfg.enabled = true;

  // 把 d 里的数字全部取出来（含 index），坐标是成对出现的：
  // 最后 4 个数字 = 角点(x,y) + 终点(x,y)
  function numTokens(d) {
    var re = /-?\d*\.?\d+/g;
    var out = [];
    var m;
    while ((m = re.exec(d)) !== null) out.push({ raw: m[0], index: m.index });
    return out;
  }

  function tailPoints(d) {
    var t = numTokens(d);
    if (t.length < 4) return [];
    var n = t.slice(-4).map(function (x) { return parseFloat(x.raw); });
    return [{ x: n[0], y: n[1] }, { x: n[2], y: n[3] }]; // [角点, 终点]
  }

  // 只替换某一对坐标的字符区间，命令字母和分隔符全部保留
  // whichFromEnd: 1 = 最后一对（终点），2 = 倒数第二对（角点）
  function setPair(d, whichFromEnd, p) {
    var t = numTokens(d);
    if (t.length < 4) return d;
    var i = t.length - (whichFromEnd === 1 ? 2 : 4);
    var from = t[i].index;
    var to = t[i + 1].index + t[i + 1].raw.length;
    return d.slice(0, from) + p.x + ',' + p.y + d.slice(to);
  }

  function fix(root) {
    if (!root || !root.querySelectorAll) return root;
    var svg = root.tagName && root.tagName.toLowerCase() === 'svg' ? root : root.querySelector('svg');
    if (!svg) return root;

    var paths = Array.prototype.slice.call(svg.querySelectorAll('path[marker-end]'));
    if (paths.length < 2) return root;

    // 按目标节点分组：边 id 形如 L_A_F_0 / L-B-C-1，倒数第二段是目标节点
    var groups = new Map();
    paths.forEach(function (p, i) {
      var id = p.id || '';
      // 边 id 带渲染前缀，如 q1-L_A_F_0 / mermaid-1-L-A-F-0
      var m = id.match(/L[-_]([^-_]+)[-_]([^-_]+)[-_]\d+$/);
      var key = m ? 'to:' + m[2] : 'solo:' + i;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });

    groups.forEach(function (group) {
      if (group.length < 2) return;

      var sample = tailPoints(group[0].getAttribute('d') || '');
      if (sample.length < 2) return;
      var vertical = Math.abs(sample[1].x - sample[0].x) < 0.5; // TD 型：末段竖直

      // 锚点取终点坐标的中位数，落在哪条轴上就对齐哪条
      var coords = [];
      group.forEach(function (p) {
        var t = tailPoints(p.getAttribute('d') || '');
        if (t.length === 2) coords.push(vertical ? t[1].x : t[1].y);
      });
      if (!coords.length) return;
      coords.sort(function (a, b) { return a - b; });
      var anchor = coords[Math.floor(coords.length / 2)];

      group.forEach(function (p, idx) {
        var d = p.getAttribute('d') || '';
        var t = tailPoints(d);
        if (t.length < 2) return;
        var corner = { x: t[0].x, y: t[0].y };
        var end = { x: t[1].x, y: t[1].y };

        if (vertical) {
          corner.x = anchor;
          end.x = anchor;
        } else {
          corner.y = anchor;
          end.y = anchor;
        }
        // 先改终点、再改角点（每次都重新解析，避免 index 位移）
        d = setPair(d, 1, end);
        d = setPair(d, 2, corner);
        p.setAttribute('d', d);

        if (idx > 0) p.removeAttribute('marker-end'); // 只保留一个箭头
      });
    });

    return root;
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName && node.tagName.toLowerCase() === 'svg') fix(node);
    if (node.querySelectorAll) {
      Array.prototype.forEach.call(node.querySelectorAll('svg'), function (s) { fix(s); });
    }
  }

  window.mermaidRoundedFixArrows = fix;

  if (typeof MutationObserver !== 'undefined' && document.body) {
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) scan(added[j]);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    Array.prototype.forEach.call(document.querySelectorAll('svg[id^="mermaid"]'), fix);
  }
})();

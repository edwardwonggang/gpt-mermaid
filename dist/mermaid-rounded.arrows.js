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
 * ⚠️ 已知问题（2026-11-12）
 * 这条路走不通：靠后处理改 `d` 无法稳定得到「一根干线 + 引导段」。
 * mermaid 的边由多段 L/Q 混合构成，各边的拐点位置也不一致；只改末尾坐标会：
 *   · 横段末梢停在箭头上，留下横向残段；
 *   · 曲线段被改坐标 → 出斜线；
 *   · 改错朝向判断 → 布局崩坏。
 * 正确做法是在**路由层**（mermaid 的 edge routing / 正交路由）合并，而不是改渲染后的 SVG。
 * 因此默认关闭；需要尝试时设 window.__MR_ARROWS.enabled = true 再调用。
 *
 * 用法：
 *   1) 自动：放在 mermaid 之后引入（MutationObserver 监听 svg 插入）
 *   2) 手动：window.mermaidRoundedFixArrows(svgOrContainer)
 */
(function () {
  var cfg = (window.__MR_ARROWS = window.__MR_ARROWS || {});
  if (cfg.enabled == null) cfg.enabled = false; // 默认关闭：见文件头「已知问题」

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
    if (!cfg.enabled) return root; // 需要显式开启
    if (!root || !root.querySelectorAll) return root;
    var svg = root.tagName && root.tagName.toLowerCase() === 'svg' ? root : root.querySelector('svg');
    if (!svg) return root;

    var paths = Array.prototype.slice.call(svg.querySelectorAll('path[marker-end]'));
    if (paths.length < 2) return root;

    // 按目标节点分组：边 id 形如 <render>-L_A_F_0，倒数第二段是目标节点
    var groups = new Map();
    paths.forEach(function (p, i) {
      var id = p.id || '';
      var m = id.match(/L[-_]([^-_]+)[-_]([^-_]+)[-_]\d+$/);
      var key = m ? m[2] : 'solo:' + i;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });

    var LEAD = (cfg.lead == null ? 16 : cfg.lead);

    function findNodeBox(to) {
      var nodes = Array.prototype.slice.call(svg.querySelectorAll('g.node'));
      for (var i = 0; i < nodes.length; i++) {
        var id = nodes[i].id || '';
        // 节点 id 形如 <render>-flowchart-F-9
        if (new RegExp('[-_]' + to.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[-_]\\d+$').test(id)) {
          try { return nodes[i].getBBox(); } catch (e) { return null; }
        }
      }
      return null;
    }

    groups.forEach(function (group, key) {
      if (group.length < 2) return;

      // 用第一条边判断朝向：看它的起点更靠上/下（TD）还是更靠左/右（LR）
      var first = group[0];
      var box = findNodeBox(key);
      if (!box) return;

      // 取所有边的起点，判断是纵向汇入还是横向汇入
      var starts = group.map(function (p) {
        try { var pt = p.getPointAtLength(0); return { x: pt.x, y: pt.y }; } catch (e) { return null; }
      });
      if (starts.some(function (s) { return !s; })) return;

      // 目标框中心；纵向时用 x，横向时用 y
      var cx = box.x + box.width / 2;
      var cy = box.y + box.height / 2;
      // 起点在节点的上下两侧 → 纵向汇入；在左右两侧 → 横向汇入
      var vertical = starts[0].y < box.y || starts[0].y > box.y + box.height;

      var anchor, entry, join;
      if (vertical) {
        anchor = cx;
        entry = starts[0].y < box.y ? box.y : box.y + box.height; // 从哪边进
        join = entry + (starts[0].y < box.y ? -LEAD : LEAD);
      } else {
        anchor = cy;
        entry = box.x;
        join = entry - LEAD;
      }

      group.forEach(function (p, idx) {
        var s0 = starts[idx];
        var d;
        if (vertical) {
          // 起点 → 竖直下到母线 → 横移到锚点 → 竖直进节点（引导段）
          d = 'M' + s0.x + ',' + s0.y +
              'L' + s0.x + ',' + join +
              'L' + anchor + ',' + join +
              'L' + anchor + ',' + entry;
        } else {
          d = 'M' + s0.x + ',' + s0.y +
              'L' + join + ',' + s0.y +
              'L' + join + ',' + anchor +
              'L' + entry + ',' + anchor;
        }
        p.setAttribute('d', d);
        if (idx > 0) p.removeAttribute('marker-end');
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

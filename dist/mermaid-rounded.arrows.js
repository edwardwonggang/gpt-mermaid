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

  // 取节点框：节点 id 形如 <render>-flowchart-F-9
  function boxOf(svg, name) {
    var nodes = Array.prototype.slice.call(svg.querySelectorAll('g.node'));
    var re = new RegExp('[-_]' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[-_]\\d+$');
    for (var i = 0; i < nodes.length; i++) {
      if (re.test(nodes[i].id || '')) {
        try {
          var el = nodes[i];
          var bb = el.getBBox();
          // g.node 的 getBBox() 是局部坐标，mermaid 把位置放在 translate 上，
          // 必须补上平移量，否则算出来的坐标全在原点附近（连线会被画到画外）。
          var t = el.transform && el.transform.baseVal && el.transform.baseVal.consolidate();
          var tx = t ? t.matrix.e : 0;
          var ty = t ? t.matrix.f : 0;
          return { x: bb.x + tx, y: bb.y + ty, width: bb.width, height: bb.height };
        } catch (e) { return null; }
      }
    }
    return null;
  }

  // 直角拐点做圆弧倒角：把每个 L 拐角替换成 折线→Q 圆角→折线
  // 只处理纯 M/L 折线；已含 Q/C/A 的路径交给 mermaid 自己（避免二次变形）
  function roundPath(d, r) {
    if (!d || /[QCASZ]/i.test(d)) return d;
    var nums = d.match(/-?\d*\.?\d+/g);
    if (!nums || nums.length < 6) return d; // 至少 3 个点才有拐角
    var pts = [];
    for (var i = 0; i + 1 < nums.length; i += 2) pts.push({ x: +nums[i], y: +nums[i + 1] });

    var out = 'M' + pts[0].x + ',' + pts[0].y;
    for (var k = 1; k < pts.length - 1; k++) {
      var p0 = pts[k - 1], p1 = pts[k], p2 = pts[k + 1];
      var v1x = p1.x - p0.x, v1y = p1.y - p0.y;
      var v2x = p2.x - p1.x, v2y = p2.y - p1.y;
      var l1 = Math.sqrt(v1x * v1x + v1y * v1y);
      var l2 = Math.sqrt(v2x * v2x + v2y * v2y);
      if (!l1 || !l2) { out += 'L' + p1.x + ',' + p1.y; continue; }
      var cross = v1x * v2y - v1y * v2x;
      if (Math.abs(cross) < 1e-9) { out += 'L' + p1.x + ',' + p1.y; continue; } // 共线
      var rr = Math.min(r, l1 / 2, l2 / 2);
      var ax = p1.x - (v1x / l1) * rr, ay = p1.y - (v1y / l1) * rr;
      var bx = p1.x + (v2x / l2) * rr, by = p1.y + (v2y / l2) * rr;
      out += 'L' + ax + ',' + ay + 'Q' + p1.x + ',' + p1.y + ' ' + bx + ',' + by;
    }
    var last = pts[pts.length - 1];
    out += 'L' + last.x + ',' + last.y;
    return out;
  }

  // 取箭头高度（px）：读 marker-end 指向的 marker 里箭头路径的 bbox
  function arrowHeight(svg, path) {
    try {
      var m = (path.getAttribute('marker-end') || '').match(/url\(#(.+?)\)/);
      if (!m) return 4;
      var mk = svg.querySelector('marker#' + m[1]) || document.getElementById(m[1]);
      if (!mk) return 4;
      var p = mk.querySelector('path');
      if (p) { var bb = p.getBBox(); if (bb.height > 0.5) return bb.height; }
      var h = parseFloat(mk.getAttribute('markerHeight') || '0');
      return h > 0 ? h : 4;
    } catch (e) { return 4; }
  }

  function fix(root) {
    if (!cfg.enabled) return root;
    if (!root || !root.querySelectorAll) return root;
    var svg = root.tagName && root.tagName.toLowerCase() === 'svg' ? root : root.querySelector('svg');
    if (!svg) return root;

    var paths = Array.prototype.slice.call(svg.querySelectorAll('path[marker-end]'));
    if (paths.length < 2) return root;

    // 分组：边 id = <render>-L_<源>_<目标>_<序号>
    var groups = new Map();
    paths.forEach(function (p, i) {
      var m = (p.id || '').match(/L[-_]([^-_]+)[-_]([^-_]+)[-_]\d+$/);
      if (!m) return;
      var key = m[2];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ path: p, from: m[1] });
    });

    // 引导段长度 = 箭头高度 × 4（保证箭头不压在母线上）
    // 注意：这行在 fix 作用域，不能引用 forEach 的 group
    var arrowH = arrowHeight(svg, paths[0]);
    var LEAD = (cfg.lead == null ? Math.max(12, Math.round(arrowH * 4)) : cfg.lead);

    groups.forEach(function (group, target) {
      if (group.length < 2) return;
      var tbox = boxOf(svg, target);
      if (!tbox) return;

      var items = [];
      for (var i = 0; i < group.length; i++) {
        var sb = boxOf(svg, group[i].from);
        if (!sb) return;                      // 有源节点找不到就整组跳过，避免半改
        items.push({
          path: group[i].path,
          sx: sb.x + sb.width / 2,
          sy: sb.y + sb.height / 2,
          sb: sb
        });
      }

      var tcx = tbox.x + tbox.width / 2;
      var tcy = tbox.y + tbox.height / 2;

      // 用「目标框中心 → 各源框中心」的平均位移判断主方向
      var dx = 0, dy = 0;
      items.forEach(function (it) {
        dx += it.sx - tcx;
        dy += it.sy - tcy;
      });
      var vertical = Math.abs(dy) >= Math.abs(dx);

      items.forEach(function (it, idx) {
        var d;
        if (vertical) {
          var fromTop = it.sy < tcy;
          var startY = fromTop ? it.sb.y + it.sb.height : it.sb.y;
          var entryY = fromTop ? tbox.y : tbox.y + tbox.height;
          var busY = entryY + (fromTop ? -LEAD : LEAD);
          // 源中心 → 竖直下到母线 → 横移到目标中线 → 一小段竖直进节点
          d = 'M' + it.sx + ',' + startY +
              'L' + it.sx + ',' + busY +
              'L' + tcx + ',' + busY +
              'L' + tcx + ',' + entryY;
        } else {
          var fromLeft = it.sx < tcx;
          var startX = fromLeft ? it.sb.x + it.sb.width : it.sb.x;
          var entryX = fromLeft ? tbox.x : tbox.x + tbox.width;
          var busX = entryX + (fromLeft ? -LEAD : LEAD);
          d = 'M' + startX + ',' + it.sy +
              'L' + busX + ',' + it.sy +
              'L' + busX + ',' + tcy +
              'L' + entryX + ',' + tcy;
        }
        it.path.setAttribute('d', d);
        if (idx > 0) it.path.removeAttribute('marker-end'); // 只留一个箭头
      });
    });

    // 所有连线统一做圆弧倒角（含刚合并出来的三段折线）
    var RADIUS = (cfg.radius == null ? 8 : cfg.radius);
    Array.prototype.forEach.call(svg.querySelectorAll('path.flowchart-link'), function (p) {
      var d = p.getAttribute('d');
      if (d) p.setAttribute('d', roundPath(d, RADIUS));
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

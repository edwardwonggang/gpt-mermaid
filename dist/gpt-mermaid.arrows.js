/**
 * gpt-mermaid.arrows.js —— 多条边汇入同一节点时合并成一根干线
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
 * 因此默认关闭；需要尝试时设 window.__GPTM_ARROWS.enabled = true 再调用。
 *
 * 用法：
 *   1) 自动：放在 mermaid 之后引入（MutationObserver 监听 svg 插入）
 *   2) 手动：window.gptMermaidFixArrows(svgOrContainer)
 */
(function () {
  var cfg = (window.__GPTM_ARROWS = window.__GPTM_ARROWS || {});
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

  function ptAt(path, atEnd) {
    try {
      var L = path.getTotalLength();
      return path.getPointAtLength(atEnd ? L : 0);
    } catch (e) { return null; }
  }

  // 终点落在目标框的哪一侧
  function sideOf(pt, box) {
    var dT = Math.abs(pt.y - box.y);
    var dB = Math.abs(pt.y - (box.y + box.height));
    var dL = Math.abs(pt.x - box.x);
    var dR = Math.abs(pt.x - (box.x + box.width));
    var m = Math.min(dT, dB, dL, dR);
    return m === dT ? 'top' : m === dB ? 'bottom' : m === dL ? 'left' : 'right';
  }

  function fix(root) {
    if (!cfg.enabled) return root;
    if (!root || !root.querySelectorAll) return root;
    var svg = root.tagName && root.tagName.toLowerCase() === 'svg' ? root : root.querySelector('svg');
    if (!svg) return root;

    var paths = Array.prototype.slice.call(svg.querySelectorAll('path[marker-end]'));
    if (paths.length < 2) return root;

    var arrowH = arrowHeight(svg, paths[0]);
    var LEAD = (cfg.lead == null ? Math.max(12, Math.round(arrowH * 4)) : cfg.lead);

    // 先按「目标节点 + 进入侧」分组
    var groups = new Map();
    paths.forEach(function (p, i) {
      var m = (p.id || '').match(/L[-_]([^-_]+)[-_]([^-_]+)[-_]\d+$/);
      if (!m) return;
      var target = m[2];
      var box = boxOf(svg, target);
      if (!box) return;
      var end = ptAt(p, true);
      var start = ptAt(p, false);
      if (!end || !start) return;
      var side = sideOf(end, box);
      var key = target + ':' + side;
      if (!groups.has(key)) groups.set(key, { target: target, box: box, side: side, items: [] });
      groups.get(key).items.push({ path: p, start: start });
    });

    groups.forEach(function (g) {
      if (g.items.length < 2) return;
      var box = g.box;
      var vertical = g.side === 'top' || g.side === 'bottom';
      var entry, bus;

      if (vertical) {
        entry = g.side === 'top' ? box.y : box.y + box.height;
        bus = entry + (g.side === 'top' ? -LEAD : LEAD);
      } else {
        entry = g.side === 'left' ? box.x : box.x + box.width;
        bus = entry + (g.side === 'left' ? -LEAD : LEAD);
      }

      var anchor = vertical ? box.x + box.width / 2 : box.y + box.height / 2;

      // 出口段也要留白：源节点贴着母线时，线会「一出来就拐弯」。
      // 规则：优先保证「母线上方/下方 LEAD」；若那样会让某条出口线短于 MIN_EXIT，
      // 就把母线挪到「最靠近目标的那个源出口」与「目标入口」的中间。
      var MIN_EXIT = (cfg.minExit == null ? 18 : cfg.minExit);
      var nearStart = null;
      g.items.forEach(function (it) {
        var v = vertical ? it.start.y : it.start.x;
        if (nearStart === null) { nearStart = v; return; }
        nearStart = vertical
          ? (g.side === 'top' ? Math.max(nearStart, v) : Math.min(nearStart, v))
          : (g.side === 'left' ? Math.max(nearStart, v) : Math.min(nearStart, v));
      });
      if (nearStart !== null) {
        var stub = vertical ? Math.abs(bus - nearStart) : Math.abs(bus - nearStart);
        if (stub < MIN_EXIT) {
          bus = (nearStart + entry) / 2;
        }
      }

      g.items.forEach(function (it, idx) {
        var sx = it.start.x, sy = it.start.y;
        var d;
        if (vertical) {
          // 从原出口点竖直走到母线 → 横移到目标中线 → 竖直进节点（引导段）
          d = 'M' + sx + ',' + sy +
              'L' + sx + ',' + bus +
              'L' + anchor + ',' + bus +
              'L' + anchor + ',' + entry;
        } else {
          d = 'M' + sx + ',' + sy +
              'L' + bus + ',' + sy +
              'L' + bus + ',' + anchor +
              'L' + entry + ',' + anchor;
        }
        it.path.setAttribute('d', d);
        if (idx > 0) it.path.removeAttribute('marker-end');
      });
    });

    // 所有连线统一做圆弧倒角（含刚合并出来的折线）
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

  window.gptMermaidFixArrows = fix;

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

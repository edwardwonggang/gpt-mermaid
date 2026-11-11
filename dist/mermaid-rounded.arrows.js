/**
 * mermaid-rounded.arrows.js —— 汇合的箭头只保留一个
 *
 * 问题：多条边汇到同一个节点时，mermaid 给每条边各画一个箭头，三四个箭头并排挤在
 *      节点上方，看起来像「一坨」。
 * 做法：渲染完成后按「汇入同一个节点」分组，把所有终点吸附到节点边界上的同一个点，
 *      只保留第一个箭头。比按距离聚类稳（边上终点常相隔 20px 左右，聚类容易漏）。
 *
 * 用法（二选一）：
 *   1) 自动：放在 mermaid 之后引入，会自己包住 mermaid.render
 *      <script src="mermaid.rounded.min.js"></script>
 *      <script src="mermaid-rounded.arrows.js"></script>
 *   2) 手动：对已渲染的 <svg> 元素调用
 *      window.mermaidRoundedFixArrows(svgElement)
 */
(function () {
  var CLUSTER = 26; // 终点相距 26px 内视为同一簇（支持链式合并）

  function endPoint(path) {
    try {
      return path.getPointAtLength(path.getTotalLength());
    } catch (e) {
      return null;
    }
  }

  // 只改最后一对坐标（mermaid 的边终点形如 `L x,y` 或曲线收尾的 `x,y`）
  function snapTail(path, x, y) {
    var d = path.getAttribute('d') || '';
    var m = d.match(/(-?[\d.]+)[,\s]+(-?[\d.]+)\s*$/);
    if (!m) return;
    var nx = Math.round(x * 100) / 100;
    var ny = Math.round(y * 100) / 100;
    path.setAttribute('d', d.slice(0, m.index) + nx + ',' + ny);
  }

  // 点是否落在矩形边界上（含容差）
  function onBorder(pt, box, tol) {
    var inX = pt.x >= box.x - tol && pt.x <= box.x + box.width + tol;
    var inY = pt.y >= box.y - tol && pt.y <= box.y + box.height + tol;
    if (!inX || !inY) return false;
    var nearTop = Math.abs(pt.y - box.y) <= tol;
    var nearBottom = Math.abs(pt.y - (box.y + box.height)) <= tol;
    var nearLeft = Math.abs(pt.x - box.x) <= tol;
    var nearRight = Math.abs(pt.x - (box.x + box.width)) <= tol;
    return nearTop || nearBottom || nearLeft || nearRight;
  }

  // 把点投到矩形最近的边上
  function project(pt, box) {
    var cx = Math.min(Math.max(pt.x, box.x), box.x + box.width);
    var cy = Math.min(Math.max(pt.y, box.y), box.y + box.height);
    var dTop = Math.abs(cy - box.y), dBottom = Math.abs(box.y + box.height - cy);
    var dLeft = Math.abs(cx - box.x), dRight = Math.abs(box.x + box.width - cx);
    var min = Math.min(dTop, dBottom, dLeft, dRight);
    if (min === dTop) return { x: cx, y: box.y };
    if (min === dBottom) return { x: cx, y: box.y + box.height };
    if (min === dLeft) return { x: box.x, y: cy };
    return { x: box.x + box.width, y: cy };
  }

  function fix(root) {
    if (!root || !root.querySelectorAll) return root;

    var paths = Array.prototype.slice.call(root.querySelectorAll('path[marker-end]'));
    if (paths.length < 2) return root;

    var items = [];
    paths.forEach(function (p) {
      var pt = endPoint(p);
      if (pt) items.push({ p: p, pt: pt });
    });
    if (items.length < 2) return root;

    // 并查集：终点相距 ≤26px 就连成一簇（边长常相隔 20px，必须支持链式合并）
    var parent = items.map(function (_, i) { return i; });
    function find(i) { return parent[i] === i ? i : (parent[i] = find(parent[i])); }
    function union(a, b) { var ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra; }

    for (var i = 0; i < items.length; i++) {
      for (var j = i + 1; j < items.length; j++) {
        var dx = items[i].pt.x - items[j].pt.x;
        var dy = items[i].pt.y - items[j].pt.y;
        if (Math.sqrt(dx * dx + dy * dy) <= CLUSTER) union(i, j);
      }
    }

    var groups = new Map();
    items.forEach(function (it, idx) {
      var k = find(idx);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    });

    groups.forEach(function (group) {
      if (group.length < 2) return;
      var sx = 0, sy = 0;
      group.forEach(function (it) { sx += it.pt.x; sy += it.pt.y; });
      sx /= group.length;
      sy /= group.length;
      group.forEach(function (it, idx) {
        snapTail(it.p, sx, sy);
        if (idx > 0) it.p.removeAttribute('marker-end');
      });
    });

    return root;
  }

  // svg 字符串 → 临时挂到文档里（getBBox 需要布局）→ 修 → 序列化回去
  function fixString(svg) {
    var doc;
    try {
      doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    } catch (e) {
      return svg;
    }
    var root = doc && doc.documentElement;
    if (!root || root.nodeName === 'parsererror') return svg;

    var host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden;';
    document.body.appendChild(host);
    var live = document.importNode(root, true);
    host.appendChild(live);
    try {
      fix(live);
    } catch (e) {
      host.remove();
      return svg;
    }
    var out = new XMLSerializer().serializeToString(live);
    host.remove();
    return out;
  }

  function install() {
    if (typeof window === 'undefined' || !window.mermaid || !window.mermaid.render) return false;
    if (window.mermaid.__mrArrowHooked) return true;

    var orig = window.mermaid.render.bind(window.mermaid);
    window.mermaid.render = function () {
      return orig.apply(null, arguments).then(function (res) {
        if (res && typeof res.svg === 'string') {
          try { res.svg = fixString(res.svg); } catch (e) { /* 保守降级 */ }
        }
        return res;
      });
    };
    window.mermaid.__mrArrowHooked = true;
    return true;
  }

  window.mermaidRoundedFixArrows = fix;

  if (!install()) {
    var tries = 0;
    var t = setInterval(function () {
      if (install() || ++tries > 250) clearInterval(t);
    }, 20);
  }
})();

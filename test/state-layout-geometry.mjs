/* 职责：独立读取最终 SVG，验收真实轮廓、独立端口、可见法向直段及关系完整性。
 * 调用方：状态图 E2E、主站 verify；依赖：浏览器几何 API 与本文件纯数据门禁。
 * 红线：不读取布局器通过标记，不以包围盒中点冒充轮廓，不豁免不同关系的共享线路。
 * 两个函数在导出时组合成自包含函数，保证 page.evaluate 序列化后仍使用同一套门禁。
 */
export function evaluateStatePortContract(snapshot) {
  const EPS = .1, MIN_SPACING = 12, MIN_VISIBLE = 16;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const issues = [...(snapshot.issues || [])], edges = snapshot.edges || [], objects = snapshot.objects || [];
  const byObject = new Map(objects.map(o => [o.id, o])), labels = [], ports = [], portGroups = [], intersections = [];
  const add = (reason, detail = {}) => issues.push({ reason, ...detail });
  if (!edges.length) add("empty-edge-set");
  if (byObject.size !== objects.length) add("duplicate-object-id");
  if (new Set(edges.map(e => e.id)).size !== edges.length) add("duplicate-edge-id");
  const logical = new Map(), markerRecords = [];
  for (const edge of edges) {
    if (!logical.has(edge.logical)) logical.set(edge.logical, []);
    logical.get(edge.logical).push(edge);
    if (edge.segments !== 1) add("display-segment-count", { id: edge.id, parts: edge.segments, expected: 1 });
    if (!edge.ranges?.length || edge.ranges.some(r => r.length < 2 || !r.every(finitePoint))) {
      add("invalid-path", { id: edge.id });
    }
    for (const endpoint of edge.endpoints || []) {
      const owner = endpoint.owner || (endpoint.start ? edge.source : edge.target);
      const object = byObject.get(owner);
      const port = { ...endpoint, edge: edge.id, logical: edge.logical, owner, segment: endpoint.segment ?? 0,
        portId: `${edge.id}:${endpoint.start ? "start" : "end"}` };
      ports.push(port);
      if (!object?.bounds || endpoint.missingOwner) {
        add("missing-owner", { edge: edge.id, owner, start: endpoint.start }); continue;
      }
      const failures = [];
      if (!finitePoint(port.point) || !Number.isFinite(port.contourGap) || port.contourGap > 1.3) failures.push("contour");
      if (!Number.isFinite(port.normalError) || port.normalError > EPS) failures.push("normal");
      if (!Number.isFinite(port.visibleLead) || port.visibleLead < MIN_VISIBLE - EPS) failures.push("visible-lead");
      if (object.poleOnly && (!Number.isFinite(port.middleError) || port.middleError > EPS)) failures.push("special-pole");
      if (failures.length) add("port-contract", { ...port, failures });
      const marker = endpoint.start ? edge.markerStart : edge.markerEnd;
      if (marker?.present) markerRecords.push({ edge: edge.id, logical: edge.logical, start: endpoint.start,
        point: port.point, side: port.side, ...marker });
    }
    if (edge.endpoints?.length !== 2) add("endpoint-count", { id: edge.id, count: edge.endpoints?.length || 0 });
    if (edge.sharedStart || edge.sharedTip) add("shared-port-metadata", { id: edge.id });
    if (edge.controlIssues?.length) add("control-contract", { id: edge.id, failures: edge.controlIssues });
  }
  const sideGroups = new Map();
  for (const port of ports) {
    const key = JSON.stringify([port.owner, port.side]);
    if (!sideGroups.has(key)) sideGroups.set(key, []);
    sideGroups.get(key).push(port);
  }
  for (const group of sideGroups.values()) {
    const object = byObject.get(group[0].owner), side = group[0].side, span = object?.sides?.[side];
    if (!span || group.some(p => !Number.isFinite(p.coordinate))) {
      add("port-side-unavailable", { owner: group[0].owner, side }); continue;
    }
    const ordered = [...group].sort((a, b) => a.coordinate - b.coordinate || a.portId.localeCompare(b.portId));
    const footprint = p => Math.max(p.markerWidth || 0, p.strokeWidth || 0) / 2;
    const requiredGaps = ordered.slice(1).map((p, i) => Math.max(MIN_SPACING, footprint(ordered[i]) + footprint(p) + 2));
    const gaps = ordered.slice(1).map((p, i) => p.coordinate - ordered[i].coordinate);
    const first = ordered[0], last = ordered.at(-1);
    // 特殊形状仅支持极点；不能从圆/菱形包围盒推导可用直边。
    // 整组必须居中，混合入出端的两侧占位取较大值，不能只加宽较小的那一侧。
    const edgeInset = object.poleOnly ? 0 : Math.max(footprint(first), footprint(last));
    const availableStart = span.min + edgeInset, availableEnd = span.max - edgeInset;
    const availableSpan = Math.max(0, availableEnd - availableStart);
    const requiredSpan = requiredGaps.reduce((a, b) => a + b, 0);
    const centerError = Math.abs((first.coordinate + last.coordinate) / 2 - span.center);
    const meanError = Math.abs(ordered.reduce((sum, p) => sum + p.coordinate, 0) / ordered.length - span.center);
    const dimension = side === "top" || side === "bottom" ? "width" : "height";
    const growBy = object.poleOnly ? null : Math.max(0, requiredSpan - (availableEnd - availableStart));
    const result = { owner: object.id, side, count: ordered.length,
      incoming: ordered.filter(p => !p.start).length, outgoing: ordered.filter(p => p.start).length,
      orderedPorts: ordered.map(p => p.portId), coordinates: ordered.map(p => p.coordinate),
      center: span.center, centerError, meanError, minSpacing: gaps.length ? Math.min(...gaps) : null,
      requiredSpacing: Math.max(MIN_SPACING, ...requiredGaps), gaps, requiredGaps,
      straightStart: span.min, straightEnd: span.max, availableStart, availableEnd, availableSpan, requiredSpan,
      capacity: object.poleOnly ? 1 : Math.max(0, Math.floor((availableEnd - availableStart + EPS)
        / Math.max(MIN_SPACING, ...requiredGaps)) + 1),
      dimension, requiredDimension: growBy === null ? null : object.bounds[dimension] + growBy, growBy,
      poleOnly: Boolean(object.poleOnly) };
    portGroups.push(result);
    ordered.forEach((p, index) => {
      Object.assign(p, { order: index, sideCount: ordered.length, groupCenterError: centerError,
        cornerClearance: Math.min(p.coordinate - span.min, span.max - p.coordinate) });
      const inset = object.poleOnly ? 0 : footprint(p);
      if (p.coordinate < span.min + inset - EPS || p.coordinate > span.max - inset + EPS) {
        add("port-corner-clearance", { edge: p.edge, owner: object.id, side, portId: p.portId,
          coordinate: p.coordinate, availableStart: span.min + inset, availableEnd: span.max - inset });
      }
    });
    if (centerError > EPS || meanError > EPS) add("port-group-center", result);
    if (gaps.some((gap, i) => gap < requiredGaps[i] - EPS)) add("port-spacing", result);
    if (requiredSpan > availableEnd - availableStart + EPS || object.poleOnly && ordered.length > 1) {
      add("port-capacity", result);
    }
  }
  const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" };
  for (const object of objects.filter(o => o.labelOwner)) {
    const endpoints = ports.filter(p => p.owner === object.id);
    const value = { edge: object.labelOwner, text: object.text || "", ports: endpoints };
    labels.push(value);
    if (endpoints.length !== 2) add("condition-port-count", { id: value.edge, count: endpoints.length });
    else if (endpoints.some(p => p.logical !== object.labelOwner)
      || endpoints.filter(p => p.start).length !== 1) add("condition-owner", { id: value.edge });
    else if (opposite[endpoints[0].side] !== endpoints[1].side) add("condition-opposite-sides", { id: value.edge });
  }
  let expectedMarkerCount = 0;
  for (const [id, pieces] of logical) {
    const condition = objects.filter(o => o.labelOwner === id);
    const isNote = pieces.some(e => [e.source, e.target].some(n => byObject.get(n)?.kind === "note"));
    if (!isNote) expectedMarkerCount++;
    if (pieces.length !== (condition.length ? 2 : 1) || condition.length > 1) {
      add("logical-segment-count", { id, count: pieces.length, expected: condition.length ? 2 : 1 });
    }
    const finals = pieces.filter(e => byObject.get(e.target)?.kind !== "label");
    if (finals.length !== 1) add("logical-final-count", { id, count: finals.length });
    for (const edge of pieces) {
      const isConditionEntry = byObject.get(edge.target)?.kind === "label";
      const shouldHave = !isNote && !isConditionEntry;
      if (shouldHave && !edge.markerEnd?.present) add("missing-final-marker", { id: edge.id, logical: id });
      if (!shouldHave && edge.markerEnd?.present) add(isConditionEntry ? "condition-entry-marker" : "note-marker", { id: edge.id });
      if (edge.markerStart?.present) add("unexpected-start-marker", { id: edge.id });
      for (const marker of [edge.markerStart, edge.markerEnd].filter(m => m?.present)) {
        if (!marker.resolved || !marker.visible || !(marker.depth > 0) || !(marker.width > 0)
          || !Number.isFinite(marker.tipGap) || marker.tipGap > EPS) add("invalid-marker", { id: edge.id, marker });
      }
    }
    if (condition.length === 1) {
      const c = condition[0].id;
      if (pieces.filter(e => e.target === c).length !== 1 || pieces.filter(e => e.source === c).length !== 1) {
        add("condition-chain", { id });
      }
    }
  }
  // 相交数值阈值与端口容差分开：圆角近邻弦段不因“很近”就变成共线相交。
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  const vector = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
  const segmentHit = (a, b, c, d) => {
    const u = vector(a, b), v = vector(c, d), w = vector(a, c);
    const ul = distance(a, b), vl = distance(c, d), determinant = cross(u, v);
    if (ul < 1e-8 || vl < 1e-8) return null;
    if (Math.max(a.x, b.x) < Math.min(c.x, d.x) - 1e-7 || Math.max(c.x, d.x) < Math.min(a.x, b.x) - 1e-7
      || Math.max(a.y, b.y) < Math.min(c.y, d.y) - 1e-7 || Math.max(c.y, d.y) < Math.min(a.y, b.y) - 1e-7) return null;
    if (Math.abs(determinant) <= 1e-10 * ul * vl) {
      if (Math.abs(cross(w, u)) / ul > 1e-7) return null;
      const t = p => ((p.x - a.x) * u.x + (p.y - a.y) * u.y) / ul;
      const low = Math.max(0, Math.min(t(c), t(d))), high = Math.min(ul, Math.max(t(c), t(d)));
      if (high < low - 1e-7) return null;
      return { x: a.x + u.x * low / ul, y: a.y + u.y * low / ul,
        kind: high - low > 1e-6 ? "overlap" : "touch", length: Math.max(0, high - low) };
    }
    const t = cross(w, v) / determinant, s = cross(w, u) / determinant;
    if (t < -1e-8 || t > 1 + 1e-8 || s < -1e-8 || s > 1 + 1e-8) return null;
    return { x: a.x + t * u.x, y: a.y + t * u.y, kind: "cross" };
  };
  const simplifySamples = points => {
    const out = [];
    for (const p of points) {
      if (out.length && distance(out.at(-1), p) < 1e-8) continue;
      while (out.length > 1) {
        const a = out.at(-2), b = out.at(-1), u = vector(a, b), v = vector(b, p);
        if (Math.abs(cross(u, v)) > 1e-9 * distance(a, b) * distance(b, p) || u.x * v.x + u.y * v.y < 0) break;
        out.pop();
      }
      out.push(p);
    }
    return out;
  };
  const routes = edges.flatMap(e => (e.ranges || []).filter(r => r.every(finitePoint))
    .map((r, range) => ({ edge: e, range, points: simplifySamples(r) })));
  for (let i = 0; i < routes.length; i++) for (let j = i; j < routes.length; j++) {
    const a = routes[i], b = routes[j], same = i === j, recorded = new Set();
    for (let p = 1; p < a.points.length; p++) for (let q = same ? p + 1 : 1; q < b.points.length; q++) {
      const hit = segmentHit(a.points[p - 1], a.points[p], b.points[q - 1], b.points[q]);
      if (!hit || same && q === p + 1 && hit.kind !== "overlap") continue;
      const key = `${hit.kind}:${hit.x.toFixed(4)}:${hit.y.toFixed(4)}`;
      if (recorded.has(key)) continue;
      recorded.add(key);
      const endTouch = !same && [a.points[0], a.points.at(-1)].some(x =>
        [b.points[0], b.points.at(-1)].some(y => distance(x, y) < 1e-6 && distance(x, hit) < 1e-6));
      const value = { a: a.edge.id, b: b.edge.id, ownerA: a.edge.logical, ownerB: b.edge.logical, ...hit };
      intersections.push(value);
      add(same ? "self-intersection" : hit.kind === "overlap" ? "cross-owner-overlap"
        : endTouch ? "endpoint-touch" : "path-crossing", value);
    }
  }
  const direction = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
  const triangles = markerRecords.filter(m => m.resolved && m.visible && finitePoint(m.point) && direction[m.side])
    .map(m => {
      const [vx, vy] = direction[m.side], p = m.point;
      return { marker: m, points: [p,
        { x: p.x + vx * m.depth - vy * m.width / 2, y: p.y + vy * m.depth + vx * m.width / 2 },
        { x: p.x + vx * m.depth + vy * m.width / 2, y: p.y + vy * m.depth - vx * m.width / 2 }] };
    });
  const triangleOverlap = (a, b) => [a, b].every(poly => poly.every((p, i) => {
    const q = poly[(i + 1) % poly.length], ax = p.y - q.y, ay = q.x - p.x, length = Math.hypot(ax, ay);
    const left = a.map(v => (v.x * ax + v.y * ay) / length), right = b.map(v => (v.x * ax + v.y * ay) / length);
    return Math.min(Math.max(...left), Math.max(...right)) - Math.max(Math.min(...left), Math.min(...right)) > 1e-6;
  }));
  for (let i = 0; i < triangles.length; i++) for (let j = i + 1; j < triangles.length; j++) {
    if (triangleOverlap(triangles[i].points, triangles[j].points)) {
      add("marker-overlap", { a: triangles[i].marker.edge, b: triangles[j].marker.edge });
    }
  }
  const markerCount = markerRecords.filter(m => !m.start && m.resolved && m.visible).length;
  if (markerCount !== expectedMarkerCount) add("marker-count", { count: markerCount, expected: expectedMarkerCount });
  const result = { nodes: objects.filter(o => o.kind !== "label").length, logicalEdges: logical.size,
    displaySegments: edges.length, labels, ports, issues, edges, portGroups, intersections,
    independentPorts: new Set(ports.map(p => p.portId)).size, markerCount, expectedMarkerCount,
    markers: { total: markerRecords.length, end: markerRecords.filter(m => !m.start).length,
      start: markerRecords.filter(m => m.start).length, validEnd: markerCount,
      expected: expectedMarkerCount, records: markerRecords },
    accepted: issues.length === 0 };
  for (const [key, expected] of Object.entries(snapshot.declaredCounts || {})) {
    const measured = key === "labels" || key === "ports" ? result[key].length : result[key];
    if (Number.isFinite(expected) && expected !== measured) add("declared-count", { key, expected, measured });
  }
  result.accepted = issues.length === 0;
  return result;
}

function readStateLayoutSvg(markup, evaluate) {
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-100000px;top:0;width:max-content";
  host.innerHTML = markup; document.body.append(host);
  const issues = [], objects = [], edges = [];
  try {
    const svg = host.querySelector("svg");
    if (!svg?.getScreenCTM()) return evaluate({ objects, edges, issues: [{ reason: "missing-svg" }] });
    const inverse = svg.getScreenCTM().inverse();
    const root = (el, p) => new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM()).matrixTransform(inverse);
    const local = (el, p) => new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM()).matrixTransform(el.getScreenCTM().inverse());
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const box = el => {
      const b = el.getBBox(), points = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height],
        [b.x + b.width, b.y + b.height]].map(([x, y]) => root(el, { x, y }));
      const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
      const right = Math.max(...points.map(p => p.x)), bottom = Math.max(...points.map(p => p.y));
      return { x, y, right, bottom, width: right - x, height: bottom - y };
    };
    const segmentDistance = (p, a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y, size = dx * dx + dy * dy;
      const t = size ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / size)) : 0;
      return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
    };
    const geometry = new Map(), byObject = new Map();
    for (const node of svg.querySelectorAll("[data-gptm-layout-object]")) {
      let shape = node.querySelector(":scope > .label-container,:scope > .outer-path,:scope > rect,:scope > circle,:scope > ellipse,:scope > path,:scope > polygon")
        || (node.dataset.gptmLabelOwner && node.querySelector("g.label rect.background,rect.labelBkg"))
        || [...node.children].find(e => e.localName === "g" && !e.classList.contains("label")
          && e.querySelector("path,rect,circle,ellipse,polygon"));
      if (shape && typeof shape.getTotalLength !== "function") {
        shape = [...shape.querySelectorAll("path,rect,circle,ellipse,polygon")]
          .sort((a, b) => box(b).width * box(b).height - box(a).width * box(a).height)[0];
      }
      const object = { id: node.dataset.id, kind: node.dataset.gptmLayoutObject,
        parent: node.dataset.gptmParent, labelOwner: node.dataset.gptmLabelOwner,
        text: node.textContent.trim(), bounds: shape ? box(shape) : null };
      objects.push(object); byObject.set(object.id, object);
      if (!shape) { issues.push({ reason: "missing-shape", owner: object.id }); continue; }
      const b = object.bounds, raw = shape.getBBox(), style = getComputedStyle(shape);
      const length = shape.getTotalLength(), outline = [], steps = Math.max(8, Math.ceil(length / .5));
      for (let i = 0; i <= steps; i++) outline.push(root(shape, shape.getPointAtLength(length * i / steps)));
      if (distance(outline[0], outline.at(-1)) > .001) outline.push(outline[0]);
      // fork/join由path绘制但轮廓是轴对齐矩形；以真实采样轮廓确认四条直边。
      const rectanglePath = ["path","polygon"].includes(shape.localName) && outline.every(p =>
        Math.min(Math.abs(p.x-b.x),Math.abs(p.x-b.right),Math.abs(p.y-b.y),Math.abs(p.y-b.bottom)) < .05);
      object.poleOnly = shape.localName !== "rect" && !rectanglePath;
      object.shape = shape.localName;
      let rx = 0, ry = 0;
      if (!object.poleOnly) {
        const x = parseFloat(style.rx) || shape.rx?.baseVal?.value || Number(shape.getAttribute("rx")) || 0;
        const y = parseFloat(style.ry) || shape.ry?.baseVal?.value || Number(shape.getAttribute("ry")) || 0;
        rx = Math.min(raw.width / 2, x || y) * b.width / raw.width;
        ry = Math.min(raw.height / 2, y || x) * b.height / raw.height;
      }
      const cx = (b.x + b.right) / 2, cy = (b.y + b.bottom) / 2;
      object.sides = {
        top: { min: object.poleOnly ? cx : b.x + rx, max: object.poleOnly ? cx : b.right - rx, center: cx },
        bottom: { min: object.poleOnly ? cx : b.x + rx, max: object.poleOnly ? cx : b.right - rx, center: cx },
        left: { min: object.poleOnly ? cy : b.y + ry, max: object.poleOnly ? cy : b.bottom - ry, center: cy },
        right: { min: object.poleOnly ? cy : b.y + ry, max: object.poleOnly ? cy : b.bottom - ry, center: cy },
      };
      geometry.set(object.id, { shape, outline });
    }
    const ancestors = id => {
      const found = new Set();
      while (byObject.get(id)?.parent && !found.has(byObject.get(id).parent)) {
        id = byObject.get(id).parent; found.add(id);
      }
      return found;
    };
    const markerInfo = (edge, endpoint) => {
      const style = getComputedStyle(edge), raw = edge.getAttribute(`marker-${endpoint}`)
        || style[endpoint === "start" ? "markerStart" : "markerEnd"];
      const present = Boolean(raw && raw !== "none"), id = raw?.match(/#([^)"'\s]+)["']?\s*\)/)?.[1];
      const marker = id && svg.getElementById(id);
      const result = { present, id: id || null, resolved: Boolean(marker), visible: false, depth: 0, width: 0, tipGap: null };
      if (!marker) return result;
      const glyph = marker.querySelector("path,polygon");
      if (!glyph) return result;
      const mstyle = getComputedStyle(marker), gstyle = getComputedStyle(glyph), b = glyph.getBBox();
      const view = (marker.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
      const w = Number(marker.getAttribute("markerWidth")) || 3, h = Number(marker.getAttribute("markerHeight")) || 3;
      const units = marker.getAttribute("markerUnits") === "userSpaceOnUse" ? 1 : parseFloat(style.strokeWidth) || 1;
      const matrix = inverse.multiply(edge.getScreenCTM()), rootScale = Math.hypot(matrix.a, matrix.b);
      let sx = view.length === 4 && view[2] > 0 ? w / view[2] : 1;
      let sy = view.length === 4 && view[3] > 0 ? h / view[3] : 1;
      if (marker.getAttribute("preserveAspectRatio") !== "none") sx = sy = Math.min(sx, sy);
      const refX = Number(marker.getAttribute("refX")) || 0, refY = Number(marker.getAttribute("refY")) || 0;
      const scale = units * rootScale;
      Object.assign(result, { depth: (refX - b.x) * sx * scale, width: b.height * sy * scale,
        tipGap: Math.hypot((refX - b.x - b.width) * sx, (refY - b.y - b.height / 2) * sy) * scale,
        visible: [style, mstyle, gstyle].every(s => s.display !== "none" && s.visibility !== "hidden"
          && s.visibility !== "collapse" && s.opacity !== "0") && (gstyle.fill !== "none" || gstyle.stroke !== "none") });
      return result;
    };
    for (const path of svg.querySelectorAll("path.transition[data-source]")) {
      const edge = { id: path.dataset.id, logical: path.dataset.gptmEdgeOwner || path.dataset.id,
        source: path.dataset.source, target: path.dataset.target, segments: 0, ranges: [], endpoints: [],
        markerStart: markerInfo(path, "start"), markerEnd: markerInfo(path, "end"),
        sharedStart: path.dataset.gptmSharedStart || null, sharedTip: path.dataset.gptmSharedTip || null, controlIssues: [] };
      edges.push(edge);
      const parts = (path.getAttribute("d") || "").trim().split(/(?=[Mm])/).filter(Boolean);
      edge.segments = parts.length;
      let controls = [];
      try {
        controls = JSON.parse(atob(path.dataset.points || "")).map(p => root(path, p));
        if (controls.length < 2 || controls.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error();
        for (let i = 1; i < controls.length; i++) if (Math.abs(controls[i].x - controls[i - 1].x) > .1
          && Math.abs(controls[i].y - controls[i - 1].y) > .1) edge.controlIssues.push("diagonal-control");
      } catch { edge.controlIssues.push("missing-or-invalid-controls"); controls = []; }
      if (parts.length !== 1) continue;
      const length = path.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) { issues.push({ reason: "invalid-path", id: edge.id }); continue; }
      const transform = inverse.multiply(path.getScreenCTM()), scale = Math.hypot(transform.a, transform.b);
      if (Math.abs(scale - Math.hypot(transform.c, transform.d)) > 1e-6
        || Math.abs(transform.a * transform.c + transform.b * transform.d) > 1e-6) {
        issues.push({ reason: "nonuniform-path-transform", id: edge.id });
      }
      const pathStyle = getComputedStyle(path);
      if (pathStyle.stroke === "none" || pathStyle.strokeOpacity === "0" || pathStyle.opacity === "0"
        || pathStyle.display === "none" || pathStyle.visibility === "hidden") {
        issues.push({ reason: "invisible-path", id: edge.id });
      }
      const rootLength = length * scale, sample = offset => root(path, path.getPointAtLength(offset / scale));
      for (const start of [true, false]) {
        const owner = byObject.get(start ? edge.source : edge.target), outline = geometry.get(owner?.id)?.outline;
        if (!owner?.bounds || !outline) { edge.endpoints.push({ start, missingOwner: true }); continue; }
        const b = owner.bounds, tip = sample(start ? 0 : rootLength);
        const candidates = [
          { side: "top", x: Math.max(b.x, Math.min(b.right, tip.x)), y: b.y, vx: 0, vy: -1 },
          { side: "bottom", x: Math.max(b.x, Math.min(b.right, tip.x)), y: b.bottom, vx: 0, vy: 1 },
          { side: "left", x: b.x, y: Math.max(b.y, Math.min(b.bottom, tip.y)), vx: -1, vy: 0 },
          { side: "right", x: b.right, y: Math.max(b.y, Math.min(b.bottom, tip.y)), vx: 1, vy: 0 },
        ].sort((a, z) => distance(a, tip) - distance(z, tip));
        const side = candidates[0], coordinate = side.vx ? tip.y : tip.x;
        const pointAt = offset => sample(start ? Math.min(rootLength, offset) : Math.max(0, rootLength - offset));
        const errorAt = offset => {
          const q = pointAt(offset);
          return Math.hypot(q.x - tip.x - side.vx * offset, q.y - tip.y - side.vy * offset);
        };
        let normalLead = 0;
        for (let offset = .25; offset <= rootLength + .25; offset += .25) {
          const probe = Math.min(rootLength, offset);
          if (errorAt(probe) > .001) {
            let low = normalLead, high = probe;
            for (let n = 0; n < 16; n++) {
              const mid = (low + high) / 2;
              if (errorAt(mid) > .001) high = mid; else low = mid;
            }
            normalLead = low; break;
          }
          normalLead = probe;
          if (probe === rootLength) break;
        }
        const marker = start ? edge.markerStart : edge.markerEnd, markerDepth = marker.present ? marker.depth : 0;
        const required = markerDepth + 16;
        let normalError = rootLength < required ? required - rootLength : 0;
        for (let offset = 1; offset <= required + 1; offset++) {
          const probe = Math.min(required, offset, rootLength); normalError = Math.max(normalError, errorAt(probe));
        }
        const contourGap = Math.min(...outline.slice(1).map((p, i) => segmentDistance(tip, outline[i], p)));
        const p = start ? controls[0] : controls.at(-1), q = start ? controls[1] : controls.at(-2);
        if (p && distance(p, tip) > 1.3) edge.controlIssues.push("endpoint-mismatch");
        edge.endpoints.push({ owner: owner.id, start, side: side.side, coordinate, point: { x: tip.x, y: tip.y },
          middleError: Math.abs(coordinate - owner.sides[side.side].center), contourGap, normalError,
          normalLead, visibleLead: Math.max(0, normalLead - markerDepth), markerDepth, markerWidth: marker.width,
          strokeWidth: (parseFloat(getComputedStyle(path).strokeWidth) || 1) * scale,
          controlLead: p && q ? distance(p, q) : null });
      }
      const ignored = new Set([...ancestors(edge.source), ...ancestors(edge.target)]), samples = [];
      const steps = Math.max(1, Math.ceil(rootLength / .5)), blocked = new Set();
      for (let i = 0; i <= steps; i++) {
        const p = sample(rootLength * i / steps); samples.push({ x: p.x, y: p.y });
        for (const object of objects) {
          if (!object.bounds || ignored.has(object.id)) continue;
          const b = object.bounds, shape = geometry.get(object.id)?.shape;
          if (shape && p.x > b.x + .5 && p.x < b.right - .5 && p.y > b.y + .5 && p.y < b.bottom - .5
            && shape.isPointInFill(local(shape, p))) blocked.add(object.id);
        }
      }
      for (const node of blocked) issues.push({ edge: edge.id, node,
        reason: node === edge.source || node === edge.target ? "owner-reentry" : "foreign-object" });
      edge.ranges.push(samples);
    }
    const declaredCounts = {};
    for (const [key, attribute] of Object.entries({ nodes: "gptmStateNodes", logicalEdges: "gptmLogicalEdges",
      displaySegments: "gptmNativeRoutes", labels: "gptmStateLabels", ports: "gptmStatePorts" })) {
      if (svg.dataset[attribute] !== undefined) declaredCounts[key] = Number(svg.dataset[attribute]);
    }
    return evaluate({ objects, edges, issues, declaredCounts });
  } catch (error) {
    issues.push({ reason: "geometry-read-failed", message: String(error?.message || error) });
    return evaluate({ objects, edges, issues });
  } finally { host.remove(); }
}

// 只嵌入本模块静态函数源；markup 始终是数据参数，不拼入可执行源码。
export const inspectStateLayout = new Function(`return function inspectStateLayout(markup) {
  return (${readStateLayoutSvg.toString()})(markup, ${evaluateStatePortContract.toString()});
}`)();

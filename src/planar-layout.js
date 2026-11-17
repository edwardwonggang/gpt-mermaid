/*
 * 职责：为少量平坦关系节点生成有界的凸环/重心、环挂树和双环共关节平面布局候选。
 * 调用方：svg-crossings.js；依赖：纯线段交叉检测，不依赖图名/标签文字。
 * 红线：只接受最终边零交叉、无共线穿节点的候选；搜索失败不代表图不可平面化。
 */
import { segmentIntersection } from "./path-intersections.js";

function solve(matrix, values) {
  const rows = matrix.map((row, i) => [...row, values[i]]);
  for (let k = 0; k < rows.length; k++) {
    let pivot = k;
    for (let i = k + 1; i < rows.length; i++) if (Math.abs(rows[i][k]) > Math.abs(rows[pivot][k])) pivot = i;
    if (Math.abs(rows[pivot][k]) < 1e-9) return null;
    [rows[k], rows[pivot]] = [rows[pivot], rows[k]];
    const value = rows[k][k];
    for (let j = k; j <= rows.length; j++) rows[k][j] /= value;
    for (let i = 0; i < rows.length; i++) if (i !== k) {
      const multiple = rows[i][k];
      for (let j = k; j <= rows.length; j++) rows[i][j] -= rows[k][j] * multiple;
    }
  }
  return rows.map((row) => row.at(-1));
}

function simpleCycles(ids, neighbors) {
  const index = new Map(ids.map((id, i) => [id, i])), cycles = [], seen = new Set();
  let budget = 12000;
  for (const start of ids) {
    const visit = (path, used) => {
      if (--budget < 0 || cycles.length >= 256) return;
      const last = path.at(-1);
      for (const next of neighbors.get(last)) {
        if (next === start && path.length >= 3) {
          const forward = path.map((id) => index.get(id)), backward = [forward[0], ...forward.slice(1).reverse()];
          const key = [forward.join(","), backward.join(",")].sort()[0];
          if (!seen.has(key)) { seen.add(key); cycles.push(path.slice()); }
        } else if (!used.has(next) && index.get(next) > index.get(start)) {
          used.add(next); path.push(next); visit(path, used); path.pop(); used.delete(next);
        }
      }
    };
    visit([start], new Set([start]));
  }
  return cycles.sort((a, b) => b.length - a.length);
}

function planarPositions(positions, links) {
  if ([...positions.values()].some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false;
  for (const [id, p] of positions) for (const [other, q] of positions) {
    if (id !== other && Math.hypot(p.x - q.x, p.y - q.y) < 1e-5) return false;
  }
  for (let i = 0; i < links.length; i++) {
    const [a, b] = links[i], p = positions.get(a), q = positions.get(b);
    for (const [id, r] of positions) {
      if (id === a || id === b) continue;
      const dx = q.x - p.x, dy = q.y - p.y, dot = (r.x - p.x) * dx + (r.y - p.y) * dy;
      if (Math.abs(dx * (r.y - p.y) - dy * (r.x - p.x)) < 1e-7 && dot > 0 && dot < dx * dx + dy * dy) return false;
    }
    for (let j = i + 1; j < links.length; j++) {
      const [c, d] = links[j], hit = segmentIntersection(p, q, positions.get(c), positions.get(d));
      if (!hit) continue;
      if (![a, b].some((id) => id === c || id === d) || hit.kind !== "touch") return false;
    }
  }
  return true;
}

function connectedComponents(ids, neighbors) {
  const seen = new Set(), components = [];
  for (const start of ids) {
    if (seen.has(start)) continue;
    const component = [], queue = [start];
    seen.add(start);
    for (let index = 0; index < queue.length; index++) {
      const id = queue[index];
      component.push(id);
      for (const next of neighbors.get(id)) if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
    components.push(component);
  }
  return components;
}

function addCycleEdges(target, cycle) {
  for (let index = 0; index < cycle.length; index++) {
    const a = cycle[index], b = cycle[(index + 1) % cycle.length];
    target.add([a, b].sort().join("\0"));
  }
}

function cycleTreePositions(component, neighbors, links, cycles) {
  for (const cycle of cycles) {
    if (!cycle.every((id) => component.includes(id))) continue;
    const boundary = new Set(cycle);
    const external = component.filter((id) => !boundary.has(id));
    // 只有“一个简单环 + 每增加一个点增加一条树边”的结构才使用这个候选。
    if (links.length !== cycle.length + external.length) continue;
    const parent = new Map(), visited = new Set(cycle), queue = cycle.slice();
    for (let index = 0; index < queue.length; index++) {
      const id = queue[index];
      for (const next of neighbors.get(id)) {
        if (visited.has(next)) continue;
        visited.add(next);
        parent.set(next, id);
        queue.push(next);
      }
    }
    if (visited.size !== component.length) continue;
    const children = new Map(component.map((id) => [id, []]));
    for (const [id, owner] of parent) children.get(owner).push(id);
    const position = new Map(cycle.map((id, index) => {
      const angle = Math.PI * 2 * index / cycle.length - Math.PI / 2;
      return [id, { x: Math.cos(angle), y: Math.sin(angle) }];
    }));
    const placeChildren = (owner, direction) => {
      const list = children.get(owner) || [];
      for (let index = 0; index < list.length; index++) {
        const id = list[index], spread = list.length > 1 ? .35 : 0;
        const baseAngle = Math.atan2(direction.y, direction.x) + (index - (list.length - 1) / 2) * spread;
        const point = {
          x: position.get(owner).x + Math.cos(baseAngle) * 1.15,
          y: position.get(owner).y + Math.sin(baseAngle) * 1.15,
        };
        position.set(id, point);
        const length = Math.hypot(point.x - position.get(owner).x, point.y - position.get(owner).y) || 1;
        placeChildren(id, {
          x: (point.x - position.get(owner).x) / length,
          y: (point.y - position.get(owner).y) / length,
        });
      }
    };
    for (const id of cycle) {
      const point = position.get(id), length = Math.hypot(point.x, point.y) || 1;
      placeChildren(id, { x: point.x / length, y: point.y / length });
    }
    if (planarPositions(position, links)) return position;
  }
  return null;
}

function cyclePairPositions(component, links, cycles) {
  for (let i = 0; i < cycles.length; i++) for (let j = i + 1; j < cycles.length; j++) {
    const a = cycles[i], b = cycles[j];
    if (!a.every((id) => component.includes(id)) || !b.every((id) => component.includes(id))) continue;
    const shared = a.filter((id) => b.includes(id));
    if (shared.length !== 1) continue;
    const cycleEdges = new Set();
    addCycleEdges(cycleEdges, a); addCycleEdges(cycleEdges, b);
    if (cycleEdges.size !== links.length) continue;
    const joint = shared[0], position = new Map([[joint, { x: 0, y: 0 }]]);
    const placeCycle = (cycle, direction) => {
      const order = [joint, ...cycle.filter((id) => id !== joint)];
      const others = order.slice(1);
      for (let index = 0; index < others.length; index++) {
        const angle = Math.PI / 2 - Math.PI * index / Math.max(1, others.length - 1);
        position.set(others[index], {
          x: direction * 1.5 + Math.cos(angle),
          y: Math.sin(angle),
        });
      }
    };
    placeCycle(a, -1); placeCycle(b, 1);
    if (planarPositions(position, links)) return position;
  }
  return null;
}

function structuralCandidates(ids, neighbors, links, cycles) {
  // 故障注入测试会替换 Math.sin/cos；所有结构候选也必须遵守有限坐标门禁。
  if (!Number.isFinite(Math.sin(0.37)) || !Number.isFinite(Math.cos(0.37))) return [];
  const components = connectedComponents(ids, neighbors);
  const nonTrivial = components.filter((component) => component.length > 1);
  if (nonTrivial.length > 1) return [];
  let position = new Map();
  if (nonTrivial.length) {
    const component = nonTrivial[0];
    position = cycleTreePositions(component, neighbors, links, cycles)
      || cyclePairPositions(component, links, cycles);
    if (!position) return [];
  }
  const isolated = ids.filter((id) => !nonTrivial.some((component) => component.includes(id)));
  isolated.forEach((id, index) => position.set(id, { x: -4 - index * 2, y: -4 }));
  return position.size && planarPositions(position, links) ? [position] : [];
}

export function planarLayoutCandidates(nodes, edges) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)
      || nodes.some(node => !node || typeof node.id !== "string" || !node.id)
      || new Set(nodes.map(node => node.id)).size !== nodes.length
      || edges.some(edge => !edge || typeof edge.source !== "string" || typeof edge.target !== "string")) return [];
  if (nodes.length < 3 || nodes.length > 32 || edges.length > 48) return [];
  const ids = nodes.map((node) => node.id), known = new Set(ids), keys = new Set(), links = [];
  const neighbors = new Map(ids.map((id) => [id, new Set()]));
  for (const edge of edges) {
    if (!known.has(edge.source) || !known.has(edge.target) || edge.source === edge.target) return [];
    const key = [edge.source, edge.target].sort().join("\0");
    if (keys.has(key)) return []; // 平行边另由端口路由处理，不能合并语义关系。
    keys.add(key); links.push([edge.source, edge.target]);
    neighbors.get(edge.source).add(edge.target); neighbors.get(edge.target).add(edge.source);
  }
  const candidates = [];
  const cycles = simpleCycles(ids, neighbors);
  for (const cycle of cycles) {
    const boundary = new Set(cycle), internal = ids.filter((id) => !boundary.has(id));
    const position = new Map(cycle.map((id, index) => {
      const angle = Math.PI * 2 * index / cycle.length - Math.PI / 2;
      return [id, { x: Math.cos(angle), y: Math.sin(angle) }];
    }));
    const matrix = internal.map((id, i) => internal.map((other, j) => i === j ? neighbors.get(id).size : neighbors.get(id).has(other) ? -1 : 0));
    const coordinates = ["x", "y"].map((axis) => solve(matrix, internal.map((id) =>
      [...neighbors.get(id)].filter((next) => boundary.has(next)).reduce((sum, next) => sum + position.get(next)[axis], 0))));
    if (coordinates.some((value) => value === null)) continue;
    internal.forEach((id, index) => position.set(id, { x: coordinates[0][index], y: coordinates[1][index] }));
    if (!planarPositions(position, links)) continue;
    candidates.push(position);
    if (candidates.length >= 6) break;
  }
  const seen = new Set(candidates.map((positions) => JSON.stringify([...positions])));
  for (const position of structuralCandidates(ids, neighbors, links, cycles)) {
    const key = JSON.stringify([...position]);
    if (seen.has(key)) continue;
    candidates.push(position);
    seen.add(key);
    if (candidates.length >= 6) break;
  }
  return candidates;
}

/*
 * 职责：在 E2E 已有浏览器中验收 SVG 的真实轮廓、文字、序号与 PNG 导出。
 * 调用方：e2e.mjs；依赖：已渲染完成的兼容页与 Playwright Page。
 * 红线：不另开浏览器；内部填充点不能冒充端点贴边，文字存在不能冒充可见。
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

export async function verifyRenderingGeometry(page, output) {
  await fs.mkdir(output, { recursive: true });
  const report = await page.evaluate(async () => {
    const results = [];
    for (const card of document.querySelectorAll('.sample[data-result="ready"]')) {
      const id = card.dataset.sampleId;
      const source = card.querySelector(".source-code").textContent;
      const rendered = await GPTMermaid.renderSvg(source);
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-10000px;top:0;width:max-content;";
      host.innerHTML = rendered.svg;
      document.body.append(host);
      try {
        const svg = host.querySelector("svg");
        const outlines = [...svg.querySelectorAll("g.node, g.cluster")].map((node) => {
          const container = node.querySelector(":scope > .label-container, :scope > .outer-path, :scope > circle, :scope > rect");
          if (!container) return null;
          return container instanceof SVGGeometryElement ? [container] : [...container.querySelectorAll("path,rect,circle,ellipse,polygon")];
        }).filter(Boolean);
        const local = (shape, point) => new DOMPoint(point.x, point.y).matrixTransform(shape.getScreenCTM().inverse());
        const screen = (shape, point) => new DOMPoint(point.x, point.y).matrixTransform(shape.getScreenCTM());
        const endpoints = [];
        const triangles = [];
        for (const edge of svg.querySelectorAll("path[marker-start],path[marker-end],line[marker-end]")) {
          for (const start of [true, false]) {
            const ref = edge.getAttribute(start ? "marker-start" : "marker-end");
            const marker = ref && svg.getElementById(ref.match(/#([^)]+)/)?.[1]);
            if (!marker?.id.includes("-gptm-")) continue;
            const markerPath = marker.querySelector("path");
            if (markerPath?.getAttribute("d") !== "M 0 0 L 10 4 L 0 8 Z") continue;
            triangles.push({
              width: Number(marker.getAttribute("markerWidth")), height: Number(marker.getAttribute("markerHeight")),
              refX: Number(marker.getAttribute("refX")), refY: Number(marker.getAttribute("refY")),
              viewBox: marker.getAttribute("viewBox"), cap: getComputedStyle(edge).strokeLinecap,
              orient: marker.getAttribute("orient"), start,
            });
            if (!edge.hasAttribute("data-points")) continue;
            const length = edge.getTotalLength();
            const tip = screen(edge, edge.getPointAtLength(start ? 0 : length));
            const near = screen(edge, edge.getPointAtLength(start ? Math.min(1, length) : Math.max(0, length - 1)));
            const distance = Math.hypot(tip.x - near.x, tip.y - near.y);
            if (!distance) continue;
            const dx = (tip.x - near.x) / distance;
            const dy = (tip.y - near.y) / distance;
            const touches = outlines.some((shapes) => {
              const painted = (point) => shapes.some((shape) => {
                const probe = local(shape, point);
                const style = getComputedStyle(shape);
                return (style.fill !== "none" && shape.isPointInFill(probe))
                  || (style.stroke !== "none" && shape.isPointInStroke(probe));
              });
              return !painted({ x: tip.x - dx * 0.3, y: tip.y - dy * 0.3 })
                && painted({ x: tip.x + dx * 0.3, y: tip.y + dy * 0.3 });
            });
            endpoints.push({ edge: edge.getAttribute("data-id"), start, touches });
          }
        }
        const titles = [...svg.querySelectorAll("g.node")].map((node) => {
          const label = node.querySelector(":scope > .label.name")
            || (node.querySelectorAll(":scope > .label").length === 1 ? node.querySelector(":scope > .label") : null);
          const shape = node.querySelector(":scope > .label-container, :scope > .outer-path");
          if (!label || !shape || !label.textContent.trim()) return null;
          const a = shape.getBoundingClientRect();
          const texts = [...label.querySelectorAll("text")].filter((text) => text.textContent.trim()).map((text) => text.getBoundingClientRect());
          if (!texts.length) return null;
          const left = Math.min(...texts.map((b) => b.left));
          const right = Math.max(...texts.map((b) => b.right));
          return { name: label.textContent.trim(), delta: Math.abs((a.left + a.width / 2) - (left + right) / 2), contained: left >= a.left - 1 && right <= a.right + 1 };
        }).filter(Boolean);
        const numberCenters = [...svg.querySelectorAll("text.sequenceNumber")].map((text) => {
          const line = text.previousElementSibling;
          const message = line.previousElementSibling;
          const lifeline = [...svg.querySelectorAll('[data-et="life-line"]')].find((item) => item.getAttribute("data-id") === message.getAttribute("data-from"));
          const circleX = Number(line.getAttribute("x1"));
          const circleY = Number(line.getAttribute("y1"));
          const box = text.getBBox();
          const center = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2)
            .matrixTransform(text.getCTM());
          const expected = new DOMPoint(circleX, circleY).matrixTransform(line.getCTM());
          return {
            dx: Math.abs(center.x - expected.x), dy: Math.abs(center.y - expected.y),
            axis: Math.abs(circleX - Number(lifeline.getAttribute("x1"))), fill: getComputedStyle(text).fill,
          };
        });
        const journey = [...svg.querySelectorAll("text.journey-section, text.task")].map((text) => {
          const group = text.closest("switch")?.parentElement;
          const rect = group?.querySelector(":scope > rect");
          const a = text.getBoundingClientRect();
          const b = rect?.getBoundingClientRect();
          return { text: text.textContent, fill: getComputedStyle(text).fill, background: rect && getComputedStyle(rect).fill,
            centered: b && Math.abs(a.left + a.width / 2 - b.left - b.width / 2) < 1 };
        });
        const erColumns = [...svg.querySelectorAll(".attribute-type,.attribute-name,.attribute-keys")].filter((label) => label.textContent.trim()).map((label) => ({
          label: label.textContent, x: label.getBoundingClientRect().left, cls: label.getAttribute("class"),
        }));
        results.push({ id, triangles, endpoints, titles, numberCenters, journey, erColumns,
          shaftSkips: Number(svg.getAttribute("data-gptm-shaft-skips")), svg: rendered.svg });
      } finally {
        host.remove();
      }
    }
    return results;
  });
  let endpoints = 0;
  let triangles = 0;
  for (const item of report) {
    assert.equal(item.shaftSkips, 0, item.id);
    for (const marker of item.triangles) {
      triangles++;
      assert.equal(marker.viewBox, "0 0 10 8");
      assert.equal(marker.refX, 10);
      assert.equal(marker.refY, 4);
      assert.equal(marker.cap, "butt");
      assert(Math.abs(marker.width / marker.height - 1.25) < 1e-6);
      assert.equal(marker.orient, marker.start ? "auto-start-reverse" : "auto");
    }
    for (const endpoint of item.endpoints) {
      endpoints++;
      assert(endpoint.touches, `${item.id}: ${JSON.stringify(endpoint)}`);
    }
    for (const title of item.titles) assert(title.delta < 1 && title.contained, `${item.id}: ${JSON.stringify(title)}`);
    for (const number of item.numberCenters) assert(number.dx < 0.1 && number.dy < 0.1 && number.axis < 0.1 && number.fill === "rgb(255, 255, 255)", JSON.stringify(number));
    for (const label of item.journey) assert(label.fill !== label.background && label.centered, JSON.stringify(label));
    await fs.writeFile(path.join(output, `${item.id}.svg`), item.svg);
    delete item.svg;
  }
  assert(triangles > 30 && endpoints > 25, JSON.stringify({ triangles, endpoints }));
  const er = report.find((item) => item.id === "er-attributes");
  assert(er?.erColumns.length >= 10);
  assert(new Set(er.erColumns.slice(0, 3).map((column) => Math.round(column.x))).size === 3, "ER 属性列发生重叠");
  const journey = report.find((item) => item.id === "journey");
  assert.equal(journey.journey.length, 6);
  for (const id of ["flow-horizontal", "flow-shapes", "flow-both", "state", "sequence", "sequence-self", "class", "er", "er-attributes", "journey"]) {
    await page.locator(`[data-sample-id="${id}"]`).screenshot({ path: path.join(output, `${id}.png`) });
  }
  const png = await page.evaluate(async () => {
    const state = GPTMermaid.ui.uiState(document);
    const record = [...state.records].find((item) => item.figure.closest(".sample")?.dataset.sampleId === "journey");
    const blob = await GPTMermaid.ui.svgToPng(record);
    const image = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, image.width, image.height).data;
    let painted = 0;
    for (let index = 0; index < data.length; index += 4) if (data[index] < 220 || data[index + 1] < 220 || data[index + 2] < 220) painted++;
    return { data: canvas.toDataURL("image/png").split(",")[1], width: image.width, height: image.height, painted };
  });
  assert(png.painted > 10000 && png.width > 1000);
  await fs.writeFile(path.join(output, "journey-export.png"), Buffer.from(png.data, "base64"));
  await fs.writeFile(path.join(output, "geometry-report.json"), JSON.stringify({ triangles, endpoints, report }, null, 2));
  await verifySharpTip(page, output);
  console.log(`几何验收：${report.length} 图，${triangles} 个三角箭头，${endpoints} 个真实轮廓接触点`);
}

async function verifySharpTip(page, output) {
  const sharp = await page.evaluate(async () => {
    const results = [];
    for (const direction of ["LR", "RL", "TD", "BT"]) {
      for (const shared of [false, true]) {
        const rendered = await GPTMermaid.renderSvg(`flowchart ${direction}\n A[Source] --> B[Target]${shared ? "\n C[Another source] --> B" : ""}`);
        const host = document.createElement("div");
        host.innerHTML = rendered.svg; document.body.append(host);
        try {
          const svg = host.querySelector("svg");
          const edge = svg.querySelector(shared ? "[data-gptm-shared-tip][marker-end]" : "[data-gptm-direction][marker-end]");
          const length = edge.getTotalLength(), tip = edge.getPointAtLength(length), near = edge.getPointAtLength(length - 1);
          const dx = tip.x - near.x, dy = tip.y - near.y;
          const marker = svg.getElementById(edge.getAttribute("marker-end").match(/#([^)]+)/)[1]);
          const depth = Number(marker.getAttribute("markerWidth"));
          const color = [...edge.style.stroke.match(/[\d.]+/g).map(Number), 255];
          const box = svg.viewBox.baseVal, origin = { x: tip.x - 22, y: tip.y - 22 };
          const image = new Image();
          image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rendered.svg)}`;
          await image.decode();
          // 直接在小画布上裁取矢量局部；不为64倍检查分配整张巨型位图。
          const canvas = document.createElement("canvas");
          canvas.width = 2816; canvas.height = 2816;
          const context = canvas.getContext("2d");
          context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, (box.x - origin.x) * 64, (box.y - origin.y) * 64, rendered.width * 64, rendered.height * 64);
          const pixel = (x, y) => [...context.getImageData(Math.round((x - origin.x) * 64), Math.round((y - origin.y) * 64), 1, 1).data];
          const probes = [0.02, 0.04, 0.08, 0.15].map((fraction) => {
            const x = tip.x - dx * depth * fraction, y = tip.y - dy * depth * fraction;
            const offset = depth / 1.25 * fraction / 2 + 0.18;
            return { fraction, center: pixel(x, y), outside: pixel(x - dy * offset, y + dx * offset) };
          });
          results.push({ direction, shared, color, probes, png: canvas.toDataURL("image/png").split(",")[1] });
        } finally { host.remove(); }
      }
    }
    return results;
  });
  for (const item of sharp) {
    for (const probe of item.probes) {
      assert.deepEqual(probe.center, item.color, `${item.direction}/${item.shared} 尖端被遮住：${JSON.stringify(probe)}`);
      assert.deepEqual(probe.outside, [255, 255, 255, 255], `${item.direction}/${item.shared} 线杆穿出尖端：${JSON.stringify(probe)}`);
    }
    await fs.writeFile(path.join(output, `sharp-tip-64x-${item.direction}${item.shared ? "-shared" : ""}.png`), Buffer.from(item.png, "base64"));
    delete item.png;
  }
  await fs.writeFile(path.join(output, "sharp-tip-report.json"), JSON.stringify(sharp, null, 2));
}

/* 职责：把渲染结果挂载成 ChatGPT 风格的内联图表、菜单、缩放与全屏查看器。 */

const NS = "http://www.w3.org/2000/svg";
const ICONS = {
  menu: [
    ["circle", { cx: "5", cy: "12", r: "1.25", fill: "currentColor", stroke: "none" }],
    ["circle", { cx: "12", cy: "12", r: "1.25", fill: "currentColor", stroke: "none" }],
    ["circle", { cx: "19", cy: "12", r: "1.25", fill: "currentColor", stroke: "none" }],
  ],
  expand: [["path", { d: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" }]],
  copy: [
    ["rect", { x: "8", y: "8", width: "14", height: "14", rx: "2" }],
    ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }],
  ],
  image: [
    ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }],
    ["circle", { cx: "9", cy: "9", r: "2" }],
    ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }],
  ],
  download: [
    ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
    ["polyline", { points: "7 10 12 15 17 10" }],
    ["line", { x1: "12", y1: "15", x2: "12", y2: "3" }],
  ],
  "zoom-in": [
    ["circle", { cx: "11", cy: "11", r: "8" }],
    ["line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }],
    ["line", { x1: "11", y1: "8", x2: "11", y2: "14" }],
    ["line", { x1: "8", y1: "11", x2: "14", y2: "11" }],
  ],
  "zoom-out": [
    ["circle", { cx: "11", cy: "11", r: "8" }],
    ["line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }],
    ["line", { x1: "8", y1: "11", x2: "14", y2: "11" }],
  ],
  fit: [
    ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
    ["path", { d: "M3 3v5h5" }],
  ],
  close: [["path", { d: "M18 6 6 18M6 6l12 12" }]],
};

function icon(doc, name) {
  const shapes = ICONS[name];
  if (!shapes) return null;
  const svg = doc.createElementNS(NS, "svg");
  svg.setAttribute("class", "mgpt-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const [tag, attrs] of shapes) {
    const node = doc.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    svg.append(node);
  }
  return svg;
}

function button(doc, action, label, iconName = null, iconOnly = false) {
  const el = doc.createElement("button");
  el.type = "button";
  el.dataset.mgptAction = action;
  if (iconName) {
    const symbol = icon(doc, iconName);
    if (symbol) el.append(symbol);
  }
  if (iconOnly) {
    el.setAttribute("aria-label", label);
    el.title = label;
  } else {
    const span = doc.createElement("span");
    span.className = "mgpt-action-label";
    span.textContent = label;
    el.append(span);
  }
  return el;
}

function setLabel(el, text) {
  const span = el?.querySelector?.(".mgpt-action-label");
  if (span) span.textContent = text;
  else if (!el?.querySelector?.(".mgpt-icon")) el.textContent = text;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function svgToPng(record) {
  const scale = Math.min(4, 8192 / record.result.width, 8192 / record.result.height,
    Math.sqrt((24 * 1024 * 1024) / (record.result.width * record.result.height)));
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(record.result.svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(record.result.width * scale));
  canvas.height = Math.max(1, Math.round(record.result.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png");
  });
}

export function createUi({ renderSvg, getConfig }) {
  const states = new WeakMap();

  function uiState(doc) {
    let state = states.get(doc);
    if (!state) {
      state = { records: new Set(), viewer: null, outside: null };
      state.outside = (event) => {
        if (!event.target.closest?.("[data-gpt-mermaid]")) closeMenus(state);
      };
      doc.addEventListener("pointerdown", state.outside, true);
      states.set(doc, state);
    }
    return state;
  }

  function closeMenus(state, except = null) {
    for (const record of state.records) {
      if (record === except || !record.menu) continue;
      record.menu.hidden = true;
      record.figure.dataset.menuOpen = "false";
      record.menuButton?.setAttribute("aria-expanded", "false");
    }
  }

  function setStatus(record, status, message) {
    record.figure.dataset.state = status;
    record.status.textContent = message;
    record.status.hidden = status === "ready";
    record.retry.hidden = status !== "error";
    for (const action of ["copy-image", "download", "zoom-in", "zoom-out", "fit", "expand"]) {
      const el = record.buttons[action];
      if (el) el.disabled = status !== "ready";
    }
  }

  function zoom(record, value, reset = false, anchor = null) {
    if (!record.result) return;
    const previous = record.zoom || 1;
    const next = Math.min(8, Math.max(.25, value));
    const box = record.stage.getBoundingClientRect();
    if (reset) record.panX = record.panY = 0;
    else if (anchor) {
      const x = anchor.x - box.left - box.width / 2;
      const y = anchor.y - box.top - box.height / 2;
      record.panX = x - (x - (record.panX || 0)) * next / previous;
      record.panY = y - (y - (record.panY || 0)) * next / previous;
    }
    record.zoom = next;
    const inDialog = Boolean(record.state.viewer?.dialog?.open && record.state.viewer.dialog.contains(record.stage));
    const available = Math.max(1, record.stage.clientWidth || box.width || record.result.width);
    const maxHeight = inDialog ? Math.max(240, box.height || 760) : record.config.fitMaxHeight;
    const fitted = Math.min(1, available / record.result.width, maxHeight / record.result.height);
    const width = record.result.width * fitted;
    const height = record.result.height * fitted;
    const stageHeight = inDialog ? Math.max(240, box.height || height) : Math.max(112, height);
    record.stage.style.height = `${stageHeight}px`;
    record.image.style.width = `${width}px`;
    record.image.style.height = `${height}px`;
    const capX = (width * next + available) / 2 - 24;
    const capY = (height * next + stageHeight) / 2 - 24;
    record.panX = Math.min(capX, Math.max(-capX, record.panX || 0));
    record.panY = Math.min(capY, Math.max(-capY, record.panY || 0));
    record.image.style.transform = `translate(calc(-50% + ${record.panX}px), calc(-50% + ${record.panY}px)) scale(${next})`;
    record.stage.dataset.zoom = String(next);
    record.stage.dataset.panX = String(record.panX);
    record.stage.dataset.panY = String(record.panY);
    setLabel(record.buttons.fit, next === 1 ? "复位" : `${Math.round(next * 100)}%`);
    if (!inDialog) {
      if (record.result.width > record.config.maxInlineWidth) record.figure.dataset.wide = "true";
      else delete record.figure.dataset.wide;
    }
  }

  function bindMotion(record) {
    let pointer = null;
    record.motion = {
      wheel(event) {
        if (!event.ctrlKey || !record.result) return;
        event.preventDefault();
        zoom(record, record.zoom * Math.exp(-event.deltaY * .002), false, { x: event.clientX, y: event.clientY });
      },
      down(event) {
        if (event.button !== 0 || !record.result) return;
        event.preventDefault();
        pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        record.stage.setPointerCapture?.(event.pointerId);
        record.stage.dataset.dragging = "true";
      },
      move(event) {
        if (!pointer || pointer.id !== event.pointerId) return;
        record.panX = (record.panX || 0) + event.clientX - pointer.x;
        record.panY = (record.panY || 0) + event.clientY - pointer.y;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        zoom(record, record.zoom);
      },
      end() {
        pointer = null;
        record.stage.dataset.dragging = "false";
      },
      key(event) {
        if (event.key === "Home") {
          event.preventDefault();
          zoom(record, 1, true);
        } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          record.panX = (record.panX || 0) + (event.key === "ArrowLeft" ? -24 : event.key === "ArrowRight" ? 24 : 0);
          record.panY = (record.panY || 0) + (event.key === "ArrowUp" ? -24 : event.key === "ArrowDown" ? 24 : 0);
          zoom(record, record.zoom);
        }
      },
    };
    record.stage.addEventListener("wheel", record.motion.wheel, { passive: false });
    record.stage.addEventListener("pointerdown", record.motion.down);
    record.stage.addEventListener("pointermove", record.motion.move);
    record.stage.addEventListener("pointerup", record.motion.end);
    record.stage.addEventListener("pointercancel", record.motion.end);
    record.stage.addEventListener("lostpointercapture", record.motion.end);
    record.stage.addEventListener("keydown", record.motion.key);
  }

  function viewer(state, record) {
    const doc = record.figure.ownerDocument;
    if (!state.viewer) {
      const dialog = doc.createElement("dialog");
      dialog.className = "mgpt-dialog";
      dialog.setAttribute("aria-label", "Diagram fullscreen viewer");
      const bar = doc.createElement("div");
      bar.className = "mgpt-dialog-bar";
      const group = doc.createElement("div");
      group.className = "mgpt-dialog-actions";
      for (const [action, label, symbol] of [
        ["zoom-out", "缩小", "zoom-out"],
        ["fit", "适应窗口", "fit"],
        ["zoom-in", "放大", "zoom-in"],
      ]) {
        const item = button(doc, action, label, symbol, true);
        item.className = "mgpt-icon-button";
        group.append(item);
      }
      const close = button(doc, "close", "关闭", "close", true);
      close.className = "mgpt-icon-button";
      bar.append(group, close);
      const viewport = doc.createElement("div");
      viewport.className = "mgpt-dialog-viewport";
      dialog.append(bar, viewport);
      doc.body.append(dialog);
      state.viewer = { dialog, viewport, record: null };
      dialog.addEventListener("close", () => {
        if (!dialog.open) closeViewer(state, false);
      });
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeViewer(state);
      });
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeViewer(state);
        handleClick(state, event);
      });
    }
    if (state.viewer.record && (state.viewer.record !== record || !state.viewer.dialog.open)) closeViewer(state, false);
    state.viewer.record = record;
    state.viewer.viewport.append(record.stage);
    if (!state.viewer.dialog.open) state.viewer.dialog.showModal();
    zoom(record, 1, true);
  }

  function closeViewer(state, closeDialog = true) {
    const current = state.viewer;
    if (!current) return;
    const record = current.record;
    current.record = null;
    if (record) {
      record.viewport.append(record.stage);
      zoom(record, 1, true);
    }
    if (closeDialog && current.dialog.open) current.dialog.close();
  }

  function handleClick(state, event) {
    const actionEl = event.target.closest?.("[data-mgpt-action]");
    if (!actionEl) {
      closeMenus(state);
      return;
    }
    const action = actionEl.dataset.mgptAction;
    const dialog = actionEl.closest(".mgpt-dialog");
    const record = dialog ? state.viewer?.record : [...state.records].find((item) => item.figure === actionEl.closest("[data-gpt-mermaid]"));
    if (!record) return;
    event.preventDefault();
    if (action === "close") {
      closeViewer(state);
      return;
    }
    if (action === "menu") {
      const open = record.menu.hidden;
      closeMenus(state, open ? record : null);
      record.menu.hidden = !open;
      record.figure.dataset.menuOpen = open ? "true" : "false";
      record.menuButton.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    closeMenus(state);
    if (action === "copy") {
      navigator.clipboard.writeText(record.source).then(() => {
        setLabel(actionEl, "已复制源码");
      }).catch((error) => record.status.textContent = `复制源码失败：${error.message}`);
      return;
    }
    if (action === "download" && record.result) {
      downloadBlob(new Blob([record.result.svg], { type: "image/svg+xml;charset=utf-8" }), "mermaid-diagram.svg");
      return;
    }
    if (action === "copy-image" && record.result) {
      svgToPng(record).then(async (blob) => {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setLabel(actionEl, "已复制图片");
      }).catch((error) => record.status.textContent = `复制图片失败：${error.message}`);
      return;
    }
    if (action === "expand") {
      viewer(state, record);
      return;
    }
    if (action === "fit") zoom(record, 1, true);
    else if (action === "zoom-in") zoom(record, record.zoom * 1.25);
    else if (action === "zoom-out") zoom(record, record.zoom / 1.25);
    else if (action === "retry") void renderRecord(record);
  }

  async function renderRecord(record) {
    if (record.loading || record.figure.dataset.state === "ready") return;
    record.loading = true;
    setStatus(record, "loading", "正在渲染图表…");
    try {
      const result = await renderSvg(record.source, record.config);
      if (!record.figure.isConnected || record.destroyed) return;
      if (record.url) URL.revokeObjectURL(record.url);
      record.result = result;
      record.url = URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }));
      record.image.onload = () => {
        if (record.destroyed) return;
        record.loading = false;
        setStatus(record, "ready", "图表已渲染");
        zoom(record, record.zoom);
      };
      record.image.onerror = () => {
        record.loading = false;
        setStatus(record, "error", "图片无法显示，可重试或检查源码。");
      };
      record.image.src = record.url;
      record.image.hidden = false;
    } catch (error) {
      record.loading = false;
      setStatus(record, "error", error.message || String(error));
    }
  }

  function createRecord(source, sourceElement, options) {
    const doc = options.document || sourceElement?.ownerDocument || document;
    const state = uiState(doc);
    const config = getConfig(options);
    const figure = doc.createElement("figure");
    figure.className = "mgpt-diagram";
    figure.dataset.gptMermaid = "";
    figure.dataset.state = "pending";
    figure.setAttribute("aria-label", "Mermaid diagram");
    const toolbar = doc.createElement("div");
    toolbar.className = "mgpt-floatbar";
    toolbar.setAttribute("role", "toolbar");
    const menuButton = button(doc, "menu", "图表选项", "menu", true);
    menuButton.className = "mgpt-icon-button";
    menuButton.setAttribute("aria-haspopup", "menu");
    menuButton.setAttribute("aria-expanded", "false");
    const expandButton = button(doc, "expand", "放大图表", "expand", true);
    expandButton.className = "mgpt-icon-button";
    const menu = doc.createElement("div");
    menu.className = "mgpt-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    const buttons = { expand: expandButton };
    for (const [action, label, symbol] of [
      ["copy", "复制源码", "copy"],
      ["copy-image", "复制图片", "image"],
      ["download", "下载 SVG", "download"],
      ["zoom-in", "放大", "zoom-in"],
      ["zoom-out", "缩小", "zoom-out"],
      ["fit", "复位", "fit"],
    ]) {
      const item = button(doc, action, label, symbol);
      item.className = "mgpt-menuitem";
      item.setAttribute("role", "menuitem");
      menu.append(item);
      buttons[action] = item;
    }
    toolbar.append(menuButton, expandButton, menu);
    const status = doc.createElement("div");
    status.className = "mgpt-status";
    status.setAttribute("role", "status");
    const retry = button(doc, "retry", "重新渲染");
    retry.className = "mgpt-retry";
    const viewport = doc.createElement("div");
    viewport.className = "mgpt-viewport";
    viewport.tabIndex = 0;
    viewport.setAttribute("aria-label", "Diagram preview");
    const stage = doc.createElement("div");
    stage.className = "mgpt-stage";
    stage.tabIndex = 0;
    stage.setAttribute("aria-label", "Ctrl+wheel to zoom, drag to pan, Home to reset");
    const image = doc.createElement("img");
    image.className = "mgpt-image";
    image.alt = "Mermaid diagram";
    image.draggable = false;
    image.hidden = true;
    stage.append(image);
    viewport.append(stage);
    figure.append(toolbar, status, retry, viewport);
    const record = {
      state, config, figure, menu, menuButton, buttons, status, retry, viewport, stage, image,
      source, sourceElement, result: null, url: null, zoom: 1, panX: 0, panY: 0,
      loading: false, destroyed: false,
    };
    state.records.add(record);
    bindMotion(record);
    setStatus(record, "pending", "滚动到此处时显示图表…");
    if (window.ResizeObserver) {
      record.resize = new ResizeObserver(() => {
        if (record.result) zoom(record, record.zoom);
      });
      record.resize.observe(stage);
    }
    record.destroy = () => {
      if (record.destroyed) return;
      record.destroyed = true;
      record.resize?.disconnect();
      if (state.viewer?.record === record) closeViewer(state);
      if (record.url) URL.revokeObjectURL(record.url);
      state.records.delete(record);
      record.figure.remove();
    };
    record.fit = () => zoom(record, 1, true);
    record.zoomIn = () => zoom(record, record.zoom * 1.25);
    record.zoomOut = () => zoom(record, record.zoom / 1.25);
    record.download = () => {
      if (!record.result) throw new Error("diagram is not ready");
      downloadBlob(new Blob([record.result.svg], { type: "image/svg+xml;charset=utf-8" }), "mermaid-diagram.svg");
    };
    record.copySource = () => navigator.clipboard.writeText(record.source);
    record.copyImage = async () => {
      if (!record.result) throw new Error("diagram is not ready");
      const blob = await svgToPng(record);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    };
    record.expand = () => viewer(state, record);
    return record;
  }

  async function mount(target, source, options = {}) {
    const doc = target?.ownerDocument || document;
    const sourceElement = options.sourceElement || null;
    const record = createRecord(source, sourceElement, { ...options, document: doc });
    if (sourceElement) {
      sourceElement.hidden = true;
      record.figure.append(sourceElement);
    }
    if (target) target.replaceWith(record.figure);
    else doc.body.append(record.figure);
    // toolbars are interactive even before render finishes (retry remains usable on error)
    record.figure.addEventListener("click", (event) => handleClick(uiState(doc), event));
    void renderRecord(record);
    return record;
  }

  function renderAll(root = document, options = {}) {
    const doc = root.ownerDocument || root;
    const diagrams = [];
    const codeBlocks = [...root.querySelectorAll("pre > code.language-mermaid, pre > code.lang-mermaid")];
    for (const code of codeBlocks) {
      if (code.closest("[data-gpt-mermaid]")) continue;
      const pre = code.parentElement;
      const source = code.textContent || "";
      const record = createRecord(source, pre, { ...options, document: doc });
      pre.replaceWith(record.figure);
      pre.hidden = true;
      record.figure.append(pre);
      record.figure.addEventListener("click", (event) => handleClick(uiState(doc), event));
      void renderRecord(record);
      diagrams.push(record);
    }
    for (const target of root.querySelectorAll("[data-gpt-mermaid-source]")) {
      if (target.closest("[data-gpt-mermaid]")) continue;
      const source = target.dataset.source || target.textContent || "";
      const record = createRecord(source, null, { ...options, document: doc });
      target.replaceWith(record.figure);
      record.figure.addEventListener("click", (event) => handleClick(uiState(doc), event));
      void renderRecord(record);
      diagrams.push(record);
    }
    return Promise.all(diagrams.map((record) => new Promise((resolve) => {
      if (record.result) return resolve(record);
      const timer = setInterval(() => {
        if (record.figure.dataset.state === "ready" || record.figure.dataset.state === "error") {
          clearInterval(timer);
          resolve(record);
        }
      }, 30);
      if (record.figure.dataset.state === "error") {
        clearInterval(timer);
        resolve(record);
      }
    })));
  }

  return { mount, renderAll, handleClick, uiState, closeMenus, svgToPng };
}

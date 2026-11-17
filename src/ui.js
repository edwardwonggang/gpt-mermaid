/* 职责：把渲染结果挂载成 ChatGPT 风格的内联图表、菜单、缩放与全屏查看器。 */

import { DEFAULT_RENDER_TIMEOUT_MS, positiveTimeout, timeoutError } from "./runtime-guard.js";

const NS = "http://www.w3.org/2000/svg";
const SCROLL_LOCK_CLASS = "mgpt-scroll-locked";
const MENU_ITEM_SELECTOR = '[role="menuitem"]:not(:disabled)';
const INLINE_STAGE_MAX_HEIGHT = 720;
const INLINE_STAGE_MIN_HEIGHT = 112;
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
  else if (el?.querySelector?.(".mgpt-icon")) {
    el.setAttribute("aria-label", text);
    el.title = text;
  } else if (el) el.textContent = text;
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
      state = {
        records: new Set(), viewer: null, outside: null,
        pendingWaits: new Map(), disconnectObserver: null,
      };
      state.outside = (event) => {
        if (!event.target.closest?.("[data-gpt-mermaid]")) closeMenus(state);
      };
      doc.addEventListener("pointerdown", state.outside, true);
      states.set(doc, state);
    }
    return state;
  }

  function menuItems(record) {
    return [...record.menu.querySelectorAll(MENU_ITEM_SELECTOR)];
  }

  function setMenuExpanded(record, open) {
    record.menu.hidden = !open;
    record.figure.dataset.menuOpen = String(open);
    record.menuButton?.setAttribute("aria-expanded", String(open));
  }

  function openMenu(state, record, position = "first") {
    closeMenus(state, record);
    setMenuExpanded(record, true);
    const items = menuItems(record);
    (position === "last" ? items.at(-1) : items[0])?.focus();
  }

  function closeMenu(record, restoreFocus = false) {
    if (!record?.menu) return;
    setMenuExpanded(record, false);
    if (restoreFocus) record.menuButton?.focus();
  }

  function closeMenus(state, except = null) {
    for (const record of state.records) {
      if (record === except || !record.menu) continue;
      setMenuExpanded(record, false);
    }
  }

  function handleMenuKeydown(record, event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(record, true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = menuItems(record);
    if (!items.length) return;
    const current = items.indexOf(record.figure.ownerDocument.activeElement);
    let next = 0;
    if (event.key === "End") next = items.length - 1;
    else if (event.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % items.length;
    else if (event.key === "ArrowUp") next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
    event.preventDefault();
    items[next].focus();
  }

  function handleMenuButtonKeydown(record, event) {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    openMenu(record.state, record, event.key === "ArrowUp" ? "last" : "first");
  }

  function showNotice(record, message, kind = "info") {
    record.status.hidden = false;
    record.status.dataset.kind = kind;
    record.figure.dataset.notice = kind;
    record.status.setAttribute("role", kind === "error" ? "alert" : "status");
    record.status.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
    record.status.textContent = message;
  }

  function setStatus(record, status, message) {
    record.figure.dataset.state = status;
    if (status === "error") record.figure.dataset.notice = "error";
    else delete record.figure.dataset.notice;
    record.status.dataset.kind = status;
    record.status.setAttribute("role", status === "error" ? "alert" : "status");
    record.status.setAttribute("aria-live", status === "error" ? "assertive" : "polite");
    record.status.textContent = message;
    record.status.hidden = status === "ready";
    record.retry.hidden = status !== "error";
    for (const action of ["copy-image", "download", "zoom-in", "zoom-out", "fit", "expand"]) {
      const el = record.buttons[action];
      if (el) el.disabled = status !== "ready";
    }
    if (status === "ready" || status === "error") settleRecord(record, status);
  }

  function settleRecord(record, outcome) {
    const waiters = [...record.waiters];
    record.waiters.clear();
    for (const waiter of waiters) waiter(outcome);
  }

  function watchDisconnect(record, waiter) {
    const state = record.state;
    state.pendingWaits.set(record, waiter);
    if (state.disconnectObserver || !record.figure.ownerDocument.documentElement) return;
    state.disconnectObserver = new MutationObserver(() => {
      for (const [pending, finish] of [...state.pendingWaits]) {
        if (!pending.figure.isConnected) {
          if (typeof pending.destroy === "function") pending.destroy();
          else finish("disconnected");
        }
      }
    });
    state.disconnectObserver.observe(record.figure.ownerDocument.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function unwatchDisconnect(record, waiter) {
    const state = record.state;
    if (state.pendingWaits.get(record) === waiter) state.pendingWaits.delete(record);
    if (!state.pendingWaits.size) {
      state.disconnectObserver?.disconnect();
      state.disconnectObserver = null;
    }
  }

  function zoom(record, value, reset = false, anchor = null) {
    if (!record.result) return;
    const inDialog = Boolean(record.state.viewer?.dialog?.open && record.state.viewer.dialog.contains(record.stage));
    // 全屏高度归查看器布局管理；保留旧px高度会在手机横屏后裁掉图像与触摸区域。
    if (inDialog) record.stage.style.height = "100%";
    const box = record.stage.getBoundingClientRect();
    if (record.motion?.resize(box)) {
      anchor = null;
      value = record.zoom;
    }
    const previous = anchor?.fromZoom ?? record.zoom ?? 1;
    const next = Math.min(8, Math.max(.25, value));
    if (reset) {
      record.motion?.reset();
      record.panX = record.panY = 0;
      if (!inDialog) record.stage.scrollTop = 0;
    }
    else if (anchor) {
      const x = anchor.x - box.left - box.width / 2;
      const y = anchor.y - box.top - box.height / 2;
      record.panX = x - (x - (anchor.fromPanX ?? record.panX ?? 0)) * next / previous;
      record.panY = y - (y - (anchor.fromPanY ?? record.panY ?? 0)) * next / previous;
      // 双指中心也会移动；使用夹紧后的真实倍率，指下的图像位置才不会漂移。
      record.panX += (anchor.toX ?? anchor.x) - anchor.x;
      record.panY += (anchor.toY ?? anchor.y) - anchor.y;
    }
    record.zoom = next;
    const available = Math.max(1, record.stage.clientWidth || box.width || record.result.width);
    const maxHeight = inDialog ? Math.max(1, box.height) : record.config.fitMaxHeight;
    const fitted = Math.min(1, available / record.result.width, maxHeight / record.result.height);
    const width = record.result.width * fitted;
    const height = record.result.height * fitted;
    const naturalStageHeight = Math.max(INLINE_STAGE_MIN_HEIGHT, height);
    // Infinity 是既有公共配置，不能改成固定值；这里只限制行内视口高度，
    // 图片本身仍保持完整尺寸并由 stage 独立滚动，避免长图把整页无限撑高。
    const viewport = record.stage.ownerDocument.defaultView;
    const inlineCap = Math.max(240, Math.min(INLINE_STAGE_MAX_HEIGHT, (viewport?.innerHeight || 900) * 0.8));
    const scrollable = !inDialog && !Number.isFinite(maxHeight) && naturalStageHeight > inlineCap;
    const stageHeight = inDialog ? Math.max(1, box.height) : Math.min(naturalStageHeight, scrollable ? inlineCap : Infinity);
    record.stage.style.height = inDialog ? "100%" : `${stageHeight}px`;
    record.image.style.width = `${width}px`;
    record.image.style.height = `${height}px`;
    if (scrollable) {
      record.stage.style.overflowY = "auto";
      record.stage.style.overflowX = "hidden";
      record.stage.dataset.scrollable = "true";
      record.image.style.position = "relative";
      record.image.style.left = "0";
      record.image.style.top = "0";
      record.image.style.margin = "0 auto";
      record.image.style.transformOrigin = "top center";
    } else {
      record.stage.style.removeProperty("overflow-y");
      record.stage.style.removeProperty("overflow-x");
      delete record.stage.dataset.scrollable;
      for (const property of ["position", "left", "top", "margin", "transform-origin"]) {
        record.image.style.removeProperty(property);
      }
    }
    const capX = (width * next + available) / 2 - 24;
    const capY = scrollable
      ? Math.max(0, (height * next - stageHeight) / 2)
      : (height * next + stageHeight) / 2 - 24;
    record.panX = Math.min(capX, Math.max(-capX, record.panX || 0));
    record.panY = Math.min(capY, Math.max(-capY, record.panY || 0));
    record.image.style.transform = scrollable
      ? `translate(${record.panX}px, ${record.panY}px) scale(${next})`
      : `translate(calc(-50% + ${record.panX}px), calc(-50% + ${record.panY}px)) scale(${next})`;
    record.stage.dataset.zoom = String(next);
    record.stage.dataset.panX = String(record.panX);
    record.stage.dataset.panY = String(record.panY);
    const percent = Math.round(next * 100);
    const zoomMessage = `缩放 ${percent}%${next === 1 ? "，适应窗口" : ""}`;
    setLabel(record.buttons.fit, next === 1 ? "复位" : `${percent}%`);
    if (record.state.viewer?.record === record) {
      const viewer = record.state.viewer;
      if (viewer.zoomStatus && viewer.zoomStatus.textContent !== zoomMessage) viewer.zoomStatus.textContent = zoomMessage;
      setLabel(viewer.fitButton, next === 1 ? "适应窗口，当前 100%" : `适应窗口，当前 ${percent}%`);
    }
    if (!inDialog) {
      if (record.result.width > record.config.maxInlineWidth) record.figure.dataset.wide = "true";
      else delete record.figure.dataset.wide;
    }
  }

  function bindMotion(record) {
    const pointers = new Map();
    let gesture = null;
    const doc = record.stage.ownerDocument;
    const inViewer = () => record.state.viewer?.dialog?.open
      && record.state.viewer.viewport.contains(record.stage);
    const release = (id) => {
      if (record.stage.hasPointerCapture?.(id)) record.stage.releasePointerCapture(id);
    };
    const rebase = () => {
      const active = [...pointers.entries()].slice(0, 2);
      gesture = active.length ? {
        ids: active.map(([id]) => id),
        x: active.reduce((sum, [, p]) => sum + p.x, 0) / active.length,
        y: active.reduce((sum, [, p]) => sum + p.y, 0) / active.length,
        distance: active.length === 2 ? Math.hypot(active[1][1].x - active[0][1].x, active[1][1].y - active[0][1].y) : 0,
        fromZoom: record.zoom, fromPanX: record.panX || 0, fromPanY: record.panY || 0,
        box: record.stage.getBoundingClientRect(),
      } : null;
    };
    record.motion = {
      resize(box) {
        if (!gesture || ["left", "top", "width", "height"].every(key => Math.abs(box[key] - gesture.box[key]) < 0.5)) return false;
        // 手指未抬起时旋转手机，旧屏幕坐标不再有效。结束旧手势再等新触摸，
        // 不把新视口中心差值误加到平移量，避免下一次1px移动跳动数百px。
        record.motion.reset();
        return true;
      },
      reset() {
        const ids = [...pointers.keys()];
        pointers.clear();
        gesture = null;
        record.stage.dataset.dragging = "false";
        ids.forEach(release);
      },
      wheel(event) {
        if (!record.result) return;
        // 全屏是独立查看器，普通滚轮即可缩放；行内图仍让普通滚轮滚动页面，
        // 避免长文阅读经过图表时被意外“截住”。触控板像素/行/页单位归一化。
        if (!inViewer() && !event.ctrlKey) return;
        event.preventDefault();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? record.stage.clientHeight : 1;
        const delta = Math.min(600, Math.max(-600, event.deltaY * unit));
        zoom(record, record.zoom * Math.exp(-delta * .002), false, { x: event.clientX, y: event.clientY });
      },
      down(event) {
        if (event.button !== 0 || !record.result) return;
        // 行内触屏保留页面滚动/缩放；只在全屏查看器内接管整图手势。
        if (event.pointerType === "touch" && !inViewer()) return;
        const first = pointers.values().next().value;
        if (first && first.type !== event.pointerType) return;
        event.preventDefault();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, type: event.pointerType });
        if (pointers.size <= 2) rebase();
        record.stage.setPointerCapture?.(event.pointerId);
        record.stage.dataset.dragging = "true";
      },
      move(event) {
        const pointer = pointers.get(event.pointerId);
        if (!pointer) return;
        event.preventDefault();
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        // 第三根手指只登记，不能抢走前两根的缩放基线；成员变化后自然以现位置续接。
        if (!gesture?.ids.includes(event.pointerId)) return;
        const active = gesture.ids.map(id => pointers.get(id));
        const x = active.reduce((sum, p) => sum + p.x, 0) / active.length;
        const y = active.reduce((sum, p) => sum + p.y, 0) / active.length;
        const distance = active.length === 2 ? Math.hypot(active[1].x - active[0].x, active[1].y - active[0].y) : 0;
        // 始终相对手势起点求倍率，不能逐事件累乘；到倍率边界后逐指事件顺序
        // 会丢掉一半比例，使等距平移误缩放。两指重合时等分开后再建立比例基线。
        const ratio = gesture.distance > 1 ? distance / gesture.distance : 1;
        zoom(record, gesture.fromZoom * ratio, false, { ...gesture, toX: x, toY: y });
        if (gesture && gesture.distance <= 1 && distance > 1) rebase();
      },
      end(event) {
        const active = gesture?.ids.includes(event.pointerId);
        pointers.delete(event.pointerId);
        if (active) rebase();
        release(event.pointerId);
        record.stage.dataset.dragging = String(pointers.size > 0);
      },
      visibility() {
        if (doc.hidden) record.motion.reset();
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
    doc.addEventListener("visibilitychange", record.motion.visibility);
    doc.defaultView?.addEventListener("blur", record.motion.reset);
    record.motion.destroy = () => {
      record.motion.reset();
      doc.removeEventListener("visibilitychange", record.motion.visibility);
      doc.defaultView?.removeEventListener("blur", record.motion.reset);
    };
  }

  function lockBackgroundScroll(state, doc) {
    const viewer = state.viewer;
    if (!viewer || viewer.scrollLock) return;
    const root = doc.documentElement;
    const body = doc.body;
    const scrollX = doc.defaultView?.scrollX ?? 0;
    const scrollY = doc.defaultView?.scrollY ?? 0;
    const lock = {
      root, body, scrollX, scrollY,
      rootHadLock: root.classList.contains(SCROLL_LOCK_CLASS),
      bodyHadLock: Boolean(body?.classList.contains(SCROLL_LOCK_CLASS)),
    };
    root.classList.add(SCROLL_LOCK_CLASS);
    body?.classList.add(SCROLL_LOCK_CLASS);
    viewer.scrollLock = lock;
  }

  function unlockBackgroundScroll(state) {
    const viewer = state.viewer;
    const lock = viewer?.scrollLock;
    if (!lock) return;
    if (!lock.rootHadLock) lock.root.classList.remove(SCROLL_LOCK_CLASS);
    if (lock.body && !lock.bodyHadLock) lock.body.classList.remove(SCROLL_LOCK_CLASS);
    viewer.scrollLock = null;
    const win = lock.root.ownerDocument.defaultView;
    if (win && (Math.abs(win.scrollX - lock.scrollX) > 0.5 || Math.abs(win.scrollY - lock.scrollY) > 0.5)) {
      win.scrollTo(lock.scrollX, lock.scrollY);
    }
  }

  function viewer(state, record) {
    const doc = record.figure.ownerDocument;
    if (!state.viewer) {
      const dialog = doc.createElement("dialog");
      dialog.className = "mgpt-dialog";
      dialog.setAttribute("aria-label", "图表全屏查看器");
      const bar = doc.createElement("div");
      bar.className = "mgpt-dialog-bar";
      const group = doc.createElement("div");
      group.className = "mgpt-dialog-actions";
      let fitButton = null;
      for (const [action, label, symbol] of [
        ["zoom-out", "缩小", "zoom-out"],
        ["fit", "适应窗口", "fit"],
        ["zoom-in", "放大", "zoom-in"],
      ]) {
        const item = button(doc, action, label, symbol, true);
        item.className = "mgpt-icon-button";
        group.append(item);
        if (action === "fit") fitButton = item;
      }
      const zoomStatus = doc.createElement("output");
      zoomStatus.className = "mgpt-zoom-status";
      zoomStatus.setAttribute("aria-label", "当前缩放");
      zoomStatus.setAttribute("aria-live", "polite");
      zoomStatus.setAttribute("aria-atomic", "true");
      zoomStatus.textContent = "缩放 100%，适应窗口";
      group.insertBefore(zoomStatus, fitButton?.nextSibling ?? null);
      const close = button(doc, "close", "关闭", "close", true);
      close.className = "mgpt-icon-button";
      bar.append(group, close);
      const viewport = doc.createElement("div");
      viewport.className = "mgpt-dialog-viewport";
      dialog.append(bar, viewport);
      doc.body.append(dialog);
      state.viewer = { dialog, viewport, record: null, fitButton, zoomStatus, scrollLock: null };
      dialog.addEventListener("close", () => {
        if (!dialog.open) {
          closeViewer(state, false);
          unlockBackgroundScroll(state);
        }
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
    record.stage.setAttribute("aria-label", "双指缩放，单指拖动平移；鼠标滚轮缩放，Home 复位");
    if (!state.viewer.dialog.open) {
      lockBackgroundScroll(state, doc);
      try {
        state.viewer.dialog.showModal();
      } catch (error) {
        unlockBackgroundScroll(state);
        state.viewer.record = null;
        record.viewport.append(record.stage);
        record.stage.setAttribute("aria-label", "触屏滑动页面，点击放大后双指缩放；Ctrl + 滚轮缩放，鼠标拖动平移");
        zoom(record, 1, true);
        throw error;
      }
    }
    zoom(record, 1, true);
  }

  function closeViewer(state, closeDialog = true) {
    const current = state.viewer;
    if (!current) return;
    const record = current.record;
    current.record = null;
    if (record) {
      record.viewport.append(record.stage);
      record.stage.setAttribute("aria-label", "触屏滑动页面，点击放大后双指缩放；Ctrl + 滚轮缩放，鼠标拖动平移");
      zoom(record, 1, true);
    }
    if (closeDialog) {
      if (current.dialog.open) current.dialog.close();
      unlockBackgroundScroll(state);
    }
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
      if (record.menu.hidden) openMenu(state, record);
      else closeMenu(record, true);
      return;
    }
    const openedMenu = !record.menu.hidden;
    closeMenus(state);
    if (openedMenu && record.menu.contains(actionEl)) record.menuButton?.focus();
    if (action === "copy") {
      navigator.clipboard.writeText(record.source).then(() => {
        setLabel(actionEl, "已复制源码");
        showNotice(record, "源码已复制", "success");
      }).catch((error) => showNotice(record, `复制源码失败：${error?.message || error}`, "error"));
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
        showNotice(record, "图片已复制", "success");
      }).catch((error) => showNotice(record, `复制图片失败：${error?.message || error}`, "error"));
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
    record.renderAbort?.abort();
    const abort = new AbortController();
    record.renderAbort = abort;
    const attempt = (record.renderAttempt || 0) + 1;
    record.renderAttempt = attempt;
    record.loading = true;
    setStatus(record, "loading", "正在渲染图表…");
    const timeoutMs = positiveTimeout(
      record.config.renderTimeoutMs ?? record.config.timeoutMs,
      DEFAULT_RENDER_TIMEOUT_MS,
    );
    const external = record.config.signal;
    const forwardAbort = () => abort.abort(external?.reason);
    if (external?.aborted) forwardAbort();
    else external?.addEventListener?.("abort", forwardAbort, { once: true });
    clearTimeout(record.imageTimer);
    record.imageTimer = 0;
    try {
      const result = await renderSvg(record.source, {
        ...record.config,
        signal: abort.signal,
        renderTimeoutMs: timeoutMs,
      });
      if (attempt !== record.renderAttempt || record.destroyed) {
        record.loading = false;
        return;
      }
      if (!record.figure.isConnected) {
        record.loading = false;
        settleRecord(record, "disconnected");
        return;
      }
      if (record.url) URL.revokeObjectURL(record.url);
      record.result = result;
      record.url = URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }));
      record.image.onload = () => {
        clearTimeout(record.imageTimer);
        record.imageTimer = 0;
        if (attempt !== record.renderAttempt || record.destroyed) {
          record.loading = false;
          return;
        }
        record.loading = false;
        setStatus(record, "ready", "图表已渲染");
        zoom(record, record.zoom);
      };
      record.image.onerror = () => {
        clearTimeout(record.imageTimer);
        record.imageTimer = 0;
        if (attempt !== record.renderAttempt || record.destroyed) return;
        record.loading = false;
        record.image.hidden = true;
        record.image.removeAttribute("src");
        if (record.url) {
          URL.revokeObjectURL(record.url);
          record.url = null;
        }
        setStatus(record, "error", "图片无法显示，可重试或检查源码。");
      };
      record.image.src = record.url;
      record.image.hidden = false;
      record.imageTimer = setTimeout(() => {
        if (attempt !== record.renderAttempt || record.destroyed) return;
        record.imageTimer = 0;
        record.loading = false;
        record.image.hidden = true;
        record.image.removeAttribute("src");
        if (record.url) {
          URL.revokeObjectURL(record.url);
          record.url = null;
        }
        setStatus(record, "error", "图片加载超时，可重试或检查图表尺寸。");
      }, timeoutMs);
    } catch (error) {
      if (attempt !== record.renderAttempt) return;
      record.loading = false;
      if (record.destroyed) {
        settleRecord(record, "destroyed");
        return;
      }
      if (!record.figure.isConnected) {
        settleRecord(record, "disconnected");
        return;
      }
      record.image.hidden = true;
      if (record.url) {
        URL.revokeObjectURL(record.url);
        record.url = null;
      }
      const message = error?.name === "TimeoutError"
        ? "渲染超时，可重试或简化图表。"
        : error?.name === "AbortError"
          ? "渲染已取消。"
          : error?.message || String(error);
      setStatus(record, "error", message);
    } finally {
      external?.removeEventListener?.("abort", forwardAbort);
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
    figure.setAttribute("aria-label", "Mermaid 图表");
    const toolbar = doc.createElement("div");
    toolbar.className = "mgpt-floatbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "图表操作");
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
      item.tabIndex = -1;
      menu.append(item);
      buttons[action] = item;
    }
    toolbar.append(menuButton, expandButton, menu);
    const status = doc.createElement("div");
    status.className = "mgpt-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    const retry = button(doc, "retry", "重新渲染");
    retry.className = "mgpt-retry";
    const viewport = doc.createElement("div");
    viewport.className = "mgpt-viewport";
    viewport.setAttribute("role", "group");
    viewport.tabIndex = 0;
    viewport.setAttribute("aria-label", "图表预览");
    const stage = doc.createElement("div");
    stage.className = "mgpt-stage";
    stage.tabIndex = 0;
    stage.setAttribute("aria-label", "触屏滑动页面，点击放大后双指缩放；Ctrl + 滚轮缩放，鼠标拖动平移");
    const image = doc.createElement("img");
    image.className = "mgpt-image";
    image.alt = "Mermaid 图表";
    image.draggable = false;
    image.hidden = true;
    stage.append(image);
    viewport.append(stage);
    figure.append(toolbar, status, retry, viewport);
    const record = {
      state, config, figure, menu, menuButton, buttons, status, retry, viewport, stage, image,
      source, sourceElement, result: null, url: null, zoom: 1, panX: 0, panY: 0,
      loading: false, destroyed: false, waiters: new Set(),
      renderAbort: null, renderAttempt: 0, imageTimer: 0,
    };
    state.records.add(record);
    menuButton.addEventListener("keydown", (event) => handleMenuButtonKeydown(record, event));
    menu.addEventListener("keydown", (event) => handleMenuKeydown(record, event));
    bindMotion(record);
    setStatus(record, "pending", "滚动到此处时显示图表…");
    if (window.ResizeObserver) {
      record.resize = new ResizeObserver(() => {
        // zoom会更新被观察容器的高度；在同一Observer交付阶段写回会让WebKit报循环。
        // 合并到下一帧，销毁时取消，保持拖动/滚轮本身仍同步响应。
        if (!record.result || record.destroyed || record.resizeFrame) return;
        record.resizeFrame = requestAnimationFrame(() => {
          record.resizeFrame = 0;
          if (!record.destroyed && record.result) zoom(record, record.zoom);
        });
      });
      record.resize.observe(stage);
    }
    record.destroy = () => {
      if (record.destroyed) return;
      record.destroyed = true;
      record.loading = false;
      record.renderAttempt += 1;
      record.renderAbort?.abort();
      clearTimeout(record.imageTimer);
      record.motion.destroy();
      record.resize?.disconnect();
      if (record.resizeFrame) cancelAnimationFrame(record.resizeFrame);
      if (state.viewer?.record === record) closeViewer(state);
      if (record.url) URL.revokeObjectURL(record.url);
      state.records.delete(record);
      settleRecord(record, "destroyed");
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

  function waitForRecord(record) {
    const state = record.figure.dataset.state;
    if (record.destroyed || !record.figure.isConnected || state === "ready" || state === "error") {
      return Promise.resolve(record);
    }
    return new Promise((resolve) => {
      let settled = false;
      let timer = 0;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        record.waiters.delete(finish);
        unwatchDisconnect(record, finish);
        resolve(record);
      };
      record.waiters.add(finish);
      watchDisconnect(record, finish);
      if (!record.figure.isConnected) {
        finish();
        return;
      }
      const timeoutMs = positiveTimeout(
        record.config.renderTimeoutMs ?? record.config.timeoutMs,
        DEFAULT_RENDER_TIMEOUT_MS,
      ) + 1000;
      timer = setTimeout(() => {
        if (settled) return;
        record.renderAbort?.abort(timeoutError("gpt-mermaid: render wait timed out"));
        record.loading = false;
        setStatus(record, "error", "渲染超时，可重试或简化图表。");
        finish();
      }, timeoutMs);
    });
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
    return Promise.all(diagrams.map(waitForRecord));
  }

  return { mount, renderAll, handleClick, uiState, closeMenus, svgToPng };
}

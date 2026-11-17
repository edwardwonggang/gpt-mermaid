/*
 * 职责：在调用方已有页面/上下文中验证图表触屏查看器，不创建浏览器。
 * 调用方：Chromium E2E与WebKit手机脚本；依赖：Playwright及公开DOM状态。
 * 红线：CDP触摸与合成PointerEvent分别报告；合成事件不能证明原生页面滚动。
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const FRAME = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const settle = page => page.evaluate(FRAME);
const clonePoints = points => new Map(points.map(point => [point.id, { ...point }]));
const EXPECTED_CHECK_COUNT = 14;

async function pose(stage) {
  return stage.evaluate(element => {
    const box = element.getBoundingClientRect();
    return {
      zoom: Number(element.dataset.zoom), panX: Number(element.dataset.panX), panY: Number(element.dataset.panY),
      dragging: element.dataset.dragging === "true", touchAction: getComputedStyle(element).touchAction,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      pageScroll: window.scrollY, viewportScale: window.visualViewport?.scale ?? 1,
      imageSource: element.querySelector("img")?.src,
    };
  });
}

function near(actual, expected, description, tolerance = 0.75) {
  assert(Number.isFinite(actual), `${description}不是有限数：${actual}`);
  assert(Math.abs(actual - expected) <= tolerance, `${description}：实际${actual}，预期${expected}`);
}

function samePose(actual, expected, description) {
  near(actual.zoom, expected.zoom, `${description}缩放`, 0.005);
  near(actual.panX, expected.panX, `${description}横向位置`);
  near(actual.panY, expected.panY, `${description}纵向位置`);
}

async function installProbe(stage) {
  await stage.evaluate(element => {
    const events = [], active = new Set();
    const listener = event => {
      if (event.pointerType !== "touch") return;
      if (event.type === "pointerdown") active.add(event.pointerId);
      if (event.type === "pointerup" || event.type === "pointercancel") active.delete(event.pointerId);
      events.push({ type: event.type, id: event.pointerId, trusted: event.isTrusted,
        prevented: event.defaultPrevented, x: event.clientX, y: event.clientY,
        captured: element.hasPointerCapture?.(event.pointerId) || false });
    };
    const types = ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"];
    types.forEach(type => element.addEventListener(type, listener));
    element.__gptTouchProbe = { events, active, listener, types };
  });
}

async function removeProbe(stage) {
  await stage.evaluate(element => {
    const probe = element.__gptTouchProbe;
    if (probe) probe.types.forEach(type => element.removeEventListener(type, probe.listener));
    delete element.__gptTouchProbe;
  });
}

export async function createCdpTouchDriver(page, stage) {
  const session = await page.context().newCDPSession(page);
  let active = new Map();
  const send = async (type, points) => {
    await session.send("Input.dispatchTouchEvent", { type, touchPoints: points.map(point => ({
      id: point.id, x: point.x, y: point.y, radiusX: 4, radiusY: 4, force: 0.5,
    })) });
    await settle(page);
  };
  return {
    mode: "cdp-touch", nativeScrolling: true, partialLiftProtocol: "touchEnd-released-points",
    async set(points) {
      const next = clonePoints(points);
      if (!next.size) {
        if (active.size) await send("touchEnd", []);
      } else {
        // 当前Chromium的CreateWebTouchEvents仅更新touchMove给出的id，不释放省略项。
        // touchEnd传已抬指的旧坐标才会逐id删除；空touchEnd表示全部抬起。
        // 依据content/browser/devtools/protocol/input_handler.cc，不按类型声明猜测。
        const removed = [...active.values()].filter(point => !next.has(point.id));
        if (removed.length) await send("touchEnd", removed);
        const added = [...next.values()].filter(point => !active.has(point.id));
        const moved = [...next.values()].some(point => {
          const previous = active.get(point.id);
          return previous && (previous.x !== point.x || previous.y !== point.y);
        });
        // 添加也只发送新触点，避免把仍按着的旧触点重复标成TouchStart。
        if (added.length) await send("touchStart", added);
        if (moved) await send("touchMove", [...next.values()]);
      }
      active = next;
    },
    async cancel() {
      if (active.size) await send("touchCancel", []);
      active.clear();
    },
    async loseCapture() {
      // pointerdown中的capture先处于pending；必须真实移动一次让其生效，
      // 否则在下个事件前release只会取消pending，不会产生lostpointercapture。
      active = new Map([...active].map(([id, point]) => [id, { ...point, x: point.x + 0.05 }]));
      await send("touchMove", [...active.values()]);
      const released = await stage.evaluate(element => {
        const ids = [...(element.__gptTouchProbe?.active || [])].filter(id => element.hasPointerCapture(id));
        for (const id of ids) element.releasePointerCapture(id);
        return ids;
      });
      assert(released.length > 0, "真实触摸必须先取得pointer capture，才能验证实际丢失捕获");
      // 同坐标的CDP调用可能不产生新pointer事件；极小真实位移触发待处理的捕获变更。
      active = new Map([...active].map(([id, point]) => [id, { ...point, x: point.x + 0.05 }]));
      await send("touchMove", [...active.values()]);
      return { mechanism: "native-releasePointerCapture", released };
    },
    async dispose() {
      if (active.size) await send("touchCancel", []);
      active.clear();
      await session.detach();
    },
  };
}

export async function createSyntheticTouchDriver(page, stage) {
  let active = new Map();
  // 合成PointerEvent不会进入浏览器活动触点注册表，原生capture会NotFoundError。
  // 仅在此模式显式模拟capture契约；真实capture行为留给CDP模式独立验收。
  await stage.evaluate(element => {
    const names = ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"], captures = new Set();
    const descriptors = names.map(name => [name, Object.getOwnPropertyDescriptor(element, name)]);
    Object.defineProperties(element, {
      setPointerCapture: { configurable: true, value: id => captures.add(id) },
      hasPointerCapture: { configurable: true, value: id => captures.has(id) },
      releasePointerCapture: { configurable: true, value: id => {
        if (captures.delete(id)) element.dispatchEvent(new PointerEvent("lostpointercapture", {
          pointerId: id, pointerType: "touch", bubbles: true,
        }));
      } },
    });
    element.__gptSyntheticCapture = { descriptors, captures };
  });
  const dispatch = (type, point, primary) => stage.evaluate((element, args) => {
    const ended = args.type === "pointerup" || args.type === "pointercancel" || args.type === "lostpointercapture";
    const event = new PointerEvent(args.type, {
      pointerId: args.point.id, pointerType: "touch", isPrimary: args.primary,
      clientX: args.point.x, clientY: args.point.y, width: 8, height: 8,
      button: args.type === "pointermove" ? -1 : 0, buttons: ended ? 0 : 1,
      pressure: ended ? 0 : 0.5, bubbles: true, cancelable: args.type !== "lostpointercapture",
    });
    element.dispatchEvent(event);
    return { trusted: event.isTrusted, prevented: event.defaultPrevented };
  }, { type, point, primary });
  return {
    mode: "synthetic-pointer-events", nativeScrolling: false, captureEmulated: true,
    async set(points) {
      const next = clonePoints(points), primary = active.keys().next().value ?? next.keys().next().value;
      for (const [id, point] of active) if (!next.has(id)) await dispatch("pointerup", point, id === primary);
      for (const [id, point] of next) {
        const previous = active.get(id);
        if (!previous) await dispatch("pointerdown", point, id === primary);
        else if (point.x !== previous.x || point.y !== previous.y) await dispatch("pointermove", point, id === primary);
      }
      active = next;
      await settle(page);
    },
    async cancel() {
      const primary = active.keys().next().value;
      for (const [id, point] of active) await dispatch("pointercancel", point, id === primary);
      active.clear();
      await settle(page);
    },
    async loseCapture() {
      for (const point of active.values()) await dispatch("lostpointercapture", point, true);
      await settle(page);
      return { mechanism: "synthetic-lostpointercapture", released: [...active.keys()] };
    },
    async dispose() {
      await this.cancel();
      await stage.evaluate(element => {
        const state = element.__gptSyntheticCapture;
        if (!state) return;
        for (const [name, descriptor] of state.descriptors) {
          if (descriptor) Object.defineProperty(element, name, descriptor);
          else delete element[name];
        }
        delete element.__gptSyntheticCapture;
      });
    },
  };
}

/**
 * 页面和上下文由调用方提供，必须已设置hasTouch:true；CDP仅适用于Chromium。
 * openSelector/inlineSelector指向同一已完成渲染的图，默认使用图库state例。
 */
export async function verifyTouchGestures(page, {
  mode = "synthetic",
  openSelector = "#state [data-fullscreen]",
  inlineSelector = "#state .mgpt-stage",
  output,
} = {}) {
  assert(["cdp", "synthetic"].includes(mode), `未知触屏验收模式：${mode}`);
  const report = {
    mode: mode === "cdp" ? "chromium-native-touch-injection" : "webkit-synthetic-pointer-events",
    tapSource: "Playwright locator.tap",
    realDevice: false,
    nativePageScrollVerified: false,
    checks: [],
  };
  const full = page.locator(".mgpt-dialog[open] .mgpt-stage");
  const close = page.locator('.mgpt-dialog[open] [data-mgpt-action="close"]');
  const reset = page.locator('.mgpt-dialog[open] [data-mgpt-action="fit"]');
  const originalViewport = page.viewportSize();
  let stage, driver;
  const remember = (name, details) => report.checks.push({ name, ...details });
  try {
    await page.locator(openSelector).scrollIntoViewIfNeeded();
    await page.locator(openSelector).tap();
    await full.waitFor({ state: "visible" });
    stage = await full.elementHandle();
    assert(stage, "全屏未挂载图表");
    await settle(page);
    await installProbe(stage);
    driver = mode === "cdp" ? await createCdpTouchDriver(page, stage) : await createSyntheticTouchDriver(page, stage);
    report.captureEmulated = driver.captureEmulated || false;
    if (driver.partialLiftProtocol) report.partialLiftProtocol = driver.partialLiftProtocol;
    const initial = await pose(stage);
    near(initial.zoom, 1, "进入全屏默认缩放", 0.005);
    near(initial.panX, 0, "进入全屏横向复位"); near(initial.panY, 0, "进入全屏纵向复位");
    assert.equal(initial.touchAction, "none", "全屏手势区须阻止浏览器将双指交给页面缩放");
    const center = { x: initial.box.x + initial.box.width / 2, y: initial.box.y + initial.box.height / 2 };
    const at = (id, x, y) => ({ id, x: center.x + x, y: center.y + y });
    remember("tap进入全屏", { zoom: initial.zoom, touchAction: initial.touchAction });

    const one = at(11, -40, 0), moved = { ...one, x: one.x + 30, y: one.y + 22 };
    await driver.set([one]); await driver.set([moved]);
    const panned = await pose(stage);
    near(panned.panX, initial.panX + 30, "单指横移"); near(panned.panY, initial.panY + 22, "单指纵移");
    near(panned.zoom, initial.zoom, "单指不能改变缩放", 0.005);
    await driver.set([]);
    assert.equal((await pose(stage)).dragging, false, "最后一指抬起须停止拖动");
    remember("单指平移", { deltaX: panned.panX - initial.panX, deltaY: panned.panY - initial.panY });
    await reset.tap(); await settle(page);
    samePose(await pose(stage), initial, "tap复位");

    let first = at(21, -65, -30), second = at(22, 35, -30);
    await driver.set([first]);
    const beforeSecond = await pose(stage);
    await driver.set([first, second]);
    samePose(await pose(stage), beforeSecond, "1到2指加入时");
    const beforePinch = await pose(stage);
    const oldMid = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    first = at(21, -70, -5); second = at(22, 80, -5);
    await driver.set([first, second]);
    const pinched = await pose(stage), newMid = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    near(pinched.zoom, beforePinch.zoom * 1.5, "双指间距比例", 0.015);
    const contentAnchor = {
      x: (oldMid.x - center.x - beforePinch.panX) / beforePinch.zoom,
      y: (oldMid.y - center.y - beforePinch.panY) / beforePinch.zoom,
    };
    const anchorError = {
      x: center.x + pinched.panX + contentAnchor.x * pinched.zoom - newMid.x,
      y: center.y + pinched.panY + contentAnchor.y * pinched.zoom - newMid.y,
    };
    near(anchorError.x, 0, "双指移动后的横向触点锚定", 1.25);
    near(anchorError.y, 0, "双指移动后的纵向触点锚定", 1.25);
    near(pinched.viewportScale, initial.viewportScale, "浏览器页面缩放不应改变", 0.005);
    remember("双指缩放与移动中心锚定", { zoom: pinched.zoom, anchorError });

    const beforePartialLift = await stage.evaluate(element => ({
      ups: element.__gptTouchProbe.events.filter(event => event.type === "pointerup").length,
      active: element.__gptTouchProbe.active.size,
    }));
    assert.equal(beforePartialLift.active, 2, "部分抬指前必须实际存在两根活动手指");
    await driver.set([first]);
    const afterPartialLift = await stage.evaluate(element => ({
      ups: element.__gptTouchProbe.events.filter(event => event.type === "pointerup").length,
      active: element.__gptTouchProbe.active.size,
    }));
    assert.equal(afterPartialLift.ups, beforePartialLift.ups + 1, "驱动必须真正发出一根手指的pointerup");
    assert.equal(afterPartialLift.active, 1, "部分抬指不能留下第二指或释放所有手指");
    samePose(await pose(stage), pinched, "2到1指抬起时");
    first = { ...first, x: first.x + 12, y: first.y - 9 };
    await driver.set([first]);
    const resumed = await pose(stage);
    near(resumed.panX, pinched.panX + 12, "2到1后横移"); near(resumed.panY, pinched.panY - 9, "2到1后纵移");
    near(resumed.zoom, pinched.zoom, "2到1后缩放稳定", 0.005);
    second = { id: 23, x: first.x + 110, y: first.y + 12 };
    await driver.set([first, second]);
    samePose(await pose(stage), resumed, "重新加入第二指时");
    first = { ...first, x: first.x + 10, y: first.y + 8 };
    second = { ...second, x: second.x + 10, y: second.y + 8 };
    await driver.set([first, second]);
    const translated = await pose(stage);
    near(translated.panX, resumed.panX + 10, "双指同向横移"); near(translated.panY, resumed.panY + 8, "双指同向纵移");
    near(translated.zoom, resumed.zoom, "双指等距移动不缩放", 0.005);
    remember("2到1及1到2指连续切换", { zoom: translated.zoom, panX: translated.panX, panY: translated.panY });

    let third = at(24, 10, 80);
    await driver.set([first, second, third]); samePose(await pose(stage), translated, "第三指加入时");
    third = { ...third, x: third.x + 18, y: third.y + 17 };
    await driver.set([first, second, third]); samePose(await pose(stage), translated, "只移动第三指时");
    await driver.set([first, second]); samePose(await pose(stage), translated, "第三指退出时");
    first = { ...first, x: first.x + 8, y: first.y - 6 };
    second = { ...second, x: second.x + 8, y: second.y - 6 };
    await driver.set([first, second]);
    const afterThird = await pose(stage);
    near(afterThird.panX, translated.panX + 8, "第三指离开后主双指仍可横移");
    near(afterThird.panY, translated.panY - 6, "第三指离开后主双指仍可纵移");
    await driver.set([]);
    remember("第三指不干扰既有双指", { zoom: afterThird.zoom });

    const upper = page.locator('.mgpt-dialog[open] [data-mgpt-action="zoom-in"]');
    const lower = page.locator('.mgpt-dialog[open] [data-mgpt-action="zoom-out"]');
    for (const { target, delta, tapButton, pointerBase } of [
      { target: 8, delta: -10, tapButton: upper, pointerBase: 61 },
      { target: 0.25, delta: 10, tapButton: lower, pointerBase: 71 },
    ]) {
      await reset.tap(); await settle(page);
      for (let attempt = 0; attempt < 12 && Math.abs((await pose(stage)).zoom - target) > 0.001; attempt++) {
        await tapButton.tap();
      }
      await settle(page);
      const boundary = await pose(stage);
      near(boundary.zoom, target, "倍率边界准备", 0.005);
      const pair = [at(pointerBase, -50, 0), at(pointerBase + 1, 50, 0)];
      await driver.set(pair);
      const shifted = pair.map(point => ({ ...point, x: point.x + delta }));
      await driver.set(shifted);
      const movedAtLimit = await pose(stage);
      near(movedAtLimit.zoom, target, "倍率边界双指同向等距移动不得改变倍率", 0.005);
      near(movedAtLimit.panX, boundary.panX + delta, "倍率边界双指同向横移");
      near(movedAtLimit.panY, boundary.panY, "倍率边界纵向位置保持");
      await driver.set([]);
      remember(`倍率${target}时等距双指平移`, {
        expectedZoom: target, actualZoom: movedAtLimit.zoom, deltaX: movedAtLimit.panX - boundary.panX,
      });
    }
    await reset.tap(); await settle(page);
    let overlapPair = [at(81, -50, 0), at(82, 50, 0)];
    await driver.set(overlapPair);
    const overlapSamples = [];
    for (const halfDistance of [8, 0, 1, 40]) {
      overlapPair = [at(81, -halfDistance, 0), at(82, halfDistance, 0)];
      await driver.set(overlapPair);
      const state = await pose(stage);
      assert(Number.isFinite(state.zoom) && Number.isFinite(state.panX) && Number.isFinite(state.panY),
        "两指缩回重合或重新分开时不得出现NaN/Infinity");
      assert(state.zoom >= 0.25 && state.zoom <= 8, "两指重合也必须遵守倍率上下限");
      overlapSamples.push({ distance: halfDistance * 2, zoom: state.zoom, panX: state.panX, panY: state.panY });
    }
    await driver.set([]);
    assert.equal((await pose(stage)).dragging, false);
    remember("两指缩回重合及重新分开保持有限", { samples: overlapSamples });
    await reset.tap(); await settle(page);

    const cancelStart = at(31, 0, 0);
    await driver.set([cancelStart]);
    await driver.set([{ ...cancelStart, x: cancelStart.x + 14 }]);
    const beforeCancel = await pose(stage);
    await driver.cancel();
    const canceled = await pose(stage);
    samePose(canceled, beforeCancel, "pointercancel时");
    assert.equal(canceled.dragging, false, "取消最后一指后不得继续dragging");
    const restarted = at(32, -20, -20);
    await driver.set([restarted]); samePose(await pose(stage), canceled, "取消后重新按下时");
    await driver.set([{ ...restarted, x: restarted.x + 9, y: restarted.y + 7 }]);
    const afterCancel = await pose(stage);
    near(afterCancel.panX, canceled.panX + 9, "取消后新手势横移"); near(afterCancel.panY, canceled.panY + 7, "取消后新手势纵移");
    await driver.set([]);
    remember("pointercancel与新手势恢复", { draggingAfterCancel: canceled.dragging });

    const captureStart = at(41, 0, 0);
    await driver.set([captureStart]);
    const captured = await pose(stage), loss = await driver.loseCapture();
    assert.equal((await pose(stage)).dragging, false, "lostpointercapture应解除原指针拖动状态");
    await driver.set([{ ...captureStart, x: captureStart.x + 13, y: captureStart.y + 11 }]);
    samePose(await pose(stage), captured, "丢失捕获后的旧指移动");
    await driver.set([]);
    remember("lostpointercapture清理", loss);

    await reset.tap(); await settle(page);
    const fitted = await pose(stage);
    samePose(fitted, initial, "完成手势后tap复位");
    near(fitted.pageScroll, initial.pageScroll, "全屏手势不能滚动底层页面", 1);
    assert.equal(fitted.imageSource, initial.imageSource, "手势不得替换图像内容");
    await close.tap(); await full.waitFor({ state: "hidden" });
    await settle(page);
    const inline = page.locator(inlineSelector);
    assert(await inline.evaluate((element, original) => element === original, stage), "退出后必须恢复原stage，不能遗留复制图");
    const restored = await pose(stage);
    samePose(restored, initial, "tap关闭回到行内");
    assert.match(restored.touchAction, /pan-y/, "退出全屏后须恢复行内纵向滚动策略");
    remember("tap关闭与行内恢复", { touchAction: restored.touchAction, dragging: restored.dragging });

    await inline.scrollIntoViewIfNeeded(); await settle(page);
    const inlineBefore = await pose(stage);
    const viewport = await page.evaluate(() => ({ height: innerHeight, scrollY,
      maximum: document.documentElement.scrollHeight - innerHeight }));
    const visibleTop = Math.max(12, inlineBefore.box.y), visibleBottom = Math.min(viewport.height - 12, inlineBefore.box.y + inlineBefore.box.height);
    assert(visibleBottom - visibleTop >= 64, "行内滚动验收需要至少64px可见图表区域");
    const upward = viewport.maximum - viewport.scrollY >= 60;
    if (driver.nativeScrolling) assert(upward || viewport.scrollY >= 60, "页面没有可滚动空间，不能假报触屏滚动通过");
    const travel = Math.min(120, (visibleBottom - visibleTop) * 0.65);
    const startY = upward ? visibleBottom - 8 : visibleTop + 8;
    const inlineStart = { id: 51, x: inlineBefore.box.x + inlineBefore.box.width / 2, y: startY };
    const eventStart = await stage.evaluate(element => element.__gptTouchProbe.events.length);
    await driver.set([inlineStart]);
    for (let step = 1; step <= 8; step++) {
      await driver.set([{ ...inlineStart, y: startY + (upward ? -1 : 1) * travel * step / 8 }]);
    }
    await driver.set([]);
    if (driver.nativeScrolling) {
      await page.waitForFunction(before => Math.abs(scrollY - before) > 20, inlineBefore.pageScroll, { timeout: 3000 });
      report.nativePageScrollVerified = true;
    }
    const inlineAfter = await pose(stage);
    samePose(inlineAfter, inlineBefore, "行内手指滑动不应平移或缩放图表");
    const inlineEvents = await stage.evaluate((element, index) => element.__gptTouchProbe.events.slice(index), eventStart);
    assert(inlineEvents.some(event => event.type === "pointerdown"), "行内滑动必须经过图表触点入口");
    assert(inlineEvents.every(event => !event.prevented), "行内触摸不能preventDefault拦截页面纵向滚动");
    remember("退出后的行内纵向滚动", {
      evidence: driver.nativeScrolling ? "native-browser-touch-scroll" : "synthetic-policy-only",
      nativePageScrollVerified: report.nativePageScrollVerified,
      scrollBefore: inlineBefore.pageScroll, scrollAfter: inlineAfter.pageScroll,
      touchAction: inlineAfter.touchAction, preventedEvents: inlineEvents.filter(event => event.prevented).length,
    });

    await page.locator(openSelector).scrollIntoViewIfNeeded();
    await page.locator(openSelector).tap(); await full.waitFor({ state: "visible" }); await settle(page);
    samePose(await pose(stage), initial, "再次全屏不得带入旧手势状态");
    assert.equal((await pose(stage)).dragging, false);
    assert(originalViewport, "横竖屏验收需要明确的viewport尺寸");
    const orientationChecks = [];
    for (const viewport of [
      { width: originalViewport.height, height: originalViewport.width }, originalViewport,
    ]) {
      await page.setViewportSize(viewport);
      await settle(page);
      await page.waitForFunction(element => {
        const box = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect();
        return Math.abs(box.width - parent.width) <= 1.5 && Math.abs(box.height - parent.height) <= 1.5;
      }, stage, { timeout: 3000 });
      const dimensions = await stage.evaluate(element => {
        const compact = box => ({ x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height });
        return {
          zoom: Number(element.dataset.zoom), stage: compact(element.getBoundingClientRect()),
          parent: compact(element.parentElement.getBoundingClientRect()),
          image: compact(element.querySelector("img").getBoundingClientRect()),
        };
      });
      near(dimensions.zoom, 1, "旋转后的适应窗口倍率", 0.005);
      near(dimensions.stage.width, dimensions.parent.width, "旋转后的stage宽度", 1.5);
      near(dimensions.stage.height, dimensions.parent.height, "旋转后的stage高度", 1.5);
      assert(dimensions.image.x >= dimensions.stage.x - 1.5 && dimensions.image.y >= dimensions.stage.y - 1.5
        && dimensions.image.right <= dimensions.stage.right + 1.5 && dimensions.image.bottom <= dimensions.stage.bottom + 1.5,
      `旋转后zoom=1的图像不能被stage裁切：${JSON.stringify(dimensions)}`);
      orientationChecks.push({ viewport, ...dimensions });
    }
    remember("横竖屏切换后stage贴合容器且适应图像完整", { orientations: orientationChecks });

    const rotationStart = await pose(stage);
    // 触点留在横竖屏共有的左上区域，避免旋转后移到stage外导致旧移动未送达的假通过。
    const rotationCenter = {
      x: rotationStart.box.x + Math.min(100, rotationStart.box.width / 2),
      y: rotationStart.box.y + Math.min(100, rotationStart.box.height / 2),
    };
    let rotatingPair = [
      { id: 91, x: rotationCenter.x - 40, y: rotationCenter.y },
      { id: 92, x: rotationCenter.x + 40, y: rotationCenter.y },
    ];
    await driver.set(rotatingPair);
    rotatingPair = [
      { ...rotatingPair[0], x: rotationCenter.x - 50 + 12, y: rotationCenter.y + 8 },
      { ...rotatingPair[1], x: rotationCenter.x + 50 + 12, y: rotationCenter.y + 8 },
    ];
    await driver.set(rotatingPair);
    const beforeActiveRotation = await pose(stage);
    near(beforeActiveRotation.zoom, rotationStart.zoom * 1.25, "旋转前双指缩放", 0.015);
    assert.equal(beforeActiveRotation.dragging, true, "旋转前双指须仍在拖动");
    assert(Math.abs(beforeActiveRotation.panX - rotationStart.panX) > 1
      && Math.abs(beforeActiveRotation.panY - rotationStart.panY) > 1, "旋转前双指须已产生横纵平移");
    assert.equal(await stage.evaluate(element => element.__gptTouchProbe.active.size), 2,
      "旋转前必须实际保留两根未抬起的手指");
    await page.setViewportSize({ width: originalViewport.height, height: originalViewport.width });
    await settle(page);
    const afterActiveRotation = await pose(stage);
    assert(Math.abs(afterActiveRotation.box.width - beforeActiveRotation.box.width) > 1
      || Math.abs(afterActiveRotation.box.height - beforeActiveRotation.box.height) > 1,
    "活动双指旋转必须实际改变stage尺寸");
    near(afterActiveRotation.zoom, beforeActiveRotation.zoom, "活动双指旋转保留缩放", 0.005);
    assert.equal(afterActiveRotation.dragging, false, "旋转后须结束旧双指拖动");
    const movesBeforeRotationReplay = await stage.evaluate(element =>
      element.__gptTouchProbe.events.filter(event => event.type === "pointermove").length);
    rotatingPair = rotatingPair.map(point => ({ ...point, x: point.x + 6, y: point.y + 5 }));
    await driver.set(rotatingPair);
    const afterOldRotationMove = await pose(stage);
    assert(await stage.evaluate(element =>
      element.__gptTouchProbe.events.filter(event => event.type === "pointermove").length) > movesBeforeRotationReplay,
    "旋转后的旧pointermove须实际到达stage，不能以事件未送达证明清理成功");
    samePose(afterOldRotationMove, afterActiveRotation, "旋转后的旧双指移动");
    assert.equal(afterOldRotationMove.dragging, false, "旧双指移动不能恢复拖动状态");
    await driver.set([]);
    const rotationRestart = {
      id: 93, x: afterActiveRotation.box.x + afterActiveRotation.box.width / 2,
      y: afterActiveRotation.box.y + afterActiveRotation.box.height / 2,
    };
    await driver.set([rotationRestart]);
    samePose(await pose(stage), afterActiveRotation, "旋转后抬起再按下时");
    await driver.set([{ ...rotationRestart, x: rotationRestart.x + 9, y: rotationRestart.y + 7 }]);
    const afterRotationRestart = await pose(stage);
    near(afterRotationRestart.panX, afterActiveRotation.panX + 9, "旋转后新手势横移");
    near(afterRotationRestart.panY, afterActiveRotation.panY + 7, "旋转后新手势纵移");
    near(afterRotationRestart.zoom, afterActiveRotation.zoom, "旋转后单指移动保留缩放", 0.005);
    await driver.set([]);
    assert.equal((await pose(stage)).dragging, false, "旋转后新手势抬起须停止拖动");
    await page.setViewportSize(originalViewport); await settle(page);
    await close.tap(); await full.waitFor({ state: "hidden" });
    remember("再次tap进入退出无残留", { passed: true });
    report.events = await stage.evaluate(element => element.__gptTouchProbe.events);
    const gestureEvents = report.events.filter(event => event.type === "pointerdown" || event.type === "pointermove");
    assert(gestureEvents.length > 0);
    assert(gestureEvents.every(event => event.trusted === driver.nativeScrolling), "事件可信标记必须与验收模式一致");
    assert(report.events.some(event => event.type === "pointercancel"), "必须实际观察取消事件");
    assert(report.events.some(event => event.type === "lostpointercapture"), "必须实际观察捕获丢失事件");
    report.nativeTouchEvents = report.events.filter(event => event.trusted).length;
    report.syntheticPointerEvents = report.events.filter(event => !event.trusted).length;
    assert.equal(report.checks.length, EXPECTED_CHECK_COUNT,
      `触屏检查项数量应为真实14项，实际${report.checks.length}`);
    report.passed = true;
    return report;
  } catch (error) {
    report.passed = false; report.error = error.message;
    if (stage) report.events = await stage.evaluate(element => element.__gptTouchProbe?.events || []).catch(() => []);
    throw error;
  } finally {
    if (driver) await driver.dispose().catch(() => {});
    if (await close.isVisible().catch(() => false)) await close.tap().catch(() => {});
    if (originalViewport && JSON.stringify(page.viewportSize()) !== JSON.stringify(originalViewport)) {
      await page.setViewportSize(originalViewport).catch(() => {});
    }
    if (stage) await removeProbe(stage).catch(() => {});
    if (output) {
      await fs.mkdir(output, { recursive: true });
      await fs.writeFile(path.join(output, "touch-gestures.json"), JSON.stringify(report, null, 2));
    }
  }
}

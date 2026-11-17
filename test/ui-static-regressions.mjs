/*
 * 职责：只读检查 ui.js/styles.css 的可访问性与清理契约。
 * 调用方：本地静态回归；不启动浏览器，不写输出文件。
 * 依赖：node:test 与源码文本。
 * 红线：这是源码契约检查，不能替代浏览器或真机行为验收。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ui = fs.readFileSync(path.join(root, "src/ui.js"), "utf8");
const css = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.notEqual(from, -1, `缺少起始标记：${start}`);
  assert.notEqual(to, -1, `缺少结束标记：${end}`);
  return source.slice(from, to);
}

test("dialog 滚动锁覆盖 html/body，关闭与销毁路径精确恢复", () => {
  const lock = between(ui, "function lockBackgroundScroll", "function unlockBackgroundScroll");
  const unlock = between(ui, "function unlockBackgroundScroll", "function viewer");
  const close = between(ui, "function closeViewer", "function handleClick");

  assert.match(ui, /const SCROLL_LOCK_CLASS = "mgpt-scroll-locked"/);
  assert.match(lock, /root\.classList\.add\(SCROLL_LOCK_CLASS\)/);
  assert.match(lock, /body\?\.classList\.add\(SCROLL_LOCK_CLASS\)/);
  assert.match(lock, /scrollX/);
  assert.match(lock, /scrollY/);
  assert.match(unlock, /root\.classList\.remove\(SCROLL_LOCK_CLASS\)/);
  assert.match(unlock, /body.*classList\.remove\(SCROLL_LOCK_CLASS\)/s);
  assert.match(unlock, /scrollTo\(lock\.scrollX, lock\.scrollY\)/);
  assert.match(close, /if \(closeDialog\)/);
  assert.match(close, /unlockBackgroundScroll\(state\)/);
  assert.match(ui, /if \(state\.viewer\?\.record === record\) closeViewer\(state\)/);
  assert.match(css, /html\.mgpt-scroll-locked,\s*body\.mgpt-scroll-locked\s*\{[^}]*overflow:\s*hidden\s*!important/s);
  assert.match(css, /overscroll-behavior:\s*none\s*!important/);
});

test("菜单支持方向键、Home/End/Escape，并在开关时管理焦点", () => {
  assert.match(ui, /\["ArrowDown", "ArrowUp", "Home", "End"\]\.includes\(event\.key\)/);
  assert.match(ui, /event\.key === "Escape"[\s\S]*?closeMenu\(record, true\)/);
  assert.match(ui, /\(position === "last" \? items\.at\(-1\) : items\[0\]\)\?\.focus\(\)/);
  assert.match(ui, /if \(restoreFocus\) record\.menuButton\?\.focus\(\)/);
  assert.match(ui, /event\.key === "ArrowUp" \? "last" : "first"/);
  assert.match(ui, /menuButton\.addEventListener\("keydown", \(event\) => handleMenuButtonKeydown\(record, event\)\)/);
  assert.match(ui, /menu\.addEventListener\("keydown", \(event\) => handleMenuKeydown\(record, event\)\)/);
});

test("复制失败使用可见 live region，且菜单关闭后恢复按钮焦点", () => {
  const notice = between(ui, "function showNotice", "function setStatus");
  const click = between(ui, "function handleClick", "async function renderRecord");

  assert.match(notice, /record\.status\.hidden = false/);
  assert.match(notice, /kind === "error" \? "alert" : "status"/);
  assert.match(notice, /kind === "error" \? "assertive" : "polite"/);
  assert.match(click, /if \(openedMenu && record\.menu\.contains\(actionEl\)\) record\.menuButton\?\.focus\(\)/);
  assert.match(click, /复制源码失败[\s\S]*?"error"/);
  assert.match(click, /复制图片失败[\s\S]*?"error"/);
  assert.doesNotMatch(click, /catch\(\(error\) => record\.status\.textContent/);
  assert.match(css, /\.mgpt-status\[data-kind="error"\]/);
});

test("全屏缩放百分比通过 output 与 aria-live 反馈", () => {
  const zoom = between(ui, "function zoom", "function bindMotion");
  const viewer = between(ui, "function viewer", "function closeViewer");

  assert.match(viewer, /doc\.createElement\("output"\)/);
  assert.match(viewer, /\.className = "mgpt-zoom-status"/);
  assert.match(viewer, /zoomStatus\.setAttribute\("aria-label", "当前缩放"\)/);
  assert.match(viewer, /zoomStatus\.setAttribute\("aria-live", "polite"\)/);
  assert.match(viewer, /zoomStatus\.setAttribute\("aria-atomic", "true"\)/);
  assert.match(zoom, /const zoomMessage = `缩放 \$\{percent\}%/);
  assert.match(zoom, /viewer\.zoomStatus\.textContent !== zoomMessage/);
  assert.match(zoom, /setLabel\(viewer\.fitButton/);
  assert.match(css, /\.mgpt-zoom-status\s*\{/);
});

test("错误状态在手机窄屏不再由绝对定位工具栏覆盖正文", () => {
  const mobile = between(css, "@media (max-width: 640px)", "\n}");
  assert.match(mobile, /\.mgpt-diagram\[data-state="error"\] \.mgpt-floatbar/);
  assert.match(mobile, /\.mgpt-diagram\[data-notice\] \.mgpt-floatbar/);
  assert.match(mobile, /position:\s*static/);
  assert.match(mobile, /width:\s*max-content/);
  assert.match(mobile, /margin:\s*4px 4px 0 auto/);
  assert.match(ui, /record\.figure\.dataset\.notice = kind/);
});

test("对话框与预览使用中文可访问名称", () => {
  assert.match(ui, /dialog\.setAttribute\("aria-label", "图表全屏查看器"\)/);
  assert.match(ui, /toolbar\.setAttribute\("aria-label", "图表操作"\)/);
  assert.match(ui, /viewport\.setAttribute\("role", "group"\)/);
  assert.match(ui, /viewport\.setAttribute\("aria-label", "图表预览"\)/);
  assert.match(ui, /figure\.setAttribute\("aria-label", "Mermaid 图表"\)/);
  assert.match(ui, /image\.alt = "Mermaid 图表"/);
});

test("粗指针重试按钮满足至少 44px 的触控目标", () => {
  assert.match(css, /@media \(pointer: coarse\)\s*\{[\s\S]*?\.mgpt-retry\s*\{\s*min-width:\s*44px;\s*min-height:\s*44px;/);
});

test("销毁、关闭和手势清理契约保持完整", () => {
  const destroy = between(ui, "record.destroy = () =>", "record.fit = () =>");
  assert.match(destroy, /record\.motion\.destroy\(\)/);
  assert.match(destroy, /if \(state\.viewer\?\.record === record\) closeViewer\(state\)/);
  assert.match(ui, /pointercancel", record\.motion\.end/);
  assert.match(ui, /lostpointercapture", record\.motion\.end/);
  assert.match(ui, /record\.stage\.dataset\.zoom = String\(next\)/);
  assert.match(ui, /record\.stage\.dataset\.panX = String\(record\.panX\)/);
  assert.match(css, /\.mgpt-dialog-viewport \.mgpt-stage\s*\{[^}]*touch-action:\s*none/s);
});

#!/usr/bin/env node
/**
 * apply-patch.mjs —— 把官方 mermaid 12.3.0 的预构建 bundle 改造成「判定框=圆角矩形 + 全圆角」
 *
 * 设计原则（重要）：
 * 1. **不构建**。mermaid 的仓库是 TypeScript + .jison 语法 + langium 生成的 parser，
 *    浏览器不能直接 import；但 npm 包里已经带了可读的 `dist/mermaid.js`，
 *    形状就是几个普通函数。要改外观，改这几个函数即可，不需要跑 esbuild/rollup。
 * 2. **锚点替换必须带断言**。上游一旦改写法，这里立刻报错而不是静默产出坏包。
 * 3. **保留原实现**。判定框用「提前 return」而不是删代码，出问题时能直接对照原逻辑。
 *
 * 用法：
 *   node scripts/apply-patch.mjs                 # 自动下载 12.3.0 并产出 dist/
 *   node scripts/apply-patch.mjs --src <path>    # 用本地的 dist/mermaid.js
 *   node scripts/apply-patch.mjs --no-minify     # 只产出未压缩版本
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = '12.3.0';
const VENDOR_DIR = path.join(ROOT, 'vendor');
const VENDOR_JS = path.join(VENDOR_DIR, `mermaid-${VERSION}.js`);
const DIST_DIR = path.join(ROOT, 'dist');

const argv = process.argv.slice(2);
const srcArg = argv.includes('--src') ? argv[argv.indexOf('--src') + 1] : null;

function log(msg) {
  console.log(msg);
}

/** 确保拿到官方未压缩 bundle */
function ensureVendor() {
  if (srcArg) {
    log(`使用指定源: ${srcArg}`);
    return fs.readFileSync(srcArg, 'utf8');
  }
  if (fs.existsSync(VENDOR_JS)) {
    log(`复用已下载的 vendor: ${path.relative(ROOT, VENDOR_JS)}`);
    return fs.readFileSync(VENDOR_JS, 'utf8');
  }
  fs.mkdirSync(VENDOR_DIR, { recursive: true });
  const tgz = path.join(VENDOR_DIR, `mermaid-${VERSION}.tgz`);
  const url = `https://registry.npmjs.org/mermaid/-/mermaid-${VERSION}.tgz`;
  log(`下载 ${url}`);
  execFileSync('curl', ['-sL', '--fail', '-m', '180', url, '-o', tgz], { stdio: 'inherit' });
  const tmp = path.join(VENDOR_DIR, '.unpack');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  execFileSync('tar', ['xzf', tgz, '-C', tmp], { stdio: 'inherit' });
  const from = path.join(tmp, 'package', 'dist', 'mermaid.js');
  if (!fs.existsSync(from)) throw new Error('压缩包里没找到 dist/mermaid.js');
  fs.copyFileSync(from, VENDOR_JS);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(tgz, { force: true });
  log(`已保存 vendor/${path.basename(VENDOR_JS)}`);
  return fs.readFileSync(VENDOR_JS, 'utf8');
}

/** 一次性替换，并断言命中次数 */
function replaceOnce(source, label, from, to) {
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(
      `[${label}] 锚点命中 ${count} 次（期望 1 次）。` +
        `上游写法可能已变，请重新对照 dist/mermaid.js 再更新补丁。`
    );
  }
  log(`  ✓ ${label}`);
  return source.replace(from, () => to);
}

let js = ensureVendor();
const originalBytes = js.length;

// ---------------------------------------------------------------------------
// 0. 注入样式常量与取值函数（挂在全局，方便运行时不改包就能调参）
// ---------------------------------------------------------------------------
const ANCHOR_DRAWRECT = `  async function drawRect3(parent4, node2, options2) {`;
const STYLE_HELPER = `  // ===== mermaid-rounded: 节点外观参数（唯一入口） =====
  // 可以在页面里用 window.__MERMAID_ROUNDED = { radius, paddingX, paddingY, minWidth } 覆盖，
  // 不用重新打补丁。
  var __MR_DEFAULTS = { radius: 8, paddingX: 12, paddingY: 10, minWidth: 48 };
  function __mrStyle(node) {
    var o = (typeof window !== "undefined" && window.__MERMAID_ROUNDED) || {};
    var pick = function (v, d) { return v === undefined || v === null ? d : v; };
    var d = __MR_DEFAULTS;
    return {
      radius: pick(node && node.rx, pick(o.radius, d.radius)),
      paddingX: pick(node && node.labelPaddingX, pick(o.paddingX, d.paddingX)),
      paddingY: pick(node && node.labelPaddingY, pick(o.paddingY, d.paddingY)),
      minWidth: pick(o.minWidth, d.minWidth)
    };
  }
  // ===== end mermaid-rounded =====
  // 说明：自适应不再依赖注入 CSS，见下面的「label div 创建即收缩」补丁。
${ANCHOR_DRAWRECT}`;

js = replaceOnce(js, '注入 __mrStyle', ANCHOR_DRAWRECT, STYLE_HELPER);

// ---------------------------------------------------------------------------
// 1. drawRect：允许传 minWidth（极短标签不至于缩成一个点；不影响默认行为）
// ---------------------------------------------------------------------------
js = replaceOnce(
  js,
  'drawRect：宽度按真实文字宽 + minWidth',
  `    const totalWidth = Math.max(bbox.width + options2.labelPaddingX * 2, node2?.width || 0);`,
  `    // ===== mermaid-rounded =====
    // bbox 在这里不可信：上游 label 的 div 被 max-width:wrappingWidth(120) 拉满，
    // 于是 bbox.width 恒为 120，「提」和「提交申请」算出一样的 152px。
    // 直接量内层文字（.nodeLabel）的真实宽度作为基准，文字没有时才退回 bbox。
    const __rootEl = shapeSvg.node();
    const __divEl = __rootEl.querySelector("foreignObject div");
    // 直接拿 node.label 文本 + 当前字体，离屏量一次真宽。
    // 不依赖 div / foreignObject 的布局（它们在 mermaid 里会被 max-width 拉满，量不准）。
    const __textOf = (n) => (typeof n.label === "string" ? n.label : "").replace(/<[^>]*>/g, "").trim();
    const __measureText = (txt, styleFrom) => {
      if (!txt || !styleFrom) return 0;
      const cs = getComputedStyle(styleFrom);
      const probe = document.createElement("span");
      probe.textContent = txt;
      probe.style.cssText = "position:absolute;left:-99999px;top:0;visibility:hidden;" +
        "display:inline-block;white-space:nowrap;";
      probe.style.fontFamily = cs.fontFamily;
      probe.style.fontSize = cs.fontSize;
      probe.style.fontWeight = cs.fontWeight;
      probe.style.letterSpacing = cs.letterSpacing;
      document.body.appendChild(probe);
      const w = probe.getBoundingClientRect().width;
      probe.remove();
      return w;
    };
    const __tw = __measureText(__textOf(node2), __divEl || __rootEl);
    const __basisW = __tw > 1 ? __tw : bbox.width;
    const __nodeW = node2 && typeof node2.width === "number" && Math.abs(node2.width - __wrapW) > 0.5
      ? node2.width
      : 0;
    const totalWidth = Math.max(__basisW + options2.labelPaddingX * 2, __nodeW, options2.minWidth || 0);
    // ===== end mermaid-rounded =====`
);

// ---------------------------------------------------------------------------
// 2. squareRect：直角 rx:0 → 统一圆角；内边距 nodePadding*2 → 12px/侧
//    原因：2 个汉字 + 20px/侧 会变成一条长条，「是/否」这种小框尤其明显。
// ---------------------------------------------------------------------------
js = replaceOnce(
  js,
  'squareRect 内边距收敛',
  `    const labelPaddingX = node2.look === "neo" ? 16 : nodePadding * 2;
    const labelPaddingY = node2.look === "neo" ? 12 : nodePadding;`,
  `    const __st = __mrStyle(node2);
    const labelPaddingX = node2.look === "neo" ? 16 : node2.labelPaddingX ?? __st.paddingX;
    const labelPaddingY = node2.look === "neo" ? 12 : node2.labelPaddingY ?? __st.paddingY;`
);

js = replaceOnce(
  js,
  'squareRect 圆角 + minWidth',
  `    const options2 = {
      rx: 0,
      ry: 0,
      classes: "",
      labelPaddingX: node2.labelPaddingX ?? labelPaddingX,
      labelPaddingY
    };
    const shapeSvg = await drawRect3(parent4, node2, options2);`,
  `    const options2 = {
      rx: __st.radius,
      ry: __st.radius,
      classes: "",
      labelPaddingX: labelPaddingX,
      labelPaddingY,
      minWidth: __st.minWidth
    };
    const shapeSvg = await drawRect3(parent4, node2, options2);`
);

// ---------------------------------------------------------------------------
// 3. question（判定框）：菱形 → 圆角矩形
//    上游：s = 文字宽 + 文字高，永远是个正方形（33 字 = 222×222 的空心大方块）。
//    这里提前 return，交给 drawRect 按「文字宽 + 左右内边距」算宽度。
//    原实现保留在下面（不可达），便于对照与回退。
// ---------------------------------------------------------------------------
js = replaceOnce(
  js,
  'question 菱形 → 圆角矩形',
  `  async function question(parent4, node2) {
    const { labelStyles, nodeStyles } = styles2String(node2);`,
  `  async function question(parent4, node2) {
    // ===== mermaid-rounded patch =====
    // 判定框按普通矩形绘制：宽度 = 文字宽 + 左右内边距，高度 = 文字高 + 上下内边距。
    // 左右各多留 2px，让判定框与普通步骤框在视觉上仍有一点点区别。
    {
      const __st = __mrStyle(node2);
      return drawRect3(parent4, node2, {
        rx: __st.radius,
        ry: __st.radius,
        classes: "",
        labelPaddingX: __st.paddingX + 2,
        labelPaddingY: __st.paddingY,
        minWidth: Math.round(__st.minWidth * 1.15)
      });
    }
    // ===== 以下为上游原始实现，保留以便对照（不会执行）=====
    const { labelStyles, nodeStyles } = styles2String(node2);`
);

// ---------------------------------------------------------------------------
// 5. 标签宽度：根因在 label div 的初始 display
//    上游把 div 设成 `display: table-cell` + `max-width: wrappingWidth(120)`，
//    table-cell 会先被拉满到 120 再量，于是：
//      bbox.width = 120 → foreignObject 写死 120 → label translate(-60) 写死
//      → 方框宽度恒为 152，且状态图里文字相对方框左移（错位）。
//    这里改成创建时就 `inline-block`：会收缩到文字宽度，量出来就是真实宽度，
//    foreignObject / translate / node.width 三者一次对齐。
//    长文本仍会撞上 max-width，落到下面的 `bbox.width === width3` 分支折行。
// ---------------------------------------------------------------------------
js = replaceOnce(
  js,
  'label div 创建即收缩',
  `    div.style("display", "table-cell");
    div.style("white-space", "nowrap");
    div.style("line-height", "1.5");`,
  `    // ===== mermaid-rounded: 量真实文字宽度并锁定 =====
    // 光改 display 没用：foreignObject 有 1200px 宽，shrink-to-fit 会直接吃到
    // max-width(120)，量出来还是 120。用 Range 直接量文本节点，才是真宽度。
    div.style("display", "table-cell");
    div.style("white-space", "nowrap");
    div.style("line-height", "1.5");
    try {
      // span 里通常是 <p> 块级元素，Range / getBoundingClientRect 量到的都是块宽(120)。
      // 用一个离屏探针按同样字体量纯文本宽度，才是真实字宽。
      const __node = span.node();
      const __text = (__node.textContent || "").trim();
      if (__text && width3 !== Number.POSITIVE_INFINITY) {
        const __cs = getComputedStyle(__node);
        const __probe = document.createElement("span");
        __probe.textContent = __text;
        __probe.style.cssText = "position:absolute;left:-99999px;top:0;visibility:hidden;" +
          "white-space:nowrap;display:inline-block;";
        __probe.style.fontFamily = __cs.fontFamily;
        __probe.style.fontSize = __cs.fontSize;
        __probe.style.fontWeight = __cs.fontWeight;
        __probe.style.letterSpacing = __cs.letterSpacing;
        document.body.appendChild(__probe);
        const __tw = __probe.getBoundingClientRect().width;
        __probe.remove();
        if (__tw > 0 && __tw < width3 - 1) {
          div.style("display", "table");
          div.style("width", Math.ceil(__tw + 2) + "px");
        }
      }
    } catch (e) { /* 老浏览器忽略 */ }`
);

// ---------------------------------------------------------------------------
// 5c. 清掉「测量残留」的 node.width
//     上游在离屏测量阶段会把 label 宽（= wrappingWidth，默认 120）写进 node.width。
//     矩形族已在 drawRect 里做了判断，但六边形/体育场形/圆柱/平行四边形等是各自
//     用 `node.width ? node.width : bbox.width` 算宽度 —— 于是「六边形」这种 3 个字的
//     标签也会撑成 200px 宽。统一在 labelHelper 入口把「等于 wrappingWidth」的值清掉，
//     让所有形状都退回按文字宽度计算。
// ---------------------------------------------------------------------------
js = replaceOnce(
  js,
  '清理各形状的 node.width 残留',
  `      labelHelper = /* @__PURE__ */ __name(async (parent4, node2, _classes, { ignoreMinWidth = false } = {}) => {
        if (node2.stereotype !== void 0) {`,
  `      labelHelper = /* @__PURE__ */ __name(async (parent4, node2, _classes, { ignoreMinWidth = false } = {}) => {
        // ===== mermaid-rounded =====
        if (node2 && typeof node2.width === "number") {
          const __w = getConfig2()?.flowchart?.wrappingWidth ?? 200;
          if (Math.abs(node2.width - __w) <= 0.5) {
            node2.width = void 0;
          }
        }
        // ===== end mermaid-rounded =====
        if (node2.stereotype !== void 0) {`
);

// ---------------------------------------------------------------------------
// 5d. 状态图圆角与流程图统一（上游 rx 5 / neo 3）
// ---------------------------------------------------------------------------
js = replaceOnce(
  js,
  '状态图圆角统一为 radius',
  `      rx: node2.look === "neo" ? 3 : 5,`,
  `      rx: __mrStyle(node2).radius,`
);

js = replaceOnce(
  js,
  'label 无条件居中',
  `    div.attr("xmlns", "http://www.w3.org/1999/xhtml");`,
  `    // ===== mermaid-rounded: 无条件居中 =====
    // 方框按文字收缩后（如 55px），label div 仍是 120px 宽；不居中文字会贴左边，
    // 表现就是「状态图文字错位」。
    div.style("text-align", "center");
    div.attr("xmlns", "http://www.w3.org/1999/xhtml");`
);

// ---------------------------------------------------------------------------
// 6. 多边形（六边形/梯形/平行四边形）：转角柔化，保持 polygon 元素不动，
//    避免打断主题里 `.node polygon` 的填充/描边选择器。
// ---------------------------------------------------------------------------
js = replaceOnce(
  js,
  'polygon 转角柔化',
  `    ).attr("class", "label-container").attr("transform", "translate(" + -w4 / 2 + "," + h3 / 2 + ")");`,
  `    ).attr("class", "label-container").attr("stroke-linejoin", "round").attr("transform", "translate(" + -w4 / 2 + "," + h3 / 2 + ")");`
);

fs.mkdirSync(DIST_DIR, { recursive: true });
const outJs = path.join(DIST_DIR, 'mermaid.rounded.js');
fs.writeFileSync(outJs, js);
log(`\n产出 ${path.relative(ROOT, outJs)}  (${(js.length / 1024 / 1024).toFixed(1)} MB, 源 ${(originalBytes / 1024 / 1024).toFixed(1)} MB)`);

// ---------------------------------------------------------------------------
// 5. 压缩（可选）：只是体积优化，不影响行为
// ---------------------------------------------------------------------------
if (!argv.includes('--no-minify')) {
  const outMin = path.join(DIST_DIR, 'mermaid.rounded.min.js');
  try {
    execFileSync(
      'npx',
      ['--yes', 'esbuild@0.25.10', outJs, '--minify', '--target=es2020', '--legal-comments=none', `--outfile=${outMin}`],
      { stdio: ['ignore', 'ignore', 'inherit'], cwd: ROOT }
    );
    log(`产出 ${path.relative(ROOT, outMin)}  (${(fs.statSync(outMin).size / 1024 / 1024).toFixed(1)} MB)`);
  } catch (e) {
    log(`\n压缩失败（不影响使用，dist/mermaid.rounded.js 已经可用）：${e.message}`);
    log('手动压缩：npx esbuild dist/mermaid.rounded.js --minify --outfile=dist/mermaid.rounded.min.js');
  }
}

log('\n完成。示例页：demo/index.html（引用 ../dist/mermaid.rounded.min.js）');

// 用本机 Chrome 真实渲染 demo，量尺寸并截图；任何渲染错误都会失败退出。
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// MR_ROOT 允许在缺少本地 node_modules 时（例如借用别的项目跑 playwright）指定仓库根目录
const ROOT = process.env.MR_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = 'file://' + path.join(ROOT, 'demo', 'index.html');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1240, height: 1100 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });

await page.goto(demo, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForFunction(() => window.__done === true, { timeout: 40000 }).catch(() => {});
await page.waitForTimeout(600);

const data = await page.evaluate(() => ({
  rows: [...document.querySelectorAll('#tbl tbody tr')].map((tr) =>
    [...tr.children].map((td) => td.textContent.trim())
  ),
  hero: document.getElementById('hero').textContent.replace(/\s+/g, ' ').trim(),
  svgs: document.querySelectorAll('.cv svg').length,
}));

console.log(JSON.stringify(data, null, 1));
if (errors.length) { console.error('ERRORS:', errors); }
await page.screenshot({ path: path.join(ROOT, 'demo', 'preview.png'), fullPage: true });
await browser.close();

const bad = errors.length > 0 || data.svgs < 4;
console.log(bad ? '\nFAIL' : '\nOK  截图: demo/preview.png');
process.exit(bad ? 1 : 0);

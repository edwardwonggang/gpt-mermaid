# Changelog

## 1.0.2 — 2026-11-17

### Improved

- Directional connectors receive distinct right, down, left and up colors from rendered SVG geometry.
- Directional arrowheads share the same 10:8 depth-to-base filled-triangle geometry. The tip is the marker reference point; ER cardinalities, UML diamonds and lollipops retain their native shapes.
- Restore full layout endpoints before intersecting the actual SVG contour, including rounded nodes, circles and special shapes; sequence arrows meet lifelines and activation bars.
- Center English node titles without flattening nested transforms or ER attribute columns. Restore journey SVG fallback labels and visible section titles.
- Sequence counters use readable white text and are centered on the source lifeline or activation bar.
- Node borders, connectors and label outlines use stronger contrast.
- ELK remains enabled for flowcharts; other diagram types use Mermaid's native layout. This fixes `mindmap` rendering, which failed under a forced ELK layout.
- `demo/compatibility.html` 去重后包含 101 个样例、22 种图表，提供自动折返与原布局对照。
- Error fallback now hides a failed image element so browser broken-image UI does not appear beside the actionable error message.
- The fullscreen viewer zooms with the ordinary mouse wheel around the pointer; inline page scrolling is preserved.
- 胶囊标签按所属边最终路径重新定位；短折弯、自环与拥挤端口使用同一套路由校准。
- 同向同样式实线共享汇入线段及箭头；原始逻辑边与标签保留，虚线和不同语义端点保持独立。
- C4 文字按实际背景校准对比度，穿节点或系统边界标题的关系改走避障路径。
- 新增 `adaptiveLayout`：长链与连续分支组支持横向换行、纵向换列；复杂反馈和子图明确保留原布局。
- 扩展状态图和类图的端口、箭头与边标签避障；运行时直接保留语义节点和边端点身份，复杂类图不再依赖重新解析后的临时DOM编号。
- 新增100张图、624个三角的局部交叠验收；保留8倍端口截图与64倍尖端像素验证。节点拖动仅完成调研，暂不实施。
- 修复标签强制横通道造成的反向重走和冗余折弯；保留可用原线，按完整路径评估候选。
- 新增通用最终SVG交叉检测、其它边硬避障、整组通道调整及有限间距重试，不按样例特判。
- `renderSvg()` 新增 `routing` 诊断；兼容页明确显示未解交叉。复杂密图仍有边界，不将渲染成功冒充零交叉。
- 修复虚线接头空白、短曲线过裁及浅角三角被合流框覆盖；原生自环与完整标签联合避让，新增实际三角接触检查。
- 同侧进出端口不强制共享主干；新增结构化平面候选，修复平行关系和可平面ER残留交叉，同步更新重布局画布。
- 替换13个过度串行或人工极端样例，新增15个独立方向/字体/改名业务变体，并增加独立 WebKit 手机回归入口。
- 全屏支持单指平移、双指围绕触点缩放与连续抬指切换；修复倍率边界漂移和手机横屏裁切。行内保留页面触摸滚动，粗指针按钮扩大至44px。
- frontmatter 只在文档首部解析，跳过 YAML 块标量中的伪闭合线；流程图分类读取 frontmatter 后的真实图种声明，`title` 中出现 `flowchart` 不会误判普通图。
- 安全过滤仅保留 frontmatter 的 `title`/`displayMode`；阻止 `securityLevel`、`click`、非法 `%%{init}%%` 和 frontmatter `config` 注入。
- SVG allowlist 删除 `ping`、事件属性、`srcset`、非白名单 XLink 命名空间和外部 `href`/`src`；SVG `<style>` 按根节点 ID 作用域化，并移除全局 at-rule 和不安全 `url(...)`。
- C4 以结构化关系建立完整 `expected` 清单；未匹配或跳过的关系不会假报清零。最终路径检测覆盖单边自交，同一节点上的多个自环分配独立 lane。
- Journey 任务文字按词换行；超长无空格单词按字符切分，超过行数上限时保留全部内容并用 `textLength` 适配，不再截断。
- 全屏增加 html/body 滚动锁与滚动位置恢复；菜单支持方向键、Home/End/Escape 和焦点恢复，复制失败使用可见 live region，全屏缩放状态通过 `aria-live` 播报。
- 新增 `AbortSignal`、渲染超时、运行时超时和严格串行调度；排队任务可被取消，超时任务会释放队列。行内长图在视口内独立滚动，避免撑高整页。
- 补齐 ESM/CJS/UMD 类型声明与四种 TypeScript 消费方式；CI 增加 dist 同步、runtime checksum、API 类型、Chromium、WebKit、npm tarball 安装和入口冒烟门禁。

### Verification status

- 本地无浏览器门禁中，`npm test` 100 项、`npm run test:api` 5 项和四套 API 类型检查通过；tarball 临时安装后的 ESM/CJS/UMD 冒烟通过。
- Chromium 原生触摸输入与 WebKit 26.5 手机模拟的合成触屏状态机报告均为 14 项；物理 iPhone 与 Safari 原生多指仍未实测。
- 上述结果描述当前工作树和 CI 门禁，不代表所有修复已发布到 GitHub Pages、npm 或物理 iPhone。

## 1.0.1 — 2026-11-16

### Fixed

- State-diagram labels no longer inherit a hard-coded `translate(-60, …)`; node text is centered with `text-anchor="middle"`.
- `WAIT_CONDITION` and other English state names remain on one line by using a state-specific wrapping width.
- GPT preset node borders, transitions and edge-label strokes are darker and use a 1.2px stroke.

## 1.0.0 — 2026-11-14

### Added

- Complete browser framework API: `configure`, `render`, `renderSvg`, `mount`, `renderAll`, `autoRender`, `destroy`.
- UMD, ESM and CommonJS builds.
- ChatGPT-style inline viewer with floating action menu and fullscreen dialog.
- Zoom, pan, fit, copy source, copy PNG and download SVG actions.
- Built-in `gpt`, `github`, `linear`, `tokyo` and `nord` presets.
- SVG sanitization and strict Mermaid source filtering.
- Playwright end-to-end test, Node unit tests and GitHub Actions CI.
- Public documentation, contributing guide, security policy and third-party notices.

### Preserved

- `gpt-mermaid.runtime.min.js`: patched Mermaid 12.3.0 runtime with rounded nodes and self-sized decision boxes.
- Legacy theme and arrow helper files.
- Legacy comparison demo at `demo/legacy-rounded.html`.

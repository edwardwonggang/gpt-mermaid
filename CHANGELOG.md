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

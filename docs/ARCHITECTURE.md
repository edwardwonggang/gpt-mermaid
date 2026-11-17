# Architecture

```text
HTML source
   │
   ▼
GPTMermaid.renderAll()
   │  source sanitization
   ▼
gpt-mermaid runtime (patched Mermaid 12.3.0)
   │  ELK layout + rounded node pipeline
   ▼
SVG theme and edge capsules
   ▼
SVG allowlist sanitizer
   │
   ▼
Detached measurement host
   │  real contour intersections, uniform triangles, title and counter alignment
   ▼
SVG allowlist sanitizer
   │
   ▼
Blob URL → <img> → zoom/pan/fullscreen UI
```

## Layers

1. `src/defaults.js`: presets and Mermaid theme variables.
2. `src/sanitize.js`: source filtering and SVG allowlist.
3. `src/render.js`: runtime loading, Mermaid initialization and SVG post-processing.
4. `src/ui.js`: DOM presentation, interactions and export actions.
5. `src/factory.js`: stable public API shared by UMD, ESM and CJS builds.
6. `src/svg-labels.js`: measured node titles, visible journey labels and sequence counters; ER attribute columns remain under the layout engine.
7. `src/svg-adaptive.js`：从结构化拓扑和测量尺寸规划安全折返，连续分支组整体搬移。
8. `src/svg-routing.js`：端口间距、短折弯、自环、共享汇入和正交避障；保留逻辑边及身份。
9. `src/svg-c4.js`：C4 关系映射与非目标节点、边界标题避障。
10. `src/svg-shaft.js`：按三角底部裁切线杆，保留虚线相位；共享末端也继承主箭头深度。
11. `src/path-intersections.js`：纯几何线段穿越、接触与重叠判定。
12. `src/svg-crossings.js`：读取最终路径命令，细分曲线并检测边对交叉；有界避障、整组调整、间距重试及结果报告。

The runtime is intentionally loaded lazily. A page that never renders a Mermaid
diagram does not pay the 5.4 MB runtime cost.

## Invariants

- Only one rendered `<img>` exists per mounted diagram.
- The source `<pre>` remains in the DOM but hidden, so copy and retry stay possible.
- Inline ordinary wheel events bubble to the page; `Ctrl+wheel` zooms inline. In the fullscreen viewer, ordinary wheel zooms around the pointer.
- A fullscreen viewer moves the existing stage, never creates a second image.
- `securityLevel: "strict"` and the SVG allowlist are non-negotiable.
- SVG is sanitized before temporary document attachment, and the measurement host is removed in `finally`.
- Arrow height is measured from base midpoint to tip, along its direction. Every triangle uses the same 10:8 geometry and scales uniformly.
- Layout `data-points` identifies connection anchors; browser `isPointInFill()` identifies actual contour intersections. A bounding box alone does not prove contact.
- 流程节点归属使用 `db.getData().nodes/edges`，不解析 ID 子串或匹配标签文字；边重排后再次验证非目标节点碰撞。
- 后处理顺序：文字校准 → 可选折返 → 路由整理 → 真实轮廓贴边 → 标签投影 → 通用交叉避障与必要贴边复核 → 画布尺寸 → 方向色和箭头 → 线杆裁切 → 最终交叉报告。
- 折返不改图源、不镜像文字。反馈、跨层和子图等无安全切口的情况明确保留原布局。
- 不以图名、节点文字或源码关键词选择避障分支。原路径可用时保留；候选必须检查完整路径的自交、重走、长度及折弯。
- 已放标签立即移动实际DOM，下一条边必须读取新位置。特殊端点留白和首尾切线不可随正交端口投影丢失。
- 零交叉结果只覆盖被检测的关系线，`not-applicable` 与 `unresolved` 不可当作 `clear`。有限搜索的失败不是图不可平面化的证明。

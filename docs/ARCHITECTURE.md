# Architecture

```text
HTML source
   │
   ▼
GPTMermaid.renderAll()
   │  frontmatter boundary + source sanitization
   ▼
gpt-mermaid runtime (patched Mermaid 12.3.0)
   │  serial render queue + abort/timeout guard
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
2. `src/sanitize.js`: frontmatter/source filtering, SVG allowlist and scoped style sanitization.
3. `src/render.js`: Mermaid初始化、各图种调度、主题和SVG后处理；状态图调用独立约束布局。
4. `src/ui.js`: DOM presentation, interactions and export actions.
5. `src/factory.js`: stable public API shared by UMD, ESM and CJS builds.
6. `src/svg-labels.js`: measured node titles, visible journey labels and sequence counters; ER attribute columns remain under the layout engine.
7. `src/svg-adaptive.js`：从结构化拓扑和测量尺寸规划安全折返，连续分支组整体搬移。
8. `src/svg-routing.js`：端口间距、短折弯、自环、共享汇入和正交避障；保留逻辑边及身份。
9. `src/svg-c4.js`：C4 关系映射与非目标节点、边界标题避障。
10. `src/svg-shaft.js`：按三角底部裁切线杆，保留虚线相位；共享末端也继承主箭头深度。
11. `src/path-intersections.js`：纯几何线段穿越、接触与重叠判定。
12. `src/svg-crossings.js`：读取最终路径命令，细分曲线并检测边对交叉；有界避障、整组调整、间距重试及结果报告。
13. `src/planar-layout.js`：平坦少量关系的结构化外围环/重心候选；只返回非退化零交叉坐标，实际矩形和标签由SVG层另验。
14. `src/runtime-guard.js`：统一超时、`AbortSignal` 与严格串行调度；排队项可取消，执行槽仅在真实任务结束后释放。
15. `src/runtime-loader.js`：按document/URL共享下载、捕获所属script的实际导出、失败清理及重试；不隐式接管任意全局Mermaid。
16. `src/state-model.js`、`state-layout.js`：同次解析语义、条件框、固定中点、引线预留、反馈边和复合状态统一布局；复用runtime已内嵌ELK。
17. `src/state-constraints.js`：只读验证语义完整性、端口、直段、障碍和共享规则；`state-svg.js`消费冻结结果一次绘制，条件关系显示为两段path且保留同一owner。

The runtime is intentionally loaded lazily. A page that never renders a Mermaid
diagram does not pay the 5.4 MB runtime cost.

The default guards are 12 seconds for a render and 15 seconds for runtime loading.
`renderTimeoutMs` and `runtimeTimeoutMs` override them per call. A timeout or abort
rejects the wait with `TimeoutError` / `AbortError`。实际执行仍在进行时保持串行槽，
后续排队请求也有截止；不能因为等待超时就在同一个可变runtime并发执行下一任务。
永久挂死的第三方执行需要可销毁上下文才能自动恢复成功，本实现不伪造恢复结果。

## Invariants

- Only one rendered `<img>` exists per mounted diagram.
- 独立UI原源码保存与主站接管策略分别管理；主站不保留可被第二个扫描器接管的隐藏语言源码DOM，复制和重试来自实例记录。
- Inline ordinary wheel events bubble to the page; `Ctrl+wheel` zooms inline. In the fullscreen viewer, ordinary wheel zooms around the pointer.
- A fullscreen viewer moves the existing stage, never creates a second image.
- 全屏触屏使用前两根活动指针的固定手势基线计算缩放/平移，成员变化时重建基线；禁止逐事件夹紧后累乘倍率，否则边界处等距平移会误缩放。行内触屏不捕获，保留页面滚动/缩放。
- 全屏stage高度由查看器容器决定，不保留竖屏像素高度；复位、关闭、销毁和后台失焦清理手势，销毁注销全局监听。
- `securityLevel: "strict"` and the SVG allowlist are non-negotiable.
- Frontmatter is recognized only at byte zero (after an optional BOM). It keeps only
  `title` and `displayMode`; JSON/flow-style `config`, unknown keys and unsafe init
  directives are dropped. Flowchart classification reads the diagram declaration
  after frontmatter, not keywords inside YAML or a scalar title.
- SVG sanitization removes event attributes, `ping`, `srcset`, unsafe `href`/`src`,
  non-XLink namespaced links and remote `url(...)`. Local fragment `xlink:href` is
  allowed. `<style>` is scoped to a safe root ID; global at-rules are removed.
- SVG is sanitized before temporary document attachment, and the measurement host is removed in `finally`.
- Arrow height is measured from base midpoint to tip, along its direction. Every triangle uses the same 10:8 geometry and scales uniformly.
- Layout `data-points` identifies connection anchors; browser `isPointInFill()` identifies actual contour intersections. A bounding box alone does not prove contact.
- 流程节点归属使用 `db.getData().nodes/edges`，不解析 ID 子串或匹配标签文字；边重排后再次验证非目标节点碰撞。
- 状态图端口固定在四边中点，使用40单位控制引线保证圆角后至少32单位法向路径。
  同向同侧在框外分叉/汇合，只共享可证明连续的首/尾段；共享末端显示一个三角，但保留每条逻辑边和标签。
  复合状态外框来自`g.statediagram-cluster[data-id]`，内部路由不把自己的祖先填充区当障碍。
  每次改路清除旧标签预留点；标签位置必须属于当前路径。
- 非状态图仍保留原后处理；状态图为文字/尺寸测量 → 语义与条件框统一布局 → 全约束验证 → 绘制 → 实际轮廓贴边 → 方向色、箭头与裁线 → 最终几何报告。不能再次调用旧标签投影或通用改路破坏已验收几何。
- 折返不改图源、不镜像文字。反馈、跨层和子图等无安全切口的情况明确保留原布局。
- 不以图名、节点文字或源码关键词选择避障分支。原路径可用时保留；候选必须检查完整路径的自交、重走、长度及折弯。
- 已放标签立即移动实际DOM，下一条边必须读取新位置。特殊端点留白和首尾切线不可随正交端口投影丢失。
- 箭头验收包含三角整体不被遮、尖端贴所属轮廓、线杆接触三角三项。曲线裁线用实际三角交界，不把深度当弧长；仅接头可补虚线空白相位。
- C4 先记录结构化 `expected` 关系数；只有完整匹配的关系线才进入零交叉结论，未匹配和 skipped 必须保持 `unresolved`。
- 最终交叉检测包含单边自交；同一节点上的多个自环必须分配不同 lane，不能因端点相同而重叠。
- Journey 任务按词换行；超长无空格单词按字符切分，超出目标行数时保留全部内容并用 `textLength` 适配，禁止截断。
- 全屏打开时锁定 html/body 滚动并保存位置，关闭、销毁和失败路径必须恢复；菜单键盘操作、焦点恢复、错误 live region 和缩放 `aria-live` 属于交互契约。
- 行内长图的高度上限为 `min(720px, 80vh)`；图片保持完整尺寸，由 stage 自身滚动。全屏 stage 始终跟随查看器实际高度。
- 零交叉结果只覆盖被检测的关系线，`not-applicable` 与 `unresolved` 不可当作 `clear`。有限搜索的失败不是图不可平面化的证明。

## Verification and release gates

CI is split into four isolated jobs:

1. `unit-api`: rebuild, verify committed `dist/`, syntax-check, pin the Mermaid runtime
   checksum, verify test registration, run `npm test`, `npm run test:api` and
   `npm run test:api-types`, then run `node:test` files outside the `*.test.mjs` glob.
2. `chromium-e2e`: rebuild, verify `dist/`, install Chromium and run the complete E2E.
3. `webkit-mobile`: independently install WebKit and run `test/webkit-mobile.mjs`.
4. `package`: rebuild, verify `dist/`, run `npm pack --dry-run`, install the generated
   tarball in an isolated consumer, and smoke ESM/CJS/UMD entries.

Passing these gates does not imply that the working tree is already deployed to
GitHub Pages, npm or a physical phone. Browser evidence must match the current source,
and a missing WebKit touch report remains an explicit pending item.

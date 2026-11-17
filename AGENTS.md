# gpt-mermaid 工程约定

- 源码在 `src/`，通过 `scripts/build.mjs` 生成 UMD、ESM、CJS；修改后同步构建受版本控制的 `dist/`。
- `src/render.js` 负责串行渲染、主题、箭头与真实轮廓端点；`src/svg-labels.js` 负责文字与序号定位；`src/ui.js` 负责预览和导出。
- 保留公共 API、严格源码过滤及 SVG 白名单；上游 SVG 必须净化后才能挂载测量，离屏容器在 `finally` 移除。
- 三角形的高指底边中点到尖端、沿箭头方向的距离。统一 `10:8` 高底比，仅允许同比缩放；尖端必须与 marker 参考点重合。
- 连接归属使用布局元数据，接触点使用实际轮廓；不能用附近节点或包围盒内点假报贴边。
- 布局整理按结构化节点/边 ID 绑定，端口改动后重新验证避障；兼容实线共享末端仍保留每条边与标签，每条共享线杆都要裁到主三角底部。
- 交叉检测读取最终路径，共享仅豁免连续目标后缀；不得按图名/文字特判。`unresolved`、`not-applicable` 不能当作零交叉，特殊端点改路保留实际偏移和切线。
- 折返只在可证明安全的切口进行，节点文字不镜像；复杂反馈、跨层和子图保留原布局并说明原因，不能为固定画布改写拓扑。
- 标题校准不能抹平子变换、ER 属性列和类图成员的合法左对齐。
- 验收使用已有 E2E 的单个 Chromium/上下文；浏览器版本跟随锁定依赖，缓存放项目 `.ms-playwright/`。
- 验证入口：`npm run build`、`npm run check`、`npm test`、`PLAYWRIGHT_BROWSERS_PATH="$PWD/.ms-playwright" npm run test:e2e`。
- 过程和一次性结果写 `docs/` 或提交正文，规则文件不写进度。架构见 `docs/ARCHITECTURE.md`。

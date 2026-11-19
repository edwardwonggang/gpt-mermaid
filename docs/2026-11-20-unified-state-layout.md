# 状态图统一约束布局与运行库生命周期

本次以统一模型替换状态图多轮SVG修线。状态节点、条件框、四边中点、40单位引线和障碍共同进入布局；条件关系展开为两条显示路径，保存原关系owner，原业务节点和关系不增减。

## 原因和改动

旧版原图虽然报告`clear/0交叉`，9个条件标签中5个偏心、4个覆盖拐点。标签中心在线上不是框端口合格，后置标签投影与反复改路会破坏前序结果。

- `state-model`在业务图上识别反馈边，再展开标签；固定端口放在框外引线预留区。有限候选只调整环路/反馈侧并整体重算，所有候选执行同一约束。
- `state-layout`自内向外计算复合状态及并行区域，注释按结构归属和指定左右方向共同占位。
- `state-constraints`只读验证原关系、标签、箭头、中点、引线、障碍、自交、共享端段。额外关系、缺段、NaN和包含环均拒绝，回执按ID配对。
- `state-svg`保留同次原生绘制的文字、主题和特殊形状，冻结几何后一次绘制；每个条件框连接两条实际path，避免多子路径重复marker与dash相位问题。
- 固定runtime公开其内嵌ELK能力，并返回同次解析的状态模型，不重新解析匹配新domId。
- `runtime-loader`按document/URL管理共享下载，捕获当前script实际导出，失败清理后重试；`load()`成为真实公开API。执行超时只结束等待，实际任务未结束时保持同runtime串行槽。

## 验证

工作目录为本仓库，浏览器缓存使用`.ms-playwright`。证据位于`output/unified-layout-20261119`及现有`output/playwright`：

- `npm test`：181项通过；统一状态模型44项包含独立反例。
- `npm run check`、四组`test:api-types`、实际包安装ESM/CJS/UMD消费通过。
- Chromium完整图库100图、124标签、446三角、15个独立变体通过；14项原生触屏输入检查通过。
- WebKit手机视口100图、15变体、tap及14项合成触点检查通过；没有冒充真机或原生多指验收。
- 原图保持7状态节点、10逻辑关系、9标签；19显示路径、38个状态/条件端点分别验证中点及法向直段。
- 新共享汇入减少两个重复三角，已逐图核对逻辑关系、标签及实际共享后缀，不能只改计数基线。

```sh
rtk npm test
rtk npm run check
rtk npm run test:api-types
rtk zsh -lc 'PLAYWRIGHT_BROWSERS_PATH="$PWD/.ms-playwright" npm run test:e2e'
rtk zsh -lc 'PLAYWRIGHT_BROWSERS_PATH="$PWD/.ms-playwright" node test/webkit-mobile.mjs'
rtk node scripts/verify-runtime-integrity.mjs
rtk node scripts/verify-package.mjs
```

## 边界与恢复

尚未建立门户模型的跨层直连返回`unsupported`，不删除关系假报成功；搜索失败或预算结束不证明图不可布局。交叉报告仍区分`clear/unresolved/not-applicable`。永久挂死第三方runtime要靠独立可销毁上下文才能自动恢复成功，本次只保证后续等待有界且不并发串扰。

主站同步及真实页面验收由`my-ai-hub`记录；独立库测试不代表主站已加载。回退须将源码、dist和runtime一并回到同一提交，再同步固定目录；不清空用户会话、认证或知识正文。

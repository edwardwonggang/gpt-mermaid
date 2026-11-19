# 状态图独立端口与紧凑布局

用户确认按第二张参考图替换唯一中点/共享干线契约。实现保留同次解析、统一布局、只读验收和一次绘制，修改的是端口与空间模型。

## 结果与机制

原业务图保持7状态节点（含初始点）、10业务关系、9条件标签、19显示路径和38连接端；每条业务关系现在拥有独立箭头。独立库真实Chromium渲染约509×975，旧版约700×1801。主站部署结果另由其真实页面报告证明。

- `state-ports.js`按每条显示段的source/target建立独立port ID。同侧入出端统一排序，以18单位间距围绕中心分配；单端口居中。按实际圆角、箭头底宽和线宽检查容量，仅增大所需方向的框，不缩放文字。
- `state-model.js`仅在实际有连接的侧预留局部直段。可见线杆16、圆角4、描边余量和目标箭头分别预算，层间距不重复承担引线职责。条件框仍是原关系的显示对象。
- 反馈先在业务图识别，展开条件后保留同owner方向。有限候选比较违反项、交叉、回路分侧、面积和弯折；最长返回回路与较短回路采用不同通道偏好，不用节点名/条件文字特判。
- `state-svg.js`读取浏览器computed圆角，框扩大时只调整形状、文字保持原尺寸。没有共享箭头分组和删除marker逻辑。
- runtime补丁仅在状态图中用原edge.id命名自环辅助节点和段，解决同一状态多个自环在上游测量阶段互相覆盖的问题。
- `state-constraints.js`只读检查独立居中端口组、容量、直段、障碍、共线重合与容器包含关系。负容量不能截成零，否则小框的居中端口会假通过。

运行库仍为Mermaid12.3.0，5,656,093字节，SHA-256：
`32e4a472d8d65ef573ef221b7c9f25bc2bc66ec74a8ff9ba21d94fa5280822e9`。

## 验证

工作目录为独立库根目录，浏览器缓存使用项目`.ms-playwright`：

```sh
rtk npm test
rtk npm run check
rtk npm run test:api-types
rtk node scripts/verify-runtime-integrity.mjs
rtk node scripts/verify-package.mjs
rtk node scripts/verify-ci-coverage.mjs
rtk zsh -lc 'PLAYWRIGHT_BROWSERS_PATH="$PWD/.ms-playwright" node test/e2e.mjs'
rtk zsh -lc 'PLAYWRIGHT_BROWSERS_PATH="$PWD/.ms-playwright" node test/webkit-mobile.mjs'
```

- 单元/API215项通过，包括独立端口分配13项、最终SVG纯数据门禁21项及原有状态模型反例。
- Chromium100张图库、454个三角、124标签、15既有变体、11新增状态变体通过；14项浏览器原生触摸输入检查通过。
- WebKit手机视口100图、15既有变体及11新增状态变体通过；14项合成触点状态机不当作真机多指或原生滚动。
- 新变体覆盖四方向、两种字体、两个带标签/无标签自环、七分支。原例另外检查700×1000画布预算、全部10箭头和38端点。
- 类型四组、包消费、运行库来源、CI覆盖、8项额外静态回归通过。

证据：`output/independent-ports-20261120/`的图形、模型回归与日志；`output/playwright/independent-state-ports/`及`output/playwright/webkit/independent-state-ports/`的11组SVG/JSON；完整图库在`output/playwright/`现有报告目录。旧中点断言已按新规则修改，未通过扩大误差容限掩盖失败。

## 波及与边界

直接影响状态图布局、轮廓贴合、箭头/标签绘制及其独立检查器。公共API、加载/超时、单图展示、源码复制、安全净化和非状态图后处理保持既有契约；全图库验证其它图种箭头计数不变。状态图恢复的8个独立箭头来自choice1、fork/join2、long5。

特殊圆/菱形仍只使用合法轴向极点；端口容量无法满足时明确unsupported。跨层连接尚无门户模型，仍明确unsupported。搜索有界，未找到无交叉解不等于证明无解；最终报告保留真实状态。原例的紧凑预算不是任意规模图的固定画布上限。

回滚独立库固定提交、主站配对引用和reader HTML/manifest，不清用户业务数据，不重启用户执行核心。

## 主站净化后的验收

主站删除data-points后，最终SVG检查器仍须直接读取实际d中的M/L/Q，验证正交直段及局部圆角。存在控制元数据时额外检查格式和端点，缺失时不能补回另一份原图形。新增反例确认损坏控制点与实际斜段仍拒绝。

真实主站固定发布`8d520773cdf89ed8e6cda3b037e155f1e0af79b8`，记录位于`../my-ai-hub/output/playwright/mermaid-unified-layout-20261120050751-iIP0YE/`。桌面/手机、失败重试、13秒慢下载、离线阅读器和完整查看器手势回归通过；真实最终图约509×975、10独立箭头。后续检查器修订仅影响测试，不改变该固定发布字节。

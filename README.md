# mermaid-rounded

把 **mermaid 12.3.0** 的流程图判定框（`B{条件}`）从菱形改成**圆角矩形**，并给所有方框加统一圆角、让方框宽度真正跟着文字走。

不用重新构建整个 mermaid 仓库 —— 直接对官方 `dist/mermaid.js` 做锚点替换，产出可用的 bundle。

## 效果（实测，非估算）

| 样例 | 官方 12.3.0 | 本仓库 | 面积 |
| --- | --- | --- | --- |
| 判定框 · 6 字 | `polygon` 164×164 | `rect` 120×40 · rx=8 | **−82%** |
| 判定框 · 33 字 | `polygon` 263×263 | `rect` 228×59 · rx=8 | **−81%** |
| 普通方框 | 152×44 · 直角 | 120×44 · rx=8 | 宽度随文字 |

![对比预览](demo/preview.png)

## 改了什么

补丁全部集中在 `scripts/apply-patch.mjs`，共 6 处，每处都带断言（上游写法一变就报错，不会静默产出坏包）：

1. **判定框菱形 → 圆角矩形**
   上游 `question()` 里 `s = 文字宽 + 文字高`，所以判定框**永远是正方形**，33 个字就是 263×263 的空心大方块，一个判断吃掉整张图。改为走 `drawRect`，宽度 = 文字宽 + 左右内边距。

2. **所有方框圆角**
   `squareRect()` 上游硬编码 `rx: 0, ry: 0`（直角），改为统一 `rx = 8`。

3. **宽度真正随文字**
   上游把 label div 设成 `display:table` + `max-width:wrappingWidth`（默认 120），被拉满成 120px，于是「提」和「提交申请」都是 152px 宽 —— 这才是"两个字也显示得非常长"的真凶。补丁注入 `!important` 规则让它收缩，并在 `drawRect` 里改用内层 `.nodeLabel` 的实测宽度。

4. **内边距收敛**：`nodePadding * 2`（20px/侧）→ 12px/侧，小方框不再被拉成条。

5. **最小宽度**：极短标签（「是」）不至于缩成一个点（默认 48px）。

6. **多边形转角柔化**：六边形/梯形等保留原几何，只把转角连接改成圆弧（保持 `polygon` 元素，不打断主题的 `.node polygon` 选择器）。

## 用法

```bash
# 1) 生成（会自动下载官方 12.3.0 到 vendor/，再打补丁 + 压缩）
node scripts/apply-patch.mjs

# 产物
#   dist/mermaid.rounded.js       未压缩，可读，便于对照
#   dist/mermaid.rounded.min.js   压缩版，5.4 MB
```

```html
<script src="dist/mermaid.rounded.min.js"></script>
<script>
  mermaid.initialize({ startOnLoad: true, theme: 'base' });
</script>
```

运行时可调（不用重新打补丁）：

```js
window.__MERMAID_ROUNDED = { radius: 12, paddingX: 16, paddingY: 12, minWidth: 56 };
```

## 验证

```bash
node scripts/verify.mjs
```

用本机 Chrome 真实渲染 `demo/index.html`（左官方 / 右本版），量出尺寸、断言无 console/page error，并输出 `demo/preview.png`。

## 已知边界

- **只支持 12.3.0**。锚点依赖该版本的具体写法；升级上游时 `apply-patch.mjs` 会直接报「锚点命中 0 次」，需要重新对照。
- **多边形不是真圆角**。六边形/梯形只做了转角柔化（`stroke-linejoin: round`），真圆角要把 `polygon` 改成 `path`，会打断主题里 `.node polygon` 的填充/描边规则，暂未做。
- **泳道图**的正交路由仍按 `shape === 'question'` 当菱形处理（`router.ts`），普通流程图不受影响。
- `dist/` 下的文件是构建产物，体积大；需要可读版本用 `--no-minify` 生成。

## 参考

美化思路借鉴了 [lukilabs/beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid)（Craft 团队）：圆角节点、紧凑内边距、ELK 布局、以及"由内容决定节点尺寸"的做法。

## 许可

补丁脚本与示例：MIT。
`vendor/mermaid-12.3.0.js` 与 `dist/*` 是 mermaid 的衍生物，遵循 mermaid 自身的 MIT 许可。

## 汇合边合并成一根（dist/mermaid-rounded.arrows.js）

多条边汇入同一节点时，mermaid 会给每条边各画一个箭头，并排挤在节点上方。
本脚本在渲染后**把线也合并**：按目标节点分组，把各条边的「角点 + 终点」一起搬到同一条
轴线上（TD 改 x、LR 改 y），横段延长、竖段重合，自然形成一根干线，只保留一个箭头。
拐角保持直角，不产生斜线，也不改 marker 方向。

> 早期版本只挪终点、不挪角点，会把直角折线拽成斜线、把箭头带歪；还对 svg 字符串做了
> DOMParser→XMLSerializer 往返，foreignObject 里的 XHTML 闭合标签被破坏，整张图解析报错。
> 现在的实现只在活 DOM 上改 `d` 的最后两对坐标，不序列化整段 svg。

```html
<script src="dist/mermaid.rounded.min.js"></script>
<script src="dist/mermaid-rounded.arrows.js"></script>
```

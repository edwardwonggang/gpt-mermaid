# API reference

## `GPTMermaid.configure(options)`

Merges global options and returns the effective configuration.

### 长图自适应折返

```js
GPTMermaid.configure({
  adaptiveLayout: {
    enabled: true,
    maxWidth: 1200,
    maxHeight: 1000,
    gap: 80
  }
});
// 单次保留原布局：
const original = await GPTMermaid.renderSvg(source, { adaptiveLayout: false });
```

阈值使用 SVG 布局单位。LR/RL 超宽时换行，TD/TB/BT 超长时换列；节点和文字只平移，连线随阅读顺序折返。
连续分支组只有在安全切口处才能换行或换列。反馈环、跨层边、子图和不可分割的大组保留原布局。
返回 SVG 上的 `data-gptm-adaptive` 为 `applied / unchanged / unsupported`，`data-gptm-adaptive-reason` 说明原因。
页面容器变化仍由既有缩放适配，不会在用户滚轮操作时重新安排节点。

## `GPTMermaid.renderSvg(source, options)`

Returns:

```js
{
  svg: "<svg ...>",
  width: 840,
  height: 520,
  source: "flowchart TD\n..."
}
```

`source` is the sanitized source, not necessarily the original string.

## `GPTMermaid.mount(target, source, options)`

Accepts an element or a CSS selector. The target is replaced by a `.mgpt-diagram`
figure. Returns a diagram controller asynchronously.

## `GPTMermaid.renderAll(root = document, options)`

Finds:

```css
pre > code.language-mermaid
pre > code.lang-mermaid
[data-gpt-mermaid-source]
```

and replaces each source with a diagram. Returns a promise resolving to the
diagram controllers.

## Diagram controller

| Member | Description |
| --- | --- |
| `figure` | Root DOM figure. |
| `stage` | Zoom/pan stage. |
| `image` | Rendered SVG image element. |
| `destroy()` | Release observers, blob URL and DOM. |
| `fit()` | Reset zoom and pan. |
| `zoomIn()` / `zoomOut()` | Adjust zoom by 1.25×. |
| `download()` | Download the sanitized SVG. |
| `copySource()` | Copy the sanitized source. |
| `copyImage()` | Copy a high-resolution PNG. |
| `expand()` | Open the fullscreen viewer. |

Fullscreen diagrams zoom with the ordinary mouse wheel around the pointer.
Inline diagrams use `Ctrl + wheel`, preserving ordinary page scrolling.
Drag to pan; press `Home` to reset. These gestures are shared by every diagram type.

## Events

The figure exposes state through `data-state="pending|loading|ready|error"` and
`data-menu-open="true|false"`. Use MutationObserver when integrating with a
framework that needs render lifecycle hooks.

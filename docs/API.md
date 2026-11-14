# API reference

## `GPTMermaid.configure(options)`

Merges global options and returns the effective configuration.

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

## Events

The figure exposes state through `data-state="pending|loading|ready|error"` and
`data-menu-open="true|false"`. Use MutationObserver when integrating with a
framework that needs render lifecycle hooks.

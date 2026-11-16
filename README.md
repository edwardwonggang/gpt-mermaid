# gpt-mermaid

[![CI](https://github.com/edwardwonggang/gpt-mermaid/actions/workflows/ci.yml/badge.svg)](https://github.com/edwardwonggang/gpt-mermaid/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Mermaid 12.3.0](https://img.shields.io/badge/mermaid-12.3.0-ff3670.svg)](https://mermaid.js.org/)

**ChatGPT-style Mermaid for any HTML page.**

`gpt-mermaid` is a complete browser renderer and UI layer for Mermaid. It combines a patched Mermaid 12.3.0 runtime with ELK flowchart layout, rounded self-sized nodes, direction-colored connectors, tall filled triangle arrows, a floating action menu, zoom/pan, fullscreen viewing, SVG download and high-resolution PNG copy.

The default preset is **GPT**. The UMD build exposes the browser global `GPTMermaid`.

> **Not affiliated with OpenAI or the Mermaid project.** “ChatGPT-style” only describes the visual presentation. See [NOTICE.md](./NOTICE.md).

![demo](./demo/preview.png)

## Why

Plain Mermaid is powerful, but its default flowchart decisions are large diamonds and its labels are often constrained by a fixed wrapping width. `gpt-mermaid` changes the shape pipeline and adds a complete presentation layer:

- decision diamonds become rounded rectangles that grow with their text;
- ordinary rectangles get a consistent radius and tighter padding;
- ELK layered layout is used for complex diagrams;
- the `gpt` preset uses blue nodes, stronger borders and distinct connector colors for right, down, left and up directions;
- directional arrows share a 10:8 height-to-base ratio (height is measured along the arrow direction); their tips meet actual node contours. ER cardinalities, UML diamonds and lollipops retain their native shapes;
- the inline viewer has no permanent gray toolbar;
- hover the diagram to reveal the `⋯` menu and fullscreen button;
- copy source, copy a high-resolution PNG, download SVG, zoom, pan and open fullscreen.
- scroll normally to zoom in the fullscreen viewer; inline diagrams use `Ctrl + wheel` so ordinary scrolling keeps moving the page.
- 长链和连续分支组支持自动“贪吃蛇”折返；边标签贴合连线，拥挤端口、自环和 C4 可读性统一校准。

兼容性页面位于 `demo/compatibility.html`：101 个去重样例、22 种图表，提供自动折返与原布局对照。复杂反馈、跨层边和嵌套子图保留原布局，页面会显示原因。

## Quick start

```html
<link rel="stylesheet" href="./dist/gpt-mermaid.css">
<script src="./dist/gpt-mermaid.umd.js"></script>

<pre><code class="language-mermaid">
flowchart TD
  A(["客户端请求"]) --> B{"命中缓存?"}
  B -->|"是"| C(["直接返回"])
  B -->|"否"| D["调用上游模型"]
</code></pre>

<script>
  GPTMermaid.configure({ preset: "gpt" });
  GPTMermaid.renderAll();
</script>
```

`gpt-mermaid.umd.js` lazily loads `gpt-mermaid.runtime.min.js` from the same directory. The CSS is also injected automatically, so the `<link>` is optional but recommended for first-paint stability.

### CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/edwardwonggang/gpt-mermaid@main/dist/gpt-mermaid.css">
<script src="https://cdn.jsdelivr.net/gh/edwardwonggang/gpt-mermaid@main/dist/gpt-mermaid.umd.js"></script>
<script>
  GPTMermaid.renderAll();
</script>
```

For production pin a release tag or commit instead of `main`.

## ESM / npm

```bash
npm install gpt-mermaid
```

```js
import GPTMermaid, { renderAll, renderSvg } from "gpt-mermaid";
import "gpt-mermaid/css";

GPTMermaid.configure({ preset: "gpt" });
await renderAll(document);

const result = await renderSvg("flowchart LR\nA --> B");
console.log(result.svg, result.width, result.height);
```

When a bundler rewrites `import.meta.url` or does not copy `dist/gpt-mermaid.runtime.min.js`, set the runtime URL explicitly:

```js
GPTMermaid.configure({
  runtimeUrl: new URL("gpt-mermaid/dist/gpt-mermaid.runtime.min.js", import.meta.url).href
});
```

## API

| Method | Description |
| --- | --- |
| `configure(options)` | Merge global options and return the effective config. |
| `renderSvg(source, options)` | Render to `{ svg, width, height, source }` without mounting UI. |
| `mount(target, source, options)` | Mount a diagram into an element or selector. |
| `render(source, options)` | Mount into `options.target`, or append a new figure to `body`. |
| `renderAll(root, options)` | Render all `pre > code.language-mermaid` and `[data-gpt-mermaid-source]` nodes. |
| `autoRender(options)` | Run `renderAll` after DOMContentLoaded when needed. |
| `destroy(diagram)` | Release the blob URL, observers and DOM of a mounted diagram. |
| `sanitizeSource(source)` | Validate and sanitize Mermaid source before rendering. |
| `sanitizeSvg(svg)` | Apply the built-in SVG allowlist. |

### Direct container

```html
<div id="diagram"></div>
<script>
  GPTMermaid.mount("#diagram", "graph LR\nA --> B");
</script>
```

### Auto-render attributes

```html
<div data-gpt-mermaid-source>
flowchart LR
  A --> B
</div>
<script>
  GPTMermaid.renderAll();
</script>
```

## Configuration

```js
GPTMermaid.configure({
  preset: "gpt",           // gpt | github | linear | tokyo | nord
  fontFamily: '"PingFang SC", sans-serif',
  runtimeUrl: "./vendor/mermaid/gpt-mermaid.runtime.min.js",
  autoInjectStyles: true,
  maxInlineWidth: 740,
  fitMaxHeight: Infinity,
  adaptiveLayout: { enabled: true, maxWidth: 1200, maxHeight: 1000, gap: 80 },
  themeVariables: {
    primaryColor: "#e5f3ff"
  }
});
```

The `themeVariables` object is merged after the preset, so one-off adjustments are safe.

## Security

- Mermaid is initialized with `securityLevel: "strict"`.
- `click` directives and `securityLevel` overrides in `%%{init}%%` are removed.
- Rendered SVG is passed through an allowlist sanitizer; scripts, event handlers, `foreignObject`, external `url(...)`, external `href` and `src` are removed.
- No remote resources are required at runtime.
- The package is browser-first; it does not render on the server and does not execute untrusted HTML.

See [SECURITY.md](./SECURITY.md) for the reporting process.

## npm publishing

The package name `gpt-mermaid` is intended to be published as a public
unscoped npm package. Publishing requires an authenticated npm account and
2FA/OTP when enabled on the account. Licensing details are in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and
[LICENSES/README.md](./LICENSES/README.md).

## Development

```bash
npm install
npm run build       # generates dist UMD/ESM/CJS bundles
npm run check       # syntax checks
npm test            # unit tests
npm run test:e2e    # Playwright smoke test
npm run test:all
```

`npm run build:runtime` regenerates the patched Mermaid runtime from the official 12.3.0 package. The anchor assertions in `scripts/apply-patch.mjs` fail loudly if Mermaid changes.

## Compatibility

- Mermaid runtime: 12.3.0, bundled as `dist/gpt-mermaid.runtime.min.js`.
- Browsers: modern Chromium, Firefox and Safari with `<dialog>`, `ResizeObserver`, `ClipboardItem` and `createImageBitmap` where the corresponding action is used.
- The wrapper itself has no framework dependency.
- Open [`demo/compatibility.html`](./demo/compatibility.html) to inspect simple-to-complex examples across common diagram types, including expected error fallback.
- The legacy patch scripts and old demos remain available under [docs/legacy-patch.md](./docs/legacy-patch.md) and `demo/legacy.html`.

## Project layout

```text
src/                 modular wrapper source
dist/                published UMD/ESM/CJS/CSS and Mermaid runtime
docs/                API, architecture and patch history
demo/                browser demos and screenshots
scripts/             build, static server and runtime patch
test/                Node and Playwright tests
.github/workflows/   CI
```

## License

The wrapper, build scripts and demos are MIT licensed. `dist/gpt-mermaid.runtime.min.js` is a derivative of Mermaid 12.3.0 (MIT) and includes ELK (EPL-2.0) components. See [LICENSE](./LICENSE) and [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

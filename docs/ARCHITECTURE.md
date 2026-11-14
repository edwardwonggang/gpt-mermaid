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
SVG post-processing
   │  soft palette, edge capsules, open arrows, theme CSS
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

The runtime is intentionally loaded lazily. A page that never renders a Mermaid
diagram does not pay the 5.4 MB runtime cost.

## Invariants

- Only one rendered `<img>` exists per mounted diagram.
- The source `<pre>` remains in the DOM but hidden, so copy and retry stay possible.
- Ordinary wheel events bubble to the page; only `Ctrl+wheel` zooms.
- A fullscreen viewer moves the existing stage, never creates a second image.
- `securityLevel: "strict"` and the SVG allowlist are non-negotiable.

# Changelog

## 1.0.0 — 2026-11-14

### Added

- Complete browser framework API: `configure`, `render`, `renderSvg`, `mount`, `renderAll`, `autoRender`, `destroy`.
- UMD, ESM and CommonJS builds.
- ChatGPT-style inline viewer with floating action menu and fullscreen dialog.
- Zoom, pan, fit, copy source, copy PNG and download SVG actions.
- Built-in `gpt`, `github`, `linear`, `tokyo` and `nord` presets.
- SVG sanitization and strict Mermaid source filtering.
- Playwright end-to-end test, Node unit tests and GitHub Actions CI.
- Public documentation, contributing guide, security policy and third-party notices.

### Preserved

- `gpt-mermaid.runtime.min.js`: patched Mermaid 12.3.0 runtime with rounded nodes and self-sized decision boxes.
- Legacy theme and arrow helper files.
- Legacy comparison demo at `demo/legacy-rounded.html`.

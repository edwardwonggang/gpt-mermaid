# Third-party notices

`gpt-mermaid` distributes a patched browser runtime derived from Mermaid.

## Mermaid

- Project: https://github.com/mermaid-js/mermaid
- Version used by the bundled runtime: 12.3.0
- License: MIT
- Copyright: 2014-2022 Knut Sveidqvist and Mermaid contributors

## Eclipse Layout Kernel (ELK)

- Project: https://www.eclipse.org/elk/
- License: Eclipse Public License 2.0
- The Mermaid runtime bundles ELK layout code for `layout: "elk"`.

## Bundled dependencies

The patched runtime is generated from Mermaid's published distribution. Mermaid's
upstream package includes additional dependencies under their respective
licenses. This repository does not claim authorship of those components.

If you redistribute `dist/gpt-mermaid.runtime.min.js`, keep this notice and the
upstream license texts with the distribution.

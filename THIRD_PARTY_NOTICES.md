# Third-party notices

`gpt-mermaid` redistributes a patched browser runtime derived from Mermaid
12.3.0. The package is not affiliated with OpenAI, ChatGPT, or the Mermaid
project; see [NOTICE.md](./NOTICE.md).

## Mermaid

- Project: https://github.com/mermaid-js/mermaid
- Version: 12.3.0
- License: MIT
- Copyright: 2014-2022 Knut Sveidqvist and Mermaid contributors
- License text: [LICENSES/Mermaid.txt](./LICENSES/Mermaid.txt)

## Eclipse Layout Kernel (ELK)

- Project: https://github.com/eclipse/elk
- Package: `elkjs` 0.12.x
- License: EPL-2.0 OR GPL-3.0-or-later; this distribution uses EPL-2.0.
- License text: [LICENSES/EPL-2.0.txt](./LICENSES/EPL-2.0.txt)
- Unmodified source: https://github.com/eclipse/elk
- Mermaid source: https://github.com/mermaid-js/mermaid/tree/v12.3.0

The local Mermaid modifications are documented and implemented in
`scripts/apply-patch.mjs`. ELK itself is not modified by this project.

## Direct Mermaid dependencies

The Mermaid browser distribution includes dependencies such as:

| Package | Declared license |
| --- | --- |
| `@braintree/sanitize-url` | MIT |
| `@iconify/utils` | MIT |
| `@mermaid-js/parser` | MIT |
| `chevrotain` and `@chevrotain/*` | Apache-2.0 |
| `cytoscape` | MIT |
| `cytoscape-cose-bilkent` | MIT |
| `cytoscape-fcose` | MIT |
| `d3` and related `d3-*` packages | ISC / BSD-3-Clause |
| `dagre-d3-es` | MIT |
| `dayjs` | MIT |
| `dompurify` | MPL-2.0 OR Apache-2.0 |
| `elkjs` | EPL-2.0 OR GPL-3.0-or-later |
| `es-toolkit` | MIT |
| `katex` | MIT |
| `khroma` | MIT |
| `marked` | MIT |
| `roughjs` | MIT |
| `stylis` | MIT |
| `ts-dedent` | MIT |

The exact resolved dependency tree and copied license files are under
[`LICENSES/packages/`](./LICENSES/packages/). The index is
[`LICENSES/packages/INDEX.tsv`](./LICENSES/packages/INDEX.tsv).

## Distribution practice

The published npm tarball includes the root MIT license, this notice, the
complete `LICENSES/` directory, and the upstream Mermaid license. Keep these
files when redistributing the browser runtime.

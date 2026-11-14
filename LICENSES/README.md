# License archive

This directory preserves the license notices that accompany the third-party
components embedded in `dist/gpt-mermaid.runtime.min.js`.

- `Mermaid.txt` — Mermaid 12.3.0, MIT.
- `EPL-2.0.txt` — Eclipse Public License 2.0, used by ELK.
- `packages/` — license files collected from the npm dependency tree used to
  produce Mermaid's browser distribution.
- `packages/INDEX.tsv` — package name, resolved version, declared SPDX
  identifier, and the copied notice file.

The runtime is generated from Mermaid's published distribution. The wrapper
source, patch script, build script, examples, and this repository's original
code are MIT licensed.

## Corresponding source for EPL components

ELK is available under EPL-2.0 or GPL-3.0-or-later. This distribution chooses
EPL-2.0. The unmodified ELK source can be obtained from:

- https://github.com/eclipse/elk
- https://www.npmjs.com/package/elkjs

Mermaid source for the runtime base is available at:

- https://github.com/mermaid-js/mermaid/tree/v12.3.0

The local modifications applied to the Mermaid distribution are contained in
`scripts/apply-patch.mjs`; the repository history and source archive contain the
corresponding patch and build instructions.

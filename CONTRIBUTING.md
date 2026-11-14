# Contributing

Thanks for improving `gpt-mermaid`.

## Development

```bash
git clone https://github.com/edwardwonggang/gpt-mermaid.git
cd gpt-mermaid
npm install
npm run build
npm run test:all
```

Use a focused branch and keep the public API backwards compatible where possible.

## Pull request checklist

- [ ] `npm run build` succeeds.
- [ ] `npm run check` succeeds.
- [ ] `npm test` succeeds.
- [ ] `npm run test:e2e` succeeds.
- [ ] README or `docs/` updated for public API changes.
- [ ] No secrets, generated browser profiles, logs or local paths committed.
- [ ] If the Mermaid runtime patch changes, `scripts/apply-patch.mjs` anchor assertions still pass.

## Commit style

Use a descriptive subject and explain the user-visible behavior, verification, and any known boundary in the body.

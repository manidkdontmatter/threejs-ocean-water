# web-ocean-water Workspace

This repository is split into two packages so ocean library work and demo work are isolated:

- `packages/web-ocean-water`: publishable npm library
- `apps/demo`: Vite demo app and manual tuning playground

## Workspace Commands

Run from repo root:

```bash
npm install
npm run dev
npm run build
npm run typecheck
```

- `npm run dev` runs the demo app.
- `npm run build` builds library first, then demo.
- `npm run typecheck` checks both packages.

Library docs and API usage live in:

- `packages/web-ocean-water/README.md`

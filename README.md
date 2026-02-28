# web-ocean-water Workspace

Monorepo for a reusable Three.js ocean library and a local demo app.

## Projects

- `packages/web-ocean-water`: publishable npm package (`web-ocean-water`).
- `apps/demo`: Vite sandbox that exercises ocean rendering, sky rendering, and Rapier buoyancy.
- `docs`: repository-level API/settings/integration reference.

## Library Summary

`web-ocean-water` provides:

- GPU ocean rendering with concentric ring LOD geometry.
- Deterministic wave math sampling for gameplay/server logic.
- Optional sky dome (`web-ocean-water/sky`).
- Optional Rapier buoyancy adapter (`web-ocean-water/rapier`).

## Quick Start (Workspace)

Run from repository root:

```bash
npm install
npm run dev
```

This starts the demo app in `apps/demo`.

## Workspace Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the demo app. |
| `npm run preview` | Previews the demo production build. |
| `npm run build` | Builds the library, then builds the demo. |
| `npm run build:lib` | Builds only `packages/web-ocean-water`. |
| `npm run build:demo` | Builds only `apps/demo`. |
| `npm run typecheck` | Runs TypeScript checks for library and demo. |
| `npm run test:follow-snap` | Runs the demo follow-mode regression script. |

## Documentation Map

- Package consumer guide: `packages/web-ocean-water/README.md`
- API reference: `docs/api-reference.md`
- Settings/defaults reference: `docs/settings-reference.md`
- Integration patterns and caveats: `docs/integration-notes.md`

## Notes

- The library is built with `tsup` and ships ESM + CJS + type declarations.
- `three` is a peer dependency of the package.
- `@dimforge/rapier3d-compat` is an optional peer dependency used only for the Rapier adapter subpath.
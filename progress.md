# Project Status

Last updated: February 27, 2026

## Current State

The workspace currently contains:

- A publishable library package at `packages/web-ocean-water`.
- A demo app at `apps/demo` using the package through its public exports.
- Optional Rapier buoyancy integration in both package API and demo.

## Implemented Capabilities

- Concentric ring LOD ocean mesh with shader-based displacement and shading.
- Deterministic wave sampler APIs for gameplay/server use.
- Flat and grouped configuration APIs.
- Camera-follow ocean recentering with snap or per-frame modes.
- Optional sky dome module driven by ocean sun direction.
- Optional Rapier buoyancy force adapter with probe-based sampling.

## Public Package Entry Points

- `web-ocean-water`
- `web-ocean-water/math`
- `web-ocean-water/sky`
- `web-ocean-water/rapier`

## Build and Typecheck

Workspace scripts are configured for:

- Library build (`tsup`, ESM/CJS + declarations)
- Demo build (`vite`)
- TypeScript checks for both packages

## Documentation

Primary docs are now:

- `README.md` (workspace overview)
- `packages/web-ocean-water/README.md` (consumer guide)
- `docs/api-reference.md`
- `docs/settings-reference.md`
- `docs/integration-notes.md`
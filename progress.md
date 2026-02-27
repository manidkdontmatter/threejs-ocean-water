Original prompt: in this workspace there is a file containing some kind of shader code idk, it's for ocean water with nice fancy waves. i want it to work with threejs if it doesn't already. we have at least two paths we can pursue, either use this shader directly or use it as a reference to create our own which is a clone of it as close as possible but for use in our threejs browser game. in this workspace we will make some sort of ocean/water simulation to be used in a threejs browser game yet to be determined. the ocean/water will have waves just like the reference shader in that file. we will have a test ui in browser with various sliders/checkboxes/etc for me to tweak the water settings in real time in the browser. this is a js or ts project using npm with a package.json and whatnot so you will have to first do npm init. this ocean system will be used in a threejs game.

## Notes
- Chosen approach: recreate reference shader behavior in a Three.js mesh-based ocean system (TypeScript) with deterministic shared wave math.
- Required: expose clearly-commented server-safe height sampler function for buoyancy.
- Required: build a rich tweak UI and debug modes.
- Required: camera-following ocean with concentric LOD rings.

## TODO
- Initialize npm/TypeScript/Vite/Three.js project.
- Implement shared wave math module and deterministic sampler API.
- Implement concentric ring ocean geometry and shader material.
- Implement UI controls (waves, shading, LOD/perf, lighting, debug).
- Add render_game_to_text and advanceTime hooks for automated testing.
- Run Playwright client script, inspect screenshots/logs, fix issues, retest.

## Progress Log
- Bootstrapped npm + TypeScript + Vite + Three.js + lil-gui.
- Added deterministic wave math module with pure server buoyancy sampler:
  - `src/ocean/waveMath.ts` -> `sampleWaveHeight(...)` with `SERVER_BUOYANCY_API` comment.
- Implemented concentric ring ocean LOD geometry and a custom shader material.
- Implemented `OceanSystem` with camera-following ocean recentering and runtime uniform updates.
- Added broad tweak UI categories with many controls (wave, shading, colors, sun, foam, LOD, time, debug).
- Added test hooks:
  - `window.render_game_to_text()`
  - `window.advanceTime(ms)`
  - `window.sampleOceanHeight(x, z, atTimeSec?)`
  - `window.setOceanServerTime(timeSec)`
- Implemented fullscreen key toggle (`f`).
- Verified typecheck and production build pass.
- Added shader-based sky dome synced with ocean sun/sky parameters for improved reference-like look.
- Ran Playwright client loop twice against local dev server:
  - Artifacts in `output/web-game/` (shot-0..2.png, state-0..2.json).
  - No generated `errors-*.json` files (no new console/page errors detected).
- Re-verified `npm run typecheck` and `npm run build` after sky dome changes.
- Replaced orbit camera with first-person fly controls:
  - Mouse freelook via pointer lock (click canvas to lock, Esc to unlock).
  - `WASD` movement, `Space/Ctrl` vertical movement, `Shift` sprint.
  - Updated HUD text and `render_game_to_text` camera payload to report look direction.
- Fixed ocean face orientation issue by correcting ring index winding in `src/ocean/oceanGeometry.ts`.
- Added full `0-octave` debug support:
  - Octave sliders support `0` for debug isolation.
  - Shader and shared wave math return flat mean-state water for zero displacement octaves.
  - `normalOctaves=0` continues to force flat normals.
- Added LOD follow mode toggle:
  - New UI checkbox `snapEveryFrame` (`followCameraEveryFrame`) in LOD controls.
  - When enabled, ocean center follows camera XZ exactly each frame (no grid snapping).
- Added follow-behavior test harness:
  - `window.__oceanDebug` API in `src/main.ts`.
  - `npm run test:follow-snap` script (`scripts/test-follow-snap.mjs`) with assertions for:
    - grid snapping (`followSnap` mode),
    - per-frame exact follow mode.
- Stabilized test runner reliability:
  - Uses strict random port per run.
  - Adds server readiness request timeouts.
  - Hard-kills process tree on shutdown to avoid hanging waits.
- Implemented wave-band split and stable displacement architecture update:
  - Added `displacementOctaves` setting (separate from `normalOctaves`).
  - Vertex displacement now uses only `displacementOctaves` and no ring-based octave scaling.
  - Normal sampling now uses only `normalOctaves` and no ring-based octave scaling.
  - Server/headless buoyancy sampler now uses displacement octave count via `toWaveSamplingParams`.
- Updated wave UI controls:
  - Added `displacementOctaves` slider.
- Added `displacementOctaves` and follow center diagnostics to `render_game_to_text`.
- Re-verified:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:follow-snap`
- Removed redundant global `waveOctaves` control entirely:
  - `displacementOctaves` and `normalOctaves` are now the only octave controls.
  - Shader uniforms and settings no longer include `waveOctaves`.
  - `render_game_to_text` no longer reports `waveOctaves`.
- Converted project toward npm-library usage:
  - Added public library entrypoints under `src/lib/`:
    - `Ocean` wrapper API (`src/lib/Ocean.ts`)
    - optional sky wrapper (`src/lib/OceanSky.ts`)
    - exports (`src/lib/index.ts`, `src/lib/math.ts`, `src/lib/sky.ts`)
  - Updated demo app to use library APIs instead of internal classes directly.
  - Added package exports map (`.`, `./math`, `./sky`) and output metadata in `package.json`.
  - Added `tsup` library build config (`tsup.config.ts`) with ESM/CJS + DTS output.
  - Added `README.md` with install and usage examples.
  - Adjusted build outputs:
    - library bundle to `dist/`
    - demo bundle to `demo-dist/` (so demo build does not overwrite library artifacts).
- Re-verified after packaging refactor:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:follow-snap`

## Remaining TODO / Suggestions
- Manually tune UI defaults further by visual comparison to the original reference shader if stricter visual parity is needed.
- Optional perf pass: split shader code paths for near/far rings to reduce fragment cost at very high quality settings.
- Optional multiplayer prep: add a tiny exported `OceanSharedParams` serialization helper for clean server/client param sync payloads.

- Added Rapier physics dependency for floating-body simulation: @dimforge/rapier3d-compat.
- Re-verified 
pm run typecheck passes after Rapier install.

- Added optional Rapier adapter entrypoint: web-ocean-water/rapier with pplyBuoyancyToRigidBody and createBoxBuoyancyProbes (no internal world ownership).
- Updated packaging: added ./rapier export, added Rapier as optional peer, and externalized Rapier in tsup build.
- Integrated demo floating physics with Rapier: three bodies (cube, tall/narrow, wide/short), buoyancy probes, water drag, angular drag, and a dedicated Floating Bodies GUI section.
- Re-verified 
pm run typecheck and 
pm run build after buoyancy integration.

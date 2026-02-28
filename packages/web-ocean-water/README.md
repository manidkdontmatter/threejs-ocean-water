# web-ocean-water

Reusable ocean/water system for Three.js games, with deterministic wave sampling and optional Rapier buoyancy helpers.

## Install

```bash
npm install web-ocean-water three
```

Optional (only if you use `web-ocean-water/rapier`):

```bash
npm install @dimforge/rapier3d-compat
```

Peer dependencies:

- `three` (required)
- `@dimforge/rapier3d-compat` (optional)

## Entry Points

- `web-ocean-water`
  - Ocean renderer/runtime API
- `web-ocean-water/math`
  - Deterministic wave sampling utilities
- `web-ocean-water/sky`
  - Optional shader sky dome
- `web-ocean-water/rapier`
  - Optional buoyancy force adapter for Rapier rigid bodies

## Quick Start

```ts
import * as THREE from "three";
import { Ocean, createDefaultOceanOptions } from "web-ocean-water";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 12000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

const ocean = new Ocean(createDefaultOceanOptions());
scene.add(ocean.object3d);

const clock = new THREE.Clock();
let simTimeSec = 0;

function frame() {
  const dt = clock.getDelta();
  simTimeSec += dt;

  ocean.update({ camera, timeSec: simTimeSec });
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

frame();
```

## Time Model

`Ocean` does not own a clock. You supply time from your game loop.

`ocean.update({ camera, timeSec })`

- Uses the exact absolute simulation time you pass.
- Best option for pause, replay, rollback, or server-authoritative sync.

`ocean.update({ camera, deltaTimeSec })`

- Adds delta to internal time.
- Useful as a convenience in simple loops.

If both are present, `timeSec` wins.

## Configuration Model

### Flat options API

`OceanSettings` is a flat object. You can set any subset with `setOptions`.

```ts
ocean.setOptions({
  waveAmplitude: 1.4,
  displacementOctaves: 9,
  debugView: "none"
});
```

### Grouped config API

You can also work with grouped config sections.

```ts
ocean.setConfig({
  wave: { waveAmplitude: 1.4, displacementOctaves: 9 },
  geometry: { ringCount: 5, followSnap: 1.0 },
  debug: { debugView: "none" }
});

const cfg = ocean.getConfig();
console.log(cfg.wave.waveAmplitude);
```

### Geometry rebuild behavior

Changing these keys triggers an internal mesh rebuild:

- `ringCount`
- `baseRingWidth`
- `ringWidthGrowth`
- `centerRadialSegments`
- `radialSegmentsDecay`
- `minRadialSegments`
- `angularSegments`
- `detailFalloff`

Other settings update live via shader uniforms/runtime state.

## Wave Sampling and Determinism

For gameplay/server logic, use deterministic math sampling.

```ts
import { sampleWaveHeight } from "web-ocean-water/math";

const height = sampleWaveHeight(x, z, simTimeSec, ocean.getWaveSamplingParams());
```

You can also sample directly from an `Ocean` instance:

```ts
const yA = ocean.sampleHeight(x, z);                 // uses current ocean time
const yB = ocean.sampleHeight(x, z, explicitTimeSec);
const yC = ocean.sampleHeightHeadless(x, z, tSec);   // always explicit time
```

Important parity note:

- Rendered displacement applies camera-distance high-frequency fading (`highFrequencyFadeDistance`, `highFrequencyFadeStrength`).
- Headless math samplers (`sampleWaveHeight`, `sampleHeight`, `sampleHeightHeadless`) do not use camera-distance fading.
- If you need stricter render/math parity at long distances, reduce or disable high-frequency fade.

## Optional Sky Module

```ts
import { OceanSky } from "web-ocean-water/sky";

const sky = new OceanSky();
scene.add(sky.object3d);

function frame() {
  ocean.update({ camera, timeSec: simTimeSec });
  const sunDir = ocean.getSunDirection();
  sky.update(camera, sunDir);
}
```

`OceanSky` has its own options (`setOptions`) for horizon/zenith colors and sun/atmosphere intensity controls.

## Optional Rapier Buoyancy Adapter

```ts
import {
  applyBuoyancyToRigidBody,
  createBoxBuoyancyProbes
} from "web-ocean-water/rapier";

const probes = createBoxBuoyancyProbes(width, height, depth, 2);

// In your fixed-step loop before world.step()
const stats = applyBuoyancyToRigidBody(
  body,
  probes,
  ocean.getWaveSamplingParams(),
  simTimeSec,
  fixedDtSec,
  {
    volume: width * height * depth,
    fluidDensity: 1.0,
    buoyancyScale: 1.0,
    linearDrag: 2.4,
    angularDrag: 1.2
  }
);

console.log(stats.submergedFraction);
```

The adapter only applies impulses/torque to bodies you pass in. It does not create or step a Rapier world.

## Top-Level Exports (`web-ocean-water`)

Runtime values:

- `Ocean`
- `createOcean`
- `createDefaultOceanOptions`
- `createDefaultOceanConfig`
- `createDefaultOceanWaveOptions`
- `createDefaultOceanShadingOptions`
- `createDefaultOceanSunOptions`
- `createDefaultOceanGeometryOptions`
- `createDefaultOceanDebugOptions`
- `getOceanConfigSnapshot`

Types:

- `OceanOptions`
- `OceanUpdateParams`
- `OceanConfig`
- `OceanConfigSnapshot`
- `OceanSettings`
- `OceanWaveSettings`
- `OceanShadingSettings`
- `OceanSunSettings`
- `OceanGeometrySettings`
- `OceanDebugSettings`
- `DebugViewMode`
- `WaveSamplingParams`

## Ocean Instance API

- `object3d`: Three.js `Group` to add to your scene.
- `update({ camera, timeSec?, deltaTimeSec? })`: updates center-follow, uniforms, and time.
- `setOptions(partial)` / `getOptions()`
- `setConfig(grouped)` / `getConfig()`
- `setWaveOptions(partial)` / `getWaveOptions()`
- `setShadingOptions(partial)` / `getShadingOptions()`
- `setSunOptions(partial)` / `getSunOptions()`
- `setGeometryOptions(partial)` / `getGeometryOptions()`
- `setDebugOptions(partial)` / `getDebugOptions()`
- `setTime(timeSec)` / `getTime()` / `advanceTime(deltaSec)`
- `sampleHeight(x, z, timeSec?)`
- `sampleHeightHeadless(x, z, timeSec)`
- `getWaveSamplingParams()`
- `getSunDirection(target?)`
- `getCenterXZ()`
- `getMaxRadius()`
- `dispose()`

## Subpath Exports

`web-ocean-water/math`:

- `sampleWaveHeight`
- `sampleWaveNormal`
- `sampleWaveValue`
- `WaveSamplingParams` (type)

`web-ocean-water/sky`:

- `OceanSky`
- `createOceanSky`
- `createDefaultOceanSkyOptions`
- `OceanSkyOptions` (type)

`web-ocean-water/rapier`:

- `createBoxBuoyancyProbes`
- `applyBuoyancyToRigidBody`
- `BuoyancyProbe` (type)
- `RapierBuoyancyConfig` (type)
- `BuoyancyApplicationStats` (type)

## Lifecycle

Call `dispose()` on `Ocean` and `OceanSky` when tearing down scenes to release geometries/materials.

## Reference Docs (Repository)

- `../../docs/api-reference.md`
- `../../docs/settings-reference.md`
- `../../docs/integration-notes.md`
# web-ocean-water

Reusable Three.js ocean system with:

- GPU-rendered ocean mesh (clipmap-style concentric rings)
- Deterministic wave sampling for server buoyancy
- Optional sky dome module (separate subpath)

## Install

```bash
npm install web-ocean-water three
```

## Quick Start

```ts
import * as THREE from "three";
import { Ocean, createDefaultOceanOptions } from "web-ocean-water";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 12000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

const oceanOptions = createDefaultOceanOptions();
const ocean = new Ocean({
  ...oceanOptions,
  displacementOctaves: 10,
  normalOctaves: 24
});

scene.add(ocean.object3d);

const clock = new THREE.Clock();
let elapsedSec = 0;
function frame() {
  const dt = clock.getDelta();
  elapsedSec += dt;
  ocean.update({ camera, timeSec: elapsedSec });
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
```

`Ocean` no longer owns pause/sim-speed/server-time policy. Keep that in your game loop and pass absolute `timeSec` (recommended), or use `deltaTimeSec` as a convenience.

## Grouped Configuration API

```ts
import { Ocean } from "web-ocean-water";

const ocean = new Ocean();

ocean.setConfig({
  wave: { displacementOctaves: 9, waveAmplitude: 1.4 },
  geometry: { ringCount: 5, followSnap: 1.0 },
  debug: { debugView: "none" }
});

const snapshot = ocean.getConfig();
console.log(snapshot.wave.displacementOctaves);
```

## Optional Sky

```ts
import { OceanSky } from "web-ocean-water/sky";

const sky = new OceanSky();
scene.add(sky.object3d);

// In your frame loop, after ocean.update(...)
const sunDirection = ocean.getSunDirection();
sky.update(camera, sunDirection);
```

## Server Buoyancy / Headless Sampling

```ts
import { sampleWaveHeight } from "web-ocean-water/math";

const y = sampleWaveHeight(x, z, serverTimeSec, {
  seaLevel: 0,
  waveAmplitude: 1.28,
  waveMean: 0.56,
  dragMultiplier: 0.28,
  baseFrequency: 1.0,
  frequencyMultiplier: 1.18,
  baseTimeMultiplier: 2.0,
  timeMultiplierGrowth: 1.07,
  weightDecay: 0.82,
  waveDirectionSeed: 0.0,
  phaseOffset: 0.0,
  displacementOctaves: 10
});
```

## Public Exports

- `web-ocean-water`
  - `Ocean`
  - `createOcean`
  - `createDefaultOceanOptions`
  - `createDefaultOceanWaveOptions`
  - `createDefaultOceanShadingOptions`
  - `createDefaultOceanSunOptions`
  - `createDefaultOceanGeometryOptions`
  - `createDefaultOceanDebugOptions`
  - `createDefaultOceanConfig`
  - `getOceanConfigSnapshot`
- `web-ocean-water/math`
  - `sampleWaveHeight`
  - `sampleWaveValue`
  - `sampleWaveNormal`
- `web-ocean-water/rapier` (optional)
  - `createBoxBuoyancyProbes`
  - `applyBuoyancyToRigidBody`
- `web-ocean-water/sky`
  - `OceanSky`
  - `createOceanSky`
  - `createDefaultOceanSkyOptions`

## Optional Rapier Buoyancy Adapter

```ts
import { applyBuoyancyToRigidBody, createBoxBuoyancyProbes } from "web-ocean-water/rapier";

const probes = createBoxBuoyancyProbes(2, 2, 2, 2);

// In your own fixed-step loop, before world.step():
applyBuoyancyToRigidBody(rigidBody, probes, oceanWaveParams, simTimeSec, fixedDtSec, {
  volume: 8.0,
  fluidDensity: 1.0
});
```

The adapter does not create or step a Rapier world; it only applies forces to bodies you own.

## Local Development

```bash
cd ../../
npm install
npm run dev
```

Build library + demo from workspace root:

```bash
npm run build
```

- Library output: `packages/web-ocean-water/dist/`
- Demo output: `apps/demo/demo-dist/`

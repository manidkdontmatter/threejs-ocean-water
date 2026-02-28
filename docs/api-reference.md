# API Reference

This page documents runtime behavior from the current source implementation in `packages/web-ocean-water/src`.

## Main Entry (`web-ocean-water`)

### `Ocean`

Constructor:

```ts
new Ocean(options?: Partial<OceanSettings>)
```

- Merges `options` onto default settings.
- Creates an internal `OceanSystem` with concentric ring geometry.
- Initializes internal time to `0`.

Public members:

- `object3d`: `THREE.Group`
  - Add this to your scene.

Time and frame methods:

- `update({ camera, timeSec?, deltaTimeSec? })`
  - `camera` is required every call.
  - If `timeSec` is finite, internal time is set to `timeSec`.
  - Else if `deltaTimeSec` is finite, internal time is incremented by `deltaTimeSec`.
  - Then ocean follow/sun/uniform updates run for the current camera.
- `setTime(timeSec)`
- `getTime()`
- `advanceTime(deltaTimeSec)`
  - Adds delta (if finite), updates internals, and returns new time.

Sampling and runtime state:

- `sampleHeight(x, z, timeSec = getTime())`
- `sampleHeightHeadless(x, z, timeSec)`
- `getWaveSamplingParams()`
- `getSunDirection(target?)`
- `getCenterXZ()`
- `getMaxRadius()`

Configuration access:

- Flat settings:
  - `getOptions()`
  - `setOptions(partial)`
- Grouped settings:
  - `getConfig()`
  - `setConfig({ wave?, shading?, sun?, geometry?, debug? })`
  - `getWaveOptions()` / `setWaveOptions(partial)`
  - `getShadingOptions()` / `setShadingOptions(partial)`
  - `getSunOptions()` / `setSunOptions(partial)`
  - `getGeometryOptions()` / `setGeometryOptions(partial)`
  - `getDebugOptions()` / `setDebugOptions(partial)`

Resource cleanup:

- `dispose()`
  - Disposes ring geometries/materials and debug helper assets.

### Geometry Rebuild Keys

Changing any of these triggers full ocean ring geometry rebuild:

- `ringCount`
- `baseRingWidth`
- `ringWidthGrowth`
- `centerRadialSegments`
- `radialSegmentsDecay`
- `minRadialSegments`
- `angularSegments`
- `detailFalloff`

All other settings update at runtime without rebuilding geometry.

## Helper Functions

- `createOcean(options?)`
- `createDefaultOceanOptions()`
- `createDefaultOceanConfig()`
- `createDefaultOceanWaveOptions()`
- `createDefaultOceanShadingOptions()`
- `createDefaultOceanSunOptions()`
- `createDefaultOceanGeometryOptions()`
- `createDefaultOceanDebugOptions()`
- `getOceanConfigSnapshot(settings)`

## Main Exported Types

- `OceanOptions = Partial<OceanSettings>`
- `OceanUpdateParams`
- `OceanConfig`
- `OceanConfigSnapshot`
- `OceanSettings`
- `OceanWaveSettings`
- `OceanShadingSettings`
- `OceanSunSettings`
- `OceanGeometrySettings`
- `OceanDebugSettings`
- `DebugViewMode = "none" | "normals" | "height" | "fresnel" | "rings"`
- `WaveSamplingParams`

## Math Entry (`web-ocean-water/math`)

- `sampleWaveValue(x, z, timeSec, params, octaves?)`
- `sampleWaveHeight(x, z, timeSec, params, octaves?)`
- `sampleWaveNormal(x, z, timeSec, params, epsilon?, octaves?)`

Behavior notes:

- Deterministic pure math (no Three.js objects required).
- Default octave count for these functions is `params.displacementOctaves`.
- `WaveSamplingParams` contains only wave-shape fields used by headless sampling.

## Sky Entry (`web-ocean-water/sky`)

### `OceanSky`

Constructor:

```ts
new OceanSky(options?: Partial<OceanSkyOptions>)
```

Public members:

- `object3d`: sky-dome mesh (`THREE.Mesh`).
- `getOptions()`
- `setOptions(partial)`
- `update(camera, sunDirection)`
  - Re-centers sky dome to camera.
  - Applies colors and sun/atmosphere uniforms.
- `dispose()`

Helpers:

- `createOceanSky(options?)`
- `createDefaultOceanSkyOptions()`

Type:

- `OceanSkyOptions`

## Rapier Entry (`web-ocean-water/rapier`)

- `createBoxBuoyancyProbes(width, height, depth, subdivisions = 2)`
  - Produces a regular local-space probe grid (`(subdivisions + 1)^3` probes).
- `applyBuoyancyToRigidBody(body, probes, waveParams, timeSec, dtSec, config?)`
  - Applies buoyancy and drag impulses per probe.
  - Applies angular drag torque impulse when submerged.
  - Returns `{ submergedProbeCount, submergedFraction }`.

Types:

- `BuoyancyProbe`
- `RapierBuoyancyConfig`
- `BuoyancyApplicationStats`

Default buoyancy config values:

- `fluidDensity: 1.0`
- `gravity: 9.81`
- `volume: 1.0`
- `maxSubmergenceDepth: 1.0`
- `buoyancyScale: 1.0`
- `linearDrag: 2.4`
- `angularDrag: 1.2`
- `normalAlign: 0.0`
- `normalSampleEpsilon: 0.2`

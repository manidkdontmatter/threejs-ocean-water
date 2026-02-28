# Integration Notes

Practical patterns for integrating `web-ocean-water` into a real game loop.

## 1) Own the Simulation Clock at App Level

`Ocean` is intentionally clock-agnostic. Keep time policy in your app.

Recommended:

```ts
const dtSec = clock.getDelta();
if (!paused) {
  simTimeSec += dtSec * timeScale;
}

ocean.update({ camera, timeSec: simTimeSec });
```

Use absolute `timeSec` for deterministic replay/server sync.

## 2) Fixed-Step Physics With Buoyancy

Run buoyancy in the same fixed-step loop as physics.

```ts
const fixedDt = 1 / 60;

while (accumulator >= fixedDt) {
  const waveParams = ocean.getWaveSamplingParams();

  for (const body of floatingBodies) {
    applyBuoyancyToRigidBody(body, probes, waveParams, simTimeSec, fixedDt, {
      volume,
      fluidDensity: 1.0,
      buoyancyScale: 1.0,
      linearDrag: 2.4,
      angularDrag: 1.2
    });
  }

  world.step();
  accumulator -= fixedDt;
}
```

Notes:

- `applyBuoyancyToRigidBody` expects `dtSec > 0`.
- Probe layout quality/perf is controlled by subdivision count.
- Higher `linearDrag` and `angularDrag` reduce jitter/overshoot.

## 3) Camera Follow Modes

Ocean center behavior:

- `followCameraEveryFrame = false`:
  - Center snaps to a grid of size `followSnap` in X/Z.
  - Reduces tiny per-frame movement noise.
- `followCameraEveryFrame = true`:
  - Center follows exact camera X/Z each frame.

`followSnap` is internally clamped to at least `0.001` during updates.

## 4) Render/Math Parity Caveat

Current implementation intentionally differs between rendering and headless sampling:

- Rendering can fade high-frequency displacement by camera distance.
- Headless sampling is camera-independent and deterministic.

Implication:

- Distant rendered water may look smoother than sampled heights.

If that mismatch is a problem:

- Lower `highFrequencyFadeStrength`, or set it to `0`.
- Keep gameplay objects closer to active camera focus when visual parity is critical.

## 5) Sun/Sky Synchronization Pattern

If you use `OceanSky`, feed it sun direction from `Ocean` each frame.

```ts
ocean.update({ camera, timeSec: simTimeSec });
const sunDirection = ocean.getSunDirection();
sky.update(camera, sunDirection);
```

This keeps water reflections, highlights, and sky dome aligned.

## 6) Disposal

Always dispose long-lived graphics resources when unloading scenes:

```ts
ocean.dispose();
sky.dispose();
```

This releases ring geometry/materials and sky geometry/material.

## 7) Performance Tuning Shortlist

Lowest impact to visuals for large gains typically comes from:

- Lower `displacementOctaves`.
- Lower `ringCount`.
- Lower `angularSegments`.
- Lower `centerRadialSegments`.
- Increase `highFrequencyFadeStrength` (if visual smoothing at distance is acceptable).

Use grouped config updates (`setConfig`) or flat updates (`setOptions`) to tune these live.
import { sampleWaveHeight, sampleWaveNormal } from './chunk-IT73NM3N.js';

// src/lib/RapierBuoyancy.ts
var DEFAULT_CONFIG = {
  fluidDensity: 1,
  gravity: 9.81,
  volume: 1,
  maxSubmergenceDepth: 1,
  buoyancyScale: 1,
  linearDrag: 2.4,
  angularDrag: 1.2,
  normalAlign: 0,
  normalSampleEpsilon: 0.2
};
function rotateVectorByQuaternion(x, y, z, qx, qy, qz, qw) {
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  return {
    x: x + qw * tx + (qy * tz - qz * ty),
    y: y + qw * ty + (qz * tx - qx * tz),
    z: z + qw * tz + (qx * ty - qy * tx)
  };
}
function resolveConfig(config) {
  return {
    ...DEFAULT_CONFIG,
    ...config ?? {}
  };
}
function normalizeOrUp(x, y, z) {
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length <= 1e-8) {
    return { x: 0, y: 1, z: 0 };
  }
  return { x: x / length, y: y / length, z: z / length };
}
function createBoxBuoyancyProbes(width, height, depth, subdivisions = 2) {
  const divisions = Math.max(1, Math.floor(subdivisions));
  const points = [];
  const halfX = width * 0.5;
  const halfY = height * 0.5;
  const halfZ = depth * 0.5;
  for (let ix = 0; ix <= divisions; ix += 1) {
    for (let iy = 0; iy <= divisions; iy += 1) {
      for (let iz = 0; iz <= divisions; iz += 1) {
        const tx = ix / divisions;
        const ty = iy / divisions;
        const tz = iz / divisions;
        points.push({
          x: -halfX + tx * width,
          y: -halfY + ty * height,
          z: -halfZ + tz * depth,
          weight: 1
        });
      }
    }
  }
  return points;
}
function applyBuoyancyToRigidBody(body, probes, waveParams, timeSec, dtSec, config) {
  if (probes.length === 0 || dtSec <= 0 || !Number.isFinite(dtSec)) {
    return { submergedProbeCount: 0, submergedFraction: 0 };
  }
  const cfg = resolveConfig(config);
  const normalAlign = Math.max(0, Math.min(1, cfg.normalAlign));
  const translation = body.translation();
  const rotation = body.rotation();
  const weightedProbeCount = probes.reduce((sum, probe) => sum + Math.max(0, probe.weight ?? 1), 0) || 1;
  const baseProbeVolume = cfg.volume / weightedProbeCount;
  const maxSubmergence = Math.max(1e-4, cfg.maxSubmergenceDepth);
  const wakeUp = true;
  let submergedProbeCount = 0;
  let submergedWeightTotal = 0;
  for (const probe of probes) {
    const probeWeight = Math.max(0, probe.weight ?? 1);
    if (probeWeight <= 0) {
      continue;
    }
    const rotated = rotateVectorByQuaternion(
      probe.x,
      probe.y,
      probe.z,
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w
    );
    const worldPoint = {
      x: translation.x + rotated.x,
      y: translation.y + rotated.y,
      z: translation.z + rotated.z
    };
    const surfaceHeight = sampleWaveHeight(worldPoint.x, worldPoint.z, timeSec, waveParams);
    const depth = surfaceHeight - worldPoint.y;
    if (depth <= 0) {
      continue;
    }
    submergedProbeCount += 1;
    submergedWeightTotal += probeWeight;
    const submergence01 = Math.min(depth / maxSubmergence, 1);
    const displacedVolume = baseProbeVolume * probeWeight * submergence01;
    const buoyancyMagnitude = cfg.fluidDensity * cfg.gravity * displacedVolume * cfg.buoyancyScale;
    const [nx, ny, nz] = sampleWaveNormal(
      worldPoint.x,
      worldPoint.z,
      timeSec,
      waveParams,
      cfg.normalSampleEpsilon
    );
    const buoyancyDir = normalizeOrUp(nx * normalAlign, 1 - normalAlign + ny * normalAlign, nz * normalAlign);
    body.applyImpulseAtPoint(
      {
        x: buoyancyDir.x * buoyancyMagnitude * dtSec,
        y: buoyancyDir.y * buoyancyMagnitude * dtSec,
        z: buoyancyDir.z * buoyancyMagnitude * dtSec
      },
      worldPoint,
      wakeUp
    );
    const pointVelocity = body.velocityAtPoint(worldPoint);
    const dragScale = cfg.linearDrag * submergence01;
    body.applyImpulseAtPoint(
      {
        x: -pointVelocity.x * dragScale * dtSec,
        y: -pointVelocity.y * dragScale * dtSec,
        z: -pointVelocity.z * dragScale * dtSec
      },
      worldPoint,
      wakeUp
    );
  }
  if (submergedProbeCount > 0) {
    const angVel = body.angvel();
    const angularDragScale = cfg.angularDrag * (submergedWeightTotal / weightedProbeCount);
    body.applyTorqueImpulse(
      {
        x: -angVel.x * angularDragScale * dtSec,
        y: -angVel.y * angularDragScale * dtSec,
        z: -angVel.z * angularDragScale * dtSec
      },
      wakeUp
    );
  }
  return {
    submergedProbeCount,
    submergedFraction: Math.min(1, submergedWeightTotal / weightedProbeCount)
  };
}

export { applyBuoyancyToRigidBody, createBoxBuoyancyProbes };
//# sourceMappingURL=rapier.js.map
//# sourceMappingURL=rapier.js.map
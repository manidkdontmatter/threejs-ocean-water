'use strict';

// src/ocean/waveMath.ts
var OCTAVE_DIRECTION_STEP = 1232.399963;
function waveDx(posX, posZ, dirX, dirZ, frequency, timeShift) {
  const x = (dirX * posX + dirZ * posZ) * frequency + timeShift;
  const wave = Math.exp(Math.sin(x) - 1);
  const derivative = -wave * Math.cos(x);
  return { wave, derivative };
}
function sampleWaveValue(x, z, timeSec, params, octaves = params.displacementOctaves) {
  const totalOctaves = Math.max(0, Math.floor(octaves));
  if (totalOctaves === 0) {
    return params.waveMean;
  }
  let iter = 0;
  let frequency = params.baseFrequency;
  let timeMultiplier = params.baseTimeMultiplier;
  let weight = 1;
  let sumValues = 0;
  let sumWeights = 0;
  let sampleX = x;
  let sampleZ = z;
  for (let i = 0; i < totalOctaves; i += 1) {
    const directionX = Math.sin(iter + params.waveDirectionSeed);
    const directionZ = Math.cos(iter + params.waveDirectionSeed);
    const { wave, derivative } = waveDx(
      sampleX,
      sampleZ,
      directionX,
      directionZ,
      frequency,
      timeSec * timeMultiplier + params.phaseOffset
    );
    sampleX += directionX * derivative * weight * params.dragMultiplier;
    sampleZ += directionZ * derivative * weight * params.dragMultiplier;
    sumValues += wave * weight;
    sumWeights += weight;
    weight *= params.weightDecay;
    frequency *= params.frequencyMultiplier;
    timeMultiplier *= params.timeMultiplierGrowth;
    iter += OCTAVE_DIRECTION_STEP;
  }
  return sumWeights > 0 ? sumValues / sumWeights : 0;
}
function sampleWaveHeight(x, z, timeSec, params, octaves = params.displacementOctaves) {
  const raw = sampleWaveValue(x, z, timeSec, params, octaves);
  return params.seaLevel + (raw - params.waveMean) * params.waveAmplitude;
}
function sampleWaveNormal(x, z, timeSec, params, epsilon = 0.1, octaves = params.displacementOctaves) {
  const h = sampleWaveHeight(x, z, timeSec, params, octaves);
  const hx = sampleWaveHeight(x + epsilon, z, timeSec, params, octaves);
  const hz = sampleWaveHeight(x, z + epsilon, timeSec, params, octaves);
  const dx = [epsilon, hx - h, 0];
  const dz = [0, hz - h, epsilon];
  const nx = dz[1] * dx[2] - dz[2] * dx[1];
  const ny = dz[2] * dx[0] - dz[0] * dx[2];
  const nz = dz[0] * dx[1] - dz[1] * dx[0];
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

// src/lib/RapierBuoyancy.ts
var DEFAULT_CONFIG = {
  fluidDensity: 1,
  gravity: 9.81,
  volume: 1,
  maxSubmergenceDepth: 1,
  buoyancyScale: 1,
  linearDrag: 2.4,
  angularDrag: 1.2,
  normalAlign: 0.35,
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
    const forceDirX = nx * cfg.normalAlign;
    const forceDirY = 1 - cfg.normalAlign + ny * cfg.normalAlign;
    const forceDirZ = nz * cfg.normalAlign;
    body.addForceAtPoint(
      {
        x: forceDirX * buoyancyMagnitude,
        y: forceDirY * buoyancyMagnitude,
        z: forceDirZ * buoyancyMagnitude
      },
      worldPoint,
      wakeUp
    );
    const pointVelocity = body.velocityAtPoint(worldPoint);
    const dragScale = cfg.linearDrag * submergence01;
    body.addForceAtPoint(
      {
        x: -pointVelocity.x * dragScale,
        y: -pointVelocity.y * dragScale,
        z: -pointVelocity.z * dragScale
      },
      worldPoint,
      wakeUp
    );
  }
  if (submergedProbeCount > 0) {
    const angVel = body.angvel();
    const angularDragScale = cfg.angularDrag * (submergedWeightTotal / weightedProbeCount);
    body.addTorque(
      {
        x: -angVel.x * angularDragScale,
        y: -angVel.y * angularDragScale,
        z: -angVel.z * angularDragScale
      },
      wakeUp
    );
  }
  return {
    submergedProbeCount,
    submergedFraction: Math.min(1, submergedWeightTotal / weightedProbeCount)
  };
}

exports.applyBuoyancyToRigidBody = applyBuoyancyToRigidBody;
exports.createBoxBuoyancyProbes = createBoxBuoyancyProbes;
//# sourceMappingURL=rapier.cjs.map
//# sourceMappingURL=rapier.cjs.map
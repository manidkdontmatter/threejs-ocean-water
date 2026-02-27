import type { RigidBody } from "@dimforge/rapier3d-compat";
import { sampleWaveHeight, sampleWaveNormal } from "../ocean/waveMath";
import type { WaveSamplingParams } from "./settings";

export interface BuoyancyProbe {
  x: number;
  y: number;
  z: number;
  weight?: number;
}

export interface RapierBuoyancyConfig {
  fluidDensity?: number;
  gravity?: number;
  volume?: number;
  maxSubmergenceDepth?: number;
  buoyancyScale?: number;
  linearDrag?: number;
  angularDrag?: number;
  normalAlign?: number;
  normalSampleEpsilon?: number;
}

export interface BuoyancyApplicationStats {
  submergedProbeCount: number;
  submergedFraction: number;
}

const DEFAULT_CONFIG: Required<RapierBuoyancyConfig> = {
  fluidDensity: 1.0,
  gravity: 9.81,
  volume: 1.0,
  maxSubmergenceDepth: 1.0,
  buoyancyScale: 1.0,
  linearDrag: 2.4,
  angularDrag: 1.2,
  normalAlign: 0.0,
  normalSampleEpsilon: 0.2
};

function rotateVectorByQuaternion(
  x: number,
  y: number,
  z: number,
  qx: number,
  qy: number,
  qz: number,
  qw: number
): { x: number; y: number; z: number } {
  const tx = 2.0 * (qy * z - qz * y);
  const ty = 2.0 * (qz * x - qx * z);
  const tz = 2.0 * (qx * y - qy * x);

  return {
    x: x + qw * tx + (qy * tz - qz * ty),
    y: y + qw * ty + (qz * tx - qx * tz),
    z: z + qw * tz + (qx * ty - qy * tx)
  };
}

function resolveConfig(config?: RapierBuoyancyConfig): Required<RapierBuoyancyConfig> {
  return {
    ...DEFAULT_CONFIG,
    ...(config ?? {})
  };
}

function normalizeOrUp(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length <= 1e-8) {
    return { x: 0, y: 1, z: 0 };
  }
  return { x: x / length, y: y / length, z: z / length };
}

export function createBoxBuoyancyProbes(
  width: number,
  height: number,
  depth: number,
  subdivisions = 2
): BuoyancyProbe[] {
  const divisions = Math.max(1, Math.floor(subdivisions));
  const points: BuoyancyProbe[] = [];
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

export function applyBuoyancyToRigidBody(
  body: RigidBody,
  probes: readonly BuoyancyProbe[],
  waveParams: WaveSamplingParams,
  timeSec: number,
  dtSec: number,
  config?: RapierBuoyancyConfig
): BuoyancyApplicationStats {
  if (probes.length === 0 || dtSec <= 0 || !Number.isFinite(dtSec)) {
    return { submergedProbeCount: 0, submergedFraction: 0 };
  }

  const cfg = resolveConfig(config);
  const normalAlign = Math.max(0, Math.min(1, cfg.normalAlign));
  const translation = body.translation();
  const rotation = body.rotation();
  const weightedProbeCount = probes.reduce((sum, probe) => sum + Math.max(0, probe.weight ?? 1), 0) || 1.0;
  const baseProbeVolume = cfg.volume / weightedProbeCount;
  const maxSubmergence = Math.max(1e-4, cfg.maxSubmergenceDepth);
  const wakeUp = true;

  let submergedProbeCount = 0;
  let submergedWeightTotal = 0.0;

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

    const submergence01 = Math.min(depth / maxSubmergence, 1.0);
    const displacedVolume = baseProbeVolume * probeWeight * submergence01;
    const buoyancyMagnitude =
      cfg.fluidDensity * cfg.gravity * displacedVolume * cfg.buoyancyScale;

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

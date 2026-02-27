import type { WaveSamplingParams } from "./types";

const OCTAVE_DIRECTION_STEP = 1232.399963;

interface WaveDxResult {
  wave: number;
  derivative: number;
}

function waveDx(
  posX: number,
  posZ: number,
  dirX: number,
  dirZ: number,
  frequency: number,
  timeShift: number
): WaveDxResult {
  const x = (dirX * posX + dirZ * posZ) * frequency + timeShift;
  const wave = Math.exp(Math.sin(x) - 1.0);
  const derivative = -wave * Math.cos(x);
  return { wave, derivative };
}

export function sampleWaveValue(
  x: number,
  z: number,
  timeSec: number,
  params: WaveSamplingParams,
  octaves = params.displacementOctaves
): number {
  const totalOctaves = Math.max(0, Math.floor(octaves));
  if (totalOctaves === 0) {
    return params.waveMean;
  }

  let iter = 0.0;
  let frequency = params.baseFrequency;
  let timeMultiplier = params.baseTimeMultiplier;
  let weight = 1.0;
  let sumValues = 0.0;
  let sumWeights = 0.0;
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

  return sumWeights > 0 ? sumValues / sumWeights : 0.0;
}

/**
 * SERVER_BUOYANCY_API: deterministic, headless wave height sampler for server physics.
 *
 * This function is intentionally pure math and has no rendering dependency.
 * Given world-space (x, z), simulation time, and shared wave params, it returns
 * a world-space water height that can be used for buoyancy, swimming, and auth logic.
 */
export function sampleWaveHeight(
  x: number,
  z: number,
  timeSec: number,
  params: WaveSamplingParams,
  octaves = params.displacementOctaves
): number {
  const raw = sampleWaveValue(x, z, timeSec, params, octaves);
  return params.seaLevel + (raw - params.waveMean) * params.waveAmplitude;
}

export function sampleWaveNormal(
  x: number,
  z: number,
  timeSec: number,
  params: WaveSamplingParams,
  epsilon = 0.1,
  octaves = params.displacementOctaves
): [number, number, number] {
  const h = sampleWaveHeight(x, z, timeSec, params, octaves);
  const hx = sampleWaveHeight(x + epsilon, z, timeSec, params, octaves);
  const hz = sampleWaveHeight(x, z + epsilon, timeSec, params, octaves);

  const dx: [number, number, number] = [epsilon, hx - h, 0.0];
  const dz: [number, number, number] = [0.0, hz - h, epsilon];

  const nx = dz[1] * dx[2] - dz[2] * dx[1];
  const ny = dz[2] * dx[0] - dz[0] * dx[2];
  const nz = dz[0] * dx[1] - dz[1] * dx[0];
  const length = Math.hypot(nx, ny, nz) || 1.0;
  return [nx / length, ny / length, nz / length];
}

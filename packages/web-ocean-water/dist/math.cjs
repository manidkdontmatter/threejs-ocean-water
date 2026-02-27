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

exports.sampleWaveHeight = sampleWaveHeight;
exports.sampleWaveNormal = sampleWaveNormal;
exports.sampleWaveValue = sampleWaveValue;
//# sourceMappingURL=math.cjs.map
//# sourceMappingURL=math.cjs.map
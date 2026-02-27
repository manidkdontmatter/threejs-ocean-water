import { W as WaveSamplingParams } from './types-GScqgROH.js';

declare function sampleWaveValue(x: number, z: number, timeSec: number, params: WaveSamplingParams, octaves?: number): number;
/**
 * SERVER_BUOYANCY_API: deterministic, headless wave height sampler for server physics.
 *
 * This function is intentionally pure math and has no rendering dependency.
 * Given world-space (x, z), simulation time, and shared wave params, it returns
 * a world-space water height that can be used for buoyancy, swimming, and auth logic.
 */
declare function sampleWaveHeight(x: number, z: number, timeSec: number, params: WaveSamplingParams, octaves?: number): number;
declare function sampleWaveNormal(x: number, z: number, timeSec: number, params: WaveSamplingParams, epsilon?: number, octaves?: number): [number, number, number];

export { WaveSamplingParams, sampleWaveHeight, sampleWaveNormal, sampleWaveValue };

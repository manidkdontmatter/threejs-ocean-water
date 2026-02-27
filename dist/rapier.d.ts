import { RigidBody } from '@dimforge/rapier3d-compat';
import { W as WaveSamplingParams } from './types-0PEEEcwO.js';

interface BuoyancyProbe {
    x: number;
    y: number;
    z: number;
    weight?: number;
}
interface RapierBuoyancyConfig {
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
interface BuoyancyApplicationStats {
    submergedProbeCount: number;
    submergedFraction: number;
}
declare function createBoxBuoyancyProbes(width: number, height: number, depth: number, subdivisions?: number): BuoyancyProbe[];
declare function applyBuoyancyToRigidBody(body: RigidBody, probes: readonly BuoyancyProbe[], waveParams: WaveSamplingParams, timeSec: number, dtSec: number, config?: RapierBuoyancyConfig): BuoyancyApplicationStats;

export { type BuoyancyApplicationStats, type BuoyancyProbe, type RapierBuoyancyConfig, applyBuoyancyToRigidBody, createBoxBuoyancyProbes };

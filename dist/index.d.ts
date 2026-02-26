import * as three from 'three';
import { Camera, Vector3 } from 'three';
import { O as OceanSettings, W as WaveSamplingParams } from './types-DDrN5H5q.js';
export { D as DebugViewMode, R as RingSpec } from './types-DDrN5H5q.js';
export { OceanSky, OceanSkyOptions, createDefaultOceanSkyOptions, createOceanSky } from './sky.js';

type OceanOptions = Partial<OceanSettings>;
interface OceanUpdateParams {
    camera: Camera;
    deltaTimeSec?: number;
    timeSec?: number;
}
declare class Ocean {
    readonly object3d: three.Group<three.Object3DEventMap>;
    private readonly settings;
    private readonly system;
    private timeSec;
    constructor(options?: OceanOptions);
    getOptions(): OceanSettings;
    setOptions(options: OceanOptions): void;
    update({ camera, deltaTimeSec, timeSec }: OceanUpdateParams): void;
    setTime(timeSec: number): void;
    getTime(): number;
    sampleHeight(x: number, z: number, timeSec?: number): number;
    getSunDirection(target?: Vector3): Vector3;
    getCenterXZ(): {
        x: number;
        z: number;
    };
    getMaxRadius(): number;
    getWaveSamplingParams(): WaveSamplingParams;
    sampleHeightHeadless(x: number, z: number, timeSec: number): number;
    dispose(): void;
}
declare function createOcean(options?: OceanOptions): Ocean;
declare function createDefaultOceanOptions(): OceanSettings;

export { Ocean, type OceanOptions, OceanSettings, type OceanUpdateParams, WaveSamplingParams, createDefaultOceanOptions, createOcean };

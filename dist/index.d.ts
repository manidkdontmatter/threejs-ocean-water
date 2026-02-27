import * as three from 'three';
import { Camera, Vector3 } from 'three';
import { O as OceanSettings, a as OceanWaveSettings, b as OceanShadingSettings, c as OceanSunSettings, d as OceanGeometrySettings, e as OceanDebugSettings, W as WaveSamplingParams } from './types-0PEEEcwO.js';
export { D as DebugViewMode, R as RingSpec } from './types-0PEEEcwO.js';

type OceanOptions = Partial<OceanSettings>;
interface OceanUpdateParams {
    camera: Camera;
    timeSec?: number;
    deltaTimeSec?: number;
}
declare class Ocean {
    readonly object3d: three.Group<three.Object3DEventMap>;
    private readonly settings;
    private readonly system;
    private timeSec;
    constructor(options?: OceanOptions);
    getOptions(): OceanSettings;
    setOptions(options: OceanOptions): void;
    setWaveOptions(options: Partial<OceanWaveSettings>): void;
    setShadingOptions(options: Partial<OceanShadingSettings>): void;
    setSunOptions(options: Partial<OceanSunSettings>): void;
    setGeometryOptions(options: Partial<OceanGeometrySettings>): void;
    setDebugOptions(options: Partial<OceanDebugSettings>): void;
    update({ camera, deltaTimeSec, timeSec }: OceanUpdateParams): void;
    advanceTime(deltaTimeSec: number): number;
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
    private applyOptions;
}
declare function createOcean(options?: OceanOptions): Ocean;
declare function createDefaultOceanOptions(): OceanSettings;

export { Ocean, OceanDebugSettings, OceanGeometrySettings, type OceanOptions, OceanSettings, OceanShadingSettings, OceanSunSettings, type OceanUpdateParams, OceanWaveSettings, WaveSamplingParams, createDefaultOceanOptions, createOcean };

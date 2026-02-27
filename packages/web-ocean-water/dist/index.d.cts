import * as three from 'three';
import { Camera, Vector3 } from 'three';
import { O as OceanWaveSettings, a as OceanShadingSettings, b as OceanSunSettings, c as OceanGeometrySettings, d as OceanDebugSettings, e as OceanSettings, W as WaveSamplingParams } from './types-GScqgROH.cjs';
export { D as DebugViewMode } from './types-GScqgROH.cjs';

interface OceanConfig {
    wave?: Partial<OceanWaveSettings>;
    shading?: Partial<OceanShadingSettings>;
    sun?: Partial<OceanSunSettings>;
    geometry?: Partial<OceanGeometrySettings>;
    debug?: Partial<OceanDebugSettings>;
}
interface OceanConfigSnapshot {
    wave: OceanWaveSettings;
    shading: OceanShadingSettings;
    sun: OceanSunSettings;
    geometry: OceanGeometrySettings;
    debug: OceanDebugSettings;
}
declare function createDefaultOceanWaveOptions(): OceanWaveSettings;
declare function createDefaultOceanShadingOptions(): OceanShadingSettings;
declare function createDefaultOceanSunOptions(): OceanSunSettings;
declare function createDefaultOceanGeometryOptions(): OceanGeometrySettings;
declare function createDefaultOceanDebugOptions(): OceanDebugSettings;
declare function createDefaultOceanConfig(): OceanConfigSnapshot;
declare function getOceanConfigSnapshot(settings: OceanSettings): OceanConfigSnapshot;

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
    getConfig(): OceanConfigSnapshot;
    getWaveOptions(): OceanWaveSettings;
    getShadingOptions(): OceanShadingSettings;
    getSunOptions(): OceanSunSettings;
    getGeometryOptions(): OceanGeometrySettings;
    getDebugOptions(): OceanDebugSettings;
    setOptions(options: OceanOptions): void;
    setConfig(config: OceanConfig): void;
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

export { Ocean, type OceanConfig, type OceanConfigSnapshot, OceanDebugSettings, OceanGeometrySettings, type OceanOptions, OceanSettings, OceanShadingSettings, OceanSunSettings, type OceanUpdateParams, OceanWaveSettings, WaveSamplingParams, createDefaultOceanConfig, createDefaultOceanDebugOptions, createDefaultOceanGeometryOptions, createDefaultOceanOptions, createDefaultOceanShadingOptions, createDefaultOceanSunOptions, createDefaultOceanWaveOptions, createOcean, getOceanConfigSnapshot };

import * as three from 'three';
import { Camera, Vector3 } from 'three';

interface SkyDomeSettings {
    skyHorizonColor: string;
    skyZenithColor: string;
    sunIntensity: number;
    sunGlowPower: number;
    sunGlowIntensity: number;
    skyStrength: number;
    toneMapExposure: number;
}

type OceanSkyOptions = SkyDomeSettings;
declare class OceanSky {
    readonly object3d: three.Mesh<three.SphereGeometry, three.ShaderMaterial, three.Object3DEventMap>;
    private readonly dome;
    private readonly options;
    constructor(options?: Partial<OceanSkyOptions>);
    getOptions(): OceanSkyOptions;
    setOptions(options: Partial<OceanSkyOptions>): void;
    update(camera: Camera, sunDirection: Vector3): void;
    dispose(): void;
}
declare function createOceanSky(options?: Partial<OceanSkyOptions>): OceanSky;
declare function createDefaultOceanSkyOptions(): OceanSkyOptions;

export { OceanSky, type OceanSkyOptions, createDefaultOceanSkyOptions, createOceanSky };

import type { Camera, Vector3 } from "three";
import { SkyDome, type SkyDomeSettings } from "../ocean/SkyDome";

export type OceanSkyOptions = SkyDomeSettings;

const DEFAULT_OCEAN_SKY_OPTIONS: OceanSkyOptions = {
  skyHorizonColor: "#9dc7ea",
  skyZenithColor: "#2e5e96",
  sunIntensity: 1.2,
  sunGlowPower: 660.0,
  sunGlowIntensity: 210.0,
  skyStrength: 0.7,
  toneMapExposure: 2.1
};

function buildDefaultOceanSkyOptions(): OceanSkyOptions {
  return { ...DEFAULT_OCEAN_SKY_OPTIONS };
}

export class OceanSky {
  public readonly object3d;
  private readonly dome: SkyDome;
  private readonly options: OceanSkyOptions;

  constructor(options?: Partial<OceanSkyOptions>) {
    this.options = {
      ...buildDefaultOceanSkyOptions(),
      ...(options ?? {})
    };
    this.dome = new SkyDome();
    this.object3d = this.dome.mesh;
  }

  getOptions(): OceanSkyOptions {
    return { ...this.options };
  }

  setOptions(options: Partial<OceanSkyOptions>): void {
    Object.assign(this.options, options);
  }

  update(camera: Camera, sunDirection: Vector3): void {
    this.dome.update(this.options, sunDirection, camera);
  }

  dispose(): void {
    this.dome.dispose();
  }
}

export function createOceanSky(options?: Partial<OceanSkyOptions>): OceanSky {
  return new OceanSky(options);
}

export function createDefaultOceanSkyOptions(): OceanSkyOptions {
  return buildDefaultOceanSkyOptions();
}

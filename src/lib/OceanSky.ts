import type { Camera, Vector3 } from "three";
import { SkyDome, type SkyDomeSettings } from "../ocean/SkyDome";
import { cloneDefaultSettings } from "../ocean/types";

export type OceanSkyOptions = SkyDomeSettings;

function buildDefaultOceanSkyOptions(): OceanSkyOptions {
  const defaults = cloneDefaultSettings();
  return {
    skyHorizonColor: defaults.skyHorizonColor,
    skyZenithColor: defaults.skyZenithColor,
    sunIntensity: defaults.sunIntensity,
    sunGlowPower: defaults.sunGlowPower,
    sunGlowIntensity: defaults.sunGlowIntensity,
    skyStrength: defaults.skyStrength,
    toneMapExposure: defaults.toneMapExposure
  };
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

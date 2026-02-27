import type { Camera } from "three";
import { Vector3 } from "three";
import { OceanSystem } from "../ocean/OceanSystem";
import {
  cloneDefaultSettings,
  OCEAN_GEOMETRY_KEYS,
  toWaveSamplingParams,
  type OceanDebugSettings,
  type OceanGeometrySettings,
  type OceanSettings,
  type OceanShadingSettings,
  type OceanSunSettings,
  type OceanWaveSettings,
  type WaveSamplingParams
} from "../ocean/types";
import { sampleWaveHeight } from "../ocean/waveMath";

export type OceanOptions = Partial<OceanSettings>;

export interface OceanUpdateParams {
  camera: Camera;
  timeSec?: number;
  deltaTimeSec?: number;
}

const GEOMETRY_OPTION_KEYS = new Set<keyof OceanSettings>(OCEAN_GEOMETRY_KEYS);

function mergeWithDefaults(options?: OceanOptions): OceanSettings {
  return {
    ...cloneDefaultSettings(),
    ...(options ?? {})
  };
}

export class Ocean {
  public readonly object3d;
  private readonly settings: OceanSettings;
  private readonly system: OceanSystem;
  private timeSec = 0.0;

  constructor(options?: OceanOptions) {
    this.settings = mergeWithDefaults(options);
    this.system = new OceanSystem(this.settings);
    this.object3d = this.system.group;
    this.system.setTime(this.timeSec);
  }

  getOptions(): OceanSettings {
    return { ...this.settings };
  }

  setOptions(options: OceanOptions): void {
    this.applyOptions(options);
  }

  setWaveOptions(options: Partial<OceanWaveSettings>): void {
    this.applyOptions(options);
  }

  setShadingOptions(options: Partial<OceanShadingSettings>): void {
    this.applyOptions(options);
  }

  setSunOptions(options: Partial<OceanSunSettings>): void {
    this.applyOptions(options);
  }

  setGeometryOptions(options: Partial<OceanGeometrySettings>): void {
    this.applyOptions(options);
  }

  setDebugOptions(options: Partial<OceanDebugSettings>): void {
    this.applyOptions(options);
  }

  update({ camera, deltaTimeSec, timeSec }: OceanUpdateParams): void {
    if (typeof timeSec === "number" && Number.isFinite(timeSec)) {
      this.timeSec = timeSec;
    } else if (typeof deltaTimeSec === "number" && Number.isFinite(deltaTimeSec)) {
      this.timeSec += deltaTimeSec;
    }

    this.system.setTime(this.timeSec);
    this.system.update(camera);
  }

  advanceTime(deltaTimeSec: number): number {
    if (Number.isFinite(deltaTimeSec)) {
      this.timeSec += deltaTimeSec;
      this.system.setTime(this.timeSec);
    }
    return this.timeSec;
  }

  setTime(timeSec: number): void {
    this.timeSec = timeSec;
    this.system.setTime(timeSec);
  }

  getTime(): number {
    return this.timeSec;
  }

  sampleHeight(x: number, z: number, timeSec = this.timeSec): number {
    return this.system.sampleHeight(x, z, timeSec);
  }

  getSunDirection(target = new Vector3()): Vector3 {
    return this.system.getSunDirection(target);
  }

  getCenterXZ(): { x: number; z: number } {
    return this.system.getCenterXZ();
  }

  getMaxRadius(): number {
    return this.system.getMaxOceanRadius();
  }

  getWaveSamplingParams(): WaveSamplingParams {
    return toWaveSamplingParams(this.settings);
  }

  sampleHeightHeadless(x: number, z: number, timeSec: number): number {
    return sampleWaveHeight(x, z, timeSec, this.getWaveSamplingParams());
  }

  dispose(): void {
    this.system.dispose();
  }

  private applyOptions(options: OceanOptions): void {
    let rebuildGeometry = false;
    for (const key of Object.keys(options) as Array<keyof OceanSettings>) {
      const nextValue = options[key];
      if (typeof nextValue === "undefined") {
        continue;
      }
      if (this.settings[key] === nextValue) {
        continue;
      }
      this.settings[key] = nextValue as never;
      if (GEOMETRY_OPTION_KEYS.has(key)) {
        rebuildGeometry = true;
      }
    }

    if (rebuildGeometry) {
      this.system.rebuildGeometry();
    }
  }
}

export function createOcean(options?: OceanOptions): Ocean {
  return new Ocean(options);
}

export function createDefaultOceanOptions(): OceanSettings {
  return cloneDefaultSettings();
}

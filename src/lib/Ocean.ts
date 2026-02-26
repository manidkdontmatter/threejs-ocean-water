import type { Camera } from "three";
import { Vector3 } from "three";
import { OceanSystem } from "../ocean/OceanSystem";
import {
  cloneDefaultSettings,
  toWaveSamplingParams,
  type OceanSettings,
  type WaveSamplingParams
} from "../ocean/types";
import { sampleWaveHeight } from "../ocean/waveMath";

export type OceanOptions = Partial<OceanSettings>;

export interface OceanUpdateParams {
  camera: Camera;
  deltaTimeSec?: number;
  timeSec?: number;
}

const GEOMETRY_OPTION_KEYS = new Set<keyof OceanSettings>([
  "ringCount",
  "baseRingWidth",
  "ringWidthGrowth",
  "centerRadialSegments",
  "radialSegmentsDecay",
  "minRadialSegments",
  "angularSegments",
  "detailFalloff"
]);

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
    this.timeSec = this.settings.useServerTime ? this.settings.serverTimeSec : 0.0;
    this.system.setTime(this.timeSec);
  }

  getOptions(): OceanSettings {
    return { ...this.settings };
  }

  setOptions(options: OceanOptions): void {
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

  update({ camera, deltaTimeSec, timeSec }: OceanUpdateParams): void {
    if (typeof timeSec === "number" && Number.isFinite(timeSec)) {
      this.timeSec = timeSec;
      if (this.settings.useServerTime) {
        this.settings.serverTimeSec = timeSec;
      }
    } else if (typeof deltaTimeSec === "number" && Number.isFinite(deltaTimeSec)) {
      if (!this.settings.paused) {
        const scaledDelta = deltaTimeSec * this.settings.simulationSpeed;
        if (this.settings.useServerTime) {
          this.settings.serverTimeSec += scaledDelta;
          this.timeSec = this.settings.serverTimeSec;
        } else {
          this.timeSec += scaledDelta;
        }
      }
    }

    this.system.setTime(this.timeSec);
    this.system.update(camera);
  }

  setTime(timeSec: number): void {
    this.timeSec = timeSec;
    if (this.settings.useServerTime) {
      this.settings.serverTimeSec = timeSec;
    }
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
}

export function createOcean(options?: OceanOptions): Ocean {
  return new Ocean(options);
}

export function createDefaultOceanOptions(): OceanSettings {
  return cloneDefaultSettings();
}

import {
  cloneDefaultSettings,
  OCEAN_DEBUG_KEYS,
  OCEAN_GEOMETRY_KEYS,
  OCEAN_SHADING_KEYS,
  OCEAN_SUN_KEYS,
  OCEAN_WAVE_KEYS,
  toWaveSamplingParams
} from "../ocean/types";
import type {
  DebugViewMode,
  OceanDebugSettings,
  OceanGeometrySettings,
  OceanSettings,
  OceanShadingSettings,
  OceanSunSettings,
  OceanWaveSettings,
  WaveSamplingParams
} from "../ocean/types";

export type {
  DebugViewMode,
  OceanDebugSettings,
  OceanGeometrySettings,
  OceanSettings,
  OceanShadingSettings,
  OceanSunSettings,
  OceanWaveSettings,
  WaveSamplingParams
};

export interface OceanConfig {
  wave?: Partial<OceanWaveSettings>;
  shading?: Partial<OceanShadingSettings>;
  sun?: Partial<OceanSunSettings>;
  geometry?: Partial<OceanGeometrySettings>;
  debug?: Partial<OceanDebugSettings>;
}

export interface OceanConfigSnapshot {
  wave: OceanWaveSettings;
  shading: OceanShadingSettings;
  sun: OceanSunSettings;
  geometry: OceanGeometrySettings;
  debug: OceanDebugSettings;
}

function pickSettings<K extends keyof OceanSettings>(
  settings: OceanSettings,
  keys: readonly K[]
): Pick<OceanSettings, K> {
  const picked = {} as Pick<OceanSettings, K>;
  for (const key of keys) {
    picked[key] = settings[key];
  }
  return picked;
}

export function createDefaultOceanOptions(): OceanSettings {
  return cloneDefaultSettings();
}

export function createDefaultOceanWaveOptions(): OceanWaveSettings {
  return pickSettings(cloneDefaultSettings(), OCEAN_WAVE_KEYS) as OceanWaveSettings;
}

export function createDefaultOceanShadingOptions(): OceanShadingSettings {
  return pickSettings(cloneDefaultSettings(), OCEAN_SHADING_KEYS) as OceanShadingSettings;
}

export function createDefaultOceanSunOptions(): OceanSunSettings {
  return pickSettings(cloneDefaultSettings(), OCEAN_SUN_KEYS) as OceanSunSettings;
}

export function createDefaultOceanGeometryOptions(): OceanGeometrySettings {
  return pickSettings(cloneDefaultSettings(), OCEAN_GEOMETRY_KEYS) as OceanGeometrySettings;
}

export function createDefaultOceanDebugOptions(): OceanDebugSettings {
  return pickSettings(cloneDefaultSettings(), OCEAN_DEBUG_KEYS) as OceanDebugSettings;
}

export function createDefaultOceanConfig(): OceanConfigSnapshot {
  const defaults = cloneDefaultSettings();
  return getOceanConfigSnapshot(defaults);
}

export function getOceanConfigSnapshot(settings: OceanSettings): OceanConfigSnapshot {
  return {
    wave: pickSettings(settings, OCEAN_WAVE_KEYS) as OceanWaveSettings,
    shading: pickSettings(settings, OCEAN_SHADING_KEYS) as OceanShadingSettings,
    sun: pickSettings(settings, OCEAN_SUN_KEYS) as OceanSunSettings,
    geometry: pickSettings(settings, OCEAN_GEOMETRY_KEYS) as OceanGeometrySettings,
    debug: pickSettings(settings, OCEAN_DEBUG_KEYS) as OceanDebugSettings
  };
}

export function flattenOceanConfig(config: OceanConfig): Partial<OceanSettings> {
  return {
    ...(config.wave ?? {}),
    ...(config.shading ?? {}),
    ...(config.sun ?? {}),
    ...(config.geometry ?? {}),
    ...(config.debug ?? {})
  };
}

export function toOceanWaveSamplingParams(settings: OceanSettings): WaveSamplingParams {
  return toWaveSamplingParams(settings);
}

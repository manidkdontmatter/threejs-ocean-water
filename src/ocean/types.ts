export type DebugViewMode = "none" | "normals" | "height" | "fresnel" | "rings";

export interface OceanSettings {
  seaLevel: number;
  waveAmplitude: number;
  waveMean: number;
  dragMultiplier: number;
  baseFrequency: number;
  frequencyMultiplier: number;
  baseTimeMultiplier: number;
  timeMultiplierGrowth: number;
  weightDecay: number;
  waveDirectionSeed: number;
  phaseOffset: number;
  displacementOctaves: number;
  normalOctaves: number;
  normalEpsilon: number;
  highFrequencyFadeDistance: number;
  highFrequencyFadeStrength: number;
  fresnelBase: number;
  fresnelPower: number;
  reflectionStrength: number;
  scatterStrength: number;
  skyStrength: number;
  toneMapExposure: number;
  shallowColor: string;
  deepColor: string;
  foamEnabled: boolean;
  foamThreshold: number;
  foamIntensity: number;
  foamColor: string;
  skyHorizonColor: string;
  skyZenithColor: string;
  sunIntensity: number;
  sunGlowPower: number;
  sunGlowIntensity: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  animateSun: boolean;
  sunOrbitSpeed: number;
  ringCount: number;
  baseRingWidth: number;
  ringWidthGrowth: number;
  centerRadialSegments: number;
  radialSegmentsDecay: number;
  minRadialSegments: number;
  angularSegments: number;
  detailFalloff: number;
  followSnap: number;
  followCameraEveryFrame: boolean;
  farFadeStart: number;
  farFadeEnd: number;
  simulationSpeed: number;
  paused: boolean;
  useServerTime: boolean;
  serverTimeSec: number;
  wireframe: boolean;
  debugView: DebugViewMode;
}

export interface WaveSamplingParams {
  seaLevel: number;
  waveAmplitude: number;
  waveMean: number;
  dragMultiplier: number;
  baseFrequency: number;
  frequencyMultiplier: number;
  baseTimeMultiplier: number;
  timeMultiplierGrowth: number;
  weightDecay: number;
  waveDirectionSeed: number;
  phaseOffset: number;
  displacementOctaves: number;
}

export interface RingSpec {
  index: number;
  innerRadius: number;
  outerRadius: number;
  radialSegments: number;
  angularSegments: number;
  detailScale: number;
}

export const DEFAULT_OCEAN_SETTINGS: OceanSettings = {
  seaLevel: 0,
  waveAmplitude: 1.28,
  waveMean: 0.56,
  dragMultiplier: 0.28,
  baseFrequency: 1.0,
  frequencyMultiplier: 1.18,
  baseTimeMultiplier: 2.0,
  timeMultiplierGrowth: 1.07,
  weightDecay: 0.82,
  waveDirectionSeed: 0.0,
  phaseOffset: 0.0,
  displacementOctaves: 10,
  normalOctaves: 24,
  normalEpsilon: 0.08,
  highFrequencyFadeDistance: 350.0,
  highFrequencyFadeStrength: 0.92,
  fresnelBase: 0.04,
  fresnelPower: 5.0,
  reflectionStrength: 1.0,
  scatterStrength: 1.0,
  skyStrength: 0.7,
  toneMapExposure: 2.1,
  shallowColor: "#3b8ac5",
  deepColor: "#093a7a",
  foamEnabled: true,
  foamThreshold: 0.12,
  foamIntensity: 0.55,
  foamColor: "#dff7ff",
  skyHorizonColor: "#9dc7ea",
  skyZenithColor: "#2e5e96",
  sunIntensity: 1.2,
  sunGlowPower: 660.0,
  sunGlowIntensity: 210.0,
  sunElevationDeg: 34.0,
  sunAzimuthDeg: 20.0,
  animateSun: false,
  sunOrbitSpeed: 0.1,
  ringCount: 6,
  baseRingWidth: 42.0,
  ringWidthGrowth: 1.66,
  centerRadialSegments: 24,
  radialSegmentsDecay: 0.8,
  minRadialSegments: 4,
  angularSegments: 256,
  detailFalloff: 0.82,
  followSnap: 1.0,
  followCameraEveryFrame: false,
  farFadeStart: 460.0,
  farFadeEnd: 1050.0,
  simulationSpeed: 1.0,
  paused: false,
  useServerTime: false,
  serverTimeSec: 0.0,
  wireframe: false,
  debugView: "none"
};

export function toWaveSamplingParams(settings: OceanSettings): WaveSamplingParams {
  return {
    seaLevel: settings.seaLevel,
    waveAmplitude: settings.waveAmplitude,
    waveMean: settings.waveMean,
    dragMultiplier: settings.dragMultiplier,
    baseFrequency: settings.baseFrequency,
    frequencyMultiplier: settings.frequencyMultiplier,
    baseTimeMultiplier: settings.baseTimeMultiplier,
    timeMultiplierGrowth: settings.timeMultiplierGrowth,
    weightDecay: settings.weightDecay,
    waveDirectionSeed: settings.waveDirectionSeed,
    phaseOffset: settings.phaseOffset,
    displacementOctaves: settings.displacementOctaves
  };
}

export function cloneDefaultSettings(): OceanSettings {
  return { ...DEFAULT_OCEAN_SETTINGS };
}

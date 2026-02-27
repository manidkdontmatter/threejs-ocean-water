import GUI from "lil-gui";
import { cloneDefaultSettings, type OceanSettings } from "../ocean/types";

export interface OceanTimeControls {
  simulationSpeed: number;
  paused: boolean;
  useServerTime: boolean;
  serverTimeSec: number;
}

interface OceanGuiOptions {
  settings: OceanSettings;
  timeControls: OceanTimeControls;
  onRebuildGeometry: () => void;
  onSettingsChanged?: () => void;
}

const DEFAULT_TIME_CONTROLS: OceanTimeControls = {
  simulationSpeed: 1.0,
  paused: false,
  useServerTime: false,
  serverTimeSec: 0.0
};

export function createOceanGui({
  settings,
  timeControls,
  onRebuildGeometry,
  onSettingsChanged
}: OceanGuiOptions): GUI {
  const gui = new GUI({ title: "Ocean Controls", width: 380 });
  const controllers: Array<{ updateDisplay: () => void }> = [];
  if (onSettingsChanged) {
    gui.onChange(onSettingsChanged);
  }

  const qualityPreset = { preset: "Reference+" };
  const applyQualityPreset = (preset: string): void => {
    if (preset === "Reference+") {
      settings.displacementOctaves = 11;
      settings.normalOctaves = 24;
      settings.ringCount = 6;
      settings.centerRadialSegments = 24;
      settings.angularSegments = 256;
      settings.highFrequencyFadeStrength = 0.92;
      settings.detailFalloff = 0.82;
      settings.baseRingWidth = 42;
      settings.ringWidthGrowth = 1.66;
    } else if (preset === "Balanced") {
      settings.displacementOctaves = 9;
      settings.normalOctaves = 24;
      settings.ringCount = 5;
      settings.centerRadialSegments = 18;
      settings.angularSegments = 192;
      settings.highFrequencyFadeStrength = 0.84;
      settings.detailFalloff = 0.76;
      settings.baseRingWidth = 38;
      settings.ringWidthGrowth = 1.6;
    } else if (preset === "Performance") {
      settings.displacementOctaves = 6;
      settings.normalOctaves = 14;
      settings.ringCount = 4;
      settings.centerRadialSegments = 12;
      settings.angularSegments = 128;
      settings.highFrequencyFadeStrength = 0.7;
      settings.detailFalloff = 0.66;
      settings.baseRingWidth = 34;
      settings.ringWidthGrowth = 1.48;
    }
    onRebuildGeometry();
    controllers.forEach((controller) => controller.updateDisplay());
  };

  gui
    .add(qualityPreset, "preset", ["Reference+", "Balanced", "Performance"])
    .name("qualityPreset")
    .onChange(applyQualityPreset);

  const waveFolder = gui.addFolder("Wave Motion");
  controllers.push(
    waveFolder.add(settings, "displacementOctaves", 0, 40, 1),
    waveFolder.add(settings, "normalOctaves", 0, 40, 1)
  );

  controllers.push(
    waveFolder.add(settings, "waveAmplitude", 0.1, 4.0, 0.01),
    waveFolder.add(settings, "waveMean", 0.0, 1.2, 0.001),
    waveFolder.add(settings, "dragMultiplier", 0.0, 1.0, 0.001),
    waveFolder.add(settings, "baseFrequency", 0.1, 4.0, 0.001),
    waveFolder.add(settings, "frequencyMultiplier", 1.01, 2.0, 0.001),
    waveFolder.add(settings, "baseTimeMultiplier", 0.1, 6.0, 0.001),
    waveFolder.add(settings, "timeMultiplierGrowth", 1.0, 1.4, 0.001),
    waveFolder.add(settings, "weightDecay", 0.4, 0.98, 0.001),
    waveFolder.add(settings, "waveDirectionSeed", -10.0, 10.0, 0.0001),
    waveFolder.add(settings, "phaseOffset", -12.0, 12.0, 0.0001),
    waveFolder.add(settings, "normalEpsilon", 0.01, 0.5, 0.001),
    waveFolder.add(settings, "highFrequencyFadeDistance", 20, 2000, 1),
    waveFolder.add(settings, "highFrequencyFadeStrength", 0.0, 1.0, 0.001)
  );

  const shadingFolder = gui.addFolder("Shading");
  controllers.push(
    shadingFolder.add(settings, "fresnelBase", 0.0, 0.25, 0.001),
    shadingFolder.add(settings, "fresnelPower", 1.0, 9.0, 0.01),
    shadingFolder.add(settings, "reflectionStrength", 0.0, 2.4, 0.001),
    shadingFolder.add(settings, "scatterStrength", 0.0, 2.4, 0.001),
    shadingFolder.add(settings, "skyStrength", 0.0, 2.0, 0.001),
    shadingFolder.add(settings, "toneMapExposure", 0.1, 4.0, 0.001),
    shadingFolder.add(settings, "farFadeStart", 30, 2600, 1),
    shadingFolder.add(settings, "farFadeEnd", 60, 4200, 1)
  );

  const colorsFolder = gui.addFolder("Colors");
  controllers.push(
    colorsFolder.addColor(settings, "shallowColor"),
    colorsFolder.addColor(settings, "deepColor"),
    colorsFolder.addColor(settings, "foamColor"),
    colorsFolder.addColor(settings, "skyHorizonColor"),
    colorsFolder.addColor(settings, "skyZenithColor")
  );

  const sunFolder = gui.addFolder("Sun");
  controllers.push(
    sunFolder.add(settings, "sunIntensity", 0.0, 4.0, 0.001),
    sunFolder.add(settings, "sunGlowPower", 20.0, 1200.0, 1.0),
    sunFolder.add(settings, "sunGlowIntensity", 0.0, 320.0, 0.01),
    sunFolder.add(settings, "sunElevationDeg", 2.0, 88.0, 0.1),
    sunFolder.add(settings, "sunAzimuthDeg", -180.0, 180.0, 0.1),
    sunFolder.add(settings, "animateSun"),
    sunFolder.add(settings, "sunOrbitSpeed", -1.0, 1.0, 0.0001)
  );

  const foamFolder = gui.addFolder("Foam");
  controllers.push(
    foamFolder.add(settings, "foamEnabled"),
    foamFolder.add(settings, "foamThreshold", 0.0, 0.8, 0.001),
    foamFolder.add(settings, "foamIntensity", 0.0, 2.0, 0.001)
  );

  const lodFolder = gui.addFolder("LOD & Mesh");
  const rebuildController = () => onRebuildGeometry();
  controllers.push(
    lodFolder.add(settings, "ringCount", 1, 9, 1).onFinishChange(rebuildController),
    lodFolder.add(settings, "baseRingWidth", 8.0, 200.0, 0.1).onFinishChange(rebuildController),
    lodFolder.add(settings, "ringWidthGrowth", 1.02, 3.0, 0.001).onFinishChange(rebuildController),
    lodFolder
      .add(settings, "centerRadialSegments", 2, 64, 1)
      .onFinishChange(rebuildController),
    lodFolder
      .add(settings, "radialSegmentsDecay", 0.25, 1.0, 0.001)
      .onFinishChange(rebuildController),
    lodFolder.add(settings, "minRadialSegments", 1, 24, 1).onFinishChange(rebuildController),
    lodFolder.add(settings, "angularSegments", 16, 768, 1).onFinishChange(rebuildController),
    lodFolder.add(settings, "detailFalloff", 0.3, 1.0, 0.001).onFinishChange(rebuildController),
    lodFolder.add(settings, "followCameraEveryFrame").name("snapEveryFrame"),
    lodFolder.add(settings, "followSnap", 0.05, 20.0, 0.05)
  );

  const timeFolder = gui.addFolder("Time");
  controllers.push(
    timeFolder.add(timeControls, "simulationSpeed", 0.0, 4.0, 0.001),
    timeFolder.add(timeControls, "paused"),
    timeFolder.add(timeControls, "useServerTime"),
    timeFolder.add(timeControls, "serverTimeSec", 0.0, 86400, 0.001)
  );

  const debugFolder = gui.addFolder("Debug");
  controllers.push(
    debugFolder.add(settings, "wireframe"),
    debugFolder.add(settings, "debugView", ["none", "normals", "height", "fresnel", "rings"])
  );

  const actions = {
    rebuildLOD: () => onRebuildGeometry(),
    resetDefaults: () => {
      Object.assign(settings, cloneDefaultSettings());
      Object.assign(timeControls, DEFAULT_TIME_CONTROLS);
      onRebuildGeometry();
      controllers.forEach((controller) => controller.updateDisplay());
    }
  };
  gui.add(actions, "rebuildLOD");
  gui.add(actions, "resetDefaults");

  waveFolder.open();
  shadingFolder.open();
  lodFolder.open();

  return gui;
}

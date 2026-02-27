'use strict';

var three = require('three');

// src/lib/Ocean.ts
function buildRingSpecs(settings) {
  const rings = [];
  const ringCount = Math.max(1, Math.floor(settings.ringCount));
  const angularSegments = Math.max(16, Math.floor(settings.angularSegments));
  let innerRadius = 0;
  let ringWidth = Math.max(4, settings.baseRingWidth);
  for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
    const outerRadius = innerRadius + ringWidth;
    const rawRadialSegments = Math.round(
      settings.centerRadialSegments * Math.pow(settings.radialSegmentsDecay, ringIndex)
    );
    const radialSegments = Math.max(settings.minRadialSegments, rawRadialSegments);
    const detailScale = Math.max(0.12, Math.pow(settings.detailFalloff, ringIndex));
    rings.push({
      index: ringIndex,
      innerRadius,
      outerRadius,
      radialSegments,
      angularSegments,
      detailScale
    });
    innerRadius = outerRadius;
    ringWidth *= settings.ringWidthGrowth;
  }
  return rings;
}
function createRingGeometry(spec) {
  const radialVertices = spec.radialSegments + 1;
  const angularVertices = spec.angularSegments + 1;
  const totalVertices = radialVertices * angularVertices;
  const positionArray = new Float32Array(totalVertices * 3);
  const uvArray = new Float32Array(totalVertices * 2);
  const localRadiusArray = new Float32Array(totalVertices);
  const indices = [];
  let vertexOffset = 0;
  let uvOffset = 0;
  let radiusOffset = 0;
  for (let radial = 0; radial <= spec.radialSegments; radial += 1) {
    const radialT = radial / spec.radialSegments;
    const radius = spec.innerRadius + (spec.outerRadius - spec.innerRadius) * radialT;
    for (let angular = 0; angular <= spec.angularSegments; angular += 1) {
      const angularT = angular / spec.angularSegments;
      const angle = angularT * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positionArray[vertexOffset] = x;
      positionArray[vertexOffset + 1] = 0;
      positionArray[vertexOffset + 2] = z;
      vertexOffset += 3;
      uvArray[uvOffset] = 0.5 + x / (spec.outerRadius * 2);
      uvArray[uvOffset + 1] = 0.5 + z / (spec.outerRadius * 2);
      uvOffset += 2;
      localRadiusArray[radiusOffset] = radius;
      radiusOffset += 1;
    }
  }
  for (let radial = 0; radial < spec.radialSegments; radial += 1) {
    for (let angular = 0; angular < spec.angularSegments; angular += 1) {
      const row = radial * angularVertices;
      const nextRow = (radial + 1) * angularVertices;
      const a = row + angular;
      const b = nextRow + angular;
      const c = nextRow + angular + 1;
      const d = row + angular + 1;
      indices.push(a, c, b, a, d, c);
    }
  }
  const indexArray = totalVertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
  const geometry = new three.BufferGeometry();
  geometry.setAttribute("position", new three.BufferAttribute(positionArray, 3));
  geometry.setAttribute("uv", new three.BufferAttribute(uvArray, 2));
  geometry.setAttribute("aLocalRadius", new three.BufferAttribute(localRadiusArray, 1));
  geometry.setIndex(new three.BufferAttribute(indexArray, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
var vertexShader = `
precision highp float;

attribute float aLocalRadius;

uniform float uTime;
uniform float uSeaLevel;
uniform float uWaveAmplitude;
uniform float uWaveMean;
uniform float uDragMultiplier;
uniform float uBaseFrequency;
uniform float uFrequencyMultiplier;
uniform float uBaseTimeMultiplier;
uniform float uTimeMultiplierGrowth;
uniform float uWeightDecay;
uniform float uWaveDirectionSeed;
uniform float uPhaseOffset;
uniform float uDisplacementOctaves;
uniform float uRingDetailScale;
uniform float uHighFrequencyFadeDistance;
uniform float uHighFrequencyFadeStrength;

varying vec3 vWorldPos;
varying float vRawWave;
varying float vLocalRadius;
varying float vDetailScale;

#define MAX_OCTAVES 48

vec2 wavedx(vec2 position, vec2 direction, float frequency, float timeshift) {
  float x = dot(direction, position) * frequency + timeshift;
  float wave = exp(sin(x) - 1.0);
  float dx = wave * cos(x);
  return vec2(wave, -dx);
}

float getDistanceDetailFade(float octaveT, float distanceFromCamera) {
  if (uHighFrequencyFadeStrength <= 0.0001) {
    return 1.0;
  }

  float distFade = smoothstep(
    uHighFrequencyFadeDistance,
    uHighFrequencyFadeDistance * 2.5,
    distanceFromCamera
  );
  return clamp(1.0 - distFade * octaveT * uHighFrequencyFadeStrength, 0.0, 1.0);
}

float getWaves(vec2 position, float distanceFromCamera, float octaveCountFloat) {
  int octaveCount = int(clamp(floor(octaveCountFloat + 0.5), 0.0, float(MAX_OCTAVES)));
  if (octaveCount <= 0) {
    return uWaveMean;
  }
  float iter = 0.0;
  float frequency = uBaseFrequency;
  float timeMultiplier = uBaseTimeMultiplier;
  float weight = 1.0;
  float sumOfValues = 0.0;
  float sumOfWeights = 0.0;

  for (int i = 0; i < MAX_OCTAVES; i++) {
    if (i >= octaveCount) {
      break;
    }

    vec2 direction = vec2(sin(iter + uWaveDirectionSeed), cos(iter + uWaveDirectionSeed));
    vec2 waveData = wavedx(
      position,
      direction,
      frequency,
      uTime * timeMultiplier + uPhaseOffset
    );

    float octaveT = float(i) / max(float(octaveCount - 1), 1.0);
    float detailFade = getDistanceDetailFade(octaveT, distanceFromCamera);
    float octaveWeight = weight * detailFade;

    position += direction * waveData.y * octaveWeight * uDragMultiplier;
    sumOfValues += waveData.x * octaveWeight;
    sumOfWeights += octaveWeight;

    weight *= uWeightDecay;
    frequency *= uFrequencyMultiplier;
    timeMultiplier *= uTimeMultiplierGrowth;
    iter += 1232.399963;
  }

  return sumOfValues / max(sumOfWeights, 0.0001);
}

void main() {
  vec4 worldBase = modelMatrix * vec4(position, 1.0);
  float distanceFromCamera = distance(worldBase.xz, cameraPosition.xz);
  float rawWave = getWaves(worldBase.xz, distanceFromCamera, uDisplacementOctaves);
  worldBase.y = uSeaLevel + (rawWave - uWaveMean) * uWaveAmplitude;

  vWorldPos = worldBase.xyz;
  vRawWave = rawWave;
  vLocalRadius = aLocalRadius;
  vDetailScale = uRingDetailScale;

  gl_Position = projectionMatrix * viewMatrix * worldBase;
}
`;
var fragmentShader = `
precision highp float;

uniform float uTime;
uniform float uSeaLevel;
uniform float uWaveAmplitude;
uniform float uWaveMean;
uniform float uDragMultiplier;
uniform float uBaseFrequency;
uniform float uFrequencyMultiplier;
uniform float uBaseTimeMultiplier;
uniform float uTimeMultiplierGrowth;
uniform float uWeightDecay;
uniform float uWaveDirectionSeed;
uniform float uPhaseOffset;
uniform float uDisplacementOctaves;
uniform float uNormalOctaves;
uniform float uNormalEpsilon;
uniform float uHighFrequencyFadeDistance;
uniform float uHighFrequencyFadeStrength;
uniform float uFresnelBase;
uniform float uFresnelPower;
uniform float uReflectionStrength;
uniform float uScatterStrength;
uniform float uSkyStrength;
uniform float uToneMapExposure;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform vec3 uFoamColor;
uniform float uFoamEnabled;
uniform float uFoamThreshold;
uniform float uFoamIntensity;
uniform vec3 uSkyHorizonColor;
uniform vec3 uSkyZenithColor;
uniform vec3 uSunDirection;
uniform float uSunIntensity;
uniform float uSunGlowPower;
uniform float uSunGlowIntensity;
uniform float uFarFadeStart;
uniform float uFarFadeEnd;
uniform float uRingDetailScale;
uniform int uDebugMode;

varying vec3 vWorldPos;
varying float vRawWave;
varying float vLocalRadius;
varying float vDetailScale;

#define MAX_OCTAVES 48

vec2 wavedx(vec2 position, vec2 direction, float frequency, float timeshift) {
  float x = dot(direction, position) * frequency + timeshift;
  float wave = exp(sin(x) - 1.0);
  float dx = wave * cos(x);
  return vec2(wave, -dx);
}

float getDistanceDetailFade(float octaveT, float distanceFromCamera) {
  if (uHighFrequencyFadeStrength <= 0.0001) {
    return 1.0;
  }

  float distFade = smoothstep(
    uHighFrequencyFadeDistance,
    uHighFrequencyFadeDistance * 2.5,
    distanceFromCamera
  );
  return clamp(1.0 - distFade * octaveT * uHighFrequencyFadeStrength, 0.0, 1.0);
}

float getWaves(vec2 position, float distanceFromCamera, float octaveCountFloat) {
  int octaveCount = int(clamp(floor(octaveCountFloat + 0.5), 0.0, float(MAX_OCTAVES)));
  if (octaveCount <= 0) {
    return uWaveMean;
  }
  float iter = 0.0;
  float frequency = uBaseFrequency;
  float timeMultiplier = uBaseTimeMultiplier;
  float weight = 1.0;
  float sumOfValues = 0.0;
  float sumOfWeights = 0.0;

  for (int i = 0; i < MAX_OCTAVES; i++) {
    if (i >= octaveCount) {
      break;
    }

    vec2 direction = vec2(sin(iter + uWaveDirectionSeed), cos(iter + uWaveDirectionSeed));
    vec2 waveData = wavedx(
      position,
      direction,
      frequency,
      uTime * timeMultiplier + uPhaseOffset
    );

    float octaveT = float(i) / max(float(octaveCount - 1), 1.0);
    float detailFade = getDistanceDetailFade(octaveT, distanceFromCamera);
    float octaveWeight = weight * detailFade;

    position += direction * waveData.y * octaveWeight * uDragMultiplier;
    sumOfValues += waveData.x * octaveWeight;
    sumOfWeights += octaveWeight;

    weight *= uWeightDecay;
    frequency *= uFrequencyMultiplier;
    timeMultiplier *= uTimeMultiplierGrowth;
    iter += 1232.399963;
  }

  return sumOfValues / max(sumOfWeights, 0.0001);
}

float sampleHeight(vec2 worldXZ, float octaveCountFloat) {
  float distanceFromCamera = distance(worldXZ, cameraPosition.xz);
  float wave = getWaves(worldXZ, distanceFromCamera, octaveCountFloat);
  return uSeaLevel + (wave - uWaveMean) * uWaveAmplitude;
}

vec3 extraCheapAtmosphere(vec3 raydir, vec3 sundir) {
  sundir.y = max(sundir.y, -0.07);
  float specialA = 1.0 / (raydir.y * 1.0 + 0.1);
  float specialB = 1.0 / (sundir.y * 11.0 + 1.0);
  float raySunDt = pow(abs(dot(sundir, raydir)), 2.0);
  float sunDt = pow(max(0.0, dot(sundir, raydir)), 8.0);
  float mie = sunDt * specialA * 0.2;
  vec3 sunColor = mix(
    vec3(1.0),
    max(vec3(0.0), vec3(1.0) - vec3(5.5, 13.0, 22.4) / 22.4),
    specialB
  );
  vec3 blueSky = vec3(5.5, 13.0, 22.4) / 22.4 * sunColor;
  vec3 blueSky2 = max(
    vec3(0.0),
    blueSky - vec3(5.5, 13.0, 22.4) * 0.002 * (specialA + -6.0 * sundir.y * sundir.y)
  );
  blueSky2 *= specialA * (0.24 + raySunDt * 0.24);
  return blueSky2 * (1.0 + pow(1.0 - raydir.y, 3.0)) + mie * sunColor;
}

float getSun(vec3 dir) {
  return pow(max(0.0, dot(dir, normalize(uSunDirection))), uSunGlowPower) * uSunGlowIntensity;
}

vec3 getSky(vec3 dir) {
  vec3 ndir = normalize(dir);
  float horizon = clamp(ndir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 gradient = mix(uSkyHorizonColor, uSkyZenithColor, pow(horizon, 0.65));
  vec3 atmosphere = extraCheapAtmosphere(ndir, normalize(uSunDirection)) * uSkyStrength;
  vec3 sun = vec3(getSun(ndir) * uSunIntensity);
  return gradient + atmosphere + sun;
}

vec3 acesTonemap(vec3 color) {
  mat3 m1 = mat3(
    0.59719, 0.07600, 0.02840,
    0.35458, 0.90834, 0.13383,
    0.04823, 0.01566, 0.83777
  );
  mat3 m2 = mat3(
    1.60475, -0.10208, -0.00327,
    -0.53108, 1.10813, -0.07276,
    -0.07367, -0.00605, 1.07602
  );
  vec3 v = m1 * color;
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return pow(clamp(m2 * (a / b), 0.0, 1.0), vec3(1.0 / 2.2));
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 viewRay = normalize(vWorldPos - cameraPosition);

  vec3 N = vec3(0.0, 1.0, 0.0);
  if (uNormalOctaves > 0.0) {
    float normalOctaves = max(1.0, uNormalOctaves);
    float h = sampleHeight(vWorldPos.xz, normalOctaves);
    float hx = sampleHeight(vWorldPos.xz + vec2(uNormalEpsilon, 0.0), normalOctaves);
    float hz = sampleHeight(vWorldPos.xz + vec2(0.0, uNormalEpsilon), normalOctaves);
    vec3 dx = vec3(uNormalEpsilon, hx - h, 0.0);
    vec3 dz = vec3(0.0, hz - h, uNormalEpsilon);
    N = normalize(cross(dz, dx));
    if (N.y < 0.0) {
      N = -N;
    }
  }

  float cosTheta = max(0.0, dot(N, viewDir));
  float fresnel = uFresnelBase + (1.0 - uFresnelBase) * pow(1.0 - cosTheta, uFresnelPower);

  vec3 reflectionRay = reflect(-viewDir, N);
  reflectionRay.y = abs(reflectionRay.y);
  vec3 reflection = getSky(reflectionRay) * uReflectionStrength;

  float depthFactor = clamp((uSeaLevel - vWorldPos.y) / max(uWaveAmplitude, 0.001) * 0.5 + 0.5, 0.0, 1.0);
  vec3 scattering = mix(uShallowColor, uDeepColor, depthFactor) * uScatterStrength;

  float slope = 1.0 - clamp(N.y, 0.0, 1.0);
  float crest = smoothstep(uWaveMean + 0.1, uWaveMean + 0.45, vRawWave);
  float foam = smoothstep(uFoamThreshold, 1.0, slope) * crest * uFoamIntensity * uFoamEnabled;

  vec3 color = mix(scattering, reflection, fresnel);
  color = mix(color, uFoamColor, clamp(foam, 0.0, 1.0));

  float distanceFromCamera = distance(vWorldPos.xz, cameraPosition.xz);
  float farFade = smoothstep(uFarFadeStart, uFarFadeEnd, distanceFromCamera);
  vec3 skyAlongRay = getSky(-viewRay);
  vec3 shadedColor = mix(color, skyAlongRay, farFade);

  if (uDebugMode == 1) {
    shadedColor = N * 0.5 + 0.5;
  } else if (uDebugMode == 2) {
    float waveHeightN = clamp((vWorldPos.y - uSeaLevel) / max(uWaveAmplitude * 2.0, 0.001) + 0.5, 0.0, 1.0);
    shadedColor = vec3(
      smoothstep(0.4, 1.0, waveHeightN),
      1.0 - abs(waveHeightN - 0.5) * 1.5,
      smoothstep(0.0, 0.6, 1.0 - waveHeightN)
    );
  } else if (uDebugMode == 3) {
    shadedColor = vec3(fresnel);
  } else if (uDebugMode == 4) {
    shadedColor = vec3(vDetailScale, 0.2, 1.0 - vDetailScale);
  }

  gl_FragColor = vec4(acesTonemap(shadedColor * uToneMapExposure), 1.0);
}
`;
function createOceanMaterial(ringDetailScale) {
  return new three.ShaderMaterial({
    name: "OceanRingMaterial",
    uniforms: {
      uTime: { value: 0 },
      uSeaLevel: { value: 0 },
      uWaveAmplitude: { value: 1 },
      uWaveMean: { value: 0.56 },
      uDragMultiplier: { value: 0.28 },
      uBaseFrequency: { value: 1 },
      uFrequencyMultiplier: { value: 1.18 },
      uBaseTimeMultiplier: { value: 2 },
      uTimeMultiplierGrowth: { value: 1.07 },
      uWeightDecay: { value: 0.82 },
      uWaveDirectionSeed: { value: 0 },
      uPhaseOffset: { value: 0 },
      uDisplacementOctaves: { value: 10 },
      uNormalOctaves: { value: 32 },
      uNormalEpsilon: { value: 0.08 },
      uHighFrequencyFadeDistance: { value: 350 },
      uHighFrequencyFadeStrength: { value: 0.9 },
      uFresnelBase: { value: 0.04 },
      uFresnelPower: { value: 5 },
      uReflectionStrength: { value: 1 },
      uScatterStrength: { value: 1 },
      uSkyStrength: { value: 0.7 },
      uToneMapExposure: { value: 2.1 },
      uShallowColor: { value: new three.Color("#3b8ac5") },
      uDeepColor: { value: new three.Color("#093a7a") },
      uFoamColor: { value: new three.Color("#dff7ff") },
      uFoamEnabled: { value: 1 },
      uFoamThreshold: { value: 0.12 },
      uFoamIntensity: { value: 0.55 },
      uSkyHorizonColor: { value: new three.Color("#9dc7ea") },
      uSkyZenithColor: { value: new three.Color("#2e5e96") },
      uSunDirection: { value: new three.Vector3(0.6, 0.8, 0.2) },
      uSunIntensity: { value: 1.2 },
      uSunGlowPower: { value: 660 },
      uSunGlowIntensity: { value: 210 },
      uFarFadeStart: { value: 460 },
      uFarFadeEnd: { value: 1050 },
      uRingDetailScale: { value: ringDetailScale },
      uDebugMode: { value: 0 }
    },
    vertexShader,
    fragmentShader
  });
}

// src/ocean/types.ts
var OCEAN_GEOMETRY_KEYS = [
  "ringCount",
  "baseRingWidth",
  "ringWidthGrowth",
  "centerRadialSegments",
  "radialSegmentsDecay",
  "minRadialSegments",
  "angularSegments",
  "detailFalloff"
];
var DEFAULT_OCEAN_SETTINGS = {
  seaLevel: 0,
  waveAmplitude: 1.28,
  waveMean: 0.56,
  dragMultiplier: 0.28,
  baseFrequency: 1,
  frequencyMultiplier: 1.18,
  baseTimeMultiplier: 2,
  timeMultiplierGrowth: 1.07,
  weightDecay: 0.82,
  waveDirectionSeed: 0,
  phaseOffset: 0,
  displacementOctaves: 10,
  normalOctaves: 24,
  normalEpsilon: 0.08,
  highFrequencyFadeDistance: 350,
  highFrequencyFadeStrength: 0.92,
  fresnelBase: 0.04,
  fresnelPower: 5,
  reflectionStrength: 1,
  scatterStrength: 1,
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
  sunGlowPower: 660,
  sunGlowIntensity: 210,
  sunElevationDeg: 34,
  sunAzimuthDeg: 20,
  animateSun: false,
  sunOrbitSpeed: 0.1,
  ringCount: 6,
  baseRingWidth: 42,
  ringWidthGrowth: 1.66,
  centerRadialSegments: 24,
  radialSegmentsDecay: 0.8,
  minRadialSegments: 4,
  angularSegments: 256,
  detailFalloff: 0.82,
  followSnap: 1,
  followCameraEveryFrame: false,
  farFadeStart: 460,
  farFadeEnd: 1050,
  wireframe: false,
  debugView: "none"
};
function toWaveSamplingParams(settings) {
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
function cloneDefaultSettings() {
  return { ...DEFAULT_OCEAN_SETTINGS };
}

// src/ocean/waveMath.ts
var OCTAVE_DIRECTION_STEP = 1232.399963;
function waveDx(posX, posZ, dirX, dirZ, frequency, timeShift) {
  const x = (dirX * posX + dirZ * posZ) * frequency + timeShift;
  const wave = Math.exp(Math.sin(x) - 1);
  const derivative = -wave * Math.cos(x);
  return { wave, derivative };
}
function sampleWaveValue(x, z, timeSec, params, octaves = params.displacementOctaves) {
  const totalOctaves = Math.max(0, Math.floor(octaves));
  if (totalOctaves === 0) {
    return params.waveMean;
  }
  let iter = 0;
  let frequency = params.baseFrequency;
  let timeMultiplier = params.baseTimeMultiplier;
  let weight = 1;
  let sumValues = 0;
  let sumWeights = 0;
  let sampleX = x;
  let sampleZ = z;
  for (let i = 0; i < totalOctaves; i += 1) {
    const directionX = Math.sin(iter + params.waveDirectionSeed);
    const directionZ = Math.cos(iter + params.waveDirectionSeed);
    const { wave, derivative } = waveDx(
      sampleX,
      sampleZ,
      directionX,
      directionZ,
      frequency,
      timeSec * timeMultiplier + params.phaseOffset
    );
    sampleX += directionX * derivative * weight * params.dragMultiplier;
    sampleZ += directionZ * derivative * weight * params.dragMultiplier;
    sumValues += wave * weight;
    sumWeights += weight;
    weight *= params.weightDecay;
    frequency *= params.frequencyMultiplier;
    timeMultiplier *= params.timeMultiplierGrowth;
    iter += OCTAVE_DIRECTION_STEP;
  }
  return sumWeights > 0 ? sumValues / sumWeights : 0;
}
function sampleWaveHeight(x, z, timeSec, params, octaves = params.displacementOctaves) {
  const raw = sampleWaveValue(x, z, timeSec, params, octaves);
  return params.seaLevel + (raw - params.waveMean) * params.waveAmplitude;
}

// src/ocean/OceanSystem.ts
var OceanSystem = class {
  constructor(settings) {
    this.settings = settings;
    this.group.name = "OceanSystem";
    this.ringDebugGroup.name = "OceanLODHelpers";
    this.group.add(this.ringDebugGroup);
    this.rebuildGeometry();
  }
  group = new three.Group();
  ringDebugGroup = new three.Group();
  shallowColor = new three.Color();
  deepColor = new three.Color();
  foamColor = new three.Color();
  skyHorizonColor = new three.Color();
  skyZenithColor = new three.Color();
  sunDirection = new three.Vector3();
  rings = [];
  timeSec = 0;
  setTime(timeSec) {
    this.timeSec = timeSec;
  }
  getTime() {
    return this.timeSec;
  }
  getSunDirection(target = new three.Vector3()) {
    return target.copy(this.sunDirection);
  }
  getMaxOceanRadius() {
    if (this.rings.length === 0) {
      return 0;
    }
    return this.rings[this.rings.length - 1].spec.outerRadius;
  }
  getCenterXZ() {
    return { x: this.group.position.x, z: this.group.position.z };
  }
  getRingSummary() {
    return this.rings.map((ring) => ({
      innerRadius: ring.spec.innerRadius,
      outerRadius: ring.spec.outerRadius,
      detailScale: ring.spec.detailScale
    }));
  }
  sampleHeight(x, z, timeSec = this.timeSec) {
    return sampleWaveHeight(x, z, timeSec, toWaveSamplingParams(this.settings));
  }
  rebuildGeometry() {
    this.disposeRings();
    const ringSpecs = buildRingSpecs(this.settings);
    for (const spec of ringSpecs) {
      const geometry = createRingGeometry(spec);
      const material = createOceanMaterial(spec.detailScale);
      const mesh = new three.Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.name = `OceanRing_${spec.index}`;
      mesh.renderOrder = 10 + spec.index;
      this.group.add(mesh);
      const helper = this.createRingHelper(spec);
      this.ringDebugGroup.add(helper);
      this.rings.push({ spec, mesh, helper });
    }
  }
  update(camera) {
    const snap = Math.max(1e-3, this.settings.followSnap);
    const centerX = this.settings.followCameraEveryFrame ? camera.position.x : Math.round(camera.position.x / snap) * snap;
    const centerZ = this.settings.followCameraEveryFrame ? camera.position.z : Math.round(camera.position.z / snap) * snap;
    this.group.position.set(centerX, 0, centerZ);
    this.updateSunDirection();
    this.updateUniforms(camera);
    this.ringDebugGroup.visible = this.settings.debugView === "rings";
  }
  dispose() {
    this.disposeRings();
  }
  updateSunDirection() {
    const azimuthDeg = this.settings.sunAzimuthDeg + (this.settings.animateSun ? this.timeSec * this.settings.sunOrbitSpeed * 57.2957795 : 0);
    const azimuth = three.MathUtils.degToRad(azimuthDeg);
    const elevation = three.MathUtils.degToRad(this.settings.sunElevationDeg);
    const cosElevation = Math.cos(elevation);
    this.sunDirection.set(
      Math.cos(azimuth) * cosElevation,
      Math.sin(elevation),
      Math.sin(azimuth) * cosElevation
    ).normalize();
  }
  updateUniforms(_camera) {
    const debugMode = this.getDebugModeId();
    this.shallowColor.set(this.settings.shallowColor);
    this.deepColor.set(this.settings.deepColor);
    this.foamColor.set(this.settings.foamColor);
    this.skyHorizonColor.set(this.settings.skyHorizonColor);
    this.skyZenithColor.set(this.settings.skyZenithColor);
    for (const ring of this.rings) {
      const { uniforms } = ring.mesh.material;
      uniforms.uTime.value = this.timeSec;
      uniforms.uSeaLevel.value = this.settings.seaLevel;
      uniforms.uWaveAmplitude.value = this.settings.waveAmplitude;
      uniforms.uWaveMean.value = this.settings.waveMean;
      uniforms.uDragMultiplier.value = this.settings.dragMultiplier;
      uniforms.uBaseFrequency.value = this.settings.baseFrequency;
      uniforms.uFrequencyMultiplier.value = this.settings.frequencyMultiplier;
      uniforms.uBaseTimeMultiplier.value = this.settings.baseTimeMultiplier;
      uniforms.uTimeMultiplierGrowth.value = this.settings.timeMultiplierGrowth;
      uniforms.uWeightDecay.value = this.settings.weightDecay;
      uniforms.uWaveDirectionSeed.value = this.settings.waveDirectionSeed;
      uniforms.uPhaseOffset.value = this.settings.phaseOffset;
      uniforms.uDisplacementOctaves.value = this.settings.displacementOctaves;
      uniforms.uNormalOctaves.value = this.settings.normalOctaves;
      uniforms.uNormalEpsilon.value = this.settings.normalEpsilon;
      uniforms.uHighFrequencyFadeDistance.value = this.settings.highFrequencyFadeDistance;
      uniforms.uHighFrequencyFadeStrength.value = this.settings.highFrequencyFadeStrength;
      uniforms.uFresnelBase.value = this.settings.fresnelBase;
      uniforms.uFresnelPower.value = this.settings.fresnelPower;
      uniforms.uReflectionStrength.value = this.settings.reflectionStrength;
      uniforms.uScatterStrength.value = this.settings.scatterStrength;
      uniforms.uSkyStrength.value = this.settings.skyStrength;
      uniforms.uToneMapExposure.value = this.settings.toneMapExposure;
      uniforms.uShallowColor.value.copy(this.shallowColor);
      uniforms.uDeepColor.value.copy(this.deepColor);
      uniforms.uFoamColor.value.copy(this.foamColor);
      uniforms.uFoamEnabled.value = this.settings.foamEnabled ? 1 : 0;
      uniforms.uFoamThreshold.value = this.settings.foamThreshold;
      uniforms.uFoamIntensity.value = this.settings.foamIntensity;
      uniforms.uSkyHorizonColor.value.copy(this.skyHorizonColor);
      uniforms.uSkyZenithColor.value.copy(this.skyZenithColor);
      uniforms.uSunDirection.value.copy(this.sunDirection);
      uniforms.uSunIntensity.value = this.settings.sunIntensity;
      uniforms.uSunGlowPower.value = this.settings.sunGlowPower;
      uniforms.uSunGlowIntensity.value = this.settings.sunGlowIntensity;
      uniforms.uFarFadeStart.value = this.settings.farFadeStart;
      uniforms.uFarFadeEnd.value = this.settings.farFadeEnd;
      uniforms.uRingDetailScale.value = ring.spec.detailScale;
      uniforms.uDebugMode.value = debugMode;
      ring.mesh.material.wireframe = this.settings.wireframe;
      const helperColor = ring.helper.material.color;
      helperColor.setHSL(0.58 - ring.spec.detailScale * 0.2, 0.8, 0.56);
      ring.helper.position.y = this.settings.seaLevel + 0.03;
    }
  }
  createRingHelper(spec) {
    const helperSegments = Math.max(32, Math.floor(spec.angularSegments / 4));
    const geometry = new three.BufferGeometry();
    geometry.setFromPoints(
      Array.from({ length: helperSegments }, (_, i) => {
        const angle = i / helperSegments * Math.PI * 2;
        return new three.Vector3(Math.cos(angle) * spec.outerRadius, 0, Math.sin(angle) * spec.outerRadius);
      })
    );
    const material = new three.LineBasicMaterial({
      color: "#7ec6ff",
      transparent: true,
      opacity: 0.62,
      depthWrite: false
    });
    const helper = new three.LineLoop(geometry, material);
    helper.renderOrder = 1e3 + spec.index;
    helper.frustumCulled = false;
    return helper;
  }
  getDebugModeId() {
    switch (this.settings.debugView) {
      case "normals":
        return 1;
      case "height":
        return 2;
      case "fresnel":
        return 3;
      case "rings":
        return 4;
      default:
        return 0;
    }
  }
  disposeRings() {
    for (const ring of this.rings) {
      this.group.remove(ring.mesh);
      this.ringDebugGroup.remove(ring.helper);
      ring.mesh.geometry.dispose();
      ring.mesh.material.dispose();
      ring.helper.geometry.dispose();
      ring.helper.material.dispose();
    }
    this.rings = [];
  }
};

// src/lib/Ocean.ts
var GEOMETRY_OPTION_KEYS = new Set(OCEAN_GEOMETRY_KEYS);
function mergeWithDefaults(options) {
  return {
    ...cloneDefaultSettings(),
    ...options ?? {}
  };
}
var Ocean = class {
  object3d;
  settings;
  system;
  timeSec = 0;
  constructor(options) {
    this.settings = mergeWithDefaults(options);
    this.system = new OceanSystem(this.settings);
    this.object3d = this.system.group;
    this.system.setTime(this.timeSec);
  }
  getOptions() {
    return { ...this.settings };
  }
  setOptions(options) {
    this.applyOptions(options);
  }
  setWaveOptions(options) {
    this.applyOptions(options);
  }
  setShadingOptions(options) {
    this.applyOptions(options);
  }
  setSunOptions(options) {
    this.applyOptions(options);
  }
  setGeometryOptions(options) {
    this.applyOptions(options);
  }
  setDebugOptions(options) {
    this.applyOptions(options);
  }
  update({ camera, deltaTimeSec, timeSec }) {
    if (typeof timeSec === "number" && Number.isFinite(timeSec)) {
      this.timeSec = timeSec;
    } else if (typeof deltaTimeSec === "number" && Number.isFinite(deltaTimeSec)) {
      this.timeSec += deltaTimeSec;
    }
    this.system.setTime(this.timeSec);
    this.system.update(camera);
  }
  advanceTime(deltaTimeSec) {
    if (Number.isFinite(deltaTimeSec)) {
      this.timeSec += deltaTimeSec;
      this.system.setTime(this.timeSec);
    }
    return this.timeSec;
  }
  setTime(timeSec) {
    this.timeSec = timeSec;
    this.system.setTime(timeSec);
  }
  getTime() {
    return this.timeSec;
  }
  sampleHeight(x, z, timeSec = this.timeSec) {
    return this.system.sampleHeight(x, z, timeSec);
  }
  getSunDirection(target = new three.Vector3()) {
    return this.system.getSunDirection(target);
  }
  getCenterXZ() {
    return this.system.getCenterXZ();
  }
  getMaxRadius() {
    return this.system.getMaxOceanRadius();
  }
  getWaveSamplingParams() {
    return toWaveSamplingParams(this.settings);
  }
  sampleHeightHeadless(x, z, timeSec) {
    return sampleWaveHeight(x, z, timeSec, this.getWaveSamplingParams());
  }
  dispose() {
    this.system.dispose();
  }
  applyOptions(options) {
    let rebuildGeometry = false;
    for (const key of Object.keys(options)) {
      const nextValue = options[key];
      if (typeof nextValue === "undefined") {
        continue;
      }
      if (this.settings[key] === nextValue) {
        continue;
      }
      this.settings[key] = nextValue;
      if (GEOMETRY_OPTION_KEYS.has(key)) {
        rebuildGeometry = true;
      }
    }
    if (rebuildGeometry) {
      this.system.rebuildGeometry();
    }
  }
};
function createOcean(options) {
  return new Ocean(options);
}
function createDefaultOceanOptions() {
  return cloneDefaultSettings();
}

exports.Ocean = Ocean;
exports.createDefaultOceanOptions = createDefaultOceanOptions;
exports.createOcean = createOcean;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map
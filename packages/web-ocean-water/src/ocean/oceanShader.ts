import { Color, ShaderMaterial, Vector3 } from "three";

const vertexShader = `
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

const fragmentShader = `
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

export function createOceanMaterial(ringDetailScale: number): ShaderMaterial {
  return new ShaderMaterial({
    name: "OceanRingMaterial",
    uniforms: {
      uTime: { value: 0.0 },
      uSeaLevel: { value: 0.0 },
      uWaveAmplitude: { value: 1.0 },
      uWaveMean: { value: 0.56 },
      uDragMultiplier: { value: 0.28 },
      uBaseFrequency: { value: 1.0 },
      uFrequencyMultiplier: { value: 1.18 },
      uBaseTimeMultiplier: { value: 2.0 },
      uTimeMultiplierGrowth: { value: 1.07 },
      uWeightDecay: { value: 0.82 },
      uWaveDirectionSeed: { value: 0.0 },
      uPhaseOffset: { value: 0.0 },
      uDisplacementOctaves: { value: 10.0 },
      uNormalOctaves: { value: 32.0 },
      uNormalEpsilon: { value: 0.08 },
      uHighFrequencyFadeDistance: { value: 350.0 },
      uHighFrequencyFadeStrength: { value: 0.9 },
      uFresnelBase: { value: 0.04 },
      uFresnelPower: { value: 5.0 },
      uReflectionStrength: { value: 1.0 },
      uScatterStrength: { value: 1.0 },
      uSkyStrength: { value: 0.7 },
      uToneMapExposure: { value: 2.1 },
      uShallowColor: { value: new Color("#3b8ac5") },
      uDeepColor: { value: new Color("#093a7a") },
      uFoamColor: { value: new Color("#dff7ff") },
      uFoamEnabled: { value: 1.0 },
      uFoamThreshold: { value: 0.12 },
      uFoamIntensity: { value: 0.55 },
      uSkyHorizonColor: { value: new Color("#9dc7ea") },
      uSkyZenithColor: { value: new Color("#2e5e96") },
      uSunDirection: { value: new Vector3(0.6, 0.8, 0.2) },
      uSunIntensity: { value: 1.2 },
      uSunGlowPower: { value: 660.0 },
      uSunGlowIntensity: { value: 210.0 },
      uFarFadeStart: { value: 460.0 },
      uFarFadeEnd: { value: 1050.0 },
      uRingDetailScale: { value: ringDetailScale },
      uDebugMode: { value: 0 }
    },
    vertexShader,
    fragmentShader
  });
}

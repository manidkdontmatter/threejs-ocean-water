'use strict';

var three = require('three');

// src/ocean/SkyDome.ts
var vertexShader = `
precision highp float;

varying vec3 vWorldPos;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;
var fragmentShader = `
precision highp float;

uniform vec3 uSkyHorizonColor;
uniform vec3 uSkyZenithColor;
uniform vec3 uSunDirection;
uniform float uSunIntensity;
uniform float uSunGlowPower;
uniform float uSunGlowIntensity;
uniform float uSkyStrength;
uniform float uToneMapExposure;

varying vec3 vWorldPos;

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
  vec3 dir = normalize(vWorldPos - cameraPosition);
  float horizon = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 gradient = mix(uSkyHorizonColor, uSkyZenithColor, pow(horizon, 0.72));
  vec3 atmosphere = extraCheapAtmosphere(dir, normalize(uSunDirection)) * uSkyStrength;
  vec3 sun = vec3(getSun(dir) * uSunIntensity);
  vec3 color = gradient + atmosphere + sun;
  gl_FragColor = vec4(acesTonemap(color * uToneMapExposure), 1.0);
}
`;
var SkyDome = class {
  mesh;
  horizonColor = new three.Color();
  zenithColor = new three.Color();
  constructor() {
    const geometry = new three.SphereGeometry(7600, 64, 32);
    const material = new three.ShaderMaterial({
      name: "OceanSkyDome",
      side: three.BackSide,
      depthWrite: false,
      uniforms: {
        uSkyHorizonColor: { value: new three.Color("#9dc7ea") },
        uSkyZenithColor: { value: new three.Color("#2e5e96") },
        uSunDirection: { value: new three.Vector3(0.6, 0.8, 0.2) },
        uSunIntensity: { value: 1.2 },
        uSunGlowPower: { value: 660 },
        uSunGlowIntensity: { value: 210 },
        uSkyStrength: { value: 0.7 },
        uToneMapExposure: { value: 2.1 }
      },
      vertexShader,
      fragmentShader
    });
    this.mesh = new three.Mesh(geometry, material);
    this.mesh.name = "OceanSkyDome";
    this.mesh.frustumCulled = false;
  }
  update(settings, sunDirection, camera) {
    this.mesh.position.copy(camera.position);
    this.horizonColor.set(settings.skyHorizonColor);
    this.zenithColor.set(settings.skyZenithColor);
    const { uniforms } = this.mesh.material;
    uniforms.uSkyHorizonColor.value.copy(this.horizonColor);
    uniforms.uSkyZenithColor.value.copy(this.zenithColor);
    uniforms.uSunDirection.value.copy(sunDirection);
    uniforms.uSunIntensity.value = settings.sunIntensity;
    uniforms.uSunGlowPower.value = settings.sunGlowPower;
    uniforms.uSunGlowIntensity.value = settings.sunGlowIntensity;
    uniforms.uSkyStrength.value = settings.skyStrength;
    uniforms.uToneMapExposure.value = settings.toneMapExposure;
  }
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
};

// src/lib/OceanSky.ts
var DEFAULT_OCEAN_SKY_OPTIONS = {
  skyHorizonColor: "#9dc7ea",
  skyZenithColor: "#2e5e96",
  sunIntensity: 1.2,
  sunGlowPower: 660,
  sunGlowIntensity: 210,
  skyStrength: 0.7,
  toneMapExposure: 2.1
};
function buildDefaultOceanSkyOptions() {
  return { ...DEFAULT_OCEAN_SKY_OPTIONS };
}
var OceanSky = class {
  object3d;
  dome;
  options;
  constructor(options) {
    this.options = {
      ...buildDefaultOceanSkyOptions(),
      ...options ?? {}
    };
    this.dome = new SkyDome();
    this.object3d = this.dome.mesh;
  }
  getOptions() {
    return { ...this.options };
  }
  setOptions(options) {
    Object.assign(this.options, options);
  }
  update(camera, sunDirection) {
    this.dome.update(this.options, sunDirection, camera);
  }
  dispose() {
    this.dome.dispose();
  }
};
function createOceanSky(options) {
  return new OceanSky(options);
}
function createDefaultOceanSkyOptions() {
  return buildDefaultOceanSkyOptions();
}

exports.OceanSky = OceanSky;
exports.createDefaultOceanSkyOptions = createDefaultOceanSkyOptions;
exports.createOceanSky = createOceanSky;
//# sourceMappingURL=sky.cjs.map
//# sourceMappingURL=sky.cjs.map
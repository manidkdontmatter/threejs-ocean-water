import {
  BufferGeometry,
  Camera,
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  MathUtils,
  Mesh,
  ShaderMaterial,
  Vector3
} from "three";
import { buildRingSpecs, createRingGeometry } from "./oceanGeometry";
import { createOceanMaterial } from "./oceanShader";
import { toWaveSamplingParams, type OceanSettings, type RingSpec } from "./types";
import { sampleWaveHeight } from "./waveMath";

interface RingRuntime {
  spec: RingSpec;
  mesh: Mesh<BufferGeometry, ShaderMaterial>;
  helper: LineLoop<BufferGeometry, LineBasicMaterial>;
}

export class OceanSystem {
  public readonly group = new Group();
  private readonly ringDebugGroup = new Group();
  private readonly shallowColor = new Color();
  private readonly deepColor = new Color();
  private readonly foamColor = new Color();
  private readonly skyHorizonColor = new Color();
  private readonly skyZenithColor = new Color();
  private readonly sunDirection = new Vector3();
  private rings: RingRuntime[] = [];
  private timeSec = 0.0;

  constructor(private readonly settings: OceanSettings) {
    this.group.name = "OceanSystem";
    this.ringDebugGroup.name = "OceanLODHelpers";
    this.group.add(this.ringDebugGroup);
    this.rebuildGeometry();
  }

  setTime(timeSec: number): void {
    this.timeSec = timeSec;
  }

  getTime(): number {
    return this.timeSec;
  }

  getSunDirection(target = new Vector3()): Vector3 {
    return target.copy(this.sunDirection);
  }

  getMaxOceanRadius(): number {
    if (this.rings.length === 0) {
      return 0;
    }
    return this.rings[this.rings.length - 1].spec.outerRadius;
  }

  getCenterXZ(): { x: number; z: number } {
    return { x: this.group.position.x, z: this.group.position.z };
  }

  getRingSummary(): Array<{ innerRadius: number; outerRadius: number; detailScale: number }> {
    return this.rings.map((ring) => ({
      innerRadius: ring.spec.innerRadius,
      outerRadius: ring.spec.outerRadius,
      detailScale: ring.spec.detailScale
    }));
  }

  sampleHeight(x: number, z: number, timeSec = this.timeSec): number {
    return sampleWaveHeight(x, z, timeSec, toWaveSamplingParams(this.settings));
  }

  rebuildGeometry(): void {
    this.disposeRings();

    const ringSpecs = buildRingSpecs(this.settings);
    for (const spec of ringSpecs) {
      const geometry = createRingGeometry(spec);
      const material = createOceanMaterial(spec.detailScale);
      const mesh = new Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.name = `OceanRing_${spec.index}`;
      mesh.renderOrder = 10 + spec.index;
      this.group.add(mesh);

      const helper = this.createRingHelper(spec);
      this.ringDebugGroup.add(helper);

      this.rings.push({ spec, mesh, helper });
    }
  }

  update(camera: Camera): void {
    const snap = Math.max(0.001, this.settings.followSnap);
    const centerX = this.settings.followCameraEveryFrame
      ? camera.position.x
      : Math.round(camera.position.x / snap) * snap;
    const centerZ = this.settings.followCameraEveryFrame
      ? camera.position.z
      : Math.round(camera.position.z / snap) * snap;
    this.group.position.set(centerX, 0.0, centerZ);

    this.updateSunDirection();
    this.updateUniforms(camera);
    this.ringDebugGroup.visible = this.settings.debugView === "rings";
  }

  dispose(): void {
    this.disposeRings();
  }

  private updateSunDirection(): void {
    const azimuthDeg =
      this.settings.sunAzimuthDeg +
      (this.settings.animateSun ? this.timeSec * this.settings.sunOrbitSpeed * 57.2957795 : 0.0);
    const azimuth = MathUtils.degToRad(azimuthDeg);
    const elevation = MathUtils.degToRad(this.settings.sunElevationDeg);
    const cosElevation = Math.cos(elevation);
    this.sunDirection
      .set(
        Math.cos(azimuth) * cosElevation,
        Math.sin(elevation),
        Math.sin(azimuth) * cosElevation
      )
      .normalize();
  }

  private updateUniforms(_camera: Camera): void {
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
      uniforms.uFoamEnabled.value = this.settings.foamEnabled ? 1.0 : 0.0;
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

  private createRingHelper(spec: RingSpec): LineLoop<BufferGeometry, LineBasicMaterial> {
    const helperSegments = Math.max(32, Math.floor(spec.angularSegments / 4));
    const geometry = new BufferGeometry();
    geometry.setFromPoints(
      Array.from({ length: helperSegments }, (_, i) => {
        const angle = (i / helperSegments) * Math.PI * 2.0;
        return new Vector3(Math.cos(angle) * spec.outerRadius, 0, Math.sin(angle) * spec.outerRadius);
      })
    );

    const material = new LineBasicMaterial({
      color: "#7ec6ff",
      transparent: true,
      opacity: 0.62,
      depthWrite: false
    });

    const helper = new LineLoop(geometry, material);
    helper.renderOrder = 1000 + spec.index;
    helper.frustumCulled = false;
    return helper;
  }

  private getDebugModeId(): number {
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

  private disposeRings(): void {
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
}

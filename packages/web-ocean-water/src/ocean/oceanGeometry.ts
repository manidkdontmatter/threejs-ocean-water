import { BufferAttribute, BufferGeometry } from "three";
import type { OceanSettings, RingSpec } from "./types";

export function buildRingSpecs(settings: OceanSettings): RingSpec[] {
  const rings: RingSpec[] = [];
  const ringCount = Math.max(1, Math.floor(settings.ringCount));
  const angularSegments = Math.max(16, Math.floor(settings.angularSegments));
  let innerRadius = 0.0;
  let ringWidth = Math.max(4.0, settings.baseRingWidth);

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

export function createRingGeometry(spec: RingSpec): BufferGeometry {
  const radialVertices = spec.radialSegments + 1;
  const angularVertices = spec.angularSegments + 1;
  const totalVertices = radialVertices * angularVertices;
  const positionArray = new Float32Array(totalVertices * 3);
  const uvArray = new Float32Array(totalVertices * 2);
  const localRadiusArray = new Float32Array(totalVertices);
  const indices: number[] = [];

  let vertexOffset = 0;
  let uvOffset = 0;
  let radiusOffset = 0;

  for (let radial = 0; radial <= spec.radialSegments; radial += 1) {
    const radialT = radial / spec.radialSegments;
    const radius = spec.innerRadius + (spec.outerRadius - spec.innerRadius) * radialT;

    for (let angular = 0; angular <= spec.angularSegments; angular += 1) {
      const angularT = angular / spec.angularSegments;
      const angle = angularT * Math.PI * 2.0;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      positionArray[vertexOffset] = x;
      positionArray[vertexOffset + 1] = 0.0;
      positionArray[vertexOffset + 2] = z;
      vertexOffset += 3;

      uvArray[uvOffset] = 0.5 + x / (spec.outerRadius * 2.0);
      uvArray[uvOffset + 1] = 0.5 + z / (spec.outerRadius * 2.0);
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
      // Winding is set so front faces point upward (+Y), making water visible from above.
      indices.push(a, c, b, a, d, c);
    }
  }

  const indexArray =
    totalVertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positionArray, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvArray, 2));
  geometry.setAttribute("aLocalRadius", new BufferAttribute(localRadiusArray, 1));
  geometry.setIndex(new BufferAttribute(indexArray, 1));
  geometry.computeBoundingSphere();

  return geometry;
}

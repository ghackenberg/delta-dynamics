import { BILINEAR_GLSL } from '../shared/bilinear'

export const pickingVertexChunks = {
    common: `
        uniform sampler2D heightMap;
        uniform float uGridSize;
        attribute float aPickingId;
        varying float vPickingId;
        ${BILINEAR_GLSL}
    `,
    begin: `
        vPickingId = aPickingId;
        vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float boundary = uGridSize * 0.5;
        vec2 uv = (instPos.xz + boundary) / uGridSize;
        vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
        float h = bilinear(heightMap, sUv, vec2(101.0)).r;
        transformed.y += h / instanceMatrix[1][1];
    `
}

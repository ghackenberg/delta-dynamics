import { BILINEAR_GLSL } from '../shared/bilinear'

export const terrainDepthVertexChunks = {
    common: `
        uniform sampler2D uTerrainSurface;
        ${BILINEAR_GLSL}
    `,
    begin: `
        vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
        transformed.y = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;
    `
}

import { BILINEAR_GLSL } from '../shared/bilinear'

export const terrainVertexChunks = {
    common: `
        uniform sampler2D uTerrainLayers;
        uniform sampler2D uTerrainSurface;
        uniform float uTileSize;
        varying float vType;
        varying vec2 vGridUv;
        ${BILINEAR_GLSL}
    `,
    begin: `
        vGridUv = uv;
        vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
        vec4 surfaceData = bilinear(uTerrainSurface, sUv, vec2(101.0));
        transformed.y = surfaceData.r;
        vType = surfaceData.b;
    `
}

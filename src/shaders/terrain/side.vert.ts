import { BILINEAR_GLSL } from '../shared/bilinear'

export const terrainSideVertexChunks = {
    common: `
        uniform highp sampler2DArray uTerrainLayers;
        uniform sampler2D uTerrainSurface;
        varying float vWorldY;
        varying float vSurfaceY;
        varying vec2 vGridUv;
        ${BILINEAR_GLSL}
    `,
    begin: (edge: 'N' | 'S' | 'E' | 'W') => `
        float edgeX = uv.x;
        ${edge === 'N' ? 'vGridUv = vec2(1.0 - edgeX, 1.0);' : ''}
        ${edge === 'S' ? 'vGridUv = vec2(edgeX, 0.0);' : ''}
        ${edge === 'W' ? 'vGridUv = vec2(0.0, 1.0 - edgeX);' : ''}
        ${edge === 'E' ? 'vGridUv = vec2(1.0, edgeX);' : ''}

        vec2 texRes = vec2(101.0);
        vec2 sUv = (vGridUv * 100.0 + 0.5) / texRes;
        float h = bilinear(uTerrainSurface, sUv, texRes).r;
        
        vSurfaceY = h;

        if (uv.y > 0.5) {
            transformed.y = vSurfaceY;
        } else {
            transformed.y = -5.0;
        }
        vWorldY = transformed.y;
    `
}

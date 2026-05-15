import { BILINEAR_GLSL } from '../shared/bilinear'

export const waterSideVertexChunks = {
    common: `
        uniform sampler2D uTerrainSurface;
        uniform sampler2D waterMap;
        uniform float uTime;
        varying float vWorldY;
        varying float vSurfaceY;
        varying float vWaterY;
        varying vec2 vGridUv;
        ${BILINEAR_GLSL}
    `,
    begin: (edge: 'N' | 'S' | 'E' | 'W') => `
        float edgeX = uv.x;
        ${edge === 'N' ? 'vGridUv = vec2(1.0 - edgeX, 1.0);' : ''}
        ${edge === 'S' ? 'vGridUv = vec2(edgeX, 0.0);' : ''}
        ${edge === 'W' ? 'vGridUv = vec2(0.0, 1.0 - edgeX);' : ''}
        ${edge === 'E' ? 'vGridUv = vec2(1.0, edgeX);' : ''}

        vec2 gridRes = vec2(100.0);
        vec2 texRes = vec2(101.0);
        vec2 sUv = (vGridUv * 100.0 + 0.5) / texRes;
        float h = bilinear(uTerrainSurface, sUv, texRes).r;
        
        // Water-Aware Interpolation for Sides
        vec2 st = vGridUv * gridRes - 0.5;
        vec2 i = floor(st);
        vec2 f = fract(st);
        vec4 p00 = texture2D(waterMap, (i + vec2(0.0, 0.0) + 0.5) / gridRes);
        vec4 p10 = texture2D(waterMap, (i + vec2(1.0, 0.0) + 0.5) / gridRes);
        vec4 p01 = texture2D(waterMap, (i + vec2(0.0, 1.0) + 0.5) / gridRes);
        vec4 p11 = texture2D(waterMap, (i + vec2(1.0, 1.0) + 0.5) / gridRes);
        
        float m00 = p00.a > -90.0 ? 1.0 : 0.0;
        float m10 = p10.a > -90.0 ? 1.0 : 0.0;
        float m01 = p01.a > -90.0 ? 1.0 : 0.0;
        float m11 = p11.a > -90.0 ? 1.0 : 0.0;
        
        float fw00 = (1.0 - f.x) * (1.0 - f.y) * m00;
        float fw10 = f.x * (1.0 - f.y) * m10;
        float fw01 = (1.0 - f.x) * f.y * m01;
        float fw11 = f.x * f.y * m11;
        float tw = fw00 + fw10 + fw01 + fw11;
        
        float wH = h - 0.05;
        if (tw > 0.0001) {
            wH = (p00.a * fw00 + p10.a * fw10 + p01.a * fw01 + p11.a * fw11) / tw;
        }

        vSurfaceY = h;
        vWaterY = wH;

        if (uv.y > 0.5) {
            transformed.y = vWaterY;
        } else {
            transformed.y = vSurfaceY;
        }
        vWorldY = transformed.y;
    `
}

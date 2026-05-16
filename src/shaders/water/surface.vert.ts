import type { ShaderModule } from '../../utils/shaderUtils'
import { BILINEAR_GLSL } from '../shared/bilinear'

export const waterSurfaceVertexModule: ShaderModule = {
    name: 'waterSurfaceVertex',
    vertex: {
        common: `
            uniform sampler2D uTerrainSurface;
            uniform sampler2D waterMap;
            uniform float uTime;
            varying float vDepth;
            varying vec2 vGridUv;
            ${BILINEAR_GLSL}
        `,
        begin: `
            vGridUv = uv;
            vec2 gridRes = vec2(100.0);
            vec2 texRes = vec2(101.0);
            
            // 1. Smooth Terrain Height at this vertex
            vec2 sUv = (uv * 100.0 + 0.5) / texRes;
            float h = bilinear(uTerrainSurface, sUv, texRes).r;
            
            // 2. Wet-Neighbor-Only Level Averaging
            vec2 st = uv * gridRes - 0.5;
            vec2 i = floor(st);
            vec2 f = fract(st);

            vec4 p00 = texture2D(waterMap, (i + vec2(0.0, 0.0) + 0.5) / gridRes);
            vec4 p10 = texture2D(waterMap, (i + vec2(1.0, 0.0) + 0.5) / gridRes);
            vec4 p01 = texture2D(waterMap, (i + vec2(0.0, 1.0) + 0.5) / gridRes);
            vec4 p11 = texture2D(waterMap, (i + vec2(1.0, 1.0) + 0.5) / gridRes);
            
            // Masks: 1.0 if wet or wet-adjacent (using extrapolated sL in Alpha)
            float m00 = p00.a > -90.0 ? 1.0 : 0.0;
            float m10 = p10.a > -90.0 ? 1.0 : 0.0;
            float m01 = p01.a > -90.0 ? 1.0 : 0.0;
            float m11 = p11.a > -90.0 ? 1.0 : 0.0;
            
            float fw00 = (1.0 - f.x) * (1.0 - f.y) * m00;
            float fw10 = f.x * (1.0 - f.y) * m10;
            float fw01 = (1.0 - f.x) * f.y * m01;
            float fw11 = f.x * f.y * m11;
            
            float totalW = fw00 + fw10 + fw01 + fw11;
            
            if (totalW > 0.0001) {
                float finalSL = (p00.a * fw00 + p10.a * fw10 + p01.a * fw01 + p11.a * fw11) / totalW;
                // Cap extrapolated water to terrain height if the local cell is dry
                float sw_local = bilinear(waterMap, vGridUv, gridRes).b;
                transformed.y = sw_local > 0.001 ? finalSL : min(finalSL, h);
            } else {
                transformed.y = h - 0.05; // Hide dry vertices
            }
            
            vDepth = transformed.y - h;
            
            float sw_interp = bilinear(waterMap, uv, gridRes).b;
            if (sw_interp > 0.05) {
              transformed.y += sin(uTime * 2.0 + (position.x + position.z) * 5.0) * 0.005;
            }
        `
    }
}

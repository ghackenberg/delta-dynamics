import type { ShaderModule } from '../../utils/shaderUtils'
import { BILINEAR_ARRAY_GLSL } from '../shared/bilinear'

export const terrainSideFragmentModule: ShaderModule = {
    name: 'terrainSideFragment',
    fragment: {
        common: `
            precision highp sampler2DArray;
            uniform sampler2DArray uTerrainLayers;
            uniform sampler2D uTerrainSurface;
            uniform vec3 uLayerColors[6];
            uniform vec2 uVisualRange;
            varying float vWorldY;
            varying float vSurfaceY;
            varying vec2 vGridUv;
            ${BILINEAR_ARRAY_GLSL}
        `,
        color: `
            vec2 gridRes = vec2(100.0);
            vec2 texRes = vec2(101.0);
            
            // Use a slight inset to avoid floating point precision issues exactly on the edge
            vec2 safeGridUv = clamp(vGridUv, 0.001, 0.999);
            vec2 cellCoord = floor(safeGridUv * gridRes);
            vec2 discreteSUv = (cellCoord + 0.5) / texRes;
            
            vec2 sUv = (vGridUv * 100.0 + 0.5) / 101.0;
            
            float currentH = uVisualRange.x;
            vec3 terrainColor = uLayerColors[0];

            for (int i = 0; i < MAX_LAYERS; i++) {
                // Interpolate thickness for smooth height transitions
                vec4 layerData = bilinearArray(uTerrainLayers, sUv, float(i), vec2(101.0));
                if (layerData.r < -0.5) break;
                
                // Read discrete type for color
                vec4 discreteLayerData = texture(uTerrainLayers, vec3(discreteSUv, float(i)));
                
                float nextH = currentH + layerData.g;
                if (vWorldY <= nextH + 0.001) {
                    float typeIdx = discreteLayerData.r;
                    if (typeIdx < -0.5) {
                        // Fall back to discrete cell's top layer if it lacks this interpolated layer
                        typeIdx = texture(uTerrainSurface, discreteSUv).b;
                    }
                    terrainColor = uLayerColors[int(typeIdx + 0.5)];
                    break;
                }
                currentH = nextH;
            }

            diffuseColor.rgb = terrainColor * 0.7; // Darken sides
            diffuseColor.a = 1.0;
        `
    }
}

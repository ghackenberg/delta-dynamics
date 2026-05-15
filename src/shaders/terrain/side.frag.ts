import { BILINEAR_ARRAY_GLSL } from '../shared/bilinear'

export const terrainSideFragmentChunks = {
    common: `
        precision highp sampler2DArray;
        uniform sampler2DArray uTerrainLayers;
        uniform sampler2D uTerrainSurface;
        uniform sampler2D waterMap;
        uniform vec3 uLayerColors[6];
        varying float vWorldY;
        varying float vSurfaceY;
        varying float vWaterY;
        varying vec2 vGridUv;
        ${BILINEAR_ARRAY_GLSL}
    `,
    color: (isWater: boolean) => `
        ${isWater ? `
            // Hide if dry and no wet neighbors
            vec4 waterData = texture2D(waterMap, vGridUv);
            if (waterData.a < -90.0) discard;

            // Deep/Shallow Color
            float depth = vWaterY - vSurfaceY;
            vec3 shallowColor = vec3(0.2, 0.5, 0.8);
            vec3 deepColor = vec3(0.02, 0.1, 0.3);
            diffuseColor.rgb = mix(shallowColor, deepColor, smoothstep(0.0, 0.5, depth)) * 0.7;
        ` : `
            vec2 gridRes = vec2(100.0);
            vec2 texRes = vec2(101.0);
            
            // Use a slight inset to avoid floating point precision issues exactly on the edge
            vec2 safeGridUv = clamp(vGridUv, 0.001, 0.999);
            vec2 cellCoord = floor(safeGridUv * gridRes);
            vec2 discreteSUv = (cellCoord + 0.5) / texRes;
            
            vec2 sUv = (vGridUv * 100.0 + 0.5) / 101.0;
            
            float currentH = -5.0;
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
        `}
        diffuseColor.a = 1.0;
    `
}

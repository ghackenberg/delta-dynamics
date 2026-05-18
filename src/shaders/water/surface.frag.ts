import type { ShaderModule } from '../../utils/shaderUtils'

export const waterSurfaceFragmentModule: ShaderModule = {
    name: 'waterSurfaceFragment',
    fragment: {
        common: `
            uniform sampler2D uTerrainSurface;
            uniform sampler2D waterMap;
            uniform vec2 uHoveredCell;
            uniform float uBrushSize;
            uniform float uBrushStrength;
            uniform int uMode;
            uniform float uTime;
            uniform vec3 uLayerColors[6];
            uniform vec3 uLayerHighlightColors[6];
            varying float vDepth;
            varying vec2 vGridUv;
        `,
        color: `
            // Hide if dry and no wet neighbors
            vec4 waterData = texture2D(waterMap, vGridUv);
            if (waterData.a < -90.0) discard;

            // Continuous Depth Check (intersection with smooth terrain)
            vec3 shallowColor = vec3(0.2, 0.5, 0.8);
            vec3 deepColor = vec3(0.02, 0.1, 0.3);
            vec3 waterColor = mix(shallowColor, deepColor, smoothstep(0.0, 0.5, vDepth));
            
            // Hover Highlight
            vec2 gridRes = vec2(100.0);
            vec2 texRes = vec2(101.0);
            vec2 cellCoord = clamp(floor(vGridUv * gridRes), 0.0, 99.0);
            vec2 gridCell = floor(vGridUv * gridRes);
            vec2 currentCell = vec2(gridCell.x, gridRes.y - 1.0 - gridCell.y);
            float dist = distance(currentCell, uHoveredCell);

            if (uMode == 1 && uHoveredCell.x >= 0.0) { // EDITOR mode
                if (dist <= uBrushSize) {
                    float sigma = uBrushSize / 2.0;
                    float sigma2 = 2.0 * sigma * sigma;
                    float weight = exp(-(dist * dist) / sigma2);
                    float highlightIntensity = (0.2 + 0.4 * uBrushStrength) * weight;
                    waterColor = mix(waterColor, uLayerHighlightColors[5], highlightIntensity);
                }
            } else if (uMode == 0 && uHoveredCell.x >= 0.0) { // PLAY mode
                if (gridCell.x == uHoveredCell.x && (gridRes.y - 1.0 - gridCell.y) == uHoveredCell.y) {
                    waterColor = mix(waterColor, uLayerHighlightColors[5], 0.4);
                }
            }

            vec4 surfaceData = texture2D(uTerrainSurface, (cellCoord + 0.5) / texRes);
            float cellType = surfaceData.b;
            float rl = surfaceData.g;
            vec3 terrainColor = uLayerColors[int(cellType + 0.5)];

            // Source/Sink Highlight (Energy Pulse) on Water
            if (rl > 0.5) {
                float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
                if (rl < 1.5) { // Source: Cyan/Blue Pulse
                    waterColor = mix(waterColor, vec3(0.0, 0.8, 1.0), pulse * 0.4);
                } else if (rl < 2.5) { // Sink: Red/Orange Pulse
                    waterColor = mix(waterColor, vec3(1.0, 0.2, 0.0), pulse * 0.4);
                }
            } else {
                // Boundary Sink Highlight
                vec2 uv = vGridUv;
                vec2 texel = 1.0 / gridRes;
                if (uv.x < texel.x || uv.x > 1.0 - texel.x || uv.y < texel.y || uv.y > 1.0 - texel.y) {
                    float sw = waterData.b;
                    if (sw > 0.01) {
                        float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
                        waterColor = mix(waterColor, vec3(1.0, 0.2, 0.0), pulse * 0.3);
                    }
                }
            }

            // Crisp shoreline contour at terrain intersection
            // Instead of white, we fade into the terrain color for a "wet edge" look
            float shoreLine = 1.0 - smoothstep(0.0, 0.04, vDepth);
            waterColor = mix(waterColor, terrainColor * 0.8, shoreLine * 0.9);
            
            // Subtle flow/grid lines
            vec2 grid = fract(vGridUv * 100.0);
            float edgeDist = 0.02;
            bool isGridLineX = grid.x < edgeDist || grid.x > 1.0 - edgeDist;
            bool isGridLineY = grid.y < edgeDist || grid.y > 1.0 - edgeDist;

            if (isGridLineX || isGridLineY) {
                bool isBrushBorder = false;
                if (uMode == 1 && uHoveredCell.x >= 0.0) {
                    float distCurrent = distance(currentCell, uHoveredCell);
                    bool currentIn = distCurrent <= uBrushSize;
                    if (isGridLineX) {
                        vec2 neighborX = currentCell + vec2(grid.x < 0.5 ? -1.0 : 1.0, 0.0);
                        bool neighborIn = distance(neighborX, uHoveredCell) <= uBrushSize;
                        if (currentIn != neighborIn) isBrushBorder = true;
                    }
                    if (!isBrushBorder && isGridLineY) {
                        vec2 neighborY = currentCell + vec2(0.0, grid.y < 0.5 ? 1.0 : -1.0);
                        bool neighborIn = distance(neighborY, uHoveredCell) <= uBrushSize;
                        if (currentIn != neighborIn) isBrushBorder = true;
                    }
                }

                if (isBrushBorder) {
                    waterColor = mix(waterColor, vec3(1.0, 1.0, 1.0), 0.9);
                } else {
                    waterColor += vec3(0.05);
                }
            }
            
            diffuseColor.rgb = waterColor;
            diffuseColor.a = 0.85;
        `
    }
}

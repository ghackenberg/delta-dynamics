export const waterFragmentChunks = {
    common: `
        uniform sampler2D waterMap;
        uniform vec2 uHoveredCell;
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
        vec2 gridCell = floor(vGridUv * gridRes);
        if (gridCell.x == uHoveredCell.x && (gridRes.y - 1.0 - gridCell.y) == uHoveredCell.y) {
            waterColor = mix(waterColor, uLayerHighlightColors[5], 0.4);
        }

        // Crisp shoreline contour at terrain intersection
        float shoreLine = 1.0 - smoothstep(0.0, 0.03, vDepth);
        waterColor = mix(waterColor, vec3(1.0), shoreLine * 0.8);
        
        // Subtle flow/grid lines
        vec2 grid = fract(vGridUv * 100.0);
        if (grid.x < 0.02 || grid.y < 0.02) {
            waterColor += vec3(0.05);
        }
        
        diffuseColor.rgb = waterColor;
        diffuseColor.a = 0.85;
    `
}

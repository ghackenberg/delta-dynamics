export const terrainSurfaceFragmentChunks = {
    common: `
        uniform sampler2D uTerrainSurface;
        uniform vec2 uHoveredCell;
        uniform vec3 uLayerColors[6];
        uniform vec3 uLayerHighlightColors[6];
        varying float vType;
        varying vec2 vGridUv;
    `,
    color: `
        // Discrete Cell-based Material Sampling
        vec2 gridRes = vec2(100.0);
        vec2 texRes = vec2(101.0);
        vec2 cellCoord = clamp(floor(vGridUv * gridRes), 0.0, 99.0);
        float cellType = texture2D(uTerrainSurface, (cellCoord + 0.5) / texRes).b;
        
        int typeIdx = int(cellType + 0.5);
        vec3 terrainColor = uLayerColors[typeIdx];
        
        // Hover Highlight (Inverted Y to match picking)
        vec2 gridCell = floor(vGridUv * gridRes);
        if (gridCell.x == uHoveredCell.x && (gridRes.y - 1.0 - gridCell.y) == uHoveredCell.y) {
            terrainColor = mix(terrainColor, uLayerHighlightColors[typeIdx], 0.6);
        }

        // Grid and Boundary lines
        vec2 grid = fract(vGridUv * 100.0);
        float edgeDist = 0.05;
        bool isGridLineX = grid.x < edgeDist || grid.x > 1.0 - edgeDist;
        bool isGridLineY = grid.y < edgeDist || grid.y > 1.0 - edgeDist;
        
        if (isGridLineX || isGridLineY) {
            float boundary = 0.0;
            if (isGridLineX) {
                float neighborType = texture2D(uTerrainSurface, (cellCoord + vec2(grid.x < 0.5 ? -0.5 : 1.5, 0.5)) / texRes).b;
                if (abs(neighborType - cellType) > 0.1) boundary = 1.0;
            }
            if (isGridLineY) {
                float neighborType = texture2D(uTerrainSurface, (cellCoord + vec2(0.5, grid.y < 0.5 ? -0.5 : 1.5)) / texRes).b;
                if (abs(neighborType - cellType) > 0.1) boundary = 1.0;
            }
            
            if (boundary > 0.5) {
                terrainColor = mix(terrainColor, vec3(1.0, 0.9, 0.5), 0.6);
            } else {
                terrainColor *= 0.8;
            }
        }
        
        diffuseColor.rgb = terrainColor;
    `
}

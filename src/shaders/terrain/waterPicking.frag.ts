export const waterPickingFragmentChunks = {
    common: `
        uniform sampler2D waterMap;
        varying float vDepth;
        varying vec2 vGridUv;
    `,
    color: `
        // Hide if dry and no wet neighbors
        vec4 waterData = texture2D(waterMap, vGridUv);
        if (waterData.a < -90.0) discard;

        // Continuous Depth Check (intersection with smooth terrain)
        float x = (clamp(floor(vGridUv.x * 100.0), 0.0, 99.0) + 1.0) / 255.0;
        float z = (clamp(floor((1.0 - vGridUv.y) * 100.0), 0.0, 99.0) + 1.0) / 255.0;
        diffuseColor.rgb = vec3(x, z, 0.0);
        diffuseColor.a = 1.0;
    `
}

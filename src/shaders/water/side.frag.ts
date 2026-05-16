import type { ShaderModule } from '../../utils/shaderUtils'

export const waterSideFragmentModule: ShaderModule = {
    name: 'waterSideFragment',
    fragment: {
        common: `
            uniform sampler2D uTerrainSurface;
            uniform sampler2D waterMap;
            varying float vWorldY;
            varying float vSurfaceY;
            varying float vWaterY;
            varying vec2 vGridUv;
        `,
        color: `
            // Hide if dry and no wet neighbors
            vec4 waterData = texture2D(waterMap, vGridUv);
            if (waterData.a < -90.0) discard;

            // Clip to water surface and terrain surface
            if (vWorldY > vWaterY + 0.001) discard;
            if (vWorldY < vSurfaceY - 0.001) discard;

            // Deep/Shallow Color
            float depth = vWaterY - vSurfaceY;
            vec3 shallowColor = vec3(0.2, 0.5, 0.8);
            vec3 deepColor = vec3(0.02, 0.1, 0.3);
            diffuseColor.rgb = mix(shallowColor, deepColor, smoothstep(0.0, 0.5, depth)) * 0.7;
            diffuseColor.a = 1.0;
        `
    }
}

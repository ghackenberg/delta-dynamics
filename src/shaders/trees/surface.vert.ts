import { BILINEAR_GLSL } from '../shared/bilinear'
import type { ShaderModule } from '../../utils/shaderUtils'

export const treeSurfaceVertexModule: ShaderModule = {
    name: 'treeSurfaceVertex',
    vertex: {
        common: `
            uniform sampler2D uTerrainSurface;
            uniform float uTime;
            uniform float uGridSize;
            attribute float aSink;
            attribute float aPickingId;
            varying float vPickingId;
            ${BILINEAR_GLSL}
        `,
        begin: `
            vPickingId = aPickingId;
            // Instance world position (xz only)
            vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            
            // Exact UV Mapping to match Terrain.tsx 101x101 DataTexture
            // Plane is from -BOUNDARY to BOUNDARY. Total width is uGridSize (20.0)
            float boundary = uGridSize * 0.5;
            vec2 uv = (instPos.xz + boundary) / uGridSize;
            // Invert Y UV to match Terrain.tsx PlaneGeometry mapping (Back/North is V=1)
            uv.y = 1.0 - uv.y;
            vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
            
            // Sample height from uTerrainSurface (R channel) using bilinear interpolation
            float h = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;
            transformed.y += h / instanceMatrix[1][1];

            // Apply sink to bottom vertices (those with local y < 0.1)
            if (position.y < 0.1) {
                transformed.y -= aSink / instanceMatrix[1][1];
            }
            
            // Wind sway (only for foliage, not trunk)
            float swayFactor = smoothstep(0.1, 1.0, position.y);
            float sway = sin(uTime * 1.5 + instPos.x * 5.0 + instPos.z * 3.0) * 0.04 * swayFactor;
            transformed.x += sway;
            transformed.z += sway * 0.5;
        `
    }
}

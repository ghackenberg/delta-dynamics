import { BILINEAR_GLSL } from '../shared/bilinear'

export const surfaceVertexChunks = {
    common: `
        uniform sampler2D heightMap;
        uniform float uTime;
        uniform float uGridSize;
        ${BILINEAR_GLSL}
    `,
    begin: `
        // Instance world position (xz only)
        vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        
        // Exact UV Mapping to match Terrain.tsx 101x101 DataTexture
        // Plane is from -BOUNDARY to BOUNDARY. Total width is uGridSize (20.0)
        float boundary = uGridSize * 0.5;
        vec2 uv = (instPos.xz + boundary) / uGridSize;
        // Invert Y UV to match Terrain.tsx PlaneGeometry mapping (Back/North is V=1)
        uv.y = 1.0 - uv.y;
        vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
        
        // Sample height from heightMap (R channel) using bilinear interpolation
        float h = bilinear(heightMap, sUv, vec2(101.0)).r;
        transformed.y += h / instanceMatrix[1][1];
        
        // Wind sway (only for foliage, not trunk)
        float swayFactor = smoothstep(0.1, 1.0, position.y);
        float sway = sin(uTime * 1.5 + instPos.x * 5.0 + instPos.z * 3.0) * 0.04 * swayFactor;
        transformed.x += sway;
        transformed.z += sway * 0.5;
    `
}

import { BILINEAR_GLSL } from '../shared/bilinear'
import type { ShaderModule } from '../../utils/shaderUtils'

export const animalSurfaceVertexModule: ShaderModule = {
    name: 'animalSurfaceVertex',
    vertex: {
        common: `
            uniform sampler2D uTerrainSurface;
            uniform float uTime;
            uniform float uGridSize;
            attribute float aRandom;
            varying float vRandom;
            ${BILINEAR_GLSL}
        `,
        begin: `
            vRandom = aRandom;
            vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            
            // Exact UV Mapping to match Terrain.tsx 101x101 DataTexture
            float boundary = uGridSize * 0.5;
            vec2 uv = (instPos.xz + boundary) / uGridSize;
            // Invert Y UV to match Terrain.tsx PlaneGeometry mapping (Back/North is V=1)
            uv.y = 1.0 - uv.y;
            vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
            float h = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;
            
            transformed.y += h / instanceMatrix[1][1];

            // Procedural animation (Hopping/Waddling)
            float speed = 8.0 + aRandom * 4.0;
            float hop = abs(sin(uTime * speed + aRandom * 10.0)) * 0.05;
            transformed.y += hop;
            
            // Slight side-to-side tilt
            float tilt = sin(uTime * speed * 0.5 + aRandom * 10.0) * 0.1;
            float cosT = cos(tilt);
            float sinT = sin(tilt);
            mat2 rot = mat2(cosT, -sinT, sinT, cosT);
            transformed.xy = rot * transformed.xy;
        `
    }
}

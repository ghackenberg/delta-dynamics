import { BILINEAR_GLSL } from '../shared/bilinear'
import type { ShaderModule } from '../../utils/shaderUtils'

export const animalPickingVertexModule: ShaderModule = {
    name: 'animalPickingVertex',
    vertex: {
        common: `
            uniform sampler2D uTerrainSurface;
            uniform float uGridSize;
            attribute float aPickingId;
            varying float vPickingId;
            ${BILINEAR_GLSL}
        `,
        begin: `
            vPickingId = aPickingId;
            vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float boundary = uGridSize * 0.5;
            vec2 uv = (instPos.xz + boundary) / uGridSize;
            // Invert Y UV to match Terrain.tsx PlaneGeometry mapping
            uv.y = 1.0 - uv.y;
            vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
            float h = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;
            transformed.y += h / instanceMatrix[1][1];
        `
    }
}

import type { ShaderModule } from '../../utils/shaderUtils'
import { BILINEAR_GLSL } from '../shared/bilinear'

export const terrainPickingVertexModule: ShaderModule = {
    name: 'terrainPickingVertex',
    vertex: {
        common: `
            uniform sampler2D uTerrainSurface;
            varying vec2 vGridUv;
            ${BILINEAR_GLSL}
        `,
        begin: `
            vGridUv = uv;
            vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
            transformed.y = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;
        `
    }
}

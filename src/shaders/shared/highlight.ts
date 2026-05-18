import type { ShaderModule } from '../../utils/shaderUtils'

export const highlightFragmentModule: ShaderModule = {
    name: 'highlightFragment',
    fragment: {
        common: `
            uniform float uHoveredPickingId;
            varying float vPickingId;
        `,
        color: `
            if (abs(vPickingId - uHoveredPickingId) < 0.1) {
                diffuseColor.rgb += vec3(0.15); // Subtle highlight
            }
        `
    }
}

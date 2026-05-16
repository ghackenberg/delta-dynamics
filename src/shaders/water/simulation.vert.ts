import type { ShaderModule } from '../../utils/shaderUtils'

export const waterSimulationVertexModule: ShaderModule = {
    name: 'waterSimulationVertex',
    vertex: {
        main: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `
    }
}

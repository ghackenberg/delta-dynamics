export const pickingFragmentShader = `
    varying vec2 vGridUv;
    void main() {
      float x = (clamp(floor(vGridUv.x * 100.0), 0.0, 99.0) + 1.0) / 255.0;
      // Invert Y UV to match grid Z if mirrored
      float z = (clamp(floor((1.0 - vGridUv.y) * 100.0), 0.0, 99.0) + 1.0) / 255.0;
      gl_FragColor = vec4(x, z, 0.0, 1.0);
    }
`

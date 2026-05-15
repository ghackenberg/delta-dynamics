export const pickingFragmentShader = `
    varying float vPickingId;
    void main() {
      float id = vPickingId + 1.0; // Offset by 1
      float r = floor(id / 256.0) / 255.0;
      float g = mod(id, 256.0) / 255.0;
      gl_FragColor = vec4(r, g, 253.0 / 255.0, 1.0); // b=253 for animals
    }
`

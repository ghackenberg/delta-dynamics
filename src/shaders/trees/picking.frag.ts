export const pickingFragmentShader = `
    varying float vPickingId;
    void main() {
      float id = vPickingId + 1.0; // Offset by 1 to avoid ID:0
      float r = floor(id / 256.0) / 255.0;
      float g = mod(id, 256.0) / 255.0;
      gl_FragColor = vec4(r, g, 1.0, 1.0); 
    }
`

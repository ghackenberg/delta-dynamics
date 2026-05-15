export const BILINEAR_GLSL = `
  vec4 bilinear(sampler2D tex, vec2 uv, vec2 res) {
      vec2 st = uv * res - 0.5;
      vec2 i = floor(st);
      vec2 f = fract(st);

      vec4 p00 = texture2D(tex, (i + vec2(0.0, 0.0) + 0.5) / res);
      vec4 p10 = texture2D(tex, (i + vec2(1.0, 0.0) + 0.5) / res);
      vec4 p01 = texture2D(tex, (i + vec2(0.0, 1.0) + 0.5) / res);
      vec4 p11 = texture2D(tex, (i + vec2(1.0, 1.0) + 0.5) / res);

      return mix(mix(p00, p10, f.x), mix(p01, p11, f.x), f.y);
  }
`;

export const BILINEAR_ARRAY_GLSL = `
  vec4 bilinearArray(sampler2DArray tex, vec2 uv, float layer, vec2 res) {
      vec2 st = uv * res - 0.5;
      vec2 i = floor(st);
      vec2 f = fract(st);

      vec4 p00 = texture(tex, vec3((i + vec2(0.0, 0.0) + 0.5) / res, layer));
      vec4 p10 = texture(tex, vec3((i + vec2(1.0, 0.0) + 0.5) / res, layer));
      vec4 p01 = texture(tex, vec3((i + vec2(0.0, 1.0) + 0.5) / res, layer));
      vec4 p11 = texture(tex, vec3((i + vec2(1.0, 1.0) + 0.5) / res, layer));

      return mix(mix(p00, p10, f.x), mix(p01, p11, f.x), f.y);
  }
`;

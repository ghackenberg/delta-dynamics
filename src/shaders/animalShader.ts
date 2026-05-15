import * as THREE from 'three'
import { GRID_SIZE, TILE_SIZE } from '../constants/gameConfig'
import { BILINEAR_GLSL } from './shared'

export const animalVertexShader = (shader: THREE.ShaderLibShader, heightMap: THREE.Texture, uTime: { value: number }) => {
  shader.uniforms.heightMap = { value: heightMap }
  shader.uniforms.uTime = uTime
  shader.uniforms.uGridSize = { value: GRID_SIZE * TILE_SIZE }

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D heightMap;
    uniform float uTime;
    uniform float uGridSize;
    attribute float aRandom;
    varying float vRandom;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vRandom = aRandom;
    vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    
    // Exact UV Mapping to match Terrain.tsx 101x101 DataTexture
    float boundary = uGridSize * 0.5;
    vec2 uv = (instPos.xz + boundary) / uGridSize;
    // Invert Y UV to match Terrain.tsx PlaneGeometry mapping (Back/North is V=1)
    uv.y = 1.0 - uv.y;
    vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
    float h = bilinear(heightMap, sUv, vec2(101.0)).r;
    
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
  )
}

export const pickingVertexShader = (shader: THREE.ShaderLibShader, heightMap: THREE.Texture) => {
  shader.uniforms.heightMap = { value: heightMap }
  shader.uniforms.uGridSize = { value: GRID_SIZE * TILE_SIZE }

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D heightMap;
    uniform float uGridSize;
    attribute float aPickingId;
    varying float vPickingId;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vPickingId = aPickingId;
    vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float boundary = uGridSize * 0.5;
    vec2 uv = (instPos.xz + boundary) / uGridSize;
    vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
    float h = bilinear(heightMap, sUv, vec2(101.0)).r;
    transformed.y += h / instanceMatrix[1][1];`
  )
  
  shader.fragmentShader = `
    varying float vPickingId;
    void main() {
      float id = vPickingId + 1.0; // Offset by 1
      float r = floor(id / 256.0) / 255.0;
      float g = mod(id, 256.0) / 255.0;
      gl_FragColor = vec4(r, g, 253.0 / 255.0, 1.0); // b=253 for animals
    }
  `
}

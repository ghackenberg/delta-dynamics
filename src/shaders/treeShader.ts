import * as THREE from 'three'
import { GRID_SIZE, TILE_SIZE } from '../constants/gameConfig'
import { BILINEAR_GLSL } from './shared'

export const treeVertexShader = (shader: THREE.ShaderLibShader, heightMap: THREE.Texture, uTime: { value: number }) => {
  shader.uniforms.heightMap = { value: heightMap }
  shader.uniforms.uTime = uTime
  shader.uniforms.uGridSize = { value: GRID_SIZE * TILE_SIZE }

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D heightMap;
    uniform float uTime;
    uniform float uGridSize;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    // Instance world position (xz only)
    vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    
    // Exact UV Mapping to match Terrain.tsx 101x101 DataTexture
    // Plane is from -BOUNDARY to BOUNDARY. Total width is uGridSize (20.0)
    float boundary = uGridSize * 0.5;
    vec2 uv = (instPos.xz + boundary) / uGridSize;
    // Invert Y UV to match Terrain.tsx PlaneGeometry mapping (Back/North is V=1)
    uv.y = 1.0 - uv.y;
    vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
    
    // Sample height from heightMap (R channel) using bilinear interpolation
    float h = bilinear(heightMap, sUv, vec2(101.0)).r;
    transformed.y += h / instanceMatrix[1][1];
    
    // Wind sway (only for foliage, not trunk)
    float swayFactor = smoothstep(0.1, 1.0, position.y);
    float sway = sin(uTime * 1.5 + instPos.x * 5.0 + instPos.z * 3.0) * 0.04 * swayFactor;
    transformed.x += sway;
    transformed.z += sway * 0.5;`
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
      float id = vPickingId + 1.0; // Offset by 1 to avoid ID:0
      float r = floor(id / 256.0) / 255.0;
      float g = mod(id, 256.0) / 255.0;
      gl_FragColor = vec4(r, g, 1.0, 1.0); 
    }
  `
}

import * as THREE from 'three'
import { BILINEAR_GLSL, BILINEAR_ARRAY_GLSL } from './shared'

export const terrainVertexShader = (shader: THREE.ShaderLibShader, uniforms: Record<string, THREE.IUniform>) => {
  shader.uniforms.uTerrainLayers = uniforms.uTerrainLayers
  shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
  shader.uniforms.uTileSize = uniforms.uTileSize

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D uTerrainLayers;
    uniform sampler2D uTerrainSurface;
    uniform float uTileSize;
    varying float vType;
    varying vec2 vGridUv;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vGridUv = uv;
    vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
    vec4 surfaceData = bilinear(uTerrainSurface, sUv, vec2(101.0));
    transformed.y = surfaceData.r;
    vType = surfaceData.b;`
  )
}

export const terrainFragmentShader = (shader: THREE.ShaderLibShader, uniforms: Record<string, THREE.IUniform>) => {
  shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
  shader.uniforms.uHoveredCell = uniforms.uHoveredCell
  shader.uniforms.uLayerColors = uniforms.uLayerColors
  shader.uniforms.uLayerHighlightColors = uniforms.uLayerHighlightColors

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D uTerrainSurface;
    uniform vec2 uHoveredCell;
    uniform vec3 uLayerColors[6];
    uniform vec3 uLayerHighlightColors[6];
    varying float vType;
    varying vec2 vGridUv;`
  ).replace(
    '#include <color_fragment>',
    `#include <color_fragment>
    // Discrete Cell-based Material Sampling
    vec2 gridRes = vec2(100.0);
    vec2 texRes = vec2(101.0);
    vec2 cellCoord = clamp(floor(vGridUv * gridRes), 0.0, 99.0);
    float cellType = texture2D(uTerrainSurface, (cellCoord + 0.5) / texRes).b;
    
    int typeIdx = int(cellType + 0.5);
    vec3 terrainColor = uLayerColors[typeIdx];
    
    // Hover Highlight (Inverted Y to match picking)
    vec2 gridCell = floor(vGridUv * gridRes);
    if (gridCell.x == uHoveredCell.x && (gridRes.y - 1.0 - gridCell.y) == uHoveredCell.y) {
        terrainColor = mix(terrainColor, uLayerHighlightColors[typeIdx], 0.6);
    }

    // Grid and Boundary lines
    vec2 grid = fract(vGridUv * 100.0);
    float edgeDist = 0.05;
    bool isGridLineX = grid.x < edgeDist || grid.x > 1.0 - edgeDist;
    bool isGridLineY = grid.y < edgeDist || grid.y > 1.0 - edgeDist;
    
    if (isGridLineX || isGridLineY) {
        float boundary = 0.0;
        if (isGridLineX) {
            float neighborType = texture2D(uTerrainSurface, (cellCoord + vec2(grid.x < 0.5 ? -0.5 : 1.5, 0.5)) / texRes).b;
            if (abs(neighborType - cellType) > 0.1) boundary = 1.0;
        }
        if (isGridLineY) {
            float neighborType = texture2D(uTerrainSurface, (cellCoord + vec2(0.5, grid.y < 0.5 ? -0.5 : 1.5)) / texRes).b;
            if (abs(neighborType - cellType) > 0.1) boundary = 1.0;
        }
        
        if (boundary > 0.5) {
            terrainColor = mix(terrainColor, vec3(1.0, 0.9, 0.5), 0.6);
        } else {
            terrainColor *= 0.8;
        }
    }
    
    diffuseColor.rgb = terrainColor;`
  )
}

export const terrainPickingVertexShader = (shader: THREE.ShaderLibShader, uTerrainSurface: THREE.IUniform) => {
  shader.uniforms.uTerrainSurface = uTerrainSurface
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D uTerrainSurface;
    varying vec2 vGridUv;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vGridUv = uv;
    vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
    transformed.y = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;`
  )
}

export const terrainPickingFragmentShader = (shader: THREE.ShaderLibShader) => {
  shader.fragmentShader = `
    varying vec2 vGridUv;
    void main() {
      float x = (clamp(floor(vGridUv.x * 100.0), 0.0, 99.0) + 1.0) / 255.0;
      // Invert Y UV to match grid Z if mirrored
      float z = (clamp(floor((1.0 - vGridUv.y) * 100.0), 0.0, 99.0) + 1.0) / 255.0;
      gl_FragColor = vec4(x, z, 0.0, 1.0);
    }
  `
}

export const waterPickingVertexShader = (shader: THREE.ShaderLibShader, uniforms: Record<string, THREE.IUniform>) => {
  shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
  shader.uniforms.waterMap = uniforms.waterMap
  shader.uniforms.uTime = uniforms.uTime

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D uTerrainSurface;
    uniform sampler2D waterMap;
    uniform float uTime;
    varying float vDepth;
    varying vec2 vGridUv;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vGridUv = uv;
    vec2 gridRes = vec2(100.0);
    vec2 texRes = vec2(101.0);
    
    vec2 sUv = (uv * 100.0 + 0.5) / texRes;
    float h = bilinear(uTerrainSurface, sUv, texRes).r;
    
    vec2 st = uv * gridRes - 0.5;
    vec2 i = floor(st);
    vec2 f = fract(st);

    vec4 p00 = texture2D(waterMap, (i + vec2(0.0, 0.0) + 0.5) / gridRes);
    vec4 p10 = texture2D(waterMap, (i + vec2(1.0, 0.0) + 0.5) / gridRes);
    vec4 p01 = texture2D(waterMap, (i + vec2(0.0, 1.0) + 0.5) / gridRes);
    vec4 p11 = texture2D(waterMap, (i + vec2(1.0, 1.0) + 0.5) / gridRes);
    
    // Masks: 1.0 if wet or wet-adjacent (using extrapolated sL in Alpha)
    float m00 = p00.a > -90.0 ? 1.0 : 0.0;
    float m10 = p10.a > -90.0 ? 1.0 : 0.0;
    float m01 = p01.a > -90.0 ? 1.0 : 0.0;
    float m11 = p11.a > -90.0 ? 1.0 : 0.0;
    
    float fw00 = (1.0 - f.x) * (1.0 - f.y) * m00;
    float fw10 = f.x * (1.0 - f.y) * m10;
    float fw01 = (1.0 - f.x) * f.y * m01;
    float fw11 = f.x * f.y * m11;
    
    float totalW = fw00 + fw10 + fw01 + fw11;
    
    if (totalW > 0.0001) {
        float finalSL = (p00.a * fw00 + p10.a * fw10 + p01.a * fw01 + p11.a * fw11) / totalW;
        // Cap extrapolated water to terrain height if the local cell is dry
        float sw_local = bilinear(waterMap, vGridUv, gridRes).b;
        transformed.y = sw_local > 0.001 ? finalSL : min(finalSL, h);
    } else {
        transformed.y = h - 0.05; // Hide dry vertices
    }
    
    vDepth = transformed.y - h;
    
    float sw_interp = bilinear(waterMap, uv, gridRes).b;
    if (sw_interp > 0.05) {
      transformed.y += sin(uTime * 2.0 + (position.x + position.z) * 5.0) * 0.005;
    }`
  )
}

export const waterPickingFragmentShader = (shader: THREE.ShaderLibShader, waterMap: THREE.IUniform) => {
  shader.uniforms.waterMap = waterMap
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D waterMap;
    varying float vDepth;
    varying vec2 vGridUv;`
  ).replace(
    '#include <color_fragment>',
    `#include <color_fragment>
    // Hide if dry and no wet neighbors
    vec4 waterData = texture2D(waterMap, vGridUv);
    if (waterData.a < -90.0) discard;

    // Continuous Depth Check (intersection with smooth terrain)
    float x = (clamp(floor(vGridUv.x * 100.0), 0.0, 99.0) + 1.0) / 255.0;
    float z = (clamp(floor((1.0 - vGridUv.y) * 100.0), 0.0, 99.0) + 1.0) / 255.0;
    diffuseColor.rgb = vec3(x, z, 0.0);
    diffuseColor.a = 1.0;`
  )
}

export const terrainDepthVertexShader = (shader: THREE.ShaderLibShader, uTerrainSurface: THREE.IUniform) => {
  shader.uniforms.uTerrainSurface = uTerrainSurface
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D uTerrainSurface;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
    transformed.y = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;`
  )
}

export const terrainSideVertexShader = (shader: THREE.ShaderLibShader, uniforms: Record<string, THREE.IUniform>, edge: 'N' | 'S' | 'E' | 'W') => {
  shader.uniforms.uTerrainLayers = uniforms.uTerrainLayers
  shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
  shader.uniforms.uLayerColors = uniforms.uLayerColors
  shader.uniforms.waterMap = uniforms.waterMap
  shader.uniforms.uTime = uniforms.uTime
  
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform highp sampler2DArray uTerrainLayers;
    uniform sampler2D uTerrainSurface;
    uniform sampler2D waterMap;
    uniform float uTime;
    varying float vWorldY;
    varying float vSurfaceY;
    varying float vWaterY;
    varying vec2 vGridUv;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    float edgeX = uv.x;
    ${edge === 'N' ? 'vGridUv = vec2(1.0 - edgeX, 1.0);' : ''}
    ${edge === 'S' ? 'vGridUv = vec2(edgeX, 0.0);' : ''}
    ${edge === 'W' ? 'vGridUv = vec2(0.0, 1.0 - edgeX);' : ''}
    ${edge === 'E' ? 'vGridUv = vec2(1.0, edgeX);' : ''}

    vec2 gridRes = vec2(100.0);
    vec2 texRes = vec2(101.0);
    vec2 sUv = (vGridUv * 100.0 + 0.5) / texRes;
    float h = bilinear(uTerrainSurface, sUv, texRes).r;
    
    // Water-Aware Interpolation for Sides
    vec2 st = vGridUv * gridRes - 0.5;
    vec2 i = floor(st);
    vec2 f = fract(st);
    vec4 p00 = texture2D(waterMap, (i + vec2(0.0, 0.0) + 0.5) / gridRes);
    vec4 p10 = texture2D(waterMap, (i + vec2(1.0, 0.0) + 0.5) / gridRes);
    vec4 p01 = texture2D(waterMap, (i + vec2(0.0, 1.0) + 0.5) / gridRes);
    vec4 p11 = texture2D(waterMap, (i + vec2(1.0, 1.0) + 0.5) / gridRes);
    
    float m00 = p00.a > -90.0 ? 1.0 : 0.0;
    float m10 = p10.a > -90.0 ? 1.0 : 0.0;
    float m01 = p01.a > -90.0 ? 1.0 : 0.0;
    float m11 = p11.a > -90.0 ? 1.0 : 0.0;
    
    float fw00 = (1.0 - f.x) * (1.0 - f.y) * m00;
    float fw10 = f.x * (1.0 - f.y) * m10;
    float fw01 = (1.0 - f.x) * f.y * m01;
    float fw11 = f.x * f.y * m11;
    float tw = fw00 + fw10 + fw01 + fw11;
    
    float wH = h - 0.05;
    if (tw > 0.0001) {
        wH = (p00.a * fw00 + p10.a * fw10 + p01.a * fw01 + p11.a * fw11) / tw;
    }

    vSurfaceY = h;
    vWaterY = wH;

    if (uv.y > 0.5) {
        transformed.y = vSurfaceY;
    } else {
        transformed.y = -1.0;
    }
    vWorldY = transformed.y;`
  )
}

export const waterFragmentShader = (shader: THREE.ShaderLibShader, uniforms: Record<string, THREE.IUniform>) => {
  shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
  shader.uniforms.waterMap = uniforms.waterMap
  shader.uniforms.uTime = uniforms.uTime
  shader.uniforms.uHoveredCell = uniforms.uHoveredCell
  shader.uniforms.uLayerHighlightColors = uniforms.uLayerHighlightColors
  
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D uTerrainSurface;
    uniform sampler2D waterMap;
    uniform float uTime;
    varying float vDepth;
    varying vec2 vGridUv;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vGridUv = uv;
    vec2 gridRes = vec2(100.0);
    vec2 texRes = vec2(101.0);
    
    // 1. Smooth Terrain Height at this vertex
    vec2 sUv = (uv * 100.0 + 0.5) / texRes;
    float h = bilinear(uTerrainSurface, sUv, texRes).r;
    
    // 2. Wet-Neighbor-Only Level Averaging
    vec2 st = uv * gridRes - 0.5;
    vec2 i = floor(st);
    vec2 f = fract(st);

    vec4 p00 = texture2D(waterMap, (i + vec2(0.0, 0.0) + 0.5) / gridRes);
    vec4 p10 = texture2D(waterMap, (i + vec2(1.0, 0.0) + 0.5) / gridRes);
    vec4 p01 = texture2D(waterMap, (i + vec2(0.0, 1.0) + 0.5) / gridRes);
    vec4 p11 = texture2D(waterMap, (i + vec2(1.0, 1.0) + 0.5) / gridRes);
    
    // Masks: 1.0 if wet or wet-adjacent (using extrapolated sL in Alpha)
    float m00 = p00.a > -90.0 ? 1.0 : 0.0;
    float m10 = p10.a > -90.0 ? 1.0 : 0.0;
    float m01 = p01.a > -90.0 ? 1.0 : 0.0;
    float m11 = p11.a > -90.0 ? 1.0 : 0.0;
    
    float fw00 = (1.0 - f.x) * (1.0 - f.y) * m00;
    float fw10 = f.x * (1.0 - f.y) * m10;
    float fw01 = (1.0 - f.x) * f.y * m01;
    float fw11 = f.x * f.y * m11;
    
    float totalW = fw00 + fw10 + fw01 + fw11;
    
    if (totalW > 0.0001) {
        float finalSL = (p00.a * fw00 + p10.a * fw10 + p01.a * fw01 + p11.a * fw11) / totalW;
        // Cap extrapolated water to terrain height if the local cell is dry
        float sw_local = bilinear(waterMap, vGridUv, gridRes).b;
        transformed.y = sw_local > 0.001 ? finalSL : min(finalSL, h);
    } else {
        transformed.y = h - 0.05; // Hide dry vertices
    }
    
    vDepth = transformed.y - h;
    
    float sw_interp = bilinear(waterMap, uv, gridRes).b;
    if (sw_interp > 0.05) {
      transformed.y += sin(uTime * 2.0 + (position.x + position.z) * 5.0) * 0.005;
    }`
  )

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D waterMap;
    uniform vec2 uHoveredCell;
    uniform vec3 uLayerHighlightColors[6];
    varying float vDepth;
    varying vec2 vGridUv;`
  ).replace(
    '#include <color_fragment>',
    `#include <color_fragment>
    // Hide if dry and no wet neighbors
    vec4 waterData = texture2D(waterMap, vGridUv);
    if (waterData.a < -90.0) discard;

    // Continuous Depth Check (intersection with smooth terrain)
    vec3 shallowColor = vec3(0.2, 0.5, 0.8);
    vec3 deepColor = vec3(0.02, 0.1, 0.3);
    vec3 waterColor = mix(shallowColor, deepColor, smoothstep(0.0, 0.5, vDepth));
    
    // Hover Highlight
    vec2 gridRes = vec2(100.0);
    vec2 gridCell = floor(vGridUv * gridRes);
    if (gridCell.x == uHoveredCell.x && (gridRes.y - 1.0 - gridCell.y) == uHoveredCell.y) {
        waterColor = mix(waterColor, uLayerHighlightColors[5], 0.4);
    }

    // Crisp shoreline contour at terrain intersection
    float shoreLine = 1.0 - smoothstep(0.0, 0.03, vDepth);
    waterColor = mix(waterColor, vec3(1.0), shoreLine * 0.8);
    
    // Subtle flow/grid lines
    vec2 grid = fract(vGridUv * 100.0);
    if (grid.x < 0.02 || grid.y < 0.02) {
        waterColor += vec3(0.05);
    }
    
    diffuseColor.rgb = waterColor;
    diffuseColor.a = 0.85;`
  )
}

export const terrainSideFragmentShader = (shader: THREE.ShaderLibShader, isWater: boolean, MAX_GPU_LAYERS: number) => {
  shader.fragmentShader = `#define MAX_LAYERS ${MAX_GPU_LAYERS}\n` + shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>
    precision highp sampler2DArray;
    uniform sampler2DArray uTerrainLayers;
    uniform sampler2D uTerrainSurface;
    uniform sampler2D waterMap;
    uniform vec3 uLayerColors[6];
    varying float vWorldY;
    varying float vSurfaceY;
    varying float vWaterY;
    varying vec2 vGridUv;
    ${BILINEAR_ARRAY_GLSL}`
  ).replace(
    '#include <color_fragment>',
    `#include <color_fragment>
    ${isWater ? `
      // Hide if dry and no wet neighbors
      vec4 waterData = texture2D(waterMap, vGridUv);
      if (waterData.a < -90.0) discard;

      // Deep/Shallow Color
      float depth = vWaterY - vSurfaceY;
      vec3 shallowColor = vec3(0.2, 0.5, 0.8);
      vec3 deepColor = vec3(0.02, 0.1, 0.3);
      diffuseColor.rgb = mix(shallowColor, deepColor, smoothstep(0.0, 0.5, depth)) * 0.7;
    ` : `
      vec2 gridRes = vec2(100.0);
      vec2 texRes = vec2(101.0);
      
      // Use a slight inset to avoid floating point precision issues exactly on the edge
      vec2 safeGridUv = clamp(vGridUv, 0.001, 0.999);
      vec2 cellCoord = floor(safeGridUv * gridRes);
      vec2 discreteSUv = (cellCoord + 0.5) / texRes;
      
      vec2 sUv = (vGridUv * 100.0 + 0.5) / 101.0;
      
      float currentH = -5.0;
      vec3 terrainColor = uLayerColors[0];

      for (int i = 0; i < MAX_LAYERS; i++) {
          // Interpolate thickness for smooth height transitions
          vec4 layerData = bilinearArray(uTerrainLayers, sUv, float(i), vec2(101.0));
          if (layerData.r < -0.5) break;
          
          // Read discrete type for color
          vec4 discreteLayerData = texture(uTerrainLayers, vec3(discreteSUv, float(i)));
          
          float nextH = currentH + layerData.g;
          if (vWorldY <= nextH + 0.001) {
              float typeIdx = discreteLayerData.r;
              if (typeIdx < -0.5) {
                  // Fall back to discrete cell's top layer if it lacks this interpolated layer
                  typeIdx = texture(uTerrainSurface, discreteSUv).b;
              }
              terrainColor = uLayerColors[int(typeIdx + 0.5)];
              break;
          }
          currentH = nextH;
      }

      diffuseColor.rgb = terrainColor * 0.7; // Darken sides
    `}
    diffuseColor.a = 1.0;`
  )
}

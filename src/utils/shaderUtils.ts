import * as THREE from 'three'

export interface Shader {
  uniforms: { [uniform: string]: THREE.IUniform }
  vertexShader: string
  fragmentShader: string
}

export interface ShaderModule {
  name: string
  uniforms?: Record<string, THREE.IUniform>
  vertex?: {
    common?: string
    begin?: string
    main?: string
  }
  fragment?: {
    common?: string
    color?: string
    main?: string
  }
  defines?: Record<string, string | number | boolean>
}

/**
 * Applies a set of shader modules to a Three.js shader object.
 */
export const applyModulesToShader = (
  shader: Shader,
  modules: ShaderModule[],
  extraUniforms?: Record<string, THREE.IUniform>
) => {
  // 1. Merge Uniforms
  if (extraUniforms) {
    Object.assign(shader.uniforms, extraUniforms)
  }
  modules.forEach((mod) => {
    if (mod.uniforms) {
      Object.assign(shader.uniforms, mod.uniforms)
    }
  })

  // 2. Apply Defines
  modules.forEach((mod) => {
    if (mod.defines) {
      const definesStr = Object.entries(mod.defines)
        .map(([key, value]) => `#define ${key} ${value}\n`)
        .join('')
      shader.vertexShader = definesStr + shader.vertexShader
      shader.fragmentShader = definesStr + shader.fragmentShader
    }
  })

  // 3. Inject Vertex Shader Code
  modules.forEach((mod) => {
    if (mod.vertex) {
      if (mod.vertex.main) {
        shader.vertexShader = mod.vertex.main
      }
      if (mod.vertex.common) {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>\n${mod.vertex.common}`
        )
      }
      if (mod.vertex.begin) {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\n${mod.vertex.begin}`
        )
      }
    }
  })

  // 4. Inject Fragment Shader Code
  modules.forEach((mod) => {
    if (mod.fragment) {
      if (mod.fragment.main) {
        shader.fragmentShader = mod.fragment.main
      }
      if (mod.fragment.common) {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>\n${mod.fragment.common}`
        )
      }
      if (mod.fragment.color) {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>\n${mod.fragment.color}`
        )
      }
    }
  })
}

/**
 * Injects a set of shader modules into a Three.js material using onBeforeCompile.
 */
export const injectModules = (
  material: THREE.Material,
  modules: ShaderModule[],
  extraUniforms?: Record<string, THREE.IUniform>
) => {
  const originalOnBeforeCompile = material.onBeforeCompile

  material.onBeforeCompile = (shader: Shader, renderer: THREE.WebGLRenderer) => {
    applyModulesToShader(shader, modules, extraUniforms)

    if (originalOnBeforeCompile) {
      const original = originalOnBeforeCompile as (s: Shader, r: THREE.WebGLRenderer) => void
      original.call(material, shader, renderer)
    }
  }

  // Ensure unique program cache key for materials with different modules
  const moduleKey = modules.map(m => m.name).join('|')
  material.customProgramCacheKey = () => moduleKey

  // Force material update
  material.needsUpdate = true
}

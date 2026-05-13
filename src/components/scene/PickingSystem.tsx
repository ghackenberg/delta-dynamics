import { useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'

export const PICKING_LAYER = 1

export const PickingSystem = () => {
  const { gl, scene, camera, mouse, size } = useThree()
  const setHoveredCell = useStore((state) => state.setHoveredCell)
  const setHoveredEntityId = useStore((state) => state.setHoveredEntityId)

  const target = useMemo(() => {
    return new THREE.WebGLRenderTarget(1, 1, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    })
  }, [])

  const pixelBuffer = useMemo(() => new Uint8Array(4), [])

  useFrame(() => {
    if (!mouse || (mouse.x === 0 && mouse.y === 0)) return

    // 1. Calculate pixel position from NDC
    const x = (mouse.x * 0.5 + 0.5) * size.width
    const y = (mouse.y * 0.5 + 0.5) * size.height

    // 2. Prepare Camera
    const originalMask = camera.layers.mask
    
    if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
        camera.setViewOffset(size.width, size.height, x, size.height - y, 1, 1)
    }
    camera.layers.set(PICKING_LAYER)

    // 3. Render
    const currentRenderTarget = gl.getRenderTarget()
    gl.setRenderTarget(target)
    gl.render(scene, camera)
    gl.setRenderTarget(currentRenderTarget)

    // 4. Restore Camera
    if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
        camera.clearViewOffset()
    }
    /* eslint-disable-next-line react-hooks/immutability */
    camera.layers.mask = originalMask

    // 5. Read back the pixel
    gl.readRenderTargetPixels(target, 0, 0, 1, 1, pixelBuffer)

    // 6. Decode
    const r = pixelBuffer[0]
    const g = pixelBuffer[1]
    const b = pixelBuffer[2]

    if (b === 0) { // Terrain encoding
      if (r > 0 && g > 0) {
        setHoveredCell({ x: r - 1, z: g - 1 })
        setHoveredEntityId(null)
      } else {
        setHoveredCell(null)
        setHoveredEntityId(null)
      }
    } else if (b === 255) { // Entity encoding
        setHoveredCell(null)
    } else {
        setHoveredCell(null)
        setHoveredEntityId(null)
    }
  }, -1) // Run BEFORE the main render pass (priority < 0)

  return null
}

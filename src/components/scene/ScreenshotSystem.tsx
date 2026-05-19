import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { GRID_SIZE, TILE_SIZE } from '../../constants/gameConfig'
import { getTerrainById } from '../../terrains'

export const ScreenshotSystem = () => {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const activeTerrainId = useStore((state) => state.activeTerrainId)
  const setScreenshotProvider = useStore((state) => state.setScreenshotProvider)

  // Dedicated preview camera for consistent angle
  const previewCamera = useMemo(() => {
    const terrainConfig = getTerrainById(activeTerrainId)
    const terrainSize = GRID_SIZE * TILE_SIZE
    const [minY, maxY] = terrainConfig.visualRange
    const targetY = (minY + maxY) / 2
    
    // Match Scene.tsx camera calculation but slightly further out for 16:9 safety
    const px = terrainConfig.cameraPosition ? terrainConfig.cameraPosition[0] : terrainSize * 1.0
    const py = terrainConfig.cameraPosition ? terrainConfig.cameraPosition[1] : targetY + terrainSize * 0.9
    const pz = terrainConfig.cameraPosition ? terrainConfig.cameraPosition[2] : terrainSize * 1.0
    
    const tx = terrainConfig.cameraTarget ? terrainConfig.cameraTarget[0] : 0
    const ty = terrainConfig.cameraTarget ? terrainConfig.cameraTarget[1] : targetY
    const tz = terrainConfig.cameraTarget ? terrainConfig.cameraTarget[2] : 0

    const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000)
    cam.position.set(px, py, pz)
    cam.lookAt(tx, ty, tz)
    cam.updateProjectionMatrix()
    return cam
  }, [activeTerrainId])

  useEffect(() => {
    const provider = async () => {
      const targetW = 1024
      const targetH = 576 // 16:9
      
      const renderTarget = new THREE.WebGLRenderTarget(targetW, targetH, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        colorSpace: THREE.SRGBColorSpace,
      })

      // 1. Setup temporary "studio" lighting for the preview
      const previewSun = new THREE.DirectionalLight(0xffffff, 2.5)
      previewSun.position.set(20, 40, 20)
      const previewAmbient = new THREE.AmbientLight(0xffffff, 0.8)
      
      // 2. Save current state and hide main lights/previews
      const originalRenderTarget = gl.getRenderTarget()
      const originalBackground = scene.background
      
      const mainAmbient = scene.getObjectByName('main-ambient-light')
      const mainDir = scene.getObjectByName('main-dir-light')
      const placementPreview = scene.getObjectByName('building-placement-preview')
      
      const originalAmbientIntensity = mainAmbient ? (mainAmbient as THREE.AmbientLight).intensity : 0
      const originalDirIntensity = mainDir ? (mainDir as THREE.DirectionalLight).intensity : 0
      const originalPreviewVisible = placementPreview ? placementPreview.visible : false

      if (mainAmbient) (mainAmbient as THREE.AmbientLight).intensity = 0
      if (mainDir) (mainDir as THREE.DirectionalLight).intensity = 0
      if (placementPreview) placementPreview.visible = false
      
      // 3. Apply preview state
      scene.add(previewSun)
      scene.add(previewAmbient)
      scene.background = new THREE.Color('#87ceeb') // Nice sky blue

      // 4. Render
      gl.setRenderTarget(renderTarget)
      gl.render(scene, previewCamera)

      // 5. Read pixels from render target
      const buffer = new Uint8Array(targetW * targetH * 4)
      gl.readRenderTargetPixels(renderTarget, 0, 0, targetW, targetH, buffer)

      // 6. Restore original state immediately
      scene.remove(previewSun)
      scene.remove(previewAmbient)
      scene.background = originalBackground
      if (mainAmbient) (mainAmbient as THREE.AmbientLight).intensity = originalAmbientIntensity
      if (mainDir) (mainDir as THREE.DirectionalLight).intensity = originalDirIntensity
      if (placementPreview) placementPreview.visible = originalPreviewVisible
      gl.setRenderTarget(originalRenderTarget)
      
      renderTarget.dispose()

      // Create a canvas to convert the pixel buffer to a data URL
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = targetW
      tempCanvas.height = targetH
      const ctx = tempCanvas.getContext('2d')
      
      if (ctx) {
        const imageData = ctx.createImageData(targetW, targetH)
        // WebGL pixels are bottom-to-top, so we need to flip them for the canvas
        for (let y = 0; y < targetH; y++) {
          const srcY = targetH - 1 - y
          const srcOffset = srcY * targetW * 4
          const destOffset = y * targetW * 4
          for (let x = 0; x < targetW * 4; x++) {
            imageData.data[destOffset + x] = buffer[srcOffset + x]
          }
        }
        ctx.putImageData(imageData, 0, 0)
      }

      return tempCanvas.toDataURL('image/webp', 0.8)
    }

    setScreenshotProvider(provider)
    return () => setScreenshotProvider(null)
  }, [gl, scene, previewCamera, setScreenshotProvider])

  return null
}

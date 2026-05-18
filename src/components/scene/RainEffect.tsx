/* eslint-disable react-hooks/purity */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { gridToWorld } from '../../utils/gameUtils'
import { GRID_SIZE, TILE_SIZE } from '../../constants/gameConfig'

const RAIN_COUNT = 500
const CLOUD_HEIGHT_OFFSET = 5

export const RainEffect = () => {
  const hoveredCell = useStore((state) => state.hoveredCell)
  const isEditorInteracting = useStore((state) => state.isEditorInteracting)
  const editorLayerType = useStore((state) => state.editorLayerType)
  const brushSize = useStore((state) => state.editorBrushSize)
  const brushStrength = useStore((state) => state.editorBrushStrength)
  const mode = useStore((state) => state.mode)
  const tHeight = useStore((state) => state.tHeight)

  const isRainSelected = mode === 'EDITOR' && editorLayerType === 'RAIN'
  const isRainPainting = isRainSelected && isEditorInteracting

  const groupRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const cloudMatRef = useRef<THREE.ShaderMaterial>(null)
  const rainMatRef = useRef<THREE.ShaderMaterial>(null)

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(RAIN_COUNT * 3)
    const vel = new Float32Array(RAIN_COUNT)
    for (let i = 0; i < RAIN_COUNT; i++) {
      vel[i] = Math.random() * 0.2 + 0.1
      
      // Randomize initial vertical position (Y) starting from inside the cloud
      pos[i * 3 + 1] = 0.5 - Math.random() * (CLOUD_HEIGHT_OFFSET + 0.5)
      
      // Randomize initial horizontal position (XZ) within a maximum potential brush size
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 15 * TILE_SIZE
      pos[i * 3 + 0] = Math.cos(angle) * radius
      pos[i * 3 + 2] = Math.sin(angle) * radius
    }
    return [pos, vel]
  }, [])

  useFrame((state) => {
    if (!groupRef.current) return

    if (isRainSelected && hoveredCell) {
      groupRef.current.visible = true
      const [wx, wz] = gridToWorld(hoveredCell.x, hoveredCell.z)
      const terrainHeight = tHeight[hoveredCell.z * GRID_SIZE + hoveredCell.x]
      const targetY = terrainHeight + CLOUD_HEIGHT_OFFSET
      
      // Smoothly move the cloud/rain group
      groupRef.current.position.x += (wx - groupRef.current.position.x) * 0.2
      groupRef.current.position.z += (wz - groupRef.current.position.z) * 0.2
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.2

      // Update cloud shader
      if (cloudMatRef.current) {
        cloudMatRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
        cloudMatRef.current.uniforms.uBrushSize.value = brushSize * TILE_SIZE
        cloudMatRef.current.uniforms.uIntensity.value = brushStrength
      }

      // Update rain particles
      if (pointsRef.current) {
        pointsRef.current.visible = isRainPainting
        
        // Update rain material intensity
        if (rainMatRef.current) {
          rainMatRef.current.uniforms.uIntensity.value = brushStrength
        }
        
        // Always update rain positions in background so they stay desynchronized
        const geo = pointsRef.current.geometry as THREE.BufferGeometry
        const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
        
        for (let i = 0; i < RAIN_COUNT; i++) {
          let y = posAttr.getY(i)
          y -= velocities[i]
          
          if (y < -CLOUD_HEIGHT_OFFSET) {
            // Respawn inside the cloud (at y=0.5) with a slight jitter
            y = 0.5 + (Math.random() - 0.5) * 0.1
            
            // Randomize XZ within current brush radius (in world space)
            const angle = Math.random() * Math.PI * 2
            // Scale effective radius by intensity slightly so low intensity feels more focused
            const radius = Math.random() * brushSize * TILE_SIZE
            posAttr.setX(i, Math.cos(angle) * radius)
            posAttr.setZ(i, Math.sin(angle) * radius)
          }
          
          posAttr.setY(i, y)
        }
        posAttr.needsUpdate = true
      }
    } else {
      groupRef.current.visible = false
    }
  })

  return (
    <group ref={groupRef}>
      {/* Cloud */}
      <mesh position={[0, 0, 0]}>
        <icosahedronGeometry args={[1, 3]} />
        <shaderMaterial
          ref={cloudMatRef}
          transparent
          uniforms={{
            uBrushSize: { value: brushSize },
            uIntensity: { value: brushStrength },
            uTime: { value: 0 },
            uColor: { value: new THREE.Color('#777') }
          }}
          vertexShader={`
            varying vec3 vNormal;
            uniform float uBrushSize;
            uniform float uIntensity;
            uniform float uTime;

            // Simple 3D Noise
            float hash(vec3 p) {
              p = fract(p * 0.3183099 + 0.1);
              p *= 17.0;
              return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }

            float noise(vec3 x) {
              vec3 i = floor(x);
              vec3 f = fract(x);
              f = f * f * (3.0 - 2.0 * f);
              return mix(mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
                             mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
                         mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                             mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
            }

            void main() {
              vNormal = normal;
              
              // Base radius
              float radius = uBrushSize;
              
              // Displacement scaled by intensity
              vec3 pos = position;
              float n = noise(pos * 2.0 + uTime * 0.5);
              float displacement = n * radius * 0.2 * (0.5 + uIntensity * 0.5);
              
              // Flatten the cloud heavily
              vec3 displacedPosition = pos * radius;
              displacedPosition.y *= 0.1;
              displacedPosition += normal * displacement;
              displacedPosition.y *= 0.5;

              gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
            }
          `}fragmentShader={`
            varying vec3 vNormal;
            uniform vec3 uColor;
            uniform float uIntensity;

            void main() {
              float dotProduct = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0)));
              float light = max(0.5, dotProduct);
              // Darken cloud with intensity
              vec3 color = uColor * (1.1 - uIntensity * 0.4);
              gl_FragColor = vec4(color * light, 0.6 + uIntensity * 0.3);
            }
          `}
        />
      </mesh>

      {/* Rain Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={rainMatRef}
          transparent
          uniforms={{
            uColor: { value: new THREE.Color('#fff') },
            uOpacity: { value: 0.6 },
            uIntensity: { value: brushStrength },
            uSize: { value: 0.1 }
          }}
          vertexShader={`
            uniform float uSize;
            uniform float uIntensity;
            varying float vLocalY;
            varying float vId;
            
            void main() {
              vLocalY = position.y;
              vId = float(gl_VertexID) / 500.0; // Normalized ID for density check
              
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = uSize * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            uniform vec3 uColor;
            uniform float uOpacity;
            uniform float uIntensity;
            varying float vLocalY;
            varying float vId;

            void main() {
              // 1. Clip particles that are above the "bottom" of the cloud
              if (vLocalY > 0.0) discard;
              
              // 2. Density scaling: Discard particles based on intensity
              // Higher intensity = more particles pass the check
              if (vId > uIntensity) discard;
              
              // 3. Simple circular particle
              if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
              
              // 4. Opacity scaling
              float finalOpacity = uOpacity * (0.5 + uIntensity * 0.5);
              gl_FragColor = vec4(uColor, finalOpacity);
            }
          `}
        />
      </points>
    </group>
  )
}

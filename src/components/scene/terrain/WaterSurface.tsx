import * as THREE from 'three'
import { PICKING_LAYER } from '../PickingSystem'

interface WaterSurfaceProps {
  geometry: THREE.BufferGeometry
  onBeforeCompile: (shader: THREE.ShaderLibShader) => void
  onBeforeCompilePicking: (shader: THREE.ShaderLibShader) => void
}

export const WaterSurface = ({
  geometry,
  onBeforeCompile,
  onBeforeCompilePicking
}: WaterSurfaceProps) => {
  return (
    <>
      {/* Water Picking Mesh */}
      <mesh 
        layers-mask={1 << PICKING_LAYER}
        frustumCulled={false} 
        position={[0, 0, 0]} 
        geometry={geometry}
      >
        <meshBasicMaterial 
          onBeforeCompile={onBeforeCompilePicking} 
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      <mesh 
        receiveShadow 
        frustumCulled={false} 
        position={[0, 0, 0]} 
        geometry={geometry}
      >
        <meshStandardMaterial
          flatShading
          onBeforeCompile={onBeforeCompile}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </>
  )
}

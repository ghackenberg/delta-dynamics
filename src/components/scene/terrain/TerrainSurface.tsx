import * as THREE from 'three'
import { PICKING_LAYER } from '../PickingSystem'

interface TerrainSurfaceProps {
  geometry: THREE.BufferGeometry
  depthMaterial: THREE.MeshDepthMaterial
  onBeforeCompile: (shader: THREE.ShaderLibShader) => void
  onBeforeCompilePicking: (shader: THREE.ShaderLibShader) => void
}

export const TerrainSurface = ({
  geometry,
  depthMaterial,
  onBeforeCompile,
  onBeforeCompilePicking
}: TerrainSurfaceProps) => {
  return (
    <>
      <mesh 
        receiveShadow 
        castShadow 
        frustumCulled={false} 
        position={[0, 0, 0]} 
        geometry={geometry}
        customDepthMaterial={depthMaterial}
      >
        <meshStandardMaterial flatShading onBeforeCompile={onBeforeCompile} />
      </mesh>
      
      {/* Picking Mesh */}
      <mesh 
        layers-mask={1 << PICKING_LAYER}
        frustumCulled={false} 
        position={[0, 0, 0]} 
        geometry={geometry}
      >
        <meshBasicMaterial onBeforeCompile={onBeforeCompilePicking} />
      </mesh>
    </>
  )
}

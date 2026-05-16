import * as THREE from 'three'

interface WaterSidesProps {
  geometry: THREE.BufferGeometry
  onBeforeCompile: (shader: THREE.ShaderLibShader, edge: 'N' | 'S' | 'E' | 'W') => void
  offset: number
}

export const WaterSides = ({
  geometry,
  onBeforeCompile,
  offset
}: WaterSidesProps) => {
  return (
    <>
      <mesh position={[0, 0, -offset]} rotation={[0, Math.PI, 0]} geometry={geometry} frustumCulled={false}>
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompile(s, 'N')} />
      </mesh>
      <mesh position={[0, 0, offset]} rotation={[0, 0, 0]} geometry={geometry} frustumCulled={false}>
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompile(s, 'S')} />
      </mesh>
      <mesh position={[-offset, 0, 0]} rotation={[0, -Math.PI/2, 0]} geometry={geometry} frustumCulled={false}>
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompile(s, 'W')} />
      </mesh>
      <mesh position={[offset, 0, 0]} rotation={[0, Math.PI/2, 0]} geometry={geometry} frustumCulled={false}>
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompile(s, 'E')} />
      </mesh>
    </>
  )
}

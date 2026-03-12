import { Text } from '@react-three/drei';
import type { SubsurfaceGrid } from '../../types';
import { SALTON_SEA } from '../../data/constants';

interface Props {
  grid: SubsurfaceGrid;
}

export default function DepthAxis({ grid }: Props) {
  const { nz } = grid;
  const labels = [1000, 1500, 2000, 2500, 3000];

  return (
    <group position={[-1.5, 0, -1.5]}>
      {labels.map((depth) => {
        const fraction = (depth - SALTON_SEA.depthTop) / (SALTON_SEA.depthBottom - SALTON_SEA.depthTop);
        const y = fraction * nz;
        return (
          <Text
            key={depth}
            position={[0, y, 0]}
            fontSize={0.6}
            color="#8b99a8"
            anchorX="right"
            anchorY="middle"
          >
            {depth}m
          </Text>
        );
      })}
      {/* Axis line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0.3, 0, 0, 0.3, nz, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#8b99a8" />
      </line>
    </group>
  );
}

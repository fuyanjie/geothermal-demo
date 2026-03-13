import { Text } from '@react-three/drei';
import type { SubsurfaceGrid } from '../../types';
import { BRADY } from '../../data/constants';

interface Props {
  grid: SubsurfaceGrid;
}

export default function DepthAxis({ grid }: Props) {
  const { nz } = grid;
  const labels = [0, 100, 200, 300, 400, 500];

  return (
    <group position={[-1.5, 0, -1.5]}>
      {labels.map((depth) => {
        const fraction = (depth - BRADY.depthTop) / (BRADY.depthBottom - BRADY.depthTop);
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
            args={[new Float32Array([0.3, 0, 0, 0.3, nz, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#8b99a8" />
      </line>
    </group>
  );
}

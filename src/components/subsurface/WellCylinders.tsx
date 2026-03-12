import { useAppState } from '../../context/AppStateContext';
import { wells } from '../../data';
import { SALTON_SEA } from '../../data/constants';

export default function WellCylinders() {
  const { selectedWellId } = useAppState();
  const { nz } = SALTON_SEA.grid;

  return (
    <group>
      {wells.map((w) => {
        const isSelected = w.id === selectedWellId;
        const height = ((w.depthMeters - SALTON_SEA.depthTop) / (SALTON_SEA.depthBottom - SALTON_SEA.depthTop)) * nz;
        const radius = isSelected ? 0.4 : 0.2;
        const color = isSelected ? '#ff6b35' : w.type === 'injection' ? '#81c784' : '#4fc3f7';

        return (
          <mesh key={w.id} position={[w.gridX, height / 2, w.gridY]}>
            <cylinderGeometry args={[radius, radius, height, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isSelected ? 0.3 : 0.1} />
          </mesh>
        );
      })}
    </group>
  );
}

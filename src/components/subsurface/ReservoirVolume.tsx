import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { SubsurfaceGrid } from '../../types';
import { valueToColor } from '../../utils/colorScale';

interface Props {
  grid: SubsurfaceGrid;
  fieldData: Float32Array;
  min: number;
  max: number;
}

const tempColor = new THREE.Color();

export default function ReservoirVolume({ grid, fieldData, min, max }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { nx, ny, nz } = grid;
  const count = nx * ny * nz;

  const boxGeo = useMemo(() => new THREE.BoxGeometry(0.85, 0.85, 0.85), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55 }),
    [],
  );

  // Set instance positions once
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    let i = 0;
    for (let iz = 0; iz < nz; iz++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let ix = 0; ix < nx; ix++) {
          matrix.setPosition(ix, iz, iy);
          mesh.setMatrixAt(i, matrix);
          i++;
        }
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [nx, ny, nz]);

  // Update colors when field data changes
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < count; i++) {
      const [r, g, b] = valueToColor(fieldData[i], min, max);
      tempColor.setRGB(r, g, b);
      mesh.setColorAt(i, tempColor);
    }
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [fieldData, min, max, count]);

  return <instancedMesh ref={meshRef} args={[boxGeo, material, count]} />;
}

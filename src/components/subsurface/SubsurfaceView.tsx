import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAppState } from '../../context/AppStateContext';
import ReservoirVolume from './ReservoirVolume';
import WellCylinders from './WellCylinders';
import DepthAxis from './DepthAxis';
import ColorLegend from './ColorLegend';
import './SubsurfaceView.css';

export default function SubsurfaceView() {
  const { subsurfaceData, subsurfaceField, timestepIndex } = useAppState();
  const { grid, timesteps } = subsurfaceData;
  const timestep = timesteps[timestepIndex];
  const fieldData = timestep[subsurfaceField];

  // Compute min/max for color scale
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < fieldData.length; i++) {
    if (fieldData[i] < min) min = fieldData[i];
    if (fieldData[i] > max) max = fieldData[i];
  }

  // Scale to fit grid into a ~10-unit cube
  const maxDim = Math.max(grid.nx, grid.ny, grid.nz);
  const s = 10 / maxDim;

  return (
    <div className="subsurface-container">
      <Canvas camera={{ position: [12, 8, 12], fov: 45, near: 0.1, far: 200 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.0} />
        <group scale={[s, s, s]}>
          <group position={[-grid.nx / 2, -grid.nz / 2, -grid.ny / 2]}>
            <ReservoirVolume grid={grid} fieldData={fieldData} min={min} max={max} />
            <WellCylinders />
            <DepthAxis grid={grid} />
          </group>
        </group>
        <OrbitControls enableDamping dampingFactor={0.1} />
      </Canvas>
      <ColorLegend
        field={subsurfaceField}
        min={min}
        max={max}
      />
    </div>
  );
}

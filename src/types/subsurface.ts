export interface SubsurfaceGrid {
  nx: number;
  ny: number;
  nz: number;
  dx: number;
  dy: number;
  dz: number;
  originX: number;
  originY: number;
  originZ: number;
}

export interface SubsurfaceTimestep {
  date: string;
  temperature: Float32Array;
  pressure: Float32Array;
}

export interface SubsurfaceData {
  grid: SubsurfaceGrid;
  timesteps: SubsurfaceTimestep[];
}

export type SubsurfaceField = 'temperature' | 'pressure';

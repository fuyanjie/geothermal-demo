import type { SubsurfaceData, SubsurfaceTimestep } from '../types';
import type { WellMetadata } from '../types';
import { SALTON_SEA } from './constants';

const { grid, numTimesteps } = SALTON_SEA;

function generateDates(): string[] {
  const dates: string[] = [];
  const start = new Date(SALTON_SEA.startDate);
  for (let i = 0; i < numTimesteps; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function idx(ix: number, iy: number, iz: number): number {
  return ix + grid.nx * (iy + grid.ny * iz);
}

function gaussDist(x: number, y: number, cx: number, cy: number, sigma: number): number {
  const dx = x - cx;
  const dy = y - cy;
  return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
}

export function generateSubsurfaceData(wellList: WellMetadata[]): SubsurfaceData {
  const dates = generateDates();
  const totalCells = grid.nx * grid.ny * grid.nz;

  // Base temperature field: geothermal gradient + hot anomaly at center
  const baseTemp = new Float32Array(totalCells);
  const basePressure = new Float32Array(totalCells);

  const centerX = grid.nx / 2;
  const centerY = grid.ny / 2;

  for (let iz = 0; iz < grid.nz; iz++) {
    const depthFraction = iz / (grid.nz - 1); // 0 = top, 1 = bottom
    const depthMeters = SALTON_SEA.depthTop + depthFraction * (SALTON_SEA.depthBottom - SALTON_SEA.depthTop);

    for (let iy = 0; iy < grid.ny; iy++) {
      for (let ix = 0; ix < grid.nx; ix++) {
        const i = idx(ix, iy, iz);

        // Temperature: gradient with depth + hot center anomaly
        const gradientTemp = SALTON_SEA.tempSurface + depthFraction * (SALTON_SEA.tempMax - SALTON_SEA.tempSurface);
        const anomaly = 20 * gaussDist(ix, iy, centerX, centerY, 5) * depthFraction;
        baseTemp[i] = gradientTemp + anomaly;

        // Pressure: hydrostatic gradient
        basePressure[i] = SALTON_SEA.pressureMin + (depthMeters / 3000) * (SALTON_SEA.pressureMax - SALTON_SEA.pressureMin);
      }
    }
  }

  // Generate timesteps with temporal perturbations around wells
  const timesteps: SubsurfaceTimestep[] = dates.map((date, t) => {
    const temp = new Float32Array(baseTemp);
    const pres = new Float32Array(basePressure);
    const timeFraction = t / (numTimesteps - 1);

    for (const well of wellList) {
      const wx = well.gridX;
      const wy = well.gridY;
      const isProduction = well.type === 'production';

      for (let iz = 0; iz < grid.nz; iz++) {
        for (let iy = 0; iy < grid.ny; iy++) {
          for (let ix = 0; ix < grid.nx; ix++) {
            const i = idx(ix, iy, iz);
            const influence = gaussDist(ix, iy, wx, wy, 3);

            if (isProduction) {
              // Production wells: temperature decline + pressure drawdown over time
              temp[i] -= influence * timeFraction * 15;
              pres[i] -= influence * timeFraction * 2;
            } else {
              // Injection wells: cold front spreading + pressure buildup
              temp[i] -= influence * timeFraction * 25;
              pres[i] += influence * timeFraction * 1.5;
            }
          }
        }
      }
    }

    return { date, temperature: temp, pressure: pres };
  });

  return {
    grid: {
      nx: grid.nx,
      ny: grid.ny,
      nz: grid.nz,
      dx: grid.dx,
      dy: grid.dy,
      dz: grid.dz,
      originX: 0,
      originY: 0,
      originZ: -SALTON_SEA.depthTop,
    },
    timesteps,
  };
}

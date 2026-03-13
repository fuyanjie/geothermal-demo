import type { SubsurfaceData, SubsurfaceTimestep } from '../types';
import type { WellMetadata } from '../types';
import { BRADY } from './constants';

const { grid, numTimesteps } = BRADY;

function generateDates(): string[] {
  const dates: string[] = [];
  const start = new Date(BRADY.startDate);
  for (let i = 0; i < numTimesteps; i++) {
    const d = new Date(start.getTime() + i * 3600000); // hourly
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}T${h}`);
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
    const depthMeters = BRADY.depthTop + depthFraction * (BRADY.depthBottom - BRADY.depthTop);

    for (let iy = 0; iy < grid.ny; iy++) {
      for (let ix = 0; ix < grid.nx; ix++) {
        const i = idx(ix, iy, iz);

        // Temperature: gradient with depth + hot center anomaly
        // Brady has ~360°C/km gradient, surface at ~20°C
        const gradientTemp = BRADY.tempSurface + depthFraction * (BRADY.tempMax - BRADY.tempSurface);
        const anomaly = 15 * gaussDist(ix, iy, centerX, centerY, 5) * depthFraction;
        baseTemp[i] = gradientTemp + anomaly;

        // Pressure: hydrostatic gradient (in PSI)
        basePressure[i] = BRADY.pressureMin + (depthMeters / BRADY.depthBottom) * (BRADY.pressureMax - BRADY.pressureMin);
      }
    }
  }

  // Generate timesteps with temporal perturbations around wells
  // Use fewer timesteps for 3D (every 12 hours) to keep memory reasonable
  const step3d = 12; // generate one 3D frame every 12 hours
  const timesteps: SubsurfaceTimestep[] = [];

  for (let t = 0; t < dates.length; t += step3d) {
    const date = dates[t];
    const temp = new Float32Array(baseTemp);
    const pres = new Float32Array(basePressure);
    const timeFraction = t / (numTimesteps - 1);

    for (const well of wellList) {
      const wx = well.gridX;
      const wy = well.gridY;
      const isPumping = well.type === 'pumping';

      for (let iz = 0; iz < grid.nz; iz++) {
        for (let iy = 0; iy < grid.ny; iy++) {
          for (let ix = 0; ix < grid.nx; ix++) {
            const i = idx(ix, iy, iz);
            const influence = gaussDist(ix, iy, wx, wy, 3);

            if (isPumping) {
              temp[i] -= influence * timeFraction * 10;
              pres[i] -= influence * timeFraction * 30;
            } else if (well.type === 'injection') {
              temp[i] -= influence * timeFraction * 20;
              pres[i] += influence * timeFraction * 20;
            }
            // observation wells don't affect the field
          }
        }
      }
    }

    timesteps.push({ date, temperature: temp, pressure: pres });
  }

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
      originZ: -BRADY.depthTop,
    },
    timesteps,
  };
}

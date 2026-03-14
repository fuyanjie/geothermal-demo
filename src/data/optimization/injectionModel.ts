import type { WellConfig } from '../../types/optimization';

/**
 * Apply analytical injection cooling effects to a base temperature field.
 *
 * Each injection well at (wx, wy) with rate r creates local cooling:
 *   ΔT = -r × α × exp(-‖(x,y)-(wx,wy)‖² / 2σ²)
 *
 * This mirrors the Python implementation in scripts/optimize_injection.py exactly.
 */
export function applyInjectionEffects(
  base: Float32Array,
  injectionRates: number[],
  config: WellConfig,
  gridSize: number,
): Float32Array {
  const result = new Float32Array(base.length);
  result.set(base);

  const sigma2 = 2 * config.sigma * config.sigma;

  for (let w = 0; w < config.injectionWells.length; w++) {
    const well = config.injectionWells[w];
    const rate = injectionRates[w];
    if (rate <= 0) continue;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const dx = col - well.x;
        const dy = row - well.y;
        const dist2 = dx * dx + dy * dy;
        const delta = -rate * config.alpha * Math.exp(-dist2 / sigma2);
        result[row * gridSize + col] += delta;
      }
    }
  }

  return result;
}

/**
 * Compute KPIs for a set of temperature fields under a given injection schedule.
 *
 * Mirrors the Python compute_kpis() function exactly.
 */
export function computeKPIs(
  tempFields: Float32Array[],
  injectionSchedule: number[][], // [numWells][numTimesteps]
  config: WellConfig,
  gridSize: number,
): { energy: number; sustainability: number; safety: number; overallScore: number } {
  const nT = tempFields.length;

  // Energy: average temperature at production wells across all timesteps
  let energySum = 0;
  for (let t = 0; t < nT; t++) {
    for (const pw of config.productionWells) {
      energySum += tempFields[t][pw.y * gridSize + pw.x];
    }
  }
  const energy = energySum / (nT * config.productionWells.length);

  // Sustainability: mean temperature at final timestep
  const finalField = tempFields[nT - 1];
  let finalSum = 0;
  for (let i = 0; i < finalField.length; i++) finalSum += finalField[i];
  const sustainability = finalSum / finalField.length;

  // Safety: penalty for exceeding threshold
  let safetyPenalty = 0;
  for (let w = 0; w < injectionSchedule.length; w++) {
    for (let t = 0; t < nT; t++) {
      const r = injectionSchedule[w][t];
      if (r > config.safetyThreshold) {
        safetyPenalty += (r - config.safetyThreshold) ** 2;
      }
    }
  }

  const overallScore = 0.5 * energy + 0.3 * sustainability - 0.2 * safetyPenalty;

  return { energy, sustainability, safety: safetyPenalty, overallScore };
}

/**
 * Get per-timestep production well temperatures from modified temperature fields.
 */
export function getProdTemps(
  tempFields: Float32Array[],
  config: WellConfig,
  gridSize: number,
): number[][] {
  return tempFields.map((field) =>
    config.productionWells.map((pw) => field[pw.y * gridSize + pw.x]),
  );
}

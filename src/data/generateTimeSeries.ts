import type { WellTimeSeries, TimeSeriesPoint } from '../types';
import type { WellMetadata } from '../types';
import { SALTON_SEA } from './constants';

// Seeded PRNG (linear congruential generator) for deterministic data
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function gaussianNoise(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
}

function generateDates(): string[] {
  const dates: string[] = [];
  const start = new Date(SALTON_SEA.startDate);
  for (let i = 0; i < SALTON_SEA.numTimesteps; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function generateAllTimeSeries(wellList: WellMetadata[]): WellTimeSeries[] {
  const dates = generateDates();

  return wellList.map((well, wi) => {
    const rng = createRng(42 + wi * 137);

    const isProduction = well.type === 'production';
    const depthFactor = (well.depthMeters - 1000) / 2000; // 0–1

    // Production rate
    const prodBase = isProduction ? 70 + depthFactor * 40 : 0;
    const productionRate: TimeSeriesPoint[] = dates.map((date, t) => ({
      date,
      value: isProduction
        ? Math.max(0, prodBase * (1 - 0.003 * t) + 5 * Math.sin((2 * Math.PI * t) / 12) + 2 * gaussianNoise(rng))
        : 0,
    }));

    // Injection rate
    const injBase = !isProduction ? 50 + depthFactor * 30 : 0;
    const injectionRate: TimeSeriesPoint[] = dates.map((date, t) => ({
      date,
      value: !isProduction
        ? Math.max(0, injBase * (1 - 0.001 * t) + 3 * Math.sin((2 * Math.PI * t) / 12 + 1) + 2 * gaussianNoise(rng))
        : 0,
    }));

    // Temperature
    const tempBase = 330 + depthFactor * 35;
    const tempDecline = isProduction ? 0.12 : 0.05;
    const temperature: TimeSeriesPoint[] = dates.map((date, t) => ({
      date,
      value: tempBase - tempDecline * t + 1.0 * gaussianNoise(rng),
    }));

    // Pressure
    const pressBase = 12 + depthFactor * 10;
    const pressTrend = isProduction ? -0.02 : 0.015;
    const pressure: TimeSeriesPoint[] = dates.map((date, t) => ({
      date,
      value: pressBase + pressTrend * t + 0.3 * gaussianNoise(rng),
    }));

    return { wellId: well.id, productionRate, injectionRate, temperature, pressure };
  });
}

export interface WellPosition {
  x: number; // column index on 64×64 grid
  y: number; // row index on 64×64 grid
}

export interface WellConfig {
  productionWells: WellPosition[];
  injectionWells: WellPosition[];
  alpha: number; // injection cooling strength
  sigma: number; // spatial spread (grid cells)
  safetyThreshold: number;
}

export interface OptKPIs {
  energy: number;
  sustainability: number;
  safety: number;
  overallScore: number;
}

export interface OptScenarioResult extends OptKPIs {
  schedule: number[][]; // [numInjectionWells][numTimesteps], values in [0,1]
  improvementPct?: number; // only on optimized
  prodTemps: number[][]; // [numTimesteps][numProductionWells] — temp at each prod well per timestep
}

export interface OptScenario {
  sampleIndex: number;
  baseline: OptScenarioResult;
  optimized: OptScenarioResult;
}

export interface OptResults {
  wellConfig: WellConfig;
  objectiveWeights: { energy: number; sustainability: number; safety: number };
  scenarios: OptScenario[];
}

export type OptMode = 'baseline' | 'optimized' | 'custom';

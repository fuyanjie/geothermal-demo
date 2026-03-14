export function computeMSE(predicted: Float32Array, groundTruth: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < predicted.length; i++) {
    const diff = predicted[i] - groundTruth[i];
    sum += diff * diff;
  }
  return sum / predicted.length;
}

export function computeMAE(predicted: Float32Array, groundTruth: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < predicted.length; i++) {
    sum += Math.abs(predicted[i] - groundTruth[i]);
  }
  return sum / predicted.length;
}

/**
 * Compute R² using the global temperature mean (across the full test set range).
 * Using the per-sample mean fails when a single field is nearly uniform
 * (e.g. timestep 0 initial condition), causing SS_tot ≈ 0 and R² → −∞.
 */
export function computeR2(
  predicted: Float32Array,
  groundTruth: Float32Array,
  globalMean?: number,
): number {
  let mean: number;
  if (globalMean !== undefined) {
    mean = globalMean;
  } else {
    mean = 0;
    for (let i = 0; i < groundTruth.length; i++) mean += groundTruth[i];
    mean /= groundTruth.length;
  }

  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < groundTruth.length; i++) {
    ssTot += (groundTruth[i] - mean) ** 2;
    ssRes += (groundTruth[i] - predicted[i]) ** 2;
  }
  return ssTot === 0 ? 1 : 1 - ssRes / ssTot;
}

export function computeErrorField(predicted: Float32Array, groundTruth: Float32Array): Float32Array {
  const error = new Float32Array(predicted.length);
  for (let i = 0; i < predicted.length; i++) {
    error[i] = predicted[i] - groundTruth[i];
  }
  return error;
}

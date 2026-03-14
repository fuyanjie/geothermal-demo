export interface PredictionMetadata {
  numSamples: number;
  gridSize: number;      // 64
  numTimesteps: number;  // 11
  tempMin: number;
  tempMax: number;
  sampleIds: number[];
}

export interface TestDataset {
  metadata: PredictionMetadata;
  fractures: Uint8Array;       // numSamples * gridSize * gridSize
  temperatures: Float32Array;  // numSamples * numTimesteps * gridSize * gridSize
}

export interface PredictionResult {
  predicted: Float32Array;     // gridSize * gridSize
  groundTruth: Float32Array;   // gridSize * gridSize
  error: Float32Array;         // gridSize * gridSize (predicted - groundTruth)
  mse: number;
  mae: number;
  r2: number;
}

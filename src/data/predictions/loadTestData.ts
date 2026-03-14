import type { TestDataset, PredictionMetadata } from '../../types/predictions';

let cached: TestDataset | null = null;

export async function loadTestData(): Promise<TestDataset> {
  if (cached) return cached;

  const base = import.meta.env.BASE_URL;

  const [metaRes, fracRes, tempRes] = await Promise.all([
    fetch(`${base}data/predictions/metadata.json`),
    fetch(`${base}data/predictions/test_fractures.bin`),
    fetch(`${base}data/predictions/test_temperatures.bin`),
  ]);

  const metadata: PredictionMetadata = await metaRes.json();
  const fracBuf = await fracRes.arrayBuffer();
  const tempBuf = await tempRes.arrayBuffer();

  cached = {
    metadata,
    fractures: new Uint8Array(fracBuf),
    temperatures: new Float32Array(tempBuf),
  };

  return cached;
}

/** Extract a single fracture field for display */
export function getFractureField(data: TestDataset, sampleIndex: number): Uint8Array {
  const { gridSize } = data.metadata;
  const offset = sampleIndex * gridSize * gridSize;
  return data.fractures.subarray(offset, offset + gridSize * gridSize);
}

/** Extract a single temperature field for a given sample and timestep */
export function getTemperatureField(
  data: TestDataset,
  sampleIndex: number,
  timestepIndex: number,
): Float32Array {
  const { gridSize, numTimesteps } = data.metadata;
  const cellsPerField = gridSize * gridSize;
  const offset = (sampleIndex * numTimesteps + timestepIndex) * cellsPerField;
  return data.temperatures.subarray(offset, offset + cellsPerField);
}

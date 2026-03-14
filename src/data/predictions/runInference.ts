import * as tf from '@tensorflow/tfjs';

let model: tf.LayersModel | null = null;
let modelLoadingPromise: Promise<tf.LayersModel> | null = null;

export async function loadModel(): Promise<tf.LayersModel> {
  if (model) return model;
  if (modelLoadingPromise) return modelLoadingPromise;

  const base = import.meta.env.BASE_URL;
  modelLoadingPromise = tf.loadLayersModel(`${base}data/predictions/tfjs_model/model.json`);
  model = await modelLoadingPromise;
  modelLoadingPromise = null;
  return model;
}

export function isModelLoaded(): boolean {
  return model !== null;
}

export async function predict(
  fractureField: Uint8Array,
  timestepIndex: number,
  gridSize: number,
  numTimesteps: number,
): Promise<Float32Array> {
  const m = await loadModel();

  // Build input tensor: (1, 64, 64, 2) — fracture channel + timestep channel
  const tNormalized = timestepIndex / (numTimesteps - 1);
  const inputData = new Float32Array(gridSize * gridSize * 2);
  for (let i = 0; i < gridSize * gridSize; i++) {
    inputData[i * 2] = fractureField[i];      // 0.0 or 1.0
    inputData[i * 2 + 1] = tNormalized;       // constant timestep channel
  }

  const inputTensor = tf.tensor4d(inputData, [1, gridSize, gridSize, 2]);
  const outputTensor = m.predict(inputTensor) as tf.Tensor;
  const result = new Float32Array(await outputTensor.data());

  // Clean up tensors
  inputTensor.dispose();
  outputTensor.dispose();

  return result;
}

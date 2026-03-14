import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TestDataset, PredictionResult } from '../types/predictions';
import { loadTestData, getFractureField, getTemperatureField } from '../data/predictions/loadTestData';
import { predict, loadModel, isModelLoaded } from '../data/predictions/runInference';
import { computeMSE, computeMAE, computeR2, computeErrorField } from '../data/predictions/metrics';
import { valueToColor, fractureToColor, errorToColor } from '../utils/colorScale';
import HeatmapCanvas from '../components/predictions/HeatmapCanvas';
import './PredictionsPage.css';

export default function PredictionsPage() {
  const [testData, setTestData] = useState<TestDataset | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [selectedSample, setSelectedSample] = useState(0);
  const [selectedTimestep, setSelectedTimestep] = useState(0);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [inferring, setInferring] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Load test data on mount
  useEffect(() => {
    loadTestData()
      .then((data) => {
        setTestData(data);
        setDataLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load test data:', err);
        setDataLoading(false);
      });
  }, []);

  // Load model on mount
  useEffect(() => {
    setModelLoading(true);
    loadModel()
      .then(() => {
        setModelReady(true);
        setModelLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load model:', err);
        setModelLoading(false);
      });
  }, []);

  // Current fields from test data
  const fractureField = useMemo(() => {
    if (!testData) return null;
    return getFractureField(testData, selectedSample);
  }, [testData, selectedSample]);

  const groundTruth = useMemo(() => {
    if (!testData) return null;
    return getTemperatureField(testData, selectedSample, selectedTimestep);
  }, [testData, selectedSample, selectedTimestep]);

  // Auto-predict when sample or timestep changes
  const runPrediction = useCallback(async () => {
    if (!testData || !fractureField || !groundTruth || !isModelLoaded()) return;

    setInferring(true);
    try {
      const { gridSize, numTimesteps } = testData.metadata;
      const predicted = await predict(fractureField, selectedTimestep, gridSize, numTimesteps);
      const error = computeErrorField(predicted, groundTruth);
      const mse = computeMSE(predicted, groundTruth);
      const mae = computeMAE(predicted, groundTruth);
      // Use global mean (midpoint of temp range) so R² stays meaningful
      // even for nearly-uniform fields (e.g. timestep 0).
      const globalMean = (testData.metadata.tempMin + testData.metadata.tempMax) / 2;
      const r2 = computeR2(predicted, groundTruth, globalMean);
      setPrediction({ predicted, groundTruth, error, mse, mae, r2 });
    } catch (err) {
      console.error('Inference error:', err);
    } finally {
      setInferring(false);
    }
  }, [testData, fractureField, groundTruth, selectedSample, selectedTimestep]);

  useEffect(() => {
    if (modelReady && testData) {
      runPrediction();
    }
  }, [modelReady, testData, selectedSample, selectedTimestep, runPrediction]);

  // Color functions
  const fracColorFn = useCallback((v: number) => fractureToColor(v), []);

  const tempColorFn = useCallback(
    (v: number) => {
      if (!testData) return [0, 0, 0] as [number, number, number];
      return valueToColor(v, testData.metadata.tempMin, testData.metadata.tempMax);
    },
    [testData],
  );

  const errorAbsMax = useMemo(() => {
    if (!prediction) return 0.5;
    let max = 0;
    for (let i = 0; i < prediction.error.length; i++) {
      const abs = Math.abs(prediction.error[i]);
      if (abs > max) max = abs;
    }
    return max || 0.5;
  }, [prediction]);

  const errorColorFn = useCallback(
    (v: number) => errorToColor(v, errorAbsMax),
    [errorAbsMax],
  );

  // Loading state
  if (dataLoading) {
    return (
      <div className="predictions-page predictions-loading">
        <span className="spinner">⏳</span> Loading training data...
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="predictions-page predictions-loading">
        Failed to load training data.
      </div>
    );
  }

  const { numSamples, numTimesteps, gridSize } = testData.metadata;

  return (
    <div className="predictions-page">
      {/* Controls */}
      <div className="pred-controls">
        <div className="pred-control-group">
          <label className="pred-label">Sample</label>
          <button
            className="pred-btn"
            disabled={selectedSample <= 0}
            onClick={() => setSelectedSample((s) => Math.max(0, s - 1))}
          >
            ◀
          </button>
          <span className="pred-value">{selectedSample + 1} / {numSamples}</span>
          <button
            className="pred-btn"
            disabled={selectedSample >= numSamples - 1}
            onClick={() => setSelectedSample((s) => Math.min(numSamples - 1, s + 1))}
          >
            ▶
          </button>
        </div>

        <div className="pred-control-group pred-timestep-group">
          <label className="pred-label">Timestep</label>
          <input
            type="range"
            className="pred-slider"
            min={0}
            max={numTimesteps - 1}
            value={selectedTimestep}
            onChange={(e) => setSelectedTimestep(Number(e.target.value))}
          />
          <span className="pred-value">{selectedTimestep} / {numTimesteps - 1}</span>
        </div>

        <div className="pred-status">
          {modelLoading && <span className="spinner">⏳</span>}
          {modelLoading && 'Loading model...'}
          {modelReady && !inferring && '✅ Model ready'}
          {inferring && '🔄 Predicting...'}
          {!modelLoading && !modelReady && '⚠️ Model unavailable'}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="pred-grid">
        {/* Fracture Field */}
        <div className="pred-panel">
          <div className="pred-panel-title">Fracture Field</div>
          {fractureField && (
            <HeatmapCanvas data={fractureField} gridSize={gridSize} colorFn={fracColorFn} />
          )}
          <div className="pred-legend">
            <span className="pred-legend-swatch" style={{ background: '#141e2d' }} />
            <span className="pred-legend-text">Rock</span>
            <span className="pred-legend-swatch" style={{ background: '#00e5ff' }} />
            <span className="pred-legend-text">Fracture</span>
          </div>
        </div>

        {/* Ground Truth Temperature */}
        <div className="pred-panel">
          <div className="pred-panel-title">Ground Truth Temperature</div>
          {groundTruth && (
            <HeatmapCanvas data={groundTruth} gridSize={gridSize} colorFn={tempColorFn} />
          )}
          <div className="pred-legend pred-legend-gradient">
            <div
              className="pred-legend-bar"
              style={{
                background: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
              }}
            />
            <div className="pred-legend-labels">
              <span>{testData.metadata.tempMin.toFixed(2)}</span>
              <span>Temperature (normalized)</span>
              <span>{testData.metadata.tempMax.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Predicted Temperature */}
        <div className="pred-panel">
          <div className="pred-panel-title">Predicted Temperature</div>
          {prediction ? (
            <HeatmapCanvas data={prediction.predicted} gridSize={gridSize} colorFn={tempColorFn} />
          ) : (
            <div className="pred-placeholder" style={{ width: 240, height: 240 }}>
              {modelLoading ? 'Loading model...' : 'Model not available'}
            </div>
          )}
          <div className="pred-legend pred-legend-gradient">
            <div
              className="pred-legend-bar"
              style={{
                background: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
              }}
            />
            <div className="pred-legend-labels">
              <span>{testData.metadata.tempMin.toFixed(2)}</span>
              <span>Temperature (normalized)</span>
              <span>{testData.metadata.tempMax.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Error Map */}
        <div className="pred-panel">
          <div className="pred-panel-title">Error (Predicted − Truth)</div>
          {prediction ? (
            <HeatmapCanvas data={prediction.error} gridSize={gridSize} colorFn={errorColorFn} />
          ) : (
            <div className="pred-placeholder" style={{ width: 240, height: 240 }}>
              {modelLoading ? 'Loading model...' : 'Run prediction first'}
            </div>
          )}
          <div className="pred-legend pred-legend-gradient">
            <div
              className="pred-legend-bar"
              style={{
                background: 'linear-gradient(to right, #4d4dff, #ffffff, #ff4d4d)',
              }}
            />
            <div className="pred-legend-labels">
              <span>−{errorAbsMax.toFixed(3)}</span>
              <span>Error</span>
              <span>+{errorAbsMax.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {prediction && (
        <div className="pred-metrics">
          <div className="pred-metric-card">
            <div className="pred-metric-value">{prediction.mse.toFixed(6)}</div>
            <div className="pred-metric-label">MSE</div>
          </div>
          <div className="pred-metric-card">
            <div className="pred-metric-value">{prediction.mae.toFixed(4)}</div>
            <div className="pred-metric-label">MAE</div>
          </div>
          <div className="pred-metric-card">
            <div className="pred-metric-value">{prediction.r2.toFixed(4)}</div>
            <div className="pred-metric-label">R²</div>
          </div>
        </div>
      )}
    </div>
  );
}

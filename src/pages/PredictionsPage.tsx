import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { TestDataset, PredictionResult } from '../types/predictions';
import { loadTestData, getFractureField, getTemperatureField } from '../data/predictions/loadTestData';
import { predict, loadModel, isModelLoaded } from '../data/predictions/runInference';
import { computeMSE, computeMAE, computeR2, computeErrorField } from '../data/predictions/metrics';
import { valueToColor, fractureToColor, errorToColor } from '../utils/colorScale';
import HeatmapCanvas from '../components/predictions/HeatmapCanvas';
import InverseModelingSection from '../components/predictions/InverseModelingSection';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
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

  // Tab state
  const [activeTab, setActiveTab] = useState<'forward' | 'inverse'>('forward');

  // Temporal dynamics state
  const [playing, setPlaying] = useState(false);
  const [allTimestepData, setAllTimestepData] = useState<{
    metrics: Array<{ timestep: number; mse: number; mae: number; r2: number }>;
    predictions: Float32Array[];
  } | null>(null);
  const [computingAll, setComputingAll] = useState(false);

  // Track numTimesteps for the play effect
  const numTimestepsRef = useRef(0);

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

  // Stop auto-play when user manually changes sample
  useEffect(() => {
    setPlaying(false);
    setAllTimestepData(null);
  }, [selectedSample]);

  // Auto-play effect
  useEffect(() => {
    if (!playing || !modelReady) return;
    const nt = numTimestepsRef.current;
    if (nt <= 0) return;
    const interval = setInterval(() => {
      setSelectedTimestep((t) => (t >= nt - 1 ? 0 : t + 1));
    }, 600);
    return () => clearInterval(interval);
  }, [playing, modelReady]);

  // Compute all timesteps when sample changes and model is ready
  useEffect(() => {
    if (!testData || !modelReady) return;
    let cancelled = false;
    setComputingAll(true);

    (async () => {
      const { gridSize, numTimesteps } = testData.metadata;
      const fracture = getFractureField(testData, selectedSample);
      const globalMean = (testData.metadata.tempMin + testData.metadata.tempMax) / 2;
      const metrics: Array<{ timestep: number; mse: number; mae: number; r2: number }> = [];
      const predictions: Float32Array[] = [];

      for (let t = 0; t < numTimesteps; t++) {
        if (cancelled) return;
        const predicted = await predict(fracture, t, gridSize, numTimesteps);
        const truth = getTemperatureField(testData, selectedSample, t);
        predictions.push(predicted);
        metrics.push({
          timestep: t,
          mse: computeMSE(predicted, truth),
          mae: computeMAE(predicted, truth),
          r2: computeR2(predicted, truth, globalMean),
        });
      }

      if (!cancelled) {
        setAllTimestepData({ metrics, predictions });
        setComputingAll(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [testData, modelReady, selectedSample]);

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
  numTimestepsRef.current = numTimesteps;

  return (
    <div className="predictions-page">
      {/* Tabs */}
      <div className="pred-tabs">
        <button
          className={`pred-tab ${activeTab === 'forward' ? 'active' : ''}`}
          onClick={() => setActiveTab('forward')}
        >
          Forward Prediction
        </button>
        <button
          className={`pred-tab ${activeTab === 'inverse' ? 'active' : ''}`}
          onClick={() => setActiveTab('inverse')}
        >
          Inverse Modeling
        </button>
      </div>

      {/* Inverse Modeling Tab */}
      {activeTab === 'inverse' && testData && (
        <InverseModelingSection testData={testData} modelReady={modelReady} />
      )}

      {/* Forward Prediction Tab */}
      {activeTab === 'forward' && (
        <>
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
          <button
            className={`pred-play-btn${playing ? ' playing' : ''}`}
            onClick={() => setPlaying((p) => !p)}
            disabled={!modelReady}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
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

      {/* Thumbnail strip */}
      <div className="pred-thumbnails">
        {allTimestepData ? (
          allTimestepData.predictions.map((pred, t) => (
            <div
              key={t}
              className={`pred-thumbnail${t === selectedTimestep ? ' active' : ''}`}
              onClick={() => setSelectedTimestep(t)}
            >
              <HeatmapCanvas data={pred} gridSize={gridSize} colorFn={tempColorFn} displaySize={56} />
              <span className="pred-thumbnail-label">t={t}</span>
            </div>
          ))
        ) : computingAll ? (
          <div className="pred-computing-label">Computing all timesteps...</div>
        ) : null}
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

      {/* Metrics-over-time chart */}
      {allTimestepData ? (
        <div className="pred-metrics-chart">
          <div className="pred-chart-title">Metrics Over Time</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={allTimestepData.metrics} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="timestep"
                tick={{ fill: '#8892a4', fontSize: 11 }}
                stroke="rgba(255,255,255,0.15)"
                label={{ value: 'Timestep', position: 'insideBottom', offset: -4, fill: '#8892a4', fontSize: 11 }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#8892a4', fontSize: 11 }}
                stroke="rgba(255,255,255,0.15)"
                label={{ value: 'MSE / MAE', angle: -90, position: 'insideLeft', fill: '#8892a4', fontSize: 11 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#8892a4', fontSize: 11 }}
                stroke="rgba(255,255,255,0.15)"
                domain={['auto', 'auto']}
                label={{ value: 'R²', angle: 90, position: 'insideRight', fill: '#8892a4', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1f2e',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#c8cdd5',
                }}
                formatter={(value: unknown, name: unknown) => [Number(value).toFixed(6), String(name).toUpperCase()]}
                labelFormatter={(label: unknown) => `Timestep ${label}`}
              />
              <ReferenceLine
                x={selectedTimestep}
                yAxisId="left"
                stroke="#00e5ff"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{ value: `t=${selectedTimestep}`, position: 'top', fill: '#00e5ff', fontSize: 10 }}
              />
              <Line yAxisId="left" type="monotone" dataKey="mse" stroke="#ff6b6b" dot={{ r: 3 }} strokeWidth={2} name="mse" />
              <Line yAxisId="left" type="monotone" dataKey="mae" stroke="#ffd93d" dot={{ r: 3 }} strokeWidth={2} name="mae" />
              <Line yAxisId="right" type="monotone" dataKey="r2" stroke="#6bcb77" dot={{ r: 3 }} strokeWidth={2} name="r2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : computingAll ? (
        <div className="pred-metrics-chart">
          <div className="pred-computing-label">Computing metrics for all timesteps...</div>
        </div>
      ) : null}
        </>
      )}
    </div>
  );
}

import { useState, useCallback, useMemo } from 'react';
import type { TestDataset } from '../../types/predictions';
import { getFractureField, getTemperatureField } from '../../data/predictions/loadTestData';
import { predict } from '../../data/predictions/runInference';
import { computeMSE } from '../../data/predictions/metrics';
import { valueToColor, fractureToColor } from '../../utils/colorScale';
import HeatmapCanvas from './HeatmapCanvas';
import './InverseModelingSection.css';

interface InverseModelingSectionProps {
  testData: TestDataset;
  modelReady: boolean;
}

interface CandidateResult {
  fracture: Uint8Array;
  predicted: Float32Array;
  mse: number;
  fractureAccuracy: number;
}

/* ---------- Random fracture generation ---------- */

function generateRandomFracture(gridSize: number): Uint8Array {
  const fracture = new Uint8Array(gridSize * gridSize);
  // Random density between 15-45%
  const density = 0.15 + Math.random() * 0.30;
  // Create clustered fractures using random seeds + Gaussian-like falloff
  const numSeeds = Math.floor(3 + Math.random() * 8);
  for (let s = 0; s < numSeeds; s++) {
    const cx = Math.floor(Math.random() * gridSize);
    const cy = Math.floor(Math.random() * gridSize);
    const radius = 3 + Math.floor(Math.random() * 12);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
          if (Math.random() < density * Math.exp(-(dx * dx + dy * dy) / (radius * radius * 0.5))) {
            fracture[y * gridSize + x] = 1;
          }
        }
      }
    }
  }
  return fracture;
}

function computeFractureAccuracy(inferred: Uint8Array, truth: Uint8Array): number {
  let match = 0;
  for (let i = 0; i < inferred.length; i++) {
    if (inferred[i] === truth[i]) match++;
  }
  return match / inferred.length;
}

/* ---------- Component ---------- */

export default function InverseModelingSection({ testData, modelReady }: InverseModelingSectionProps) {
  const { numSamples, numTimesteps, gridSize } = testData.metadata;

  const [selectedSample, setSelectedSample] = useState(0);
  const [selectedTimestep, setSelectedTimestep] = useState(5);
  const [numCandidates, setNumCandidates] = useState(30);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CandidateResult[] | null>(null);
  const [bestIndex, setBestIndex] = useState(0);

  // Current observation and true fracture
  const observedTemp = useMemo(
    () => getTemperatureField(testData, selectedSample, selectedTimestep),
    [testData, selectedSample, selectedTimestep],
  );

  const trueFracture = useMemo(
    () => getFractureField(testData, selectedSample),
    [testData, selectedSample],
  );

  // Color functions
  const tempColorFn = useCallback(
    (v: number) => valueToColor(v, testData.metadata.tempMin, testData.metadata.tempMax),
    [testData],
  );

  const fracColorFn = useCallback((v: number) => fractureToColor(v), []);

  // Run inverse search
  const runInverseSearch = useCallback(async () => {
    if (!modelReady) return;
    setRunning(true);
    setProgress(0);
    setResults(null);

    const candidates: CandidateResult[] = [];

    for (let i = 0; i < numCandidates; i++) {
      const fracture = generateRandomFracture(gridSize);
      const predicted = await predict(fracture, selectedTimestep, gridSize, numTimesteps);
      const mse = computeMSE(predicted, observedTemp);
      const fractureAccuracy = computeFractureAccuracy(fracture, trueFracture);
      candidates.push({ fracture, predicted, mse, fractureAccuracy });
      setProgress(i + 1);

      // Yield to UI every few iterations
      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // Sort by MSE (ascending = best match first)
    candidates.sort((a, b) => a.mse - b.mse);
    setResults(candidates);
    setBestIndex(0);
    setRunning(false);
  }, [modelReady, numCandidates, gridSize, numTimesteps, selectedTimestep, observedTemp, trueFracture]);

  // Reset results when sample or timestep changes
  const handleSampleChange = (s: number) => {
    setSelectedSample(s);
    setResults(null);
  };

  const handleTimestepChange = (t: number) => {
    setSelectedTimestep(t);
    setResults(null);
  };

  const best = results ? results[bestIndex] : null;

  return (
    <div className="inv-section">
      {/* Description */}
      <div className="inv-description">
        <strong>Inverse Modeling Demo:</strong> Given an observed temperature field, search for the
        fracture pattern that best reproduces it. This Monte Carlo approach generates random
        candidate fracture fields, runs each through the CNN forward model, and ranks by
        mean squared error against the observation.
      </div>

      {/* Controls */}
      <div className="inv-controls">
        <div className="inv-control-group">
          <label className="pred-label">Observation Sample</label>
          <button
            className="pred-btn"
            disabled={selectedSample <= 0}
            onClick={() => handleSampleChange(Math.max(0, selectedSample - 1))}
          >
            &#9664;
          </button>
          <span className="pred-value">
            {selectedSample + 1} / {numSamples}
          </span>
          <button
            className="pred-btn"
            disabled={selectedSample >= numSamples - 1}
            onClick={() => handleSampleChange(Math.min(numSamples - 1, selectedSample + 1))}
          >
            &#9654;
          </button>
        </div>

        <div className="inv-control-group">
          <label className="pred-label">Timestep</label>
          <input
            type="range"
            className="pred-slider"
            min={0}
            max={numTimesteps - 1}
            value={selectedTimestep}
            onChange={(e) => handleTimestepChange(Number(e.target.value))}
          />
          <span className="pred-value">
            {selectedTimestep} / {numTimesteps - 1}
          </span>
        </div>

        <div className="inv-control-group">
          <label className="pred-label">Candidates</label>
          <select
            className="inv-select"
            value={numCandidates}
            onChange={(e) => {
              setNumCandidates(Number(e.target.value));
              setResults(null);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <button
          className="inv-run-btn"
          onClick={runInverseSearch}
          disabled={!modelReady || running}
        >
          {running ? `Searching... ${progress}/${numCandidates}` : 'Run Inverse Search'}
        </button>
      </div>

      {/* Progress bar */}
      {running && (
        <div className="inv-progress-bar">
          <div
            className="inv-progress-fill"
            style={{ width: `${(progress / numCandidates) * 100}%` }}
          />
        </div>
      )}

      {/* Pipeline display */}
      <div className="inv-pipeline">
        <div className="inv-pipeline-panel">
          <div className="inv-pipeline-title">Observed Temperature</div>
          <HeatmapCanvas data={observedTemp} gridSize={gridSize} colorFn={tempColorFn} displaySize={200} />
          <div className="inv-pipeline-subtitle">Target (from test data, t={selectedTimestep})</div>
        </div>

        <div className="inv-arrow">&#10230;</div>

        <div className="inv-pipeline-panel">
          <div className="inv-pipeline-title">Best-Match Fracture</div>
          {best ? (
            <HeatmapCanvas data={best.fracture} gridSize={gridSize} colorFn={fracColorFn} displaySize={200} />
          ) : (
            <div className="inv-placeholder">Run search first</div>
          )}
          <div className="inv-pipeline-subtitle">Inferred (rank #{bestIndex + 1})</div>
        </div>

        <div className="inv-arrow">&#10230;</div>

        <div className="inv-pipeline-panel">
          <div className="inv-pipeline-title">Predicted Temperature</div>
          {best ? (
            <HeatmapCanvas data={best.predicted} gridSize={gridSize} colorFn={tempColorFn} displaySize={200} />
          ) : (
            <div className="inv-placeholder">Run search first</div>
          )}
          <div className="inv-pipeline-subtitle">From best-match fracture</div>
        </div>

        <div className="inv-arrow">vs</div>

        <div className="inv-pipeline-panel">
          <div className="inv-pipeline-title">True Fracture</div>
          <HeatmapCanvas data={trueFracture} gridSize={gridSize} colorFn={fracColorFn} displaySize={200} />
          <div className="inv-pipeline-subtitle">Ground truth (hidden)</div>
        </div>
      </div>

      {/* Legends */}
      <div className="inv-legends">
        <div className="inv-legend-item">
          <div className="pred-legend">
            <span className="pred-legend-swatch" style={{ background: '#141e2d' }} />
            <span className="pred-legend-text">Rock</span>
            <span className="pred-legend-swatch" style={{ background: '#00e5ff' }} />
            <span className="pred-legend-text">Fracture</span>
          </div>
        </div>
        <div className="inv-legend-item">
          <div className="pred-legend pred-legend-gradient">
            <div
              className="pred-legend-bar"
              style={{
                background: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
              }}
            />
            <div className="pred-legend-labels">
              <span>{testData.metadata.tempMin.toFixed(2)}</span>
              <span>Temperature</span>
              <span>{testData.metadata.tempMax.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {best && (
        <div className="inv-metrics">
          <div className="pred-metric-card">
            <div className="pred-metric-value">{best.mse.toFixed(6)}</div>
            <div className="pred-metric-label">Best MSE</div>
          </div>
          <div className="pred-metric-card">
            <div className="pred-metric-value">{(best.fractureAccuracy * 100).toFixed(1)}%</div>
            <div className="pred-metric-label">Fracture Accuracy</div>
          </div>
          <div className="pred-metric-card">
            <div className="pred-metric-value">{results!.length}</div>
            <div className="pred-metric-label">Candidates Tested</div>
          </div>
        </div>
      )}

      {/* Top candidates */}
      {results && results.length > 0 && (
        <div className="inv-candidates">
          <div className="inv-candidates-title">Top Candidates (ranked by MSE)</div>
          <div className="inv-candidates-list">
            {results.slice(0, 5).map((candidate, idx) => (
              <div
                key={idx}
                className={`inv-candidate-row${idx === bestIndex ? ' active' : ''}`}
                onClick={() => setBestIndex(idx)}
              >
                <div className="inv-candidate-rank">#{idx + 1}</div>
                <div className="inv-candidate-thumbnails">
                  <HeatmapCanvas data={candidate.fracture} gridSize={gridSize} colorFn={fracColorFn} displaySize={56} />
                  <HeatmapCanvas data={candidate.predicted} gridSize={gridSize} colorFn={tempColorFn} displaySize={56} />
                </div>
                <div className="inv-candidate-stats">
                  <div className="inv-candidate-stat">
                    <span className="inv-stat-label">MSE</span>
                    <span className="inv-stat-value">{candidate.mse.toFixed(6)}</span>
                  </div>
                  <div className="inv-candidate-stat">
                    <span className="inv-stat-label">Frac. Acc.</span>
                    <span className="inv-stat-value">{(candidate.fractureAccuracy * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

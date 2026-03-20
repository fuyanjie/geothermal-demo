import { useState, useCallback, useMemo } from 'react';
import type { TestDataset } from '../../types/predictions';
import { getFractureField, getTemperatureField } from '../../data/predictions/loadTestData';
import { predict } from '../../data/predictions/runInference';
import { computeR2 } from '../../data/predictions/metrics';
import { valueToColor } from '../../utils/colorScale';
import HeatmapCanvas from './HeatmapCanvas';
import './TransferLearningSection.css';

interface TransferLearningSectionProps {
  testData: TestDataset;
  modelReady: boolean;
}

interface SiteResult {
  fracture: Float32Array;
  groundTruth: Float32Array;
  predicted: Float32Array;
  r2: number;
}

interface FineTuneResult {
  beforeR2: number[];     // R² for each test sample before fine-tuning
  afterR2: number[];      // R² for each test sample after fine-tuning
  avgBefore: number;
  avgAfter: number;
  correctedPredictions: Float32Array[]; // corrected predictions for test samples
}

/* ---------- Domain shift helpers ---------- */

/** Apply domain shift to fracture field: scale fracture density */
function applyFractureDomainShift(
  fracture: Uint8Array,
  factor: number,
  gridSize: number,
): Float32Array {
  const shifted = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < shifted.length; i++) {
    // Scale the fracture value and clamp to [0, 1]
    shifted[i] = Math.min(1, Math.max(0, fracture[i] * factor));
  }
  return shifted;
}

/** Apply temperature domain shift: add spatial bias */
function applyTempDomainShift(
  temp: Float32Array,
  gridSize: number,
  biasStrength: number,
): Float32Array {
  const shifted = new Float32Array(temp.length);
  for (let i = 0; i < temp.length; i++) {
    const x = (i % gridSize) / gridSize;
    const y = Math.floor(i / gridSize) / gridSize;
    // Add a spatial gradient bias (warmer at bottom-right)
    const bias = biasStrength * (0.3 * x + 0.7 * y - 0.5);
    shifted[i] = temp[i] + bias;
  }
  return shifted;
}

/** Simple linear regression: fit y = a*x + b */
function linearRegression(
  xs: number[],
  ys: number[],
): { a: number; b: number } {
  const n = xs.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumXX += xs[i] * xs[i];
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) {
    return { a: 1, b: 0 };
  }
  const a = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - a * sumX) / n;
  return { a, b };
}

/* ---------- Component ---------- */

export default function TransferLearningSection({
  testData,
  modelReady,
}: TransferLearningSectionProps) {
  const { numSamples, numTimesteps, gridSize } = testData.metadata;
  const globalMean = (testData.metadata.tempMin + testData.metadata.tempMax) / 2;

  // State
  const [fractureFactor, setFractureFactor] = useState(1.5);
  const [selectedTimestep, setSelectedTimestep] = useState(5);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [siteAResult, setSiteAResult] = useState<SiteResult | null>(null);
  const [siteBResult, setSiteBResult] = useState<SiteResult | null>(null);
  const [fineTuneResult, setFineTuneResult] = useState<FineTuneResult | null>(null);
  const [finetuning, setFinetuning] = useState(false);

  // Number of samples to use (cap at available)
  const numTestSamples = Math.min(5, numSamples);
  const numCalibration = Math.min(3, numTestSamples);

  // Color functions
  const tempColorFn = useCallback(
    (v: number) => valueToColor(v, testData.metadata.tempMin, testData.metadata.tempMax),
    [testData],
  );

  // Shifted fracture color function (for continuous float values)
  const shiftedFracColorFn = useCallback((v: number): [number, number, number] => {
    // Map 0..1 float to rock/fracture color gradient
    const t = Math.min(1, Math.max(0, v));
    const r = Math.round(20 + t * (0 - 20));
    const g = Math.round(30 + t * (229 - 30));
    const b = Math.round(45 + t * (255 - 45));
    return [r, g, b];
  }, []);

  const r2Class = (r2: number) => {
    if (r2 >= 0.9) return 'good';
    if (r2 >= 0.7) return 'moderate';
    return 'poor';
  };

  // Run comparison: predict on Site A and Site B for sample 0
  const runComparison = useCallback(async () => {
    if (!modelReady) return;
    setRunning(true);
    setProgress(0);
    setSiteAResult(null);
    setSiteBResult(null);
    setFineTuneResult(null);

    try {
      const sampleIdx = 0;

      // Site A: original
      const fractureA = getFractureField(testData, sampleIdx);
      const truthA = getTemperatureField(testData, sampleIdx, selectedTimestep);
      const predA = await predict(fractureA, selectedTimestep, gridSize, numTimesteps);
      const r2A = computeR2(predA, truthA, globalMean);
      setProgress(1);

      const fractureAFloat = new Float32Array(fractureA.length);
      for (let i = 0; i < fractureA.length; i++) fractureAFloat[i] = fractureA[i];

      setSiteAResult({
        fracture: fractureAFloat,
        groundTruth: truthA,
        predicted: predA,
        r2: r2A,
      });

      // Site B: domain-shifted
      const shiftedFracture = applyFractureDomainShift(fractureA, fractureFactor, gridSize);
      // Create a Uint8Array version for the CNN (threshold at 0.5)
      const shiftedFractureUint8 = new Uint8Array(shiftedFracture.length);
      for (let i = 0; i < shiftedFracture.length; i++) {
        shiftedFractureUint8[i] = shiftedFracture[i] >= 0.5 ? 1 : 0;
      }
      const predB = await predict(shiftedFractureUint8, selectedTimestep, gridSize, numTimesteps);
      // "Ground truth" for Site B: shift the original truth
      const biasStrength = (fractureFactor - 1.0) * 0.15;
      const truthB = applyTempDomainShift(truthA, gridSize, biasStrength);
      const r2B = computeR2(predB, truthB, globalMean);
      setProgress(2);

      setSiteBResult({
        fracture: shiftedFracture,
        groundTruth: truthB,
        predicted: predB,
        r2: r2B,
      });
    } catch (err) {
      console.error('Transfer learning comparison error:', err);
    } finally {
      setRunning(false);
    }
  }, [modelReady, testData, selectedTimestep, gridSize, numTimesteps, fractureFactor, globalMean]);

  // Run fine-tuning simulation
  const runFineTuning = useCallback(async () => {
    if (!modelReady) return;
    setFinetuning(true);
    setFineTuneResult(null);

    try {
      const biasStrength = (fractureFactor - 1.0) * 0.15;

      // Collect calibration data (samples 0..numCalibration-1)
      const calibPredValues: number[] = [];
      const calibTruthValues: number[] = [];

      for (let s = 0; s < numCalibration; s++) {
        const frac = getFractureField(testData, s);
        const shiftedFracUint8 = new Uint8Array(frac.length);
        for (let i = 0; i < frac.length; i++) {
          const sv = Math.min(1, Math.max(0, frac[i] * fractureFactor));
          shiftedFracUint8[i] = sv >= 0.5 ? 1 : 0;
        }
        const pred = await predict(shiftedFracUint8, selectedTimestep, gridSize, numTimesteps);
        const truth = getTemperatureField(testData, s, selectedTimestep);
        const shiftedTruth = applyTempDomainShift(truth, gridSize, biasStrength);

        // Subsample pixel values for regression (every 16th pixel)
        for (let i = 0; i < pred.length; i += 16) {
          calibPredValues.push(pred[i]);
          calibTruthValues.push(shiftedTruth[i]);
        }
      }

      // Fit affine correction: truth_B ≈ a * pred + b
      const { a, b } = linearRegression(calibPredValues, calibTruthValues);

      // Evaluate on all numTestSamples samples
      const beforeR2: number[] = [];
      const afterR2: number[] = [];
      const correctedPredictions: Float32Array[] = [];

      for (let s = 0; s < numTestSamples; s++) {
        const frac = getFractureField(testData, s);
        const shiftedFracUint8 = new Uint8Array(frac.length);
        for (let i = 0; i < frac.length; i++) {
          const sv = Math.min(1, Math.max(0, frac[i] * fractureFactor));
          shiftedFracUint8[i] = sv >= 0.5 ? 1 : 0;
        }
        const pred = await predict(shiftedFracUint8, selectedTimestep, gridSize, numTimesteps);
        const truth = getTemperatureField(testData, s, selectedTimestep);
        const shiftedTruth = applyTempDomainShift(truth, gridSize, biasStrength);

        // Before fine-tuning
        const r2Before = computeR2(pred, shiftedTruth, globalMean);
        beforeR2.push(r2Before);

        // Apply affine correction
        const corrected = new Float32Array(pred.length);
        for (let i = 0; i < pred.length; i++) {
          corrected[i] = a * pred[i] + b;
        }
        correctedPredictions.push(corrected);

        // After fine-tuning
        const r2After = computeR2(corrected, shiftedTruth, globalMean);
        afterR2.push(r2After);
      }

      const avgBefore = beforeR2.reduce((sum, v) => sum + v, 0) / beforeR2.length;
      const avgAfter = afterR2.reduce((sum, v) => sum + v, 0) / afterR2.length;

      setFineTuneResult({
        beforeR2,
        afterR2,
        avgBefore,
        avgAfter,
        correctedPredictions,
      });
    } catch (err) {
      console.error('Fine-tuning simulation error:', err);
    } finally {
      setFinetuning(false);
    }
  }, [modelReady, testData, selectedTimestep, gridSize, numTimesteps, fractureFactor, globalMean, numCalibration, numTestSamples]);

  // Reset results when parameters change
  const handleFactorChange = (v: number) => {
    setFractureFactor(v);
    setSiteAResult(null);
    setSiteBResult(null);
    setFineTuneResult(null);
  };

  const handleTimestepChange = (v: number) => {
    setSelectedTimestep(v);
    setSiteAResult(null);
    setSiteBResult(null);
    setFineTuneResult(null);
  };

  // Bar chart max height
  const barMaxR2 = useMemo(() => {
    if (!fineTuneResult) return 1;
    const all = [...fineTuneResult.beforeR2, ...fineTuneResult.afterR2];
    return Math.max(...all.map(v => Math.max(0, v)), 0.01);
  }, [fineTuneResult]);

  return (
    <div className="tl-section">
      {/* Description */}
      <div className="tl-description">
        <strong>Transfer Learning Demo:</strong> Demonstrates domain adaptation of a CNN surrogate
        model trained on one geothermal site (Site A) to a new site (Site B) with different
        fracture characteristics. The fracture density is scaled by a configurable factor, creating
        a domain shift. A simple affine correction is calibrated from a few samples to adapt
        predictions without full retraining.
      </div>

      {/* Controls */}
      <div className="tl-controls">
        <div className="tl-control-group">
          <label className="pred-label">Fracture Factor</label>
          <input
            type="range"
            className="pred-slider"
            min={0.5}
            max={2.0}
            step={0.1}
            value={fractureFactor}
            onChange={(e) => handleFactorChange(Number(e.target.value))}
          />
          <span className="tl-slider-value">{fractureFactor.toFixed(1)}x</span>
        </div>

        <div className="tl-control-group">
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

        <button
          className="inv-run-btn"
          onClick={runComparison}
          disabled={!modelReady || running}
        >
          {running ? `Computing... ${progress}/2` : 'Run Comparison'}
        </button>
      </div>

      {/* Progress bar */}
      {running && (
        <div className="tl-progress-bar">
          <div
            className="tl-progress-fill"
            style={{ width: `${(progress / 2) * 100}%` }}
          />
        </div>
      )}

      {/* Side-by-side comparison */}
      <div className="tl-comparison">
        {/* Site A */}
        <div className="tl-site-panel">
          <div className="tl-site-header">
            <span className="tl-site-badge source">Source</span>
            <span className="tl-site-title">Site A (Original Domain)</span>
          </div>
          <div className="tl-heatmaps">
            <div className="tl-heatmap-item">
              <span className="tl-heatmap-label">Fracture</span>
              {siteAResult ? (
                <HeatmapCanvas
                  data={siteAResult.fracture}
                  gridSize={gridSize}
                  colorFn={shiftedFracColorFn}
                  displaySize={160}
                />
              ) : (
                <div className="inv-placeholder" style={{ width: 160, height: 160 }}>
                  Run comparison
                </div>
              )}
            </div>
            <div className="tl-heatmap-item">
              <span className="tl-heatmap-label">Predicted Temp</span>
              {siteAResult ? (
                <HeatmapCanvas
                  data={siteAResult.predicted}
                  gridSize={gridSize}
                  colorFn={tempColorFn}
                  displaySize={160}
                />
              ) : (
                <div className="inv-placeholder" style={{ width: 160, height: 160 }}>
                  Run comparison
                </div>
              )}
            </div>
          </div>
          <div className="tl-r2-display">
            <span className="tl-r2-label">R²</span>
            <span className={`tl-r2-value ${siteAResult ? r2Class(siteAResult.r2) : ''}`}>
              {siteAResult ? siteAResult.r2.toFixed(4) : '—'}
            </span>
          </div>
        </div>

        {/* Site B */}
        <div className="tl-site-panel">
          <div className="tl-site-header">
            <span className="tl-site-badge target">Target</span>
            <span className="tl-site-title">Site B (Shifted Domain, {fractureFactor.toFixed(1)}x)</span>
          </div>
          <div className="tl-heatmaps">
            <div className="tl-heatmap-item">
              <span className="tl-heatmap-label">Fracture</span>
              {siteBResult ? (
                <HeatmapCanvas
                  data={siteBResult.fracture}
                  gridSize={gridSize}
                  colorFn={shiftedFracColorFn}
                  displaySize={160}
                />
              ) : (
                <div className="inv-placeholder" style={{ width: 160, height: 160 }}>
                  Run comparison
                </div>
              )}
            </div>
            <div className="tl-heatmap-item">
              <span className="tl-heatmap-label">Predicted Temp</span>
              {siteBResult ? (
                <HeatmapCanvas
                  data={siteBResult.predicted}
                  gridSize={gridSize}
                  colorFn={tempColorFn}
                  displaySize={160}
                />
              ) : (
                <div className="inv-placeholder" style={{ width: 160, height: 160 }}>
                  Run comparison
                </div>
              )}
            </div>
          </div>
          <div className="tl-r2-display">
            <span className="tl-r2-label">R²</span>
            <span className={`tl-r2-value ${siteBResult ? r2Class(siteBResult.r2) : ''}`}>
              {siteBResult ? siteBResult.r2.toFixed(4) : '—'}
            </span>
          </div>
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

      {/* Fine-Tuning Simulation */}
      {siteAResult && siteBResult && (
        <div className="tl-finetuning">
          <div className="tl-finetuning-title">Fine-Tuning Simulation</div>
          <div className="tl-description">
            Calibrates an affine correction (y = a*x + b) using predictions from{' '}
            {numCalibration} calibration samples, then evaluates on {numTestSamples - numCalibration > 0 ? numTestSamples - numCalibration : numTestSamples}{' '}
            test samples. This simulates domain adaptation without retraining the CNN.
          </div>
          <button
            className="tl-finetune-btn"
            onClick={runFineTuning}
            disabled={!modelReady || finetuning}
          >
            {finetuning ? 'Simulating Fine-Tuning...' : 'Simulate Fine-Tuning'}
          </button>

          {/* Before/After comparison cards */}
          {fineTuneResult && (
            <>
              <div className="tl-comparison-cards">
                <div className="tl-card before">
                  <span className="tl-card-label">Before Transfer</span>
                  <span className="tl-card-value before">
                    {fineTuneResult.avgBefore.toFixed(4)}
                  </span>
                  <span className="tl-card-sublabel">Avg R² (all {numTestSamples} samples)</span>
                </div>
                <div className="tl-card after">
                  <span className="tl-card-label">After Transfer</span>
                  <span className="tl-card-value after">
                    {fineTuneResult.avgAfter.toFixed(4)}
                  </span>
                  <span className="tl-card-sublabel">Avg R² (all {numTestSamples} samples)</span>
                </div>
                <div className="tl-card improvement">
                  <span className="tl-card-label">Improvement</span>
                  <span className="tl-card-value improvement">
                    +{(fineTuneResult.avgAfter - fineTuneResult.avgBefore).toFixed(4)}
                  </span>
                  <span className="tl-card-sublabel">
                    {((fineTuneResult.avgAfter - fineTuneResult.avgBefore) / Math.max(Math.abs(fineTuneResult.avgBefore), 1e-6) * 100).toFixed(1)}% relative
                  </span>
                </div>
              </div>

              {/* Bar chart: R² per sample */}
              <div className="tl-barchart-section">
                <div className="tl-barchart-title">
                  R² by Sample (Before vs After Fine-Tuning)
                </div>
                <div className="tl-barchart">
                  {fineTuneResult.beforeR2.map((bR2, idx) => {
                    const aR2 = fineTuneResult.afterR2[idx];
                    const bHeight = Math.max(0, bR2) / barMaxR2 * 100;
                    const aHeight = Math.max(0, aR2) / barMaxR2 * 100;
                    return (
                      <div key={idx} className="tl-bar-group">
                        <div className="tl-bars">
                          <div
                            className="tl-bar before-bar"
                            style={{ height: `${bHeight}%` }}
                            title={`Before: ${bR2.toFixed(4)}`}
                          />
                          <div
                            className="tl-bar after-bar"
                            style={{ height: `${aHeight}%` }}
                            title={`After: ${aR2.toFixed(4)}`}
                          />
                        </div>
                        <span className="tl-bar-label">
                          {idx < numCalibration ? `Cal ${idx + 1}` : `Test ${idx - numCalibration + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="tl-barchart-legend">
                  <div className="tl-legend-entry">
                    <span className="tl-legend-swatch before-swatch" />
                    <span>Before Transfer</span>
                  </div>
                  <div className="tl-legend-entry">
                    <span className="tl-legend-swatch after-swatch" />
                    <span>After Transfer</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

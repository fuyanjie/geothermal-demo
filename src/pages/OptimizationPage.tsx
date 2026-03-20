import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ScatterChart,
  ZAxis,
  Cell,
} from 'recharts';
import type { OptResults, OptMode } from '../types/optimization';
import type { TestDataset } from '../types/predictions';
import { loadOptResults } from '../data/optimization/loadOptResults';
import { loadTestData, getFractureField } from '../data/predictions/loadTestData';
import { predict, loadModel, isModelLoaded } from '../data/predictions/runInference';
import { applyInjectionEffects, computeKPIs, getProdTemps } from '../data/optimization/injectionModel';
import { valueToColor, fractureToColor } from '../utils/colorScale';
import HeatmapCanvas from '../components/predictions/HeatmapCanvas';
import WellOverlay from '../components/optimization/WellOverlay';
import './OptimizationPage.css';

const DISPLAY_SIZE = 240;
const COMPARE_SIZE = 200;

export default function OptimizationPage() {
  const [optResults, setOptResults] = useState<OptResults | null>(null);
  const [testData, setTestData] = useState<TestDataset | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedSample, setSelectedSample] = useState(0);
  const [selectedTimestep, setSelectedTimestep] = useState(5);
  const [mode, setMode] = useState<OptMode>('optimized');

  // Custom mode: injection schedule [numWells][numTimesteps]
  const [customSchedule, setCustomSchedule] = useState<number[][]>([
    [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  ]);

  // Custom mode computed results
  const [customKPIs, setCustomKPIs] = useState<{
    energy: number;
    sustainability: number;
    safety: number;
    overallScore: number;
  } | null>(null);
  const [customProdTemps, setCustomProdTemps] = useState<number[][] | null>(null);

  // Load data on mount
  useEffect(() => {
    Promise.all([loadOptResults(), loadTestData(), loadModel()])
      .then(([opt, test]) => {
        setOptResults(opt);
        setTestData(test);
        setModelReady(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load optimization data:', err);
        setLoading(false);
      });
  }, []);

  const config = optResults?.wellConfig ?? null;
  const scenario = optResults?.scenarios[selectedSample] ?? null;
  const numTimesteps = testData?.metadata.numTimesteps ?? 11;
  const gridSize = testData?.metadata.gridSize ?? 64;

  // Current schedule based on mode
  const currentSchedule = useMemo(() => {
    if (!scenario) return null;
    if (mode === 'baseline') return scenario.baseline.schedule;
    if (mode === 'optimized') return scenario.optimized.schedule;
    return customSchedule;
  }, [scenario, mode, customSchedule]);

  // Fracture field for selected sample
  const fractureField = useMemo(() => {
    if (!testData) return null;
    return getFractureField(testData, selectedSample);
  }, [testData, selectedSample]);

  // Color functions
  const fracColorFn = useCallback((v: number) => fractureToColor(v), []);
  const tempColorFn = useCallback(
    (v: number) => {
      if (!testData) return [0, 0, 0] as [number, number, number];
      return valueToColor(v, testData.metadata.tempMin, testData.metadata.tempMax);
    },
    [testData],
  );

  // Temperature fields: current mode + baseline for comparison
  const [displayTempField, setDisplayTempField] = useState<Float32Array | null>(null);
  const [baselineTempField, setBaselineTempField] = useState<Float32Array | null>(null);

  useEffect(() => {
    if (!fractureField || !config || !currentSchedule || !isModelLoaded()) return;

    let cancelled = false;

    (async () => {
      const baseTemp = await predict(fractureField, selectedTimestep, gridSize, numTimesteps);
      if (cancelled) return;

      // Always compute baseline field for comparison
      const baselineRates = scenario?.baseline.schedule.map(w => w[selectedTimestep]) ?? [0.5, 0.5, 0.5];
      const baselineField = applyInjectionEffects(baseTemp, baselineRates, config, gridSize);

      // Compute current mode field
      const currentRates = currentSchedule.map((wellSched) => wellSched[selectedTimestep]);
      const currentField = applyInjectionEffects(baseTemp, currentRates, config, gridSize);

      if (!cancelled) {
        setBaselineTempField(baselineField);
        setDisplayTempField(currentField);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fractureField, config, currentSchedule, selectedTimestep, gridSize, numTimesteps, mode, scenario]);

  // Custom mode: compute full KPIs across all timesteps
  useEffect(() => {
    if (mode !== 'custom' || !fractureField || !config || !isModelLoaded()) return;

    let cancelled = false;

    (async () => {
      const allFields: Float32Array[] = [];
      for (let t = 0; t < numTimesteps; t++) {
        const baseTemp = await predict(fractureField, t, gridSize, numTimesteps);
        if (cancelled) return;
        const rates = customSchedule.map((wellSched) => wellSched[t]);
        const modified = applyInjectionEffects(baseTemp, rates, config, gridSize);
        allFields.push(modified);
      }
      if (cancelled) return;

      const kpis = computeKPIs(allFields, customSchedule, config, gridSize);
      const prodTemps = getProdTemps(allFields, config, gridSize);
      setCustomKPIs(kpis);
      setCustomProdTemps(prodTemps);
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, fractureField, config, customSchedule, gridSize, numTimesteps]);

  // Get KPIs and prodTemps for current mode
  const currentKPIs = useMemo(() => {
    if (!scenario) return null;
    if (mode === 'baseline') return scenario.baseline;
    if (mode === 'optimized') return scenario.optimized;
    return customKPIs;
  }, [scenario, mode, customKPIs]);

  const currentProdTemps = useMemo(() => {
    if (!scenario) return null;
    if (mode === 'baseline') return scenario.baseline.prodTemps;
    if (mode === 'optimized') return scenario.optimized.prodTemps;
    return customProdTemps;
  }, [scenario, mode, customProdTemps]);

  const baselineKPIs = scenario?.baseline ?? null;

  // Bar chart data for injection schedule
  const scheduleChartData = useMemo(() => {
    if (!currentSchedule) return [];
    return Array.from({ length: numTimesteps }, (_, t) => ({
      timestep: `t${t}`,
      'Well 1': currentSchedule[0]?.[t] ?? 0,
      'Well 2': currentSchedule[1]?.[t] ?? 0,
      'Well 3': currentSchedule[2]?.[t] ?? 0,
    }));
  }, [currentSchedule, numTimesteps]);

  // Line chart data for production well temperatures
  const perfChartData = useMemo(() => {
    if (!currentProdTemps) return [];
    return currentProdTemps.map((temps, t) => ({
      timestep: t,
      'P1': temps[0] ?? 0,
      'P2': temps[1] ?? 0,
      'P3': temps[2] ?? 0,
    }));
  }, [currentProdTemps]);

  // KPI comparison bar chart data
  const kpiCompareData = useMemo(() => {
    if (!currentKPIs || !baselineKPIs) return [];
    const modeLabel = mode === 'optimized' ? 'Optimized' : mode === 'custom' ? 'Custom' : 'Baseline';
    return [
      { name: 'Energy', Baseline: baselineKPIs.energy, [modeLabel]: currentKPIs.energy ?? 0 },
      { name: 'Sustain.', Baseline: baselineKPIs.sustainability, [modeLabel]: currentKPIs.sustainability ?? 0 },
      { name: 'Safety', Baseline: baselineKPIs.safety, [modeLabel]: currentKPIs.safety ?? 0 },
      { name: 'Overall', Baseline: baselineKPIs.overallScore, [modeLabel]: currentKPIs.overallScore ?? 0 },
    ];
  }, [currentKPIs, baselineKPIs, mode]);

  // Pareto front data: all scenarios mapped to energy vs sustainability
  const paretoData = useMemo(() => {
    if (!optResults) return [];
    return optResults.scenarios.map((s, i) => ({
      id: i,
      baselineEnergy: s.baseline.energy,
      baselineSustainability: s.baseline.sustainability,
      baselineSafety: s.baseline.safety,
      optEnergy: s.optimized.energy,
      optSustainability: s.optimized.sustainability,
      optSafety: s.optimized.safety,
      improvement: s.optimized.overallScore - s.baseline.overallScore,
    }));
  }, [optResults]);

  // Sensitivity analysis: per-well contribution to overall score change
  const sensitivityData = useMemo(() => {
    if (!scenario || !config) return [];
    const optimized = scenario.optimized.overallScore;
    const baseline = scenario.baseline.overallScore;
    const baseSchedule = scenario.baseline.schedule;
    const optSchedule = scenario.optimized.schedule;

    const wellNames = ['Injection Well 1', 'Injection Well 2', 'Injection Well 3'];
    return wellNames.map((name, wIdx) => {
      const baseAvg = baseSchedule[wIdx].reduce((a, b) => a + b, 0) / baseSchedule[wIdx].length;
      const optAvg = optSchedule[wIdx].reduce((a, b) => a + b, 0) / optSchedule[wIdx].length;
      const rateChange = optAvg - baseAvg;
      const totalChange = optSchedule.reduce((sum, well, i) => {
        const bAvg = baseSchedule[i].reduce((a, b) => a + b, 0) / baseSchedule[i].length;
        const oAvg = well.reduce((a, b) => a + b, 0) / well.length;
        return sum + Math.abs(oAvg - bAvg);
      }, 0) || 1;
      const contribution = (Math.abs(rateChange) / totalChange) * (optimized - baseline);
      return {
        name,
        rateChange,
        contribution,
        positive: contribution >= 0,
      };
    });
  }, [scenario, config]);

  // Custom slider handler
  const handleSliderChange = useCallback(
    (wellIdx: number, timestep: number, value: number) => {
      setCustomSchedule((prev) => {
        const next = prev.map((row) => [...row]);
        next[wellIdx][timestep] = value;
        return next;
      });
    },
    [],
  );

  // Loading state
  if (loading) {
    return (
      <div className="optimization-page optimization-loading">
        <span className="opt-spinner">⏳</span> Loading optimization data...
      </div>
    );
  }

  if (!optResults || !testData || !config) {
    return (
      <div className="optimization-page optimization-loading">
        Failed to load optimization data.
      </div>
    );
  }

  const numSamples = optResults.scenarios.length;

  // Compute deltas for KPI cards
  const getDelta = (key: 'energy' | 'sustainability' | 'safety' | 'overallScore') => {
    if (!currentKPIs || !baselineKPIs || mode === 'baseline') return null;
    const baseline = baselineKPIs[key];
    const current = currentKPIs[key];
    if (baseline === 0) return null;
    return ((current - baseline) / Math.abs(baseline)) * 100;
  };

  const modeLabel = mode === 'optimized' ? 'Optimized' : mode === 'custom' ? 'Custom' : 'Baseline';
  const accentFill = '#ff6b35';

  return (
    <div className="optimization-page">
      {/* Controls */}
      <div className="opt-controls">
        <div className="opt-control-group">
          <label className="opt-label">Sample</label>
          <button
            className="opt-btn"
            disabled={selectedSample <= 0}
            onClick={() => setSelectedSample((s) => Math.max(0, s - 1))}
          >
            ◀
          </button>
          <span className="opt-value">
            {selectedSample + 1} / {numSamples}
          </span>
          <button
            className="opt-btn"
            disabled={selectedSample >= numSamples - 1}
            onClick={() => setSelectedSample((s) => Math.min(numSamples - 1, s + 1))}
          >
            ▶
          </button>
        </div>

        <div className="opt-control-group">
          <label className="opt-label">Mode</label>
          <div className="opt-mode-toggle">
            {(['baseline', 'optimized', 'custom'] as OptMode[]).map((m) => (
              <button
                key={m}
                className={`opt-mode-btn ${mode === m ? 'active' : ''}`}
                onClick={() => setMode(m)}
              >
                {m === 'baseline' ? 'Baseline' : m === 'optimized' ? 'Optimized' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        <div className="opt-control-group">
          <label className="opt-label">Timestep</label>
          <input
            type="range"
            className="opt-slider"
            min={0}
            max={numTimesteps - 1}
            value={selectedTimestep}
            onChange={(e) => setSelectedTimestep(Number(e.target.value))}
          />
          <span className="opt-value">
            {selectedTimestep} / {numTimesteps - 1}
          </span>
        </div>

        <div className="opt-status">
          {modelReady ? '✅ Model ready' : '⏳ Loading model...'}
        </div>
      </div>

      {/* Main grid: heatmaps + charts */}
      <div className="opt-main-grid">
        {/* Left: Heatmaps */}
        <div className="opt-heatmaps">
          {/* Fracture field */}
          <div className="opt-panel">
            <div className="opt-panel-title">Fracture Field</div>
            <div className="opt-heatmap-wrapper">
              {fractureField && (
                <HeatmapCanvas
                  data={fractureField}
                  gridSize={gridSize}
                  colorFn={fracColorFn}
                  displaySize={DISPLAY_SIZE}
                />
              )}
              {config && (
                <WellOverlay config={config} gridSize={gridSize} displaySize={DISPLAY_SIZE} />
              )}
            </div>
            <div className="opt-legend">
              <span className="opt-legend-swatch" style={{ background: '#141e2d' }} />
              <span>Rock</span>
              <span className="opt-legend-swatch" style={{ background: '#00e5ff' }} />
              <span>Fracture</span>
              <span className="opt-legend-swatch" style={{ background: '#ff7043' }} />
              <span>Production</span>
              <span className="opt-legend-swatch" style={{ background: '#4fc3f7' }} />
              <span>Injection</span>
            </div>
          </div>

          {/* Temperature field: side-by-side when not baseline */}
          {mode !== 'baseline' ? (
            <div className="opt-comparison">
              {/* Baseline */}
              <div className="opt-panel">
                <div className="opt-panel-title">Baseline Temperature (t={selectedTimestep})</div>
                <div className="opt-heatmap-wrapper">
                  {baselineTempField ? (
                    <HeatmapCanvas
                      data={baselineTempField}
                      gridSize={gridSize}
                      colorFn={tempColorFn}
                      displaySize={COMPARE_SIZE}
                    />
                  ) : (
                    <div
                      style={{
                        width: COMPARE_SIZE,
                        height: COMPARE_SIZE,
                        background: 'var(--color-bg-primary)',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-secondary)',
                        fontSize: 12,
                      }}
                    >
                      Computing...
                    </div>
                  )}
                  {config && (
                    <WellOverlay config={config} gridSize={gridSize} displaySize={COMPARE_SIZE} />
                  )}
                </div>
              </div>
              {/* Optimized/Custom */}
              <div className="opt-panel">
                <div className="opt-panel-title">{modeLabel} Temperature (t={selectedTimestep})</div>
                <div className="opt-heatmap-wrapper">
                  {displayTempField ? (
                    <HeatmapCanvas
                      data={displayTempField}
                      gridSize={gridSize}
                      colorFn={tempColorFn}
                      displaySize={COMPARE_SIZE}
                    />
                  ) : (
                    <div
                      style={{
                        width: COMPARE_SIZE,
                        height: COMPARE_SIZE,
                        background: 'var(--color-bg-primary)',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-secondary)',
                        fontSize: 12,
                      }}
                    >
                      Computing...
                    </div>
                  )}
                  {config && (
                    <WellOverlay config={config} gridSize={gridSize} displaySize={COMPARE_SIZE} />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="opt-panel">
              <div className="opt-panel-title">
                Temperature (t={selectedTimestep})
              </div>
              <div className="opt-heatmap-wrapper">
                {displayTempField ? (
                  <HeatmapCanvas
                    data={displayTempField}
                    gridSize={gridSize}
                    colorFn={tempColorFn}
                    displaySize={DISPLAY_SIZE}
                  />
                ) : (
                  <div
                    style={{
                      width: DISPLAY_SIZE,
                      height: DISPLAY_SIZE,
                      background: 'var(--color-bg-primary)',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-secondary)',
                      fontSize: 12,
                    }}
                  >
                    Computing...
                  </div>
                )}
                {config && (
                  <WellOverlay config={config} gridSize={gridSize} displaySize={DISPLAY_SIZE} />
                )}
              </div>
            </div>
          )}

          {/* Temperature legend (shared) */}
          <div className="opt-legend opt-legend-gradient">
            <div
              className="opt-legend-bar"
              style={{
                background:
                  'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
              }}
            />
            <div className="opt-legend-labels">
              <span>{testData.metadata.tempMin.toFixed(2)}</span>
              <span>Temperature</span>
              <span>{testData.metadata.tempMax.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Right: Charts + KPIs */}
        <div className="opt-charts">
          {/* Injection schedule bar chart */}
          <div className="opt-chart-panel">
            <div className="opt-chart-title">
              Injection Schedule ({mode === 'baseline' ? 'Constant' : mode === 'optimized' ? 'Optimized' : 'Custom'})
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={scheduleChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                <XAxis dataKey="timestep" tick={{ fill: '#8b99a8', fontSize: 10 }} />
                <YAxis domain={[0, 1]} tick={{ fill: '#8b99a8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: '#162231',
                    border: '1px solid #1e2d3d',
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Well 1" fill="#4fc3f7" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Well 2" fill="#81c784" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Well 3" fill="#ba68c8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance line chart */}
          <div className="opt-chart-panel">
            <div className="opt-chart-title">Production Well Temperatures Over Time</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={perfChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                <XAxis
                  dataKey="timestep"
                  tick={{ fill: '#8b99a8', fontSize: 10 }}
                  label={{ value: 'Timestep', position: 'bottom', fill: '#8b99a8', fontSize: 10, offset: -5 }}
                />
                <YAxis tick={{ fill: '#8b99a8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: '#162231',
                    border: '1px solid #1e2d3d',
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="P1" stroke="#ff7043" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="P2" stroke="#ff9800" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="P3" stroke="#ffca28" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* KPI Comparison Bar Chart (shown when not baseline) */}
          {mode !== 'baseline' && kpiCompareData.length > 0 && (
            <div className="opt-chart-panel">
              <div className="opt-chart-title">KPI Comparison: Baseline vs {modeLabel}</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={kpiCompareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                  <XAxis dataKey="name" tick={{ fill: '#8b99a8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#8b99a8', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#162231',
                      border: '1px solid #1e2d3d',
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="#1e2d3d" />
                  <Bar dataKey="Baseline" fill="#5c6b7a" radius={[2, 2, 0, 0]} />
                  <Bar dataKey={modeLabel} fill={accentFill} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* KPI Cards */}
          <div className="opt-kpis">
            <KPICard label="Energy" value={currentKPIs?.energy} delta={getDelta('energy')} higherIsBetter />
            <KPICard label="Sustainability" value={currentKPIs?.sustainability} delta={getDelta('sustainability')} higherIsBetter />
            <KPICard label="Safety Risk" value={currentKPIs?.safety} delta={getDelta('safety')} higherIsBetter={false} />
            <KPICard label="Overall Score" value={currentKPIs?.overallScore} delta={getDelta('overallScore')} higherIsBetter />
          </div>
        </div>
      </div>

      {/* Custom sliders panel */}
      {mode === 'custom' && (
        <div className="opt-custom-panel">
          <div className="opt-custom-header">
            <div className="opt-custom-title">Custom Injection Rates</div>
            <div className="opt-custom-actions">
              <button
                className="opt-action-btn"
                onClick={() =>
                  setCustomSchedule([
                    Array(numTimesteps).fill(0.5),
                    Array(numTimesteps).fill(0.5),
                    Array(numTimesteps).fill(0.5),
                  ])
                }
              >
                Reset to Baseline
              </button>
              {scenario && (
                <button
                  className="opt-action-btn"
                  onClick={() =>
                    setCustomSchedule(scenario.optimized.schedule.map((row) => [...row]))
                  }
                >
                  Copy from Optimized
                </button>
              )}
            </div>
          </div>

          {/* Timestep labels */}
          <div className="opt-timestep-labels">
            {Array.from({ length: numTimesteps }, (_, t) => (
              <span key={t} className="opt-timestep-label">
                t{t}
              </span>
            ))}
          </div>

          {/* Well sliders */}
          {customSchedule.map((wellRates, wIdx) => (
            <div key={wIdx} className="opt-well-row">
              <span className="opt-well-label">I{wIdx + 1}</span>
              <div className="opt-well-sliders">
                {wellRates.map((rate, t) => (
                  <div
                    key={t}
                    className={`opt-rate-cell ${t === selectedTimestep ? 'highlighted' : ''}`}
                  >
                    <input
                      type="range"
                      className="opt-rate-slider"
                      min={0}
                      max={1}
                      step={0.05}
                      value={rate}
                      onChange={(e) => handleSliderChange(wIdx, t, Number(e.target.value))}
                    />
                    <span className="opt-rate-val">{rate.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pareto Front Visualization */}
      {paretoData.length > 0 && (
        <div className="opt-pareto-section">
          <div className="opt-section-title">Multi-Objective Trade-off: Pareto Analysis</div>
          <div className="opt-pareto-content">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                <XAxis
                  type="number"
                  dataKey="energy"
                  name="Energy"
                  tick={{ fill: '#8b99a8', fontSize: 10 }}
                  label={{ value: 'Energy Score', position: 'bottom', fill: '#8b99a8', fontSize: 11, offset: -5 }}
                />
                <YAxis
                  type="number"
                  dataKey="sustainability"
                  name="Sustainability"
                  tick={{ fill: '#8b99a8', fontSize: 10 }}
                  label={{ value: 'Sustainability', angle: -90, position: 'insideLeft', fill: '#8b99a8', fontSize: 11 }}
                />
                <ZAxis range={[60, 60]} />
                <Tooltip
                  contentStyle={{ background: '#162231', border: '1px solid #1e2d3d', borderRadius: 6, fontSize: 11 }}
                  formatter={(value: unknown) => Number(value).toFixed(4)}
                />
                <Scatter
                  name="Baseline"
                  data={paretoData.map(d => ({ energy: d.baselineEnergy, sustainability: d.baselineSustainability, id: d.id }))}
                  fill="#5c6b7a"
                  onClick={(data: any) => setSelectedSample(data.id)}
                >
                  {paretoData.map((_, i) => (
                    <Cell key={i} fill={i === selectedSample ? '#00e5ff' : '#5c6b7a'} r={i === selectedSample ? 8 : 5} />
                  ))}
                </Scatter>
                <Scatter
                  name="Optimized"
                  data={paretoData.map(d => ({ energy: d.optEnergy, sustainability: d.optSustainability, id: d.id }))}
                  fill="#ff6b35"
                  onClick={(data: any) => setSelectedSample(data.id)}
                >
                  {paretoData.map((_, i) => (
                    <Cell key={i} fill={i === selectedSample ? '#00e5ff' : '#ff6b35'} r={i === selectedSample ? 8 : 5} />
                  ))}
                </Scatter>
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="opt-sensitivity-legend">
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                Each dot represents one fracture scenario. <strong style={{ color: '#5c6b7a' }}>Gray</strong> = baseline performance,{' '}
                <strong style={{ color: '#ff6b35' }}>Orange</strong> = optimized performance.{' '}
                <strong style={{ color: '#00e5ff' }}>Cyan</strong> = currently selected sample. Click any dot to select that sample.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Parameter Sensitivity Analysis */}
      {sensitivityData.length > 0 && (
        <div className="opt-sensitivity-section">
          <div className="opt-section-title">Parameter Sensitivity Analysis</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sensitivityData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
              <XAxis
                type="number"
                tick={{ fill: '#8b99a8', fontSize: 10 }}
                label={{ value: 'Impact on Overall Score', position: 'bottom', fill: '#8b99a8', fontSize: 11, offset: -5 }}
              />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8b99a8', fontSize: 10 }} width={100} />
              <Tooltip
                contentStyle={{ background: '#162231', border: '1px solid #1e2d3d', borderRadius: 6, fontSize: 11 }}
              />
              <ReferenceLine x={0} stroke="#1e2d3d" />
              <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                {sensitivityData.map((d, i) => (
                  <Cell key={i} fill={d.positive ? '#66bb6a' : '#ef5350'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="opt-sensitivity-legend">
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Shows relative contribution of each injection well's rate adjustment to the overall score improvement.
              <strong style={{ color: '#66bb6a' }}> Green</strong> = positive impact,
              <strong style={{ color: '#ef5350' }}> Red</strong> = negative impact.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- KPI Card sub-component ----------
function KPICard({
  label,
  value,
  delta,
  higherIsBetter,
}: {
  label: string;
  value?: number;
  delta: number | null;
  higherIsBetter: boolean;
}) {
  const isPositive = delta !== null && ((higherIsBetter && delta > 0) || (!higherIsBetter && delta < 0));
  const isNegative = delta !== null && ((higherIsBetter && delta < 0) || (!higherIsBetter && delta > 0));

  return (
    <div className="opt-kpi-card">
      <div className="opt-kpi-value">
        {value !== undefined ? value.toFixed(4) : '—'}
        {delta !== null && Math.abs(delta) > 0.05 && (
          <span className={`opt-kpi-delta ${isPositive ? 'positive' : isNegative ? 'negative' : ''}`}>
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="opt-kpi-label">{label}</div>
    </div>
  );
}

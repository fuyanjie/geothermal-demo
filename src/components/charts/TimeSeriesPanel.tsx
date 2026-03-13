import { useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import type { TimeSeriesField } from '../../types';
import TimeSeriesChart from './TimeSeriesChart';
import './TimeSeriesPanel.css';

const CHART_CONFIGS: { field: TimeSeriesField; label: string; unit: string; color: string }[] = [
  { field: 'extractionFlow', label: 'Extraction Flow', unit: 'GPM', color: 'var(--color-production)' },
  { field: 'injectionFlow',  label: 'Injection Flow',  unit: 'GPM', color: 'var(--color-injection)' },
  { field: 'temperature',    label: 'Temperature',      unit: '°C',  color: 'var(--color-temperature)' },
  { field: 'pressure',       label: 'Pressure',         unit: 'PSI', color: 'var(--color-pressure)' },
];

export default function TimeSeriesPanel() {
  const { selectedWellId, timeSeriesData, timestepIndex } = useAppState();

  const wellData = useMemo(
    () => timeSeriesData.find((d) => d.wellId === selectedWellId),
    [timeSeriesData, selectedWellId],
  );

  if (!wellData) return null;

  return (
    <div className="ts-panel">
      {CHART_CONFIGS.map((cfg) => (
        <TimeSeriesChart
          key={cfg.field}
          data={wellData[cfg.field]}
          label={cfg.label}
          unit={cfg.unit}
          color={cfg.color}
          timestepIndex={timestepIndex}
        />
      ))}
    </div>
  );
}

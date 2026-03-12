import { useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import TimeSeriesChart from './TimeSeriesChart';
import './TimeSeriesPanel.css';

const CHART_CONFIGS = [
  { field: 'productionRate' as const, label: 'Production Rate', unit: 'kg/s', color: 'var(--color-production)' },
  { field: 'injectionRate' as const, label: 'Injection Rate', unit: 'kg/s', color: 'var(--color-injection)' },
  { field: 'temperature' as const, label: 'Temperature', unit: '°C', color: 'var(--color-temperature)' },
  { field: 'pressure' as const, label: 'Pressure', unit: 'MPa', color: 'var(--color-pressure)' },
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

import type { SubsurfaceField } from '../../types';
import { formatNumber } from '../../utils/formatters';
import './ColorLegend.css';

interface Props {
  field: SubsurfaceField;
  min: number;
  max: number;
}

const FIELD_LABELS: Record<SubsurfaceField, { label: string; unit: string }> = {
  temperature: { label: 'Temperature', unit: '°C' },
  pressure: { label: 'Pressure', unit: 'MPa' },
};

export default function ColorLegend({ field, min, max }: Props) {
  const { label, unit } = FIELD_LABELS[field];

  return (
    <div className="color-legend">
      <div className="color-legend-label">{label} ({unit})</div>
      <div className="color-legend-bar" />
      <div className="color-legend-range">
        <span>{formatNumber(min, 0)}</span>
        <span>{formatNumber(max, 0)}</span>
      </div>
    </div>
  );
}

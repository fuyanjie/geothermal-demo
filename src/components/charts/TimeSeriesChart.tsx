import { memo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import type { TimeSeriesPoint } from '../../types';
import { formatDateShort, formatNumber } from '../../utils/formatters';
import './TimeSeriesChart.css';

interface Props {
  data?: TimeSeriesPoint[];
  label: string;
  unit: string;
  color: string;
  timestepIndex: number;
}

const TimeSeriesChart = memo(function TimeSeriesChart({ data, label, unit, color, timestepIndex }: Props) {
  const hasData = data && data.length > 0;
  const refDate = hasData ? data[timestepIndex]?.date : undefined;

  return (
    <div className="ts-chart">
      <div className="ts-chart-title">
        {label} <span className="ts-chart-unit">({unit})</span>
      </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fontSize: 10, fill: '#8b99a8' }}
              interval={79}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#8b99a8' }}
              width={45}
              tickFormatter={(v: number) => formatNumber(v, 0)}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-sidebar)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                fontSize: '12px',
              }}
              labelFormatter={(dateStr: unknown) => formatDateShort(String(dateStr))}
              formatter={(v: unknown) => [formatNumber(Number(v), 1) + ' ' + unit, label]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: color }}
            />
            {refDate && (
              <ReferenceLine x={refDate} stroke="var(--color-accent)" strokeDasharray="4 4" strokeWidth={1} />
            )}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="ts-chart-nodata">
          No data available
        </div>
      )}
    </div>
  );
});

export default TimeSeriesChart;

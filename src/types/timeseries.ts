export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface WellTimeSeries {
  wellId: string;
  productionRate: TimeSeriesPoint[];
  injectionRate: TimeSeriesPoint[];
  temperature: TimeSeriesPoint[];
  pressure: TimeSeriesPoint[];
}

export type TimeSeriesField = 'productionRate' | 'injectionRate' | 'temperature' | 'pressure';

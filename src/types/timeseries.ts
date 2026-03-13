export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface WellTimeSeries {
  wellId: string;
  extractionFlow?: TimeSeriesPoint[];
  injectionFlow?: TimeSeriesPoint[];
  temperature?: TimeSeriesPoint[];
  pressure?: TimeSeriesPoint[];
}

export type TimeSeriesField = 'extractionFlow' | 'injectionFlow' | 'temperature' | 'pressure';

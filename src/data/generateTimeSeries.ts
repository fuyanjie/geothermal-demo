import type { WellTimeSeries, TimeSeriesPoint, TimeSeriesField } from '../types';

// Shape of the preprocessed JSON
interface BradyJson {
  dates: string[];
  wells: Array<{ id: string }>;
  timeSeries: Record<string, Partial<Record<TimeSeriesField, (number | null)[]>>>;
}

let cachedData: WellTimeSeries[] | null = null;
let cachedDates: string[] | null = null;

function toTimeSeriesPoints(dates: string[], values: (number | null)[]): TimeSeriesPoint[] {
  return dates.map((date, i) => ({
    date,
    value: values[i] ?? 0,
  }));
}

export async function loadAllTimeSeries(): Promise<WellTimeSeries[]> {
  if (cachedData) return cachedData;

  const res = await fetch(`${import.meta.env.BASE_URL}data/brady.json`);
  const json: BradyJson = await res.json();

  cachedDates = json.dates;

  const allFields: TimeSeriesField[] = ['extractionFlow', 'injectionFlow', 'temperature', 'pressure'];

  cachedData = json.wells.map((well) => {
    const wellTs = json.timeSeries[well.id] ?? {};
    const result: WellTimeSeries = { wellId: well.id };

    for (const field of allFields) {
      const values = wellTs[field];
      if (values && values.some((v) => v !== null)) {
        result[field] = toTimeSeriesPoints(json.dates, values);
      }
    }

    return result;
  });

  return cachedData;
}

export function getCachedDates(): string[] {
  return cachedDates ?? [];
}

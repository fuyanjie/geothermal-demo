import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { SubsurfaceField } from '../types';
import type { WellTimeSeries, SubsurfaceData } from '../types';
import { wells, loadAllTimeSeries, generateSubsurfaceData, getCachedDates } from '../data';

export type PageId = 'explorer' | 'predictions' | 'optimization';

interface AppState {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  selectedWellId: string;
  setSelectedWellId: (id: string) => void;
  timestepIndex: number;
  setTimestepIndex: (i: number) => void;
  subsurfaceField: SubsurfaceField;
  setSubsurfaceField: (f: SubsurfaceField) => void;
  timeSeriesData: WellTimeSeries[];
  subsurfaceData: SubsurfaceData;
  numTimesteps: number;
  currentDate: string;
  dates: string[];
}

const AppStateContext = createContext<AppState | null>(null);

// Subsurface data can be generated synchronously (still synthetic)
const subsurfaceData = generateSubsurfaceData(wells);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageId>('explorer');
  const [selectedWellId, setSelectedWellId] = useState(wells[0].id);
  const [timestepIndex, setTimestepIndex] = useState(0);
  const [subsurfaceField, setSubsurfaceField] = useState<SubsurfaceField>('temperature');
  const [timeSeriesData, setTimeSeriesData] = useState<WellTimeSeries[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllTimeSeries().then((data) => {
      setTimeSeriesData(data);
      setLoading(false);
    });
  }, []);

  const dates = getCachedDates();
  const numTimesteps = dates.length || subsurfaceData.timesteps.length;

  // Map time-series timestep index to subsurface timestep index (3D has fewer frames)
  const subsurfaceTimestepIndex = Math.min(
    Math.floor((timestepIndex / Math.max(numTimesteps - 1, 1)) * (subsurfaceData.timesteps.length - 1)),
    subsurfaceData.timesteps.length - 1,
  );

  const currentDate = dates[timestepIndex] ?? subsurfaceData.timesteps[subsurfaceTimestepIndex]?.date ?? '';

  const value = useMemo<AppState>(
    () => ({
      currentPage,
      setCurrentPage,
      selectedWellId,
      setSelectedWellId,
      timestepIndex,
      setTimestepIndex,
      subsurfaceField,
      setSubsurfaceField,
      timeSeriesData: timeSeriesData ?? [],
      subsurfaceData: {
        ...subsurfaceData,
        // Override the timestep index mapping so the 3D view uses the correct frame
        _subsurfaceTimestepIndex: subsurfaceTimestepIndex,
      } as SubsurfaceData & { _subsurfaceTimestepIndex: number },
      numTimesteps,
      currentDate,
      dates,
    }),
    [currentPage, selectedWellId, timestepIndex, subsurfaceField, timeSeriesData, numTimesteps, currentDate, subsurfaceTimestepIndex, dates],
  );

  if (loading || !timeSeriesData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-secondary)',
        fontSize: '14px',
        gap: '8px',
      }}>
        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
        Loading Brady Hot Springs data...
      </div>
    );
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

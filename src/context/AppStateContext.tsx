import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import type { SubsurfaceField } from '../types';
import type { WellTimeSeries, SubsurfaceData } from '../types';
import { wells, generateAllTimeSeries, generateSubsurfaceData } from '../data';

interface AppState {
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
}

const AppStateContext = createContext<AppState | null>(null);

// Generate data once outside component to avoid re-computation
const timeSeriesData = generateAllTimeSeries(wells);
const subsurfaceData = generateSubsurfaceData(wells);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [selectedWellId, setSelectedWellId] = useState(wells[0].id);
  const [timestepIndex, setTimestepIndex] = useState(0);
  const [subsurfaceField, setSubsurfaceField] = useState<SubsurfaceField>('temperature');

  const numTimesteps = subsurfaceData.timesteps.length;
  const currentDate = subsurfaceData.timesteps[timestepIndex]?.date ?? '';

  const value = useMemo<AppState>(
    () => ({
      selectedWellId,
      setSelectedWellId,
      timestepIndex,
      setTimestepIndex,
      subsurfaceField,
      setSubsurfaceField,
      timeSeriesData,
      subsurfaceData,
      numTimesteps,
      currentDate,
    }),
    [selectedWellId, timestepIndex, subsurfaceField, numTimesteps, currentDate],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

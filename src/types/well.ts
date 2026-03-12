export interface WellMetadata {
  id: string;
  name: string;
  type: 'production' | 'injection';
  latitude: number;
  longitude: number;
  depthMeters: number;
  gridX: number;
  gridY: number;
}

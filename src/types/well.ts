export interface WellMetadata {
  id: string;
  name: string;
  type: 'pumping' | 'injection' | 'observation';
  latitude: number;
  longitude: number;
  depthMeters: number;
  gridX: number;
  gridY: number;
}

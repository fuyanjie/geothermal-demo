import type { WellMetadata } from '../types';

// Brady Hot Springs wells — coordinates from DOE GDR #828 (UTM Zone 11N → WGS84)
// Grid positions mapped from UTM easting/northing to 20×20 grid
export const wells: WellMetadata[] = [
  // Pumping (extraction) wells
  { id: '48A-1',  name: '48A-1',  type: 'pumping',     latitude: 39.797160, longitude: -119.012454, depthMeters: 382,  gridX: 8,  gridY: 8  },
  { id: '47C-1',  name: '47C-1',  type: 'pumping',     latitude: 39.798312, longitude: -119.012004, depthMeters: 579,  gridX: 8,  gridY: 8  },
  { id: '18-1',   name: '18-1',   type: 'pumping',     latitude: 39.795681, longitude: -119.020342, depthMeters: 1746, gridX: 1,  gridY: 8  },
  { id: '27-1',   name: '27-1',   type: 'pumping',     latitude: 39.797282, longitude: -119.017709, depthMeters: 1778, gridX: 3,  gridY: 8  },
  { id: '82A-11', name: '82A-11', type: 'pumping',     latitude: 39.792738, longitude: -119.021656, depthMeters: 1819, gridX: 0,  gridY: 7  },
  // Injection wells
  { id: '18D-31', name: '18D-31', type: 'injection',   latitude: 39.810412, longitude: -119.000618, depthMeters: 200,  gridX: 18, gridY: 14 },
  { id: '18B-31', name: '18B-31', type: 'injection',   latitude: 39.811155, longitude: -119.000179, depthMeters: 229,  gridX: 19, gridY: 14 },
  { id: '81A-1',  name: '81A-1',  type: 'injection',   latitude: 39.809679, longitude: -119.002298, depthMeters: 212,  gridX: 17, gridY: 13 },
  { id: '73-25',  name: '73-25',  type: 'injection',   latitude: 39.747503, longitude: -119.005435, depthMeters: 187,  gridX: 15, gridY: 0  },
  // Observation (sensor) wells
  { id: '56A-1',  name: '56A-1',  type: 'observation', latitude: 39.800566, longitude: -119.010756, depthMeters: 544,  gridX: 9,  gridY: 9  },
  { id: '81B-1',  name: '81B-1',  type: 'observation', latitude: 39.808586, longitude: -119.003172, depthMeters: 205,  gridX: 16, gridY: 13 },
  { id: 'SP-2',   name: 'SP-2',   type: 'observation', latitude: 39.801265, longitude: -119.007640, depthMeters: 1352, gridX: 12, gridY: 9  },
];

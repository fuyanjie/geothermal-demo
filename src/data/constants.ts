export const BRADY = {
  name: 'Brady Hot Springs',
  location: 'Churchill County, Nevada',

  centerLat: 39.80,
  centerLon: -119.01,

  // Brady is a moderate-temperature system (~150-200°C)
  tempMin: 100,
  tempMax: 200,
  tempSurface: 20,

  // Pressure in PSI (matching deployment data units)
  pressureMin: 10,
  pressureMax: 350,

  // Flow rates in GPM
  extractionFlowMax: 3000,
  injectionFlowMax: 5000,

  // Brady wells are relatively shallow
  depthTop: 0,
  depthBottom: 500,

  startDate: '2016-03-11T08',
  endDate: '2016-03-27T23',
  numTimesteps: 400,

  grid: {
    nx: 20,
    ny: 20,
    nz: 10,
    dx: 100,
    dy: 100,
    dz: 50,
    sizeX: 2000,
    sizeY: 2000,
    sizeZ: 500,
  },
} as const;

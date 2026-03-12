export const SALTON_SEA = {
  centerLat: 33.20,
  centerLon: -115.60,

  tempMin: 300,
  tempMax: 370,
  tempSurface: 150,

  pressureMin: 10,
  pressureMax: 25,

  productionRateMin: 40,
  productionRateMax: 120,
  injectionRateMin: 30,
  injectionRateMax: 100,

  depthTop: 1000,
  depthBottom: 3000,

  startDate: '2019-01-01',
  endDate: '2023-12-01',
  numTimesteps: 60,

  grid: {
    nx: 20,
    ny: 20,
    nz: 10,
    dx: 200,
    dy: 200,
    dz: 200,
    sizeX: 4000,
    sizeY: 4000,
    sizeZ: 2000,
  },
} as const;

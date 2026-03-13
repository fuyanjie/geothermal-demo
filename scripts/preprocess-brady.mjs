/**
 * Preprocess Brady Hot Springs CSV data into a single JSON file.
 *
 * Reads 4 CSV files (all with CR line endings):
 *   - brady_deployment.csv (9 operational wells: flow rates + pressures)
 *   - brady_56A1.csv, brady_81B1.csv, brady_SP2.csv (3 sensor wells: temp + pressure)
 *
 * Outputs: public/data/brady.json
 *   - Hourly-aggregated time series
 *   - Well metadata with lat/lon (converted from UTM Zone 11N)
 *
 * Usage: node scripts/preprocess-brady.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ─── UTM Zone 11N → WGS84 lat/lon conversion ───
function utmToLatLon(easting, northing) {
  const k0 = 0.9996;
  const a = 6378137.0;
  const e = 0.0818191908426;
  const e2 = e * e;
  const ep2 = e2 / (1 - e2);
  const lon0 = -117 * Math.PI / 180; // Zone 11 central meridian

  const x = easting - 500000;
  const y = northing;

  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));

  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
    + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu)
    + (1097 * e1 * e1 * e1 * e1 / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = ep2 * cosPhi1 * cosPhi1;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * k0);

  const lat = phi1
    - (N1 * tanPhi1 / R1) * (
      D * D / 2
      - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D * D * D * D / 24
      + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D * D * D * D * D * D / 720
    );

  const lon = lon0 + (
    D
    - (1 + 2 * T1 + C1) * D * D * D / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D * D * D * D * D / 120
  ) / cosPhi1;

  return {
    lat: lat * 180 / Math.PI,
    lon: lon * 180 / Math.PI,
  };
}

// ─── Well metadata from GDR #828 (UTM Zone 11S coords) ───
const WELL_META_UTM = [
  // Pumping (extraction) wells
  { id: '48A-1',  name: 'Well 48A-1',  type: 'pumping',     utmE: 327703.86, utmN: 4407181.58, elev: 1226.40, depth: 382 },
  { id: '47C-1',  name: 'Well 47C-1',  type: 'pumping',     utmE: 327745.26, utmN: 4407308.58, elev: 1227.00, depth: 579 },
  { id: '18-1',   name: 'Well 18-1',   type: 'pumping',     utmE: 327024.73, utmN: 4407032.58, elev: 1223.50, depth: 1746 },
  { id: '27-1',   name: 'Well 27-1',   type: 'pumping',     utmE: 327254.25, utmN: 4407205.19, elev: 1222.00, depth: 1778 },
  { id: '82A-11', name: 'Well 82A-11', type: 'pumping',     utmE: 326904.91, utmN: 4406708.46, elev: 1220.59, depth: 1819 },
  // Injection wells
  { id: '18D-31', name: 'Well 18D-31', type: 'injection',   utmE: 328750.14, utmN: 4408629.76, elev: 1252.34, depth: 200 },
  { id: '18B-31', name: 'Well 18B-31', type: 'injection',   utmE: 328789.55, utmN: 4408711.47, elev: 1253.65, depth: 229 },
  { id: '81A-1',  name: 'Well 81A-1',  type: 'injection',   utmE: 328604.53, utmN: 4408551.68, elev: 1248.30, depth: 212 },
  { id: '73-25',  name: 'Well 73-25',  type: 'injection',   utmE: 328181.33, utmN: 4401656.23, elev: 1232.47, depth: 187 },
  // Observation (sensor) wells
  { id: '56A-1',  name: 'Well 56A-1',  type: 'observation', utmE: 327857.74, utmN: 4407556.31, elev: 1227.87, depth: 544 },
  { id: '81B-1',  name: 'Well 81B-1',  type: 'observation', utmE: 328527.01, utmN: 4408432.02, elev: 1246.05, depth: 205 },
  { id: 'SP-2',   name: 'Well SP-2',   type: 'observation', utmE: 328126.29, utmN: 4407627.97, elev: 1236.07, depth: 1352 },
];

// Convert UTM to lat/lon
const wells = WELL_META_UTM.map(w => {
  const { lat, lon } = utmToLatLon(w.utmE, w.utmN);
  return {
    id: w.id,
    name: w.name,
    type: w.type,
    latitude: Math.round(lat * 1000000) / 1000000,
    longitude: Math.round(lon * 1000000) / 1000000,
    depthMeters: w.depth,
    elevationMeters: w.elev,
  };
});

console.log('Well coordinates (lat/lon):');
wells.forEach(w => console.log(`  ${w.id}: ${w.latitude}, ${w.longitude}`));

// ─── Parse CSV helpers ───
function readCsvCR(filepath) {
  const raw = readFileSync(filepath, 'utf8');
  // Handle CR, CRLF, or LF line endings
  const lines = raw.split(/\r\n|\r|\n/).filter(l => l.trim());
  return lines;
}

function parseDeploymentDate(dateStr) {
  // Format: "M/D/YY H:MM" e.g., "3/11/16 8:00"
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, month, day, year2, hour, minute] = match;
  const year = 2000 + parseInt(year2);
  return new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
}

function dateToHourKey(d) {
  // "2016-03-11T08"
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}`;
}

// ─── Parse deployment.csv ───
function parseDeployment(filepath) {
  const lines = readCsvCR(filepath);

  // Column indices (from header analysis):
  // 0: Full UTC Date Time
  // 1: ms
  // 2: 48A-1 Extraction Flow [gpm]
  // 3: 47C-1 Extraction Flow [gpm]
  // 4: 18-1 Extraction Flow [gpm]
  // 5: 27-1 Extraction Flow [gpm]
  // 6: 82A-11 Extraction Flow [gpm]
  // 7: 18D-31 Injection Flow [gpm]
  // 8: 18B-31 Injection Flow [gpm]
  // 9: 81A-1 Injection Flow [gpm]
  // 10: 73-25 Injection Flow [gpm]
  // 11: 82A-11 Downhole Pressure [PSI]
  // 12: 27-1 Downhole Pressure [PSI]
  // 13: 18-1 Downhole Pressure [PSI]
  // 14: 48A-1 Downhole Pressure [PSI]
  // 15: 47C-1 Downhole Pressure [PSI]

  // Map: wellId -> field -> colIndex
  const fieldMap = {
    '48A-1':  { extractionFlow: 2, pressure: 14 },
    '47C-1':  { extractionFlow: 3, pressure: 15 },
    '18-1':   { extractionFlow: 4, pressure: 13 },
    '27-1':   { extractionFlow: 5, pressure: 12 },
    '82A-11': { extractionFlow: 6, pressure: 11 },
    '18D-31': { injectionFlow: 7 },
    '18B-31': { injectionFlow: 8 },
    '81A-1':  { injectionFlow: 9 },
    '73-25':  { injectionFlow: 10 },
  };

  // Accumulators: hourKey -> wellId -> field -> { sum, count }
  const accum = {};

  let skipped = 0;
  let parsed = 0;

  // Skip header (first 2 lines typically: header + units)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(',');

    const dateStr = cols[0]?.trim();
    if (!dateStr) continue;

    const d = parseDeploymentDate(dateStr);
    if (!d) {
      skipped++;
      continue;
    }

    const hourKey = dateToHourKey(d);
    if (!accum[hourKey]) accum[hourKey] = {};

    for (const [wellId, fields] of Object.entries(fieldMap)) {
      if (!accum[hourKey][wellId]) accum[hourKey][wellId] = {};

      for (const [fieldName, colIdx] of Object.entries(fields)) {
        const raw = cols[colIdx]?.trim();
        const val = parseFloat(raw);
        if (isNaN(val)) continue;

        if (!accum[hourKey][wellId][fieldName]) {
          accum[hourKey][wellId][fieldName] = { sum: 0, count: 0 };
        }
        accum[hourKey][wellId][fieldName].sum += val;
        accum[hourKey][wellId][fieldName].count++;
      }
    }
    parsed++;
  }

  console.log(`Deployment: parsed ${parsed} rows, skipped ${skipped} (header/invalid)`);
  return accum;
}

// ─── Parse sensor CSV (56A-1, 81B-1, SP-2) ───
function parseSensor(filepath, wellId) {
  const lines = readCsvCR(filepath);

  // Sensor CSV columns:
  // 0: Full UTC Date Time (M/D/YY H:MM format)
  // 1-6: Year, Month, Day, Hour, Minute, Second (broken out)
  // 7: Temperature (deg C)
  // 8: Pressure (kPa)

  const accum = {};
  let parsed = 0;
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(',');

    const dateStr = cols[0]?.trim();
    if (!dateStr) continue;

    const d = parseDeploymentDate(dateStr);
    if (!d) {
      skipped++;
      continue;
    }

    const hourKey = dateToHourKey(d);
    if (!accum[hourKey]) accum[hourKey] = {};
    if (!accum[hourKey][wellId]) accum[hourKey][wellId] = {};

    // Temperature (°C) - column 7
    const temp = parseFloat(cols[7]?.trim());
    if (!isNaN(temp)) {
      if (!accum[hourKey][wellId].temperature) {
        accum[hourKey][wellId].temperature = { sum: 0, count: 0 };
      }
      accum[hourKey][wellId].temperature.sum += temp;
      accum[hourKey][wellId].temperature.count++;
    }

    // Pressure (kPa → PSI: 1 kPa = 0.145038 PSI)
    const presKpa = parseFloat(cols[8]?.trim());
    if (!isNaN(presKpa)) {
      const presPsi = presKpa * 0.145038;
      if (!accum[hourKey][wellId].pressure) {
        accum[hourKey][wellId].pressure = { sum: 0, count: 0 };
      }
      accum[hourKey][wellId].pressure.sum += presPsi;
      accum[hourKey][wellId].pressure.count++;
    }

    parsed++;
  }

  console.log(`Sensor ${wellId}: parsed ${parsed} rows, skipped ${skipped}`);
  return accum;
}

// ─── Merge accumulators ───
function mergeAccum(target, source) {
  for (const [hourKey, wells] of Object.entries(source)) {
    if (!target[hourKey]) target[hourKey] = {};
    for (const [wellId, fields] of Object.entries(wells)) {
      if (!target[hourKey][wellId]) target[hourKey][wellId] = {};
      for (const [fieldName, agg] of Object.entries(fields)) {
        if (!target[hourKey][wellId][fieldName]) {
          target[hourKey][wellId][fieldName] = { sum: 0, count: 0 };
        }
        target[hourKey][wellId][fieldName].sum += agg.sum;
        target[hourKey][wellId][fieldName].count += agg.count;
      }
    }
  }
}

// ─── Main ───
const csvDir = '/tmp';

console.log('Parsing deployment.csv...');
const deployAccum = parseDeployment(resolve(csvDir, 'brady_deployment.csv'));

console.log('\nParsing sensor CSVs...');
const sensor56A1 = parseSensor(resolve(csvDir, 'brady_56A1.csv'), '56A-1');
const sensor81B1 = parseSensor(resolve(csvDir, 'brady_81B1.csv'), '81B-1');
const sensorSP2 = parseSensor(resolve(csvDir, 'brady_SP2.csv'), 'SP-2');

// Merge all accumulators
const allAccum = {};
mergeAccum(allAccum, deployAccum);
mergeAccum(allAccum, sensor56A1);
mergeAccum(allAccum, sensor81B1);
mergeAccum(allAccum, sensorSP2);

// Restrict to deployment time window (Mar 11-27, 2016) + sort
const allHourKeys = Object.keys(allAccum).sort();
console.log(`\nTotal hour keys: ${allHourKeys.length}`);
console.log(`Range: ${allHourKeys[0]} to ${allHourKeys[allHourKeys.length - 1]}`);

// Filter to deployment window
const startHour = '2016-03-11T08';
const endHour = '2016-03-27T23';
const filteredHourKeys = allHourKeys.filter(k => k >= startHour && k <= endHour);
console.log(`Filtered to deployment window: ${filteredHourKeys.length} hours`);

// Build time series arrays
const allFields = ['extractionFlow', 'injectionFlow', 'temperature', 'pressure'];
const wellIds = wells.map(w => w.id);

const timeSeries = {};
for (const wellId of wellIds) {
  timeSeries[wellId] = {};
}

for (const wellId of wellIds) {
  for (const field of allFields) {
    const values = [];
    let hasAny = false;

    for (const hourKey of filteredHourKeys) {
      const agg = allAccum[hourKey]?.[wellId]?.[field];
      if (agg && agg.count > 0) {
        values.push(Math.round(agg.sum / agg.count * 100) / 100);
        hasAny = true;
      } else {
        values.push(null);
      }
    }

    if (hasAny) {
      timeSeries[wellId][field] = values;
    }
  }
}

// Report what each well has
console.log('\nWell data summary:');
for (const wellId of wellIds) {
  const fields = Object.keys(timeSeries[wellId]);
  const nonNullCounts = {};
  for (const f of fields) {
    nonNullCounts[f] = timeSeries[wellId][f].filter(v => v !== null).length;
  }
  console.log(`  ${wellId}: ${JSON.stringify(nonNullCounts)}`);
}

// Compute grid positions (for 3D view)
const allUtm = WELL_META_UTM.map(w => ({ x: w.utmE, y: w.utmN }));
const utmMinX = Math.min(...allUtm.map(u => u.x));
const utmMaxX = Math.max(...allUtm.map(u => u.x));
const utmMinY = Math.min(...allUtm.map(u => u.y));
const utmMaxY = Math.max(...allUtm.map(u => u.y));

// Map to 0-19 grid (20x20)
const wellsWithGrid = wells.map((w, i) => {
  const meta = WELL_META_UTM[i];
  const gridX = Math.round(((meta.utmE - utmMinX) / (utmMaxX - utmMinX || 1)) * 19);
  const gridY = Math.round(((meta.utmN - utmMinY) / (utmMaxY - utmMinY || 1)) * 19);
  return { ...w, gridX, gridY };
});

// Build final JSON
const output = {
  dates: filteredHourKeys,
  wells: wellsWithGrid,
  timeSeries,
  metadata: {
    source: 'DOE Geothermal Data Repository (GDR)',
    campaign: 'PoroTomo 2016 Spring',
    location: 'Brady Hot Springs, Churchill County, Nevada',
    timeRange: `${filteredHourKeys[0]} to ${filteredHourKeys[filteredHourKeys.length - 1]}`,
    numTimesteps: filteredHourKeys.length,
    numWells: wells.length,
  },
};

const outputPath = resolve(projectRoot, 'public/data/brady.json');
writeFileSync(outputPath, JSON.stringify(output));
const fileSizeKB = Math.round(readFileSync(outputPath).length / 1024);
console.log(`\nWrote ${outputPath} (${fileSizeKB} KB)`);
console.log(`Dates: ${output.dates.length} hourly timesteps`);
console.log(`Wells: ${output.wells.length}`);
console.log('Done!');

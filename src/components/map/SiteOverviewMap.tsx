import { useAppState } from '../../context/AppStateContext';
import { wells } from '../../data';
import './SiteOverviewMap.css';

// Brady Hot Springs field boundary (elongated NNE-SSW along the fault)
// The field spans ~8km N-S along the Brady fault zone
const FIELD_BOUNDARY =
  'M 160,30 L 200,20 L 240,30 L 260,80 L 270,160 L 265,250 L 250,320 L 230,360 L 190,380 L 160,370 L 140,320 L 130,250 L 135,160 L 145,80 Z';

// Map well lat/lon to SVG coordinates (affine mapping for Brady area)
function wellToSvg(lat: number, lon: number): { x: number; y: number } {
  // Brady wells span approximately:
  // Lat: 39.747 (73-25, southernmost) to 39.811 (18B-31, northernmost)
  // Lon: -119.022 (82A-11, westernmost) to -119.000 (18B-31, easternmost)
  const latMin = 39.744;
  const latMax = 39.815;
  const lonMin = -119.025;
  const lonMax = -118.997;

  const x = 40 + ((lon - lonMin) / (lonMax - lonMin)) * 320;
  const y = 390 - ((lat - latMin) / (latMax - latMin)) * 380;
  return { x, y };
}

function wellColor(type: string, isSelected: boolean): string {
  if (isSelected) return 'var(--color-accent)';
  if (type === 'injection') return '#81c784';
  if (type === 'observation') return '#ffd54f';
  return '#4fc3f7'; // pumping
}

export default function SiteOverviewMap() {
  const { selectedWellId, setSelectedWellId } = useAppState();

  return (
    <svg className="site-map" viewBox="0 0 400 420" preserveAspectRatio="xMidYMid meet">
      {/* Geothermal field boundary */}
      <path
        d={FIELD_BOUNDARY}
        fill="rgba(255, 107, 53, 0.08)"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeDasharray="6 3"
      />
      <text x="295" y="200" textAnchor="middle" className="map-label-field">
        Brady
      </text>
      <text x="295" y="215" textAnchor="middle" className="map-label-field">
        Hot Springs
      </text>

      {/* Fault line (approximate NNE-SSW trend) */}
      <line x1={180} y1={15} x2={210} y2={395} stroke="rgba(255,100,100,0.3)" strokeWidth="2" strokeDasharray="8 4" />
      <text x={185} y={405} textAnchor="middle" style={{ fontSize: '9px', fill: 'rgba(255,100,100,0.5)' }}>
        Brady Fault
      </text>

      {/* Wells */}
      {wells.map((w) => {
        const { x, y } = wellToSvg(w.latitude, w.longitude);
        const isSelected = w.id === selectedWellId;
        return (
          <g key={w.id} onClick={() => setSelectedWellId(w.id)} style={{ cursor: 'pointer' }}>
            <circle
              cx={x}
              cy={y}
              r={isSelected ? 8 : 5}
              fill={wellColor(w.type, isSelected)}
              stroke={isSelected ? '#fff' : 'none'}
              strokeWidth={2}
              opacity={isSelected ? 1 : 0.8}
            />
            <text
              x={x + 10}
              y={y + 3}
              textAnchor="start"
              className={`map-label-well ${isSelected ? 'selected' : ''}`}
            >
              {w.name}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(10, 415)">
        <circle cx={8} cy={-6} r={4} fill="#4fc3f7" />
        <text x={16} y={-2} className="map-legend-text">Pumping</text>
        <circle cx={78} cy={-6} r={4} fill="#81c784" />
        <text x={86} y={-2} className="map-legend-text">Injection</text>
        <circle cx={158} cy={-6} r={4} fill="#ffd54f" />
        <text x={166} y={-2} className="map-legend-text">Observation</text>
      </g>

      {/* North arrow */}
      <g transform="translate(370, 30)">
        <line x1={0} y1={20} x2={0} y2={0} stroke="var(--color-text-secondary)" strokeWidth="1.5" />
        <polygon points="0,0 -4,8 4,8" fill="var(--color-text-secondary)" />
        <text x={0} y={-5} textAnchor="middle" className="map-legend-text">N</text>
      </g>
    </svg>
  );
}

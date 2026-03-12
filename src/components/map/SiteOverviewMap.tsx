import { useAppState } from '../../context/AppStateContext';
import { wells } from '../../data';
import './SiteOverviewMap.css';

// Simplified Salton Sea outline (approximate SVG coordinates in a 400x400 viewport)
const SALTON_SEA_PATH =
  'M 120,40 Q 80,100 70,180 Q 65,240 80,300 Q 100,350 140,370 Q 180,385 220,380 Q 280,370 310,330 Q 340,280 340,220 Q 335,150 310,100 Q 280,55 240,40 Q 180,25 120,40 Z';

// Geothermal field boundary (smaller polygon near south end)
const FIELD_BOUNDARY =
  'M 170,250 L 210,240 L 260,255 L 270,290 L 250,320 L 200,330 L 170,310 Z';

// Map well lat/lon to SVG coordinates (simple affine mapping)
function wellToSvg(lat: number, lon: number): { x: number; y: number } {
  const latMin = 33.175;
  const latMax = 33.235;
  const lonMin = -115.635;
  const lonMax = -115.565;

  const x = 150 + ((lon - lonMin) / (lonMax - lonMin)) * 140;
  const y = 340 - ((lat - latMin) / (latMax - latMin)) * 140;
  return { x, y };
}

export default function SiteOverviewMap() {
  const { selectedWellId, setSelectedWellId } = useAppState();

  return (
    <svg className="site-map" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
      {/* Water */}
      <path d={SALTON_SEA_PATH} fill="rgba(30, 80, 130, 0.4)" stroke="rgba(60, 140, 200, 0.5)" strokeWidth="1.5" />
      <text x="190" y="160" textAnchor="middle" className="map-label-water">
        Salton Sea
      </text>

      {/* Geothermal field */}
      <path
        d={FIELD_BOUNDARY}
        fill="rgba(255, 107, 53, 0.1)"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeDasharray="6 3"
      />
      <text x="220" y="275" textAnchor="middle" className="map-label-field">
        Geothermal Field
      </text>

      {/* Wells */}
      {wells.map((w) => {
        const { x, y } = wellToSvg(w.latitude, w.longitude);
        const isSelected = w.id === selectedWellId;
        const isInjection = w.type === 'injection';
        return (
          <g key={w.id} onClick={() => setSelectedWellId(w.id)} style={{ cursor: 'pointer' }}>
            <circle
              cx={x}
              cy={y}
              r={isSelected ? 8 : 5}
              fill={isSelected ? 'var(--color-accent)' : isInjection ? '#81c784' : '#4fc3f7'}
              stroke={isSelected ? '#fff' : 'none'}
              strokeWidth={2}
              opacity={isSelected ? 1 : 0.8}
            />
            <text
              x={x}
              y={y - (isSelected ? 12 : 9)}
              textAnchor="middle"
              className={`map-label-well ${isSelected ? 'selected' : ''}`}
            >
              {w.name}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(10, 360)">
        <circle cx={8} cy={0} r={4} fill="#4fc3f7" />
        <text x={16} y={4} className="map-legend-text">Production</text>
        <circle cx={90} cy={0} r={4} fill="#81c784" />
        <text x={98} y={4} className="map-legend-text">Injection</text>
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

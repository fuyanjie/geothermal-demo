import type { WellConfig } from '../../types/optimization';

interface WellOverlayProps {
  config: WellConfig;
  gridSize: number;
  displaySize: number;
}

export default function WellOverlay({ config, gridSize, displaySize }: WellOverlayProps) {
  const scale = displaySize / gridSize;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: displaySize,
        height: displaySize,
        pointerEvents: 'none',
      }}
    >
      {/* Production wells: red/orange markers */}
      {config.productionWells.map((w, i) => (
        <g key={`prod-${i}`}>
          <circle
            cx={w.x * scale + scale / 2}
            cy={w.y * scale + scale / 2}
            r={7}
            fill="none"
            stroke="#ff7043"
            strokeWidth={2}
          />
          <circle
            cx={w.x * scale + scale / 2}
            cy={w.y * scale + scale / 2}
            r={3}
            fill="#ff7043"
          />
          <text
            x={w.x * scale + scale / 2 + 10}
            y={w.y * scale + scale / 2 + 4}
            fill="#ff7043"
            fontSize={9}
            fontWeight={600}
          >
            P{i + 1}
          </text>
        </g>
      ))}

      {/* Injection wells: cyan/blue markers */}
      {config.injectionWells.map((w, i) => (
        <g key={`inj-${i}`}>
          <circle
            cx={w.x * scale + scale / 2}
            cy={w.y * scale + scale / 2}
            r={7}
            fill="none"
            stroke="#4fc3f7"
            strokeWidth={2}
          />
          <circle
            cx={w.x * scale + scale / 2}
            cy={w.y * scale + scale / 2}
            r={3}
            fill="#4fc3f7"
          />
          <text
            x={w.x * scale + scale / 2 + 10}
            y={w.y * scale + scale / 2 + 4}
            fill="#4fc3f7"
            fontSize={9}
            fontWeight={600}
          >
            I{i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

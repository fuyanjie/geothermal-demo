# Geothermal Demo System

An interactive web-based visualization platform for geothermal reservoir exploration, targeting the **Salton Sea geothermal field** in California. Built as a research demo for the ASU-KU collaboration.

## Features

### Tier 1: Data Explorer (Current)

- **Site Overview Map** — SVG-based 2D map of the Salton Sea with 7 clickable well locations (5 production, 2 injection)
- **3D Subsurface View** — Interactive voxel volume (20x20x10 grid) rendered with Three.js, showing color-mapped temperature or pressure fields with orbit controls
- **Time-Series Charts** — 2x2 panel of production rate, injection rate, temperature, and pressure curves (Recharts)
- **Interactive Controls** — Time slider (60 monthly steps, Jan 2019 – Dec 2023), well selector, and temperature/pressure field toggle

All panels are synchronized: selecting a well updates the map, charts, and 3D view; scrubbing the time slider updates the chart reference line and 3D voxel colors.

### Tier 2: Predictions (Planned)

AI-driven surrogate model for "what-if" forecasting of injection/production scenarios.

### Tier 3: Optimization (Planned)

Decision support with seismicity-aware injection schedule optimization.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| 3D Rendering | Three.js via @react-three/fiber + @react-three/drei |
| Charts | Recharts |
| Map | Pure SVG (no mapping library) |
| State | React Context |
| Data | Synthetic (generated in-browser, deterministic) |

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build
```

Open `http://localhost:5173` in your browser.

## Project Structure

```
src/
├── types/              # TypeScript interfaces (Well, TimeSeries, Subsurface)
├── data/               # Synthetic data generators + Salton Sea constants
│   ├── constants.ts    # Domain parameters (temp, pressure, depth ranges)
│   ├── wells.ts        # 7 well definitions with coordinates
│   ├── generateTimeSeries.ts      # Seeded PRNG time-series generator
│   └── generateSubsurfaceGrid.ts  # 3D voxel grid generator
├── context/            # React Context for shared dashboard state
├── components/
│   ├── layout/         # Sidebar, Header, DashboardLayout
│   ├── controls/       # TimeSlider, WellSelector, FieldToggle
│   ├── map/            # SVG site overview map
│   ├── charts/         # Recharts time-series panels (2x2 grid)
│   └── subsurface/     # Three.js 3D volume, well cylinders, depth axis
└── utils/              # Color scale, formatters
```

## Synthetic Data

The demo generates realistic data based on published Salton Sea geothermal parameters:

- **Temperature**: 300–370°C (one of the hottest geothermal fields globally)
- **Pressure**: 10–25 MPa (hydrostatic gradient)
- **Production/Injection rates**: 30–120 kg/s
- **Reservoir depth**: 1,000–3,000 m
- **Temporal trends**: Gradual thermal decline, pressure drawdown around production wells, cold-front spreading from injection wells

Data is generated deterministically via a seeded PRNG, ensuring consistent results across page loads. The data layer (`src/data/`) is modular and can be swapped for real data sources.

## Extending

To integrate real data, replace the generator functions in `src/data/` with API calls or file loaders that return the same type interfaces (`WellTimeSeries[]`, `SubsurfaceData`).

To enable Tier 2 or Tier 3, set `enabled: true` on the corresponding nav item in `src/components/layout/Sidebar.tsx` and add the page component.

## License

MIT

## Acknowledgments

ASU-KU Geothermal Research Collaboration

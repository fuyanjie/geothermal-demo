// Maps a scalar value to an RGB color using a thermal colormap (blue → cyan → green → yellow → red)
export function valueToColor(value: number, min: number, max: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // 5-stop thermal gradient
  let r: number, g: number, b: number;
  if (t < 0.25) {
    const s = t / 0.25;
    r = 0;
    g = s;
    b = 1;
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    r = 0;
    g = 1;
    b = 1 - s;
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    r = s;
    g = 1;
    b = 0;
  } else {
    const s = (t - 0.75) / 0.25;
    r = 1;
    g = 1 - s;
    b = 0;
  }

  return [r, g, b];
}

export function valueToCSS(value: number, min: number, max: number): string {
  const [r, g, b] = valueToColor(value, min, max);
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

/** Binary fracture field: 0 = dark rock, 1 = bright cyan fracture */
export function fractureToColor(value: number): [number, number, number] {
  if (value > 0.5) {
    return [0, 0.9, 1]; // cyan for fracture
  }
  return [0.08, 0.12, 0.18]; // dark gray for rock
}

/** Diverging error colormap: blue (negative) → white (zero) → red (positive) */
export function errorToColor(value: number, absMax: number): [number, number, number] {
  if (absMax === 0) return [1, 1, 1];
  const t = Math.max(-1, Math.min(1, value / absMax));
  if (t < 0) {
    const s = -t;
    return [1 - s * 0.7, 1 - s * 0.7, 1]; // white → blue
  } else {
    const s = t;
    return [1, 1 - s * 0.7, 1 - s * 0.7]; // white → red
  }
}

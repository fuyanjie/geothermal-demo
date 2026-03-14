import { useRef, useEffect } from 'react';

interface HeatmapCanvasProps {
  data: Float32Array | Uint8Array;
  gridSize: number;
  colorFn: (value: number) => [number, number, number];
  displaySize?: number;
}

export default function HeatmapCanvas({ data, gridSize, colorFn, displaySize = 240 }: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = gridSize;
    canvas.height = gridSize;

    const imageData = ctx.createImageData(gridSize, gridSize);
    const pixels = imageData.data;

    for (let i = 0; i < gridSize * gridSize; i++) {
      const [r, g, b] = colorFn(data[i]);
      const p = i * 4;
      pixels[p] = Math.round(r * 255);
      pixels[p + 1] = Math.round(g * 255);
      pixels[p + 2] = Math.round(b * 255);
      pixels[p + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [data, gridSize, colorFn]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: displaySize,
        height: displaySize,
        imageRendering: 'pixelated',
        borderRadius: '4px',
      }}
    />
  );
}

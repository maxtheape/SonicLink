import React, { useRef, useEffect, useState } from 'react';
import { interpolateColor } from '../services/audioUtils';

interface VisualizerCanvasProps {
  frequencyData: number[];
  decibels: number;
  colors: string[];
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ frequencyData, decibels, colors }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle Resizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Draw Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;

    // Ensure internal resolution matches display size for sharpness
    canvas.width = width;
    canvas.height = height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw background grid (fainter)
    ctx.strokeStyle = '#27272a'; // zinc-800
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Dynamic grid spacing based on size
    const gridSpace = Math.max(40, width / 20);
    
    for(let i=0; i<width; i+=gridSpace) { ctx.moveTo(i,0); ctx.lineTo(i,height); }
    for(let i=0; i<height; i+=gridSpace) { ctx.moveTo(0,i); ctx.lineTo(width,i); }
    ctx.stroke();

    if (!frequencyData || frequencyData.length === 0) return;

    // Drawing Bars
    const barWidth = (width / frequencyData.length) * 2.5; 
    let x = 0;
    const centerY = height / 2;

    for (let i = 0; i < frequencyData.length; i++) {
      const value = frequencyData[i];
      const percent = value / 255;
      const barHeight = (height * 0.8) * percent; 

      const color = interpolateColor(value, 0, 255, colors);
      
      ctx.fillStyle = color;
      
      // Mirrored visualizer
      ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);

      x += barWidth + 1; // +1 for gap
      if (x > width) break;
    }

    // Optional: Draw subtle Db text if needed, but usually redundant if meter is shown
    // ctx.fillStyle = 'rgba(255,255,255,0.05)';
    // ctx.font = `${Math.min(width, height) * 0.2}px Inter`;
    // ctx.textAlign = 'center';
    // ctx.textBaseline = 'middle';
    // ctx.fillText(`${Math.round(decibels)} dB`, width/2, height/2);

  }, [frequencyData, decibels, colors, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[200px]">
      <canvas 
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  );
};
export const calculateDecibels = (rms: number): number => {
  if (rms === 0) return 0;
  // Standard reference for dBFS usually puts 0dB at max volume, but for SPL-like metering:
  // We approximate. 20 * log10(rms). 
  // A standard web audio rms is 0.0 to 1.0. 
  // Let's normalize to a roughly 0-100 scale for UI visualization where -Infinity is 0.
  const db = 20 * Math.log10(rms);
  // Normalize for display: typical silence is around -100dB in digital, loud is 0dB.
  // We will shift it to show 0-100 positive range for the user.
  // display_db = Math.max(0, db + 100);
  return Math.max(0, db + 100); 
};

export const getHazardLevel = (db: number): 'LOW' | 'MEDIUM' | 'HIGH' => {
  if (db < 60) return 'LOW';
  if (db < 85) return 'MEDIUM';
  return 'HIGH';
};

// Helper to convert hex to rgb object
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

export const interpolateColor = (value: number, min: number, max: number, colors: string[]): string => {
  // If no colors provided, fallback to default
  const palette = colors.length > 0 ? colors : ['#22c55e', '#eab308', '#ef4444'];
  
  // Normalize value to 0-1 range
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // If we have N colors, we map 0..1 to segments between them
  const segmentCount = palette.length - 1;
  
  // If only one color, return it
  if (segmentCount <= 0) return palette[0];

  const scaledT = t * segmentCount;
  const index = Math.min(Math.floor(scaledT), segmentCount - 1);
  const segmentT = scaledT - index; // 0 to 1 within the specific segment

  const c1 = hexToRgb(palette[index]);
  const c2 = hexToRgb(palette[index + 1]);

  const r = Math.round(c1.r + (c2.r - c1.r) * segmentT);
  const g = Math.round(c1.g + (c2.g - c1.g) * segmentT);
  const b = Math.round(c1.b + (c2.b - c1.b) * segmentT);

  return `rgb(${r}, ${g}, ${b})`;
};
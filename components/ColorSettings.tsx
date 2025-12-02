import React from 'react';
import { Check, RotateCcw, Palette, X } from 'lucide-react';

export const PRESETS = [
  { name: 'Default', colors: ['#22c55e', '#eab308', '#ef4444'] }, // Green -> Yellow -> Red
  { name: 'Ocean', colors: ['#06b6d4', '#3b82f6', '#a855f7'] },   // Cyan -> Blue -> Purple
  { name: 'Sunset', colors: ['#f97316', '#ec4899', '#8b5cf6'] },  // Orange -> Pink -> Violet
  { name: 'Neon', colors: ['#a3e635', '#22d3ee', '#f472b6'] },    // Lime -> Cyan -> Pink
  { name: 'Matrix', colors: ['#14532d', '#22c55e', '#86efac'] },  // Dark Green -> Green -> Light Green
  { name: 'Fire', colors: ['#991b1b', '#ef4444', '#fbbf24'] },    // Dark Red -> Red -> Amber
];

interface ColorSettingsProps {
  currentColors: string[];
  onChange: (colors: string[]) => void;
  onClose: () => void;
}

export const ColorSettings: React.FC<ColorSettingsProps> = ({ currentColors, onChange, onClose }) => {
  const handleCustomColorChange = (index: number, value: string) => {
    const newColors = [...currentColors];
    newColors[index] = value;
    onChange(newColors);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-2xl w-full max-w-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Palette size={18} className="text-rose-500" />
          Color Scheme
        </h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-6">
        {/* Presets Grid */}
        <div>
          <label className="text-xs text-zinc-500 uppercase font-semibold mb-3 block">Presets</label>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => {
              const isActive = JSON.stringify(preset.colors) === JSON.stringify(currentColors);
              return (
                <button
                  key={preset.name}
                  onClick={() => onChange(preset.colors)}
                  className={`relative p-3 rounded-lg border text-left transition-all ${
                    isActive 
                      ? 'bg-zinc-800 border-rose-500 ring-1 ring-rose-500' 
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                      {preset.name}
                    </span>
                    {isActive && <Check size={14} className="text-rose-500" />}
                  </div>
                  <div 
                    className="h-2 w-full rounded-full" 
                    style={{
                      background: `linear-gradient(to right, ${preset.colors[0]}, ${preset.colors[1]}, ${preset.colors[2]})`
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Inputs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-zinc-500 uppercase font-semibold">Custom Palette</label>
            <button 
              onClick={() => onChange(PRESETS[0].colors)}
              className="text-[10px] text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={10} /> Reset
            </button>
          </div>
          <div className="flex gap-3">
            {currentColors.map((color, idx) => (
              <div key={idx} className="flex-1 flex flex-col gap-1">
                <div className="relative h-10 w-full rounded-lg overflow-hidden ring-1 ring-zinc-700">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleCustomColorChange(idx, e.target.value)}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                  />
                </div>
                <input 
                  type="text" 
                  value={color}
                  onChange={(e) => handleCustomColorChange(idx, e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-400 text-center font-mono focus:outline-none focus:border-zinc-600 uppercase"
                />
                <span className="text-[10px] text-zinc-600 text-center uppercase font-medium">
                  {idx === 0 ? 'Low' : idx === 1 ? 'Mid' : 'High'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Copy, Link, Check, Smartphone, Monitor } from 'lucide-react';

interface ConnectionPanelProps {
  peerId: string | null;
  onConnect?: (targetId: string) => void;
  mode: 'SOURCE' | 'DISPLAY';
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ peerId, onConnect, mode }) => {
  const [targetId, setTargetId] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl max-w-md w-full mx-auto mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 rounded-full ${mode === 'SOURCE' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
          {mode === 'SOURCE' ? <Smartphone size={24} /> : <Monitor size={24} />}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{mode === 'SOURCE' ? 'Audio Source' : 'Remote Display'}</h2>
          <p className="text-zinc-400 text-sm">{mode === 'SOURCE' ? 'Capture and broadcast audio' : 'Receive and visualize audio'}</p>
        </div>
      </div>

      {mode === 'SOURCE' && (
        <div className="space-y-4">
          <div className="bg-black/40 p-4 rounded-lg border border-zinc-800">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Your Device ID</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-lg font-mono text-emerald-400 truncate">
                {peerId || 'Generating...'}
              </code>
              <button 
                onClick={handleCopy}
                disabled={!peerId}
                className="p-2 hover:bg-zinc-700 rounded-md transition-colors text-zinc-400 hover:text-white"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 text-center">
            Enter this ID on the computer you want to use as a display.
          </p>
        </div>
      )}

      {mode === 'DISPLAY' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Enter Source Device ID</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="e.g. 5d92-a1b3..."
                className="flex-1 bg-black/40 border border-zinc-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 font-mono transition-colors"
              />
              <button 
                onClick={() => onConnect && onConnect(targetId)}
                disabled={!targetId}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Link size={18} />
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
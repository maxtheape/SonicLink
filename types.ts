export enum AppMode {
  LANDING = 'LANDING',
  SOURCE = 'SOURCE',
  DISPLAY = 'DISPLAY'
}

export interface AudioDataPacket {
  rms: number;      // Root Mean Square (Volume)
  decibels: number; // Calculated dB
  frequencyData: number[]; // FFT Array (simplified)
  peak: number;
  timestamp: number;
}

// Global declaration for PeerJS since we are loading from CDN
declare global {
  interface Window {
    Peer: any;
  }
}
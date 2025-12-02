import React, { useState, useEffect, useRef } from 'react';
import { AppMode, AudioDataPacket } from './types';
import { VisualizerCanvas } from './components/VisualizerCanvas';
import { ConnectionPanel } from './components/ConnectionPanel';
import { ColorSettings, PRESETS } from './components/ColorSettings';
import { calculateDecibels, getHazardLevel } from './services/audioUtils';
import { Activity, Radio, Mic, Monitor, ArrowLeft, Maximize2, Gauge, LayoutDashboard, Palette, Minimize2 } from 'lucide-react';

// Sample rate for sending data over network to avoid congestion
const NETWORK_TICK_RATE = 50; // ms

type ViewMode = 'COMBINED' | 'METER' | 'VISUALIZER';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [viewMode, setViewMode] = useState<ViewMode>('COMBINED');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Audio State
  const [decibels, setDecibels] = useState(0);
  const [frequencyData, setFrequencyData] = useState<number[]>(new Array(64).fill(0));

  // Appearance State
  const [colors, setColors] = useState<string[]>(PRESETS[0].colors);
  const [showColorSettings, setShowColorSettings] = useState(false);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const lastSentTimeRef = useRef<number>(0);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // --- Initialization & Cleanup ---

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      stopAudio();
      if (peerRef.current) peerRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAudio = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (sourceRef.current) sourceRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
  };

  const sendData = (type: string, payload: any) => {
    if (connRef.current && connRef.current.open) {
      // Also check the underlying RTCDataChannel state
      const dataChannel = connRef.current.dataChannel;
      if (dataChannel && dataChannel.readyState === 'open') {
        try {
          connRef.current.send({ type, payload });
        } catch (e) {
          console.warn("Failed to send data:", e);
        }
      }
    }
  };

  // --- Full Screen Logic ---
  const toggleFullScreen = async () => {
    if (!document.fullscreenElement && dashboardRef.current) {
      try {
        await dashboardRef.current.requestFullscreen();
      } catch (err) {
        console.error("Error attempting to enable full-screen mode:", err);
      }
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  // --- PeerJS Setup ---

  const initializePeer = (newMode: AppMode) => {
    const peer = new window.Peer(null, {
      debug: 1,
    });

    peer.on('open', (id: string) => {
      console.log('My peer ID is: ' + id);
      setPeerId(id);
    });

    peer.on('connection', (conn: any) => {
      if (newMode === AppMode.SOURCE) {
        console.log('Incoming connection from display...');
        // Clean up existing connection if present
        if (connRef.current) {
          connRef.current.close();
        }
        connRef.current = conn;
        setConnectionStatus('connected');
        
        conn.on('close', () => setConnectionStatus('disconnected'));
        conn.on('error', () => setConnectionStatus('disconnected'));
      }
    });

    peer.on('error', (err: any) => {
      console.error(err);
      alert("Connection error: " + err.type);
    });

    peerRef.current = peer;
  };

  const connectToSource = (targetId: string) => {
    if (!peerRef.current) return;
    setConnectionStatus('connecting');
    
    // Clean up existing connection
    if (connRef.current) {
      connRef.current.close();
    }

    const conn = peerRef.current.connect(targetId);
    connRef.current = conn;

    conn.on('open', () => {
      console.log("Connected to source!");
      setConnectionStatus('connected');
    });

    conn.on('data', (data: any) => {
      // Handle incoming data packets
      if (data.type === 'AUDIO_DATA') {
        const packet = data.payload as AudioDataPacket;
        setDecibels(packet.decibels);
        setFrequencyData(packet.frequencyData);
      }
    });

    conn.on('close', () => {
      setConnectionStatus('disconnected');
      setDecibels(0);
      setFrequencyData(new Array(64).fill(0));
      alert("Source disconnected");
    });

    conn.on('error', (err: any) => {
      console.error("Connection error", err);
      setConnectionStatus('disconnected');
    });
  };

  // --- Audio Logic (Source Only) ---

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128; // Smaller FFT for network performance
      analyser.smoothingTimeConstant = 0.8;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      processAudioLoop();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const processAudioLoop = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const timeData = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(timeData);
    
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const value = (timeData[i] - 128) / 128; // Normalize -1 to 1
      sum += value * value;
    }
    const rms = Math.sqrt(sum / bufferLength);
    const db = calculateDecibels(rms);

    // Update Local State
    setDecibels(db);
    const freqArray = Array.from(dataArray);
    setFrequencyData(freqArray);

    // Network Broadcast
    const now = Date.now();
    if (now - lastSentTimeRef.current > NETWORK_TICK_RATE) {
      const packet: AudioDataPacket = {
        rms,
        decibels: db,
        frequencyData: freqArray,
        peak: Math.max(...freqArray),
        timestamp: now
      };
      sendData('AUDIO_DATA', packet);
      lastSentTimeRef.current = now;
    }

    animationFrameRef.current = requestAnimationFrame(processAudioLoop);
  };

  // --- Mode Switching ---

  const enterSourceMode = () => {
    setMode(AppMode.SOURCE);
    initializePeer(AppMode.SOURCE);
    startAudioCapture();
  };

  const enterDisplayMode = () => {
    setMode(AppMode.DISPLAY);
    initializePeer(AppMode.DISPLAY);
  };

  const goBack = () => {
    setMode(AppMode.LANDING);
    stopAudio();
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setPeerId(null);
    setConnectionStatus('disconnected');
    setDecibels(0);
    setFrequencyData([]);
  };

  // --- Renders ---

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-zinc-950 text-white relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600 rounded-full blur-[100px]"></div>
      </div>

      <div className="z-10 text-center space-y-8 max-w-2xl">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Activity className="text-rose-500 w-10 h-10" />
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-rose-400 to-orange-500 bg-clip-text text-transparent">
              SonicLink
            </h1>
          </div>
          <p className="text-zinc-400 text-lg">
            Real-time acoustic analysis and remote visualization.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 w-full">
          <button 
            onClick={enterSourceMode}
            className="group relative p-8 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 transition-all hover:scale-[1.02] flex flex-col items-center gap-4 text-center"
          >
            <div className="p-4 rounded-full bg-zinc-800 group-hover:bg-rose-500/20 text-rose-500 transition-colors">
              <Mic size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Start as Source</h3>
              <p className="text-sm text-zinc-500">Use this device's microphone to capture audio.</p>
            </div>
          </button>

          <button 
            onClick={enterDisplayMode}
            className="group relative p-8 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all hover:scale-[1.02] flex flex-col items-center gap-4 text-center"
          >
            <div className="p-4 rounded-full bg-zinc-800 group-hover:bg-blue-500/20 text-blue-500 transition-colors">
              <Monitor size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Start as Display</h3>
              <p className="text-sm text-zinc-500">View visualization from another device.</p>
            </div>
          </button>
        </div>

        <div className="pt-8 flex items-center justify-center gap-2 text-zinc-600 text-sm">
          <Radio size={16} />
          <span>Powered by WebRTC</span>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const hazard = getHazardLevel(decibels);
    const hazardColor = hazard === 'HIGH' ? 'text-red-500' : hazard === 'MEDIUM' ? 'text-yellow-500' : 'text-emerald-500';

    return (
      <div 
        ref={dashboardRef}
        className={`bg-zinc-950 text-white flex flex-col transition-all duration-300 ${isFullScreen ? 'h-screen w-screen cursor-pointer' : 'min-h-screen'}`}
        onClick={() => isFullScreen && toggleFullScreen()}
      >
        {/* Header Bar - Hidden in Full Screen */}
        {!isFullScreen && (
          <header className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950 sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <button 
                onClick={goBack} 
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
                title="Go Back"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="hidden md:block">
                <h1 className="font-bold text-lg tracking-tight">SonicLink</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button 
                onClick={() => setViewMode('METER')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'METER' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Noise Meter Only"
              >
                <Gauge size={18} />
              </button>
              <button 
                onClick={() => setViewMode('COMBINED')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'COMBINED' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Combined View"
              >
                <LayoutDashboard size={18} />
              </button>
              <button 
                onClick={() => setViewMode('VISUALIZER')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'VISUALIZER' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Visualizer Only"
              >
                <Maximize2 size={18} />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
               <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${connectionStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
                {connectionStatus === 'connected' ? 'Linked' : 'Offline'}
              </div>
              
              <button 
                onClick={toggleFullScreen}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
                title="Full Screen"
              >
                <Maximize2 size={20} />
              </button>

              <button 
                onClick={() => setShowColorSettings(true)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm transition-colors"
              >
                <Palette size={16} className="text-rose-500" />
                <span className="hidden sm:inline">Colors</span>
              </button>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className={`flex-1 flex flex-col ${isFullScreen ? 'p-0' : 'p-4 md:p-6'} overflow-hidden`}>
          
          {/* Connection Panel - Hidden in Full Screen */}
          {connectionStatus !== 'connected' && !isFullScreen && (
            <div className="p-4 flex justify-center">
              <ConnectionPanel peerId={peerId} onConnect={connectToSource} mode={mode} />
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden h-full">
            
            {/* VIEW: METER ONLY */}
            {viewMode === 'METER' && (
               <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                  <div className="text-center space-y-4">
                     <h2 className={`text-zinc-500 uppercase tracking-[0.2em] font-medium ${isFullScreen ? 'text-xl' : 'text-base'}`}>Current Noise Level</h2>
                     <div className={`${isFullScreen ? 'text-[25vh]' : 'text-[12rem]'} leading-none font-black tabular-nums tracking-tighter ${hazardColor}`}>
                        {Math.round(decibels)}
                     </div>
                     <div className={`${isFullScreen ? 'text-6xl' : 'text-4xl'} font-bold text-zinc-600`}>DECIBELS</div>
                     {!isFullScreen && (
                       <div className={`inline-block px-6 py-2 rounded-xl text-xl font-bold bg-zinc-900 border border-zinc-800 mt-8 ${hazardColor}`}>
                          {hazard} HAZARD
                       </div>
                     )}
                  </div>
               </div>
            )}

            {/* VIEW: VISUALIZER ONLY */}
            {viewMode === 'VISUALIZER' && (
              <div className={`flex-1 relative bg-zinc-900 overflow-hidden ${isFullScreen ? '' : 'rounded-3xl border border-zinc-800 shadow-2xl'} animate-in fade-in zoom-in duration-300`}>
                <VisualizerCanvas frequencyData={frequencyData} decibels={decibels} colors={colors} />
              </div>
            )}

            {/* VIEW: COMBINED */}
            {viewMode === 'COMBINED' && (
              <div className={`flex-1 h-full w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ${isFullScreen ? 'flex flex-row' : 'grid lg:grid-cols-12 gap-6'}`}>
                 
                 {/* Left Column: Meter */}
                 <div className={`${isFullScreen ? 'w-[35%] border-r border-zinc-900' : 'lg:col-span-4'} flex flex-col gap-6`}>
                    <div className={`flex-1 bg-zinc-900 flex flex-col items-center justify-center text-center relative overflow-hidden ${isFullScreen ? '' : 'rounded-3xl p-8 border border-zinc-800 shadow-xl'}`}>
                        {!isFullScreen && (
                           <div className="absolute top-0 right-0 p-8 opacity-5">
                             <Activity size={200} />
                           </div>
                        )}
                        <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-4">Noise Level</h3>
                        <div className={`${isFullScreen ? 'text-[15vw]' : 'text-9xl'} font-black tabular-nums tracking-tighter mb-2 leading-none ${hazardColor}`}>
                          {Math.round(decibels)}
                        </div>
                        <span className="text-2xl font-bold text-zinc-600">dB</span>
                        <div className={`mt-8 px-4 py-1.5 rounded-lg text-sm font-bold bg-zinc-950 border border-zinc-800 ${hazardColor}`}>
                          {hazard} HAZARD
                        </div>
                    </div>
                 </div>

                 {/* Right Column: Visualizer */}
                 <div className={`${isFullScreen ? 'w-[65%]' : 'lg:col-span-8 rounded-3xl border border-zinc-800 shadow-xl'} bg-zinc-900 overflow-hidden relative min-h-[300px]`}>
                    <VisualizerCanvas frequencyData={frequencyData} decibels={decibels} colors={colors} />
                 </div>
              </div>
            )}
          </div>

          {/* Color Settings Modal - Hidden in Full Screen */}
          {showColorSettings && !isFullScreen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div onClick={(e) => e.stopPropagation()}>
                <ColorSettings 
                  currentColors={colors} 
                  onChange={setColors} 
                  onClose={() => setShowColorSettings(false)}
                />
              </div>
            </div>
          )}

        </main>
      </div>
    );
  };

  return (
    <>
      {mode === AppMode.LANDING && renderLanding()}
      {(mode === AppMode.SOURCE || mode === AppMode.DISPLAY) && renderDashboard()}
    </>
  );
}

export default App;
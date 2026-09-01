import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Wifi, 
  Volume2, 
  VolumeX, 
  Settings, 
  History, 
  ListTodo, 
  Maximize2, 
  Minimize2, 
  ShieldCheck, 
  Zap, 
  Thermometer, 
  Radio, 
  Clock,
  Sparkles
} from 'lucide-react';
import { AssistantState, SystemTelemetry } from '../types';

interface HudTelemetryProps {
  state: AssistantState;
  telemetry: SystemTelemetry;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenTasks: () => void;
  density?: 'minimal' | 'balanced' | 'cyberpunk';
}

export const HudTelemetry: React.FC<HudTelemetryProps> = ({
  state,
  telemetry,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  onOpenHistory,
  onOpenTasks,
  density = 'balanced',
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
      setDateStr(now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isMinimal = density === 'minimal';
  const isCyberpunk = density === 'cyberpunk';

  return (
    <>
      {/* TOP HUD HEADER BAR */}
      <header className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between border-b border-cyan-500/20 bg-[#02040a]/85 backdrop-blur-md relative z-30">
        {/* Stark Industries / JARVIS Identity */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-sm border border-cyan-400/60 bg-cyan-950/60 flex items-center justify-center text-cyan-300 font-orbitron font-extrabold text-[10px] sm:text-xs glow-cyan-box">
            ST
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-orbitron text-xs sm:text-sm font-bold tracking-widest text-cyan-100">
              <span>STARK INDUSTRIES</span>
              <span className="hidden sm:inline text-cyan-500/60">//</span>
              <span className="hidden sm:inline text-cyan-400 font-mono-tech text-xs">J.A.R.V.I.S. OS v4.8</span>
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono-tech text-cyan-400/70 tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ARC REACTOR MK-LXXXV</span>
              <span className="text-orange-400 text-[9px] font-mono-tech hidden sm:inline">[ ACCESS: STARK-OMEGA ]</span>
              {telemetry.demoMode && (
                <span className="text-amber-400 bg-amber-950/40 px-1 rounded border border-amber-500/30">
                  DEMO MODE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center Live Atomic Clock */}
        <div className="hidden md:flex flex-col items-center">
          <div className="font-mono-tech text-sm sm:text-base font-bold tracking-widest text-cyan-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{timeStr || '00:00:00'}</span>
          </div>
          <div className="text-[9px] font-mono-tech text-cyan-500/80 tracking-wider">
            {dateStr} // MALIBU UTC-8 SYNC
          </div>
        </div>

        {/* Right Action Icons & Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Stark Task Protocol Button */}
          <button
            onClick={onOpenTasks}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded bg-[#02040a]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer"
            title="Stark Task Protocols"
          >
            <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">TASKS</span>
          </button>

          {/* Mission Logs / Conversation History Button */}
          <button
            onClick={onOpenHistory}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded bg-[#02040a]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer"
            title="Mission Logs & History"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">LOGS</span>
          </button>

          {/* Sound FX Toggle Button */}
          <button
            onClick={onToggleSound}
            className="p-1.5 rounded bg-[#02040a]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all cursor-pointer"
            title={soundEnabled ? 'Disable Audio FX' : 'Enable Audio FX'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded bg-[#02040a]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all cursor-pointer"
            title="Tactical Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden lg:block p-1.5 rounded bg-[#02040a]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* DESKTOP FLANK HUD TELEMETRY CARDS (Positioned left & right of reactor on large screens) */}
      {!isMinimal && (
        <>
          {/* Left Flank: Core Reactor Power & Containment Diagnostics */}
          <div className="hidden xl:flex flex-col gap-2.5 fixed left-6 top-24 w-56 z-20 pointer-events-none">
            {/* Core Output Card */}
            <div className="hud-panel p-2.5 rounded border border-cyan-500/20 text-xs">
              <div className="flex items-center justify-between text-[10px] font-mono-tech text-cyan-400/80 mb-1">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-cyan-400" /> CORE OUTPUT
                </span>
                <span className="text-emerald-400">99.4% EFF</span>
              </div>
              <div className="text-sm font-orbitron font-bold text-cyan-200">
                {telemetry.coreOutputGW} GW <span className="text-[10px] font-mono-tech text-cyan-400/60 font-normal">CLEAN FUSION</span>
              </div>
              {/* Micro graph bars */}
              <div className="mt-1.5 flex gap-1 h-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-xs ${
                      i < 7 ? 'bg-cyan-400' : 'bg-cyan-900'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Thermal Dynamics Card */}
            <div className="hud-panel p-2.5 rounded border border-cyan-500/20 text-xs">
              <div className="flex items-center justify-between text-[10px] font-mono-tech text-cyan-400/80 mb-1">
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-cyan-400" /> THERMAL LEVEL
                </span>
                <span className="text-cyan-300">STABLE</span>
              </div>
              <div className="text-sm font-orbitron font-bold text-cyan-200">
                {telemetry.coreTempKelvin} K <span className="text-[10px] font-mono-tech text-cyan-400/60 font-normal">CONTAINMENT OK</span>
              </div>
            </div>

            {/* Subsystem Status Indicators */}
            {isCyberpunk && (
              <div className="hud-panel p-2.5 rounded border border-cyan-500/20 text-[10px] font-mono-tech space-y-1">
                <div className="text-cyan-400/60 uppercase">SUBSYSTEM STATUS</div>
                <div className="flex items-center justify-between text-cyan-300">
                  <span>MAGNETIC SHIELD</span>
                  <span className="text-emerald-400">ONLINE</span>
                </div>
                <div className="flex items-center justify-between text-cyan-300">
                  <span>NEURAL CORE MATRIX</span>
                  <span className="text-emerald-400">98.2%</span>
                </div>
                <div className="flex items-center justify-between text-cyan-300">
                  <span>VOX INTERFACE</span>
                  <span className="text-cyan-400">READY</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Flank: Security, Network & Intelligence */}
          <div className="hidden xl:flex flex-col gap-2.5 fixed right-6 top-24 w-56 z-20 pointer-events-none">
            {/* Global Network Card */}
            <div className="hud-panel p-2.5 rounded border border-cyan-500/20 text-xs">
              <div className="flex items-center justify-between text-[10px] font-mono-tech text-cyan-400/80 mb-1">
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-cyan-400" /> NETWORK
                </span>
                <span className="text-emerald-400">CONNECTED</span>
              </div>
              <div className="text-xs font-mono-tech text-cyan-200 truncate">
                STARK SATELLITE // 10 Gbps
              </div>
            </div>

            {/* AI Core Intelligence */}
            <div className="hud-panel p-2.5 rounded border border-cyan-500/20 text-xs">
              <div className="flex items-center justify-between text-[10px] font-mono-tech text-cyan-400/80 mb-1">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> AI REASONING
                </span>
                <span className="text-cyan-300">READY</span>
              </div>
              <div className="text-xs font-orbitron font-bold text-cyan-200 truncate">
                {telemetry.activeModel}
              </div>
            </div>

            {/* Protocol Security Card */}
            {isCyberpunk && (
              <div className="hud-panel p-2.5 rounded border border-cyan-500/20 text-[10px] font-mono-tech space-y-1">
                <div className="text-cyan-400/60 uppercase">ACTIVE PROTOCOLS</div>
                <div className="text-cyan-300 flex items-center justify-between">
                  <span>HOUSE PARTY PROTOCOL</span>
                  <span className="text-slate-500">STANDBY</span>
                </div>
                <div className="text-cyan-300 flex items-center justify-between">
                  <span>BARN DOOR SECURITY</span>
                  <span className="text-emerald-400">ACTIVE</span>
                </div>
                <div className="text-cyan-300 flex items-center justify-between">
                  <span>CLEAN ENERGY GRID</span>
                  <span className="text-emerald-400">ROUTED</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

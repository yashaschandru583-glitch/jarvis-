import React, { useState } from 'react';
import { 
  Wifi, 
  Heart, 
  ChevronRight, 
  X,
  Plus
} from 'lucide-react';

interface JarvisRightColumnProps {
  onOpenRunningApps: () => void;
  onOpenSystemInfo: () => void;
}

export const JarvisRightColumn: React.FC<JarvisRightColumnProps> = ({
  onOpenRunningApps,
  onOpenSystemInfo,
}) => {
  // Visibility states for collapsible cards
  const [cardsVisible, setCardsVisible] = useState({
    networkStatus: true,
    systemHealth: true,
    activeApps: true,
    powerOutput: true,
  });

  const toggleCard = (card: keyof typeof cardsVisible) => {
    setCardsVisible((prev) => ({ ...prev, [card]: !prev[card] }));
  };

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 w-full max-w-[340px] text-cyan-300 font-mono-tech select-none">
      {/* 1. NETWORK STATUS CARD */}
      {cardsVisible.networkStatus && (
        <div className="relative p-3 rounded bg-[#030914]/85 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.05)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-cyan-500/20">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-cyan-300 uppercase">
              NETWORK STATUS
            </span>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-cyan-400 animate-pulse" />
              <button
                onClick={() => toggleCard('networkStatus')}
                className="text-cyan-500/60 hover:text-cyan-300 p-0.5 transition-colors cursor-pointer"
                title="Dismiss Card"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metric Rows */}
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/70">LATENCY</span>
              <span className="font-bold text-cyan-200">12 ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/70">DOWNLOAD</span>
              <span className="font-bold text-cyan-200">124.6 Mbps</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/70">UPLOAD</span>
              <span className="font-bold text-cyan-200">48.3 Mbps</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-cyan-500/15">
              <span className="text-cyan-400/70">IP ADDRESS</span>
              <span className="font-bold text-cyan-200 tracking-wider">192.168.1.12</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. SYSTEM HEALTH CARD */}
      {cardsVisible.systemHealth && (
        <div className="relative p-3 rounded bg-[#030914]/85 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.05)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-cyan-500/20">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-cyan-300 uppercase">
              SYSTEM HEALTH
            </span>
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-400/80 animate-pulse" />
              <button
                onClick={() => toggleCard('systemHealth')}
                className="text-cyan-500/60 hover:text-cyan-300 p-0.5 transition-colors cursor-pointer"
                title="Dismiss Card"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Health Rows */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/70">AI CORE</span>
              <span className="font-bold text-emerald-400 tracking-wider">OPTIMAL</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/70">DATABASE</span>
              <span className="font-bold text-emerald-400 tracking-wider">ONLINE</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/70">VOICE SYS</span>
              <span className="font-bold text-emerald-400 tracking-wider">ONLINE</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/70">SECURITY</span>
              <span className="font-bold text-emerald-400 tracking-wider">ACTIVE</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/70">GPU</span>
              <span className="font-bold text-emerald-400 tracking-wider">NORMAL</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. ACTIVE APPS CARD */}
      {cardsVisible.activeApps && (
        <div className="relative p-3 rounded bg-[#030914]/85 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.05)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-cyan-300 uppercase">
              ACTIVE APPS
            </span>
            <button
              onClick={() => toggleCard('activeApps')}
              className="text-cyan-500/60 hover:text-cyan-300 p-0.5 transition-colors cursor-pointer"
              title="Dismiss Card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* App List */}
          <div className="space-y-2 text-[11px]">
            {/* Chrome */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="#ffffff" />
                  <circle cx="12" cy="12" r="4.5" fill="#4285f4" />
                  <path d="M12 2a10 10 0 0 1 8.66 5H12z" fill="#ea4335" />
                  <path d="M20.66 7A10 10 0 0 1 12 22l4.33-7.5z" fill="#fbbc05" />
                  <path d="M12 22A10 10 0 0 1 3.34 7H12z" fill="#34a853" />
                  <circle cx="12" cy="12" r="4" fill="#ffffff" />
                  <circle cx="12" cy="12" r="3" fill="#1a73e8" />
                </svg>
                <span className="text-cyan-200">Google Chrome</span>
              </div>
              <span className="font-bold text-emerald-400 text-[10px] tracking-wider">RUNNING</span>
            </div>

            {/* VS Code */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M17.5 2L7 11.5L2 7.5L0 9L6 14L0 19L2 20.5L7 16.5L17.5 26L24 23V5L17.5 2Z" fill="#007ACC" />
                  <path d="M17.5 2L7 11.5L17.5 21V2Z" fill="#1F9CF0" />
                </svg>
                <span className="text-cyan-200">VS Code</span>
              </div>
              <span className="font-bold text-emerald-400 text-[10px] tracking-wider">RUNNING</span>
            </div>

            {/* Spotify */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1DB954">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M7 9c3.5-1 7.5-.7 10.5.8" stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <path d="M7.5 12c3-.8 6.5-.5 9 .7" stroke="#000" strokeWidth="1.3" strokeLinecap="round" fill="none" />
                  <path d="M8 15c2.3-.6 5-.4 7 .5" stroke="#000" strokeWidth="1.1" strokeLinecap="round" fill="none" />
                </svg>
                <span className="text-cyan-200">Spotify</span>
              </div>
              <span className="font-bold text-emerald-400 text-[10px] tracking-wider">RUNNING</span>
            </div>

            {/* Notepad */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                  <rect x="4" y="3" width="16" height="18" rx="2" fill="#0369a1" />
                  <line x1="8" y1="8" x2="16" y2="8" stroke="#e0f2fe" />
                  <line x1="8" y1="12" x2="16" y2="12" stroke="#e0f2fe" />
                  <line x1="8" y1="16" x2="13" y2="16" stroke="#e0f2fe" />
                </svg>
                <span className="text-cyan-200">Notepad</span>
              </div>
              <span className="font-bold text-emerald-400 text-[10px] tracking-wider">RUNNING</span>
            </div>

            {/* More Button */}
            <button
              onClick={onOpenRunningApps}
              className="text-[10px] text-cyan-400/80 hover:text-cyan-200 pt-1 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>+ 3 MORE</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. POWER OUTPUT CARD */}
      {cardsVisible.powerOutput && (
        <div className="relative p-3 rounded bg-[#030914]/85 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.05)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-cyan-300 uppercase">
              POWER OUTPUT
            </span>
            <button
              onClick={onOpenSystemInfo}
              className="text-cyan-500/60 hover:text-cyan-300 p-0.5 transition-colors cursor-pointer"
              title="View Telemetry"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Gauge & Metrics Row */}
          <div className="flex items-center justify-between gap-3">
            {/* Circular Tachometer Dial Gauge */}
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Outer Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(0, 240, 255, 0.2)"
                  strokeWidth="3"
                />
                {/* Active Arc (approx 270 degrees) */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="4"
                  strokeDasharray="210 264"
                  strokeDashoffset="-25"
                  strokeLinecap="round"
                  filter="drop-shadow(0 0 4px #00f0ff)"
                />
                {/* Gauge needle pointer pointing to ~98% */}
                <line
                  x1="50"
                  y1="50"
                  x2="72"
                  y2="30"
                  stroke="#fb7185"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Center needle hub */}
                <circle cx="50" cy="50" r="4" fill="#ffffff" />
                <circle cx="50" cy="50" r="2" fill="#0f172a" />
              </svg>
            </div>

            {/* Value & Stability text */}
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-mono-tech text-cyan-200 tracking-wider">
                98%
              </span>
              <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">
                STABLE
              </span>
            </div>

            {/* Live Sparkline Graph */}
            <div className="flex-1 h-10 flex items-end">
              <svg viewBox="0 0 100 40" className="w-full h-full">
                <defs>
                  <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 35 Q 15 32 30 36 T 60 30 T 80 26 L 100 32 L 100 40 L 0 40 Z"
                  fill="url(#sparkGrad)"
                />
                <path
                  d="M 0 35 Q 15 32 30 36 T 60 30 T 80 26 L 100 32"
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="1.8"
                />
                <circle cx="100" cy="32" r="2" fill="#ffffff" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

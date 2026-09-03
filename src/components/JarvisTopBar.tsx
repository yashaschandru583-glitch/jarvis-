import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface JarvisTopBarProps {
  onOpenSettings?: () => void;
}

export const JarvisTopBar: React.FC<JarvisTopBarProps> = ({ onOpenSettings }) => {
  const [timeStr, setTimeStr] = useState('10:01:13 PM');
  const [dateStr, setDateStr] = useState('SATURDAY, JUNE 01, 2024');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now
          .toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: '2-digit',
            year: 'numeric',
          })
          .toUpperCase()
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 z-30 select-none relative border-b border-cyan-500/25 bg-[#02050e]/90 backdrop-blur-md">
      {/* Top Border Technical Corner Accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />

      {/* LEFT SECTION: < JARVIS OS > v7.2.1 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-mono-tech tracking-wider text-cyan-400 hover:text-cyan-200 transition-colors group cursor-pointer"
          title="System Core Configuration"
        >
          <span className="text-cyan-500 group-hover:-translate-x-0.5 transition-transform">&lt;</span>
          <span className="font-bold tracking-widest text-cyan-300">JARVIS OS</span>
          <span className="text-cyan-500 group-hover:translate-x-0.5 transition-transform">&gt;</span>
          <span className="text-[11px] text-cyan-500/80 tracking-normal ml-1">v7.2.1</span>
        </button>
      </div>

      {/* CENTER SECTION: JARVIS / AI SYSTEM ONLINE WITH GRAPHIC WINGS */}
      <div className="flex items-center gap-2 sm:gap-6">
        {/* Left Tech Wing */}
        <div className="hidden md:flex items-center gap-1 opacity-70">
          <div className="w-8 lg:w-16 h-[1px] bg-cyan-500/50" />
          <div className="w-2 h-2 border-t border-l border-cyan-400 -rotate-45" />
          <div className="w-12 lg:w-20 h-[1.5px] bg-cyan-400/80" />
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>

        {/* Center Title Display */}
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="font-orbitron font-black text-sm sm:text-base lg:text-lg tracking-[0.25em] text-cyan-300 drop-shadow-[0_0_12px_rgba(0,240,255,0.7)] uppercase">
            JARVIS
          </h1>
          <span className="text-[9px] sm:text-[10px] font-mono-tech tracking-[0.3em] text-cyan-400/80 uppercase mt-0.5">
            AI SYSTEM ONLINE
          </span>
        </div>

        {/* Right Tech Wing */}
        <div className="hidden md:flex items-center gap-1 opacity-70">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <div className="w-12 lg:w-20 h-[1.5px] bg-cyan-400/80" />
          <div className="w-2 h-2 border-b border-r border-cyan-400 -rotate-45" />
          <div className="w-8 lg:w-16 h-[1px] bg-cyan-500/50" />
        </div>
      </div>

      {/* RIGHT SECTION: CLOCK & DATE */}
      <div className="flex items-center gap-2 sm:gap-3 text-right">
        <div className="flex flex-col items-end">
          <span className="text-xs sm:text-sm font-mono-tech font-bold text-cyan-200 tracking-wider">
            {timeStr}
          </span>
          <span className="text-[9px] sm:text-[10px] font-mono-tech text-cyan-400/70 tracking-tight sm:tracking-normal">
            {dateStr}
          </span>
        </div>
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-cyan-400/60 flex items-center justify-center bg-cyan-950/40 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.3)]">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
        </div>
      </div>
    </header>
  );
};

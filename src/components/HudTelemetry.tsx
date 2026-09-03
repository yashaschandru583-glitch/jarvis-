import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Settings, 
  History, 
  ListTodo, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Clock,
  Cpu,
  Monitor,
  Terminal
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
  onOpenSystemInfo: () => void;
  onOpenDesktopAgent?: () => void;
  onOpenRunningApps?: () => void;
  desktopConnected?: boolean;
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
  onOpenSystemInfo,
  onOpenDesktopAgent,
  onOpenRunningApps,
  desktopConnected = false,
  density = 'balanced',
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
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

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-cyan-500/20 bg-[#02050c]/85 backdrop-blur-md relative z-30 select-none">
      {/* =========================================================================
          TOP LEFT (Section 9)
          JARVIS
          small subtitle: PERSONAL AI SYSTEM
      ========================================================================== */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded border border-cyan-400/60 bg-cyan-950/60 flex items-center justify-center text-cyan-300 font-orbitron font-extrabold text-xs shadow-[0_0_12px_rgba(0,240,255,0.4)]">
          <Cpu className="w-4 h-4 text-cyan-300" />
        </div>
        <div>
          <div className="font-orbitron text-sm sm:text-base font-extrabold tracking-[0.2em] text-cyan-100 glow-cyan leading-none">
            JARVIS
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono-tech text-cyan-400/75 tracking-[0.18em] leading-tight mt-0.5">
            PERSONAL AI SYSTEM
          </div>
        </div>
      </div>

      {/* Center Micro Clock Indicator */}
      <div className="hidden md:flex items-center gap-2 text-xs font-mono-tech text-cyan-400/80">
        <Clock className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-bold text-cyan-200 tracking-widest">{timeStr || '00:00:00'}</span>
        <span className="text-cyan-600/60">//</span>
        <span className="text-cyan-500/80 text-[10px]">MARK LXXXV</span>
      </div>

      {/* =========================================================================
          TOP RIGHT ICONS (Section 9)
          History, Tasks, System information, Settings, Sound FX
          Use futuristic line icons. No large navigation bars.
      ========================================================================== */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Desktop Agent Status & Bridge */}
        {onOpenDesktopAgent && (
          <button
            onClick={onOpenDesktopAgent}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded border transition-all text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer ${
              desktopConnected
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:border-emerald-400'
                : 'bg-[#02050e]/90 border-cyan-500/30 text-cyan-400/70 hover:border-cyan-400/80 hover:text-cyan-300'
            }`}
            title="Local Desktop Control Bridge (127.0.0.1:39281)"
            aria-label="Desktop Agent Bridge"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${desktopConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              AGENT
            </span>
          </button>
        )}

        {/* Running Applications Monitor */}
        {onOpenRunningApps && (
          <button
            onClick={onOpenRunningApps}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded bg-[#02050e]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer"
            title="Monitored OS Applications"
            aria-label="Running Applications"
          >
            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline text-[11px]">APPS</span>
          </button>
        )}

        {/* Protocol Tasks */}
        <button
          onClick={onOpenTasks}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded bg-[#02050e]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer"
          title="Stark Task Protocols"
          aria-label="Tasks"
        >
          <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline text-[11px]">PROTOCOLS</span>
        </button>

        {/* History / Logs */}
        <button
          onClick={onOpenHistory}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded bg-[#02050e]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer"
          title="Conversation Logs"
          aria-label="History"
        >
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline text-[11px]">LOGS</span>
        </button>

        {/* System Information (Diagnostics & Telemetry) */}
        <button
          onClick={onOpenSystemInfo}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded bg-[#02050e]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer"
          title="System Diagnostics & Telemetry"
          aria-label="System Info"
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline text-[11px]">DIAGNOSTICS</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 sm:px-2 rounded bg-[#02050e]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all cursor-pointer"
          title="System Settings"
          aria-label="Settings"
        >
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        {/* Sound FX Toggle */}
        <button
          onClick={onToggleSound}
          className="p-1.5 sm:px-2 rounded bg-[#02050e]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all cursor-pointer"
          title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
          aria-label="Audio"
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="hidden md:block p-1.5 sm:px-2 rounded bg-[#02050e]/90 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 transition-all cursor-pointer"
          title="Toggle Fullscreen"
          aria-label="Fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
          )}
        </button>
      </div>
    </header>
  );
};

import React, { useEffect, useState } from 'react';
import { 
  CheckSquare, 
  FileText, 
  Calendar, 
  Cpu, 
  Settings, 
  Mic, 
  X,
  Volume2
} from 'lucide-react';
import { AssistantState, VoiceMetrics } from '../types';
import { ttsService } from '../utils/ttsService';

interface JarvisLeftColumnProps {
  state: AssistantState;
  audioLevel: number;
  onOpenTasks: () => void;
  onOpenHistory: () => void;
  onOpenSystemInfo: () => void;
  onOpenSettings: () => void;
  onToggleMic: () => void;
}

export const JarvisLeftColumn: React.FC<JarvisLeftColumnProps> = ({
  state,
  audioLevel,
  onOpenTasks,
  onOpenHistory,
  onOpenSystemInfo,
  onOpenSettings,
  onToggleMic,
}) => {
  // Live uptime counter
  const [uptimeSeconds, setUptimeSeconds] = useState(12258); // default starting at 03:24:18
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetrics>(() => ttsService.getMetrics());

  useEffect(() => {
    return ttsService.subscribeMetrics((m) => setVoiceMetrics(m));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
  };

  // Visibility states for collapsible cards
  const [cardsVisible, setCardsVisible] = useState({
    systemStatus: true,
    voiceInput: true,
    currentMode: true,
    quickAccess: true,
  });

  const toggleCard = (card: keyof typeof cardsVisible) => {
    setCardsVisible((prev) => ({ ...prev, [card]: !prev[card] }));
  };

  // Spectrum analyzer bars (28 bars matching image.png)
  const numBars = 28;
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isInterrupted = state === 'interrupted';
  const isThinking = state === 'thinking' || state === 'executing' || state === 'generating';

  // Determine current mode label
  const modeLabel = isListening 
    ? 'LISTENING...' 
    : isSpeaking 
    ? 'SPEAKING...' 
    : isInterrupted
    ? 'INTERRUPTED'
    : isThinking 
    ? 'PROCESSING...' 
    : state === 'success' 
    ? 'COMPLETE' 
    : 'IDLE';

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 w-full max-w-[340px] text-cyan-300 font-mono-tech select-none">
      {/* 1. SYSTEM STATUS CARD */}
      {cardsVisible.systemStatus && (
        <div className="relative p-3 rounded bg-[#030914]/85 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.05)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-cyan-500/20">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-cyan-300 uppercase">
              SYSTEM STATUS
            </span>
            <button
              onClick={() => toggleCard('systemStatus')}
              className="text-cyan-500/60 hover:text-cyan-300 p-0.5 transition-colors cursor-pointer"
              title="Dismiss Card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Metric Rows */}
          <div className="space-y-2 text-[11px]">
            {/* Power Core */}
            <div>
              <div className="flex justify-between items-center text-[10px] text-cyan-400/80 mb-1">
                <span>POWER CORE</span>
                <span className="font-bold text-cyan-200">100%</span>
              </div>
              <div className="w-full h-1.5 bg-cyan-950/60 rounded-full overflow-hidden border border-cyan-500/30">
                <div 
                  className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all duration-500" 
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* CPU Usage */}
            <div>
              <div className="flex justify-between items-center text-[10px] text-cyan-400/80 mb-1">
                <span>CPU USAGE</span>
                <span className="font-bold text-cyan-200">23%</span>
              </div>
              <div className="w-full h-1.5 bg-cyan-950/60 rounded-full overflow-hidden border border-cyan-500/30">
                <div 
                  className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all duration-500" 
                  style={{ width: '23%' }}
                />
              </div>
            </div>

            {/* Memory */}
            <div>
              <div className="flex justify-between items-center text-[10px] text-cyan-400/80 mb-1">
                <span>MEMORY</span>
                <span className="font-bold text-cyan-200">46%</span>
              </div>
              <div className="w-full h-1.5 bg-cyan-950/60 rounded-full overflow-hidden border border-cyan-500/30">
                <div 
                  className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all duration-500" 
                  style={{ width: '46%' }}
                />
              </div>
            </div>

            {/* Network & Uptime */}
            <div className="pt-1 space-y-1.5 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-cyan-400/70">NETWORK</span>
                <span className="font-bold text-cyan-200 tracking-wider">CONNECTED</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-cyan-400/70">UPTIME</span>
                <span className="font-bold text-cyan-200">{formatUptime(uptimeSeconds)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. VOICE INPUT CARD */}
      {cardsVisible.voiceInput && (
        <div className="relative p-3 rounded bg-[#030914]/85 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.05)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-cyan-500/20">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-cyan-300 uppercase">
              VOICE INPUT
            </span>
            <button
              onClick={() => toggleCard('voiceInput')}
              className="text-cyan-500/60 hover:text-cyan-300 p-0.5 transition-colors cursor-pointer"
              title="Dismiss Card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mic Status */}
          <div className="flex items-center gap-2 mb-2 text-[10px]">
            <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'}`} />
            <span className="font-bold tracking-wider text-emerald-400 uppercase">
              {isListening ? 'MIC ACTIVE' : 'MIC ACTIVE'}
            </span>
          </div>

          {/* Audio Level Spectrum Analyzer (28 vertical bars) */}
          <div className="mb-3">
            <div className="text-[9px] text-cyan-400/70 mb-1.5 uppercase">
              AUDIO LEVEL
            </div>
            <div className="flex items-end justify-between h-8 gap-[2px] px-1 bg-[#02050d]/80 rounded border border-cyan-500/20 py-1">
              {Array.from({ length: numBars }).map((_, i) => {
                // Dynamic bar height reacting to audioLevel or animated harmonics
                const centerBias = 1 - Math.abs(i - numBars / 2) / (numBars / 2);
                const activeHeight = Math.min(
                  100,
                  Math.max(
                    8,
                    (audioLevel * 120 + (isListening ? 35 : isSpeaking ? 40 : 15)) * centerBias * (0.6 + Math.sin(i * 1.5) * 0.4)
                  )
                );

                return (
                  <div
                    key={`eq-bar-${i}`}
                    className="flex-1 rounded-xs bg-cyan-400 transition-all duration-75"
                    style={{
                      height: `${activeHeight}%`,
                      opacity: 0.4 + (activeHeight / 100) * 0.6,
                      boxShadow: activeHeight > 40 ? '0 0 4px #00f0ff' : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Noise Suppression */}
          <div className="flex justify-between items-center text-[10px] pt-1 border-t border-cyan-500/15">
            <span className="text-cyan-400/70">NOISE SUPPRESSION</span>
            <span className="font-bold text-cyan-200">ON</span>
          </div>

          {/* Technical Voice Metrics (HUD section required by prompt) */}
          {/* Real Performance Voice Telemetry */}
          <div className="mt-2.5 pt-2 border-t border-cyan-500/15 text-[9px] font-mono-tech space-y-1 text-cyan-400/75">
            <div className="flex justify-between items-center text-[9px] text-cyan-300 font-bold uppercase tracking-wider">
              <span>VOICE TELEMETRY</span>
              <span className={`w-1.5 h-1.5 rounded-full ${voiceMetrics.voiceActive || isSpeaking ? 'bg-cyan-300 animate-ping' : 'bg-emerald-400'}`} />
            </div>
            <div className="grid grid-cols-2 gap-1 pt-0.5">
              <div>AI 1ST TOKEN: <span className="text-cyan-100 font-bold">{(voiceMetrics.aiFirstTokenLatency ?? voiceMetrics.aiResponseTime ?? 0.38).toFixed(2)}s</span></div>
              <div>TTS START: <span className="text-cyan-100 font-bold">{(voiceMetrics.ttsFirstAudioLatency ?? voiceMetrics.ttsStartTime ?? 0.22).toFixed(2)}s</span></div>
              <div>VOICE LATENCY: <span className="text-cyan-300 font-bold">{(voiceMetrics.totalVoiceLatency ?? 0.60).toFixed(2)}s</span></div>
              <div>ENGINE: <span className="text-cyan-100 font-bold truncate">{voiceMetrics.providerName || 'Neural British (Ryan)'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CURRENT MODE CARD */}
      {cardsVisible.currentMode && (
        <div className="relative p-3 rounded bg-[#030914]/85 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.05)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-cyan-500/20">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-cyan-300 uppercase">
              CURRENT MODE
            </span>
            <button
              onClick={() => toggleCard('currentMode')}
              className="text-cyan-500/60 hover:text-cyan-300 p-0.5 transition-colors cursor-pointer"
              title="Dismiss Card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Title & Waveform Visualizer */}
          <div className="text-xs sm:text-sm font-bold tracking-widest text-cyan-300 uppercase mb-2">
            {modeLabel}
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Oscilloscope Sound Wave Visualizer */}
            <div className="flex-1 h-12 flex items-center overflow-hidden relative">
              <svg viewBox="0 0 200 40" className="w-full h-full">
                <defs>
                  <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#00f0ff" stopOpacity="1" />
                    <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                {/* Horizontal baseline */}
                <line x1="0" y1="20" x2="200" y2="20" stroke="rgba(0, 240, 255, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
                {/* Sinusoidal Wave */}
                <path
                  d={`M 0 20 
                    Q 25 ${20 - (audioLevel * 30 + (isListening ? 14 : 4))} 50 20 
                    T 100 20 
                    T 150 20 
                    T 200 20`}
                  fill="none"
                  stroke="url(#waveGrad)"
                  strokeWidth="2.5"
                  className={isListening || isSpeaking ? 'animate-pulse' : ''}
                />
                <path
                  d={`M 0 20 
                    Q 25 ${20 + (audioLevel * 20 + (isListening ? 10 : 3))} 50 20 
                    T 100 20 
                    T 150 20 
                    T 200 20`}
                  fill="none"
                  stroke="rgba(0, 240, 255, 0.5)"
                  strokeWidth="1.2"
                />
              </svg>
            </div>

            {/* Glowing Circular Mic Badge Button */}
            <button
              onClick={onToggleMic}
              className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer relative shrink-0 ${
                isListening
                  ? 'border-cyan-400 bg-cyan-950/70 shadow-[0_0_15px_rgba(0,240,255,0.7)] text-cyan-200'
                  : 'border-cyan-500/40 bg-[#02050e] hover:border-cyan-400 text-cyan-400 hover:text-cyan-200'
              }`}
              title={isListening ? 'Stop Listening' : 'Activate Voice'}
            >
              <div className="absolute inset-0.5 rounded-full border border-cyan-500/30" />
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. QUICK ACCESS CARD */}
      {cardsVisible.quickAccess && (
        <div className="relative p-3 rounded bg-[#030914]/85 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.05)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-cyan-500/20">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-cyan-300 uppercase">
              QUICK ACCESS
            </span>
            <button
              onClick={() => toggleCard('quickAccess')}
              className="text-cyan-500/60 hover:text-cyan-300 p-0.5 transition-colors cursor-pointer"
              title="Dismiss Card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 5 Circular Action Buttons */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {/* 1. TASKS */}
            <button
              onClick={onOpenTasks}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
              title="Open Protocol Tasks"
            >
              <div className="w-9 h-9 rounded-full border border-cyan-500/40 bg-[#030814] group-hover:border-cyan-400 group-hover:bg-cyan-950/50 group-hover:shadow-[0_0_10px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center text-cyan-400 group-hover:text-cyan-200">
                <CheckSquare className="w-4 h-4" />
              </div>
              <span className="text-[9px] text-cyan-400/80 group-hover:text-cyan-200 tracking-wider">
                TASKS
              </span>
            </button>

            {/* 2. NOTES */}
            <button
              onClick={onOpenHistory}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
              title="Conversation Notes & History"
            >
              <div className="w-9 h-9 rounded-full border border-cyan-500/40 bg-[#030814] group-hover:border-cyan-400 group-hover:bg-cyan-950/50 group-hover:shadow-[0_0_10px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center text-cyan-400 group-hover:text-cyan-200">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[9px] text-cyan-400/80 group-hover:text-cyan-200 tracking-wider">
                NOTES
              </span>
            </button>

            {/* 3. CALENDAR */}
            <button
              onClick={onOpenTasks}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
              title="Calendar & Timeline"
            >
              <div className="w-9 h-9 rounded-full border border-cyan-500/40 bg-[#030814] group-hover:border-cyan-400 group-hover:bg-cyan-950/50 group-hover:shadow-[0_0_10px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center text-cyan-400 group-hover:text-cyan-200">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-[9px] text-cyan-400/80 group-hover:text-cyan-200 tracking-wider">
                CALENDAR
              </span>
            </button>

            {/* 4. SYSTEM */}
            <button
              onClick={onOpenSystemInfo}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
              title="System Diagnostics & Telemetry"
            >
              <div className="w-9 h-9 rounded-full border border-cyan-500/40 bg-[#030814] group-hover:border-cyan-400 group-hover:bg-cyan-950/50 group-hover:shadow-[0_0_10px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center text-cyan-400 group-hover:text-cyan-200">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="text-[9px] text-cyan-400/80 group-hover:text-cyan-200 tracking-wider">
                SYSTEM
              </span>
            </button>

            {/* 5. SETTINGS */}
            <button
              onClick={onOpenSettings}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
              title="Core Parameters & Preferences"
            >
              <div className="w-9 h-9 rounded-full border border-cyan-500/40 bg-[#030814] group-hover:border-cyan-400 group-hover:bg-cyan-950/50 group-hover:shadow-[0_0_10px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center text-cyan-400 group-hover:text-cyan-200">
                <Settings className="w-4 h-4" />
              </div>
              <span className="text-[9px] text-cyan-400/80 group-hover:text-cyan-200 tracking-wider">
                SETTINGS
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

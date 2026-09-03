import React, { useState, useEffect } from 'react';
import { AssistantState, SystemTelemetry } from '../types';
import { Activity, Wifi, Mic, Cpu, Zap, Radio, Shield, Gauge } from 'lucide-react';

interface ReactorHudSurroundProps {
  state: AssistantState;
  audioLevel: number;
  telemetry: SystemTelemetry;
}

export const ReactorHudSurround: React.FC<ReactorHudSurroundProps> = ({
  state,
  audioLevel,
  telemetry,
}) => {
  // Live fluctuating telemetry values for authentic Stark OS realism
  const [liveTemp, setLiveTemp] = useState(32.4);
  const [liveOutput, setLiveOutput] = useState(98.7);
  const [liveTokensPerSec, setLiveTokensPerSec] = useState(12.4);
  const [liveLatencyMs, setLiveLatencyMs] = useState(18);
  const [liveVoiceDb, setLiveVoiceDb] = useState(-18);
  const [liveAiLatency, setLiveAiLatency] = useState(0.42);
  const [systemLoadPercent, setSystemLoadPercent] = useState(34);

  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';
  const isExecuting = state === 'executing';

  // Micro-fluctuations to simulate live reactor telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTemp((prev) => +(32.2 + Math.random() * 0.5).toFixed(1));
      setLiveOutput((prev) => +(98.5 + Math.random() * 0.4).toFixed(1));
      setLiveLatencyMs((prev) => Math.floor(16 + Math.random() * 5));
      setLiveAiLatency((prev) => +(0.38 + Math.random() * 0.08).toFixed(2));
      setSystemLoadPercent((prev) => {
        if (isThinking || isExecuting) return Math.floor(62 + Math.random() * 15);
        if (isSpeaking) return Math.floor(45 + Math.random() * 8);
        return Math.floor(32 + Math.random() * 5);
      });
      setLiveTokensPerSec((prev) => {
        if (isSpeaking || isThinking) return +(14.2 + Math.random() * 2.8).toFixed(1);
        return 0;
      });
    }, 2400);

    return () => clearInterval(interval);
  }, [isThinking, isExecuting, isSpeaking]);

  // Voice signal dB from audioLevel
  useEffect(() => {
    if (audioLevel > 0.05) {
      const db = Math.round(-42 + audioLevel * 36);
      setLiveVoiceDb(db);
    } else {
      setLiveVoiceDb(-42);
    }
  }, [audioLevel]);

  // Compute 10-segment audio level block string: ████████░░
  const totalBlocks = 10;
  const activeBlocks = isListening || isSpeaking
    ? Math.min(totalBlocks, Math.max(1, Math.round(audioLevel * totalBlocks * 1.5)))
    : 0;
  const audioMeterStr = '█'.repeat(activeBlocks) + '░'.repeat(totalBlocks - activeBlocks);

  return (
    <>
      {/* =========================================================================
          TOP LEFT TECHNICAL READOUT (Section 3)
          JARVIS AI CORE / SYSTEM ONLINE / NEURAL ENGINE: ACTIVE
      ========================================================================== */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20 pointer-events-none select-none">
        <div className="hud-panel p-2 sm:p-2.5 rounded border-cyan-500/25 bg-[#020612]/85 max-w-[210px]">
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-orbitron font-bold tracking-wider mb-1">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>JARVIS AI CORE</span>
          </div>
          <div className="font-mono-tech text-[9px] sm:text-[10px] text-cyan-300 space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-cyan-500/70">STATUS:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SYSTEM ONLINE
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-500/70">NEURAL:</span>
              <span className="text-cyan-200">ACTIVE // {telemetry.activeModel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-500/70">SECURITY:</span>
              <span className="text-cyan-400">STARK-OMEGA</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TOP RIGHT TECHNICAL READOUT (Section 3)
          NETWORK CONNECTED / LATENCY 42 ms / AI STATUS READY
      ========================================================================== */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 pointer-events-none select-none text-right">
        <div className="hud-panel p-2 sm:p-2.5 rounded border-cyan-500/25 bg-[#020612]/85 min-w-[170px]">
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          <div className="flex items-center justify-end gap-1.5 text-cyan-400 text-[10px] font-orbitron font-bold tracking-wider mb-1">
            <Wifi className="w-3 h-3 text-cyan-400" />
            <span>NETWORK</span>
          </div>
          <div className="font-mono-tech text-[9px] sm:text-[10px] text-cyan-300 space-y-0.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-cyan-500/70">LINK:</span>
              <span className="text-emerald-400 font-semibold">CONNECTED</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-cyan-500/70">LATENCY:</span>
              <span className="text-cyan-100 font-bold">{liveLatencyMs} ms</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-cyan-500/70">AI STATUS:</span>
              <span className="text-cyan-200 uppercase font-bold">
                {state === 'idle' ? 'READY' : state.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM LEFT TECHNICAL READOUT (Section 3)
          VOICE INPUT / MIC: ACTIVE / AUDIO LEVEL ████████░░
      ========================================================================== */}
      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-20 pointer-events-none select-none">
        <div className="hud-panel p-2 sm:p-2.5 rounded border-cyan-500/25 bg-[#020612]/85 min-w-[190px]">
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-orbitron font-bold tracking-wider mb-1">
            <Mic className="w-3 h-3 text-cyan-400" />
            <span>VOICE INPUT</span>
          </div>
          <div className="font-mono-tech text-[9px] sm:text-[10px] text-cyan-300 space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-cyan-500/70">MIC STATUS:</span>
              <span className={isListening ? 'text-cyan-300 font-bold animate-pulse' : 'text-cyan-500'}>
                {isListening ? 'ACTIVE // CAPTURE' : 'ARMED // STANDBY'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-500/70">AUDIO LEVEL:</span>
              <span className="font-mono text-cyan-300 tracking-tighter">
                {audioMeterStr}
              </span>
            </div>
            <div className="flex items-center justify-between text-[8.5px]">
              <span className="text-cyan-500/70">SIGNAL GAIN:</span>
              <span className="text-cyan-400">{liveVoiceDb} dB</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM RIGHT TECHNICAL READOUT (Section 3)
          SYSTEM LOAD 34% / MEMORY STABLE
      ========================================================================== */}
      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-20 pointer-events-none select-none text-right">
        <div className="hud-panel p-2 sm:p-2.5 rounded border-cyan-500/25 bg-[#020612]/85 min-w-[170px]">
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          <div className="flex items-center justify-end gap-1.5 text-cyan-400 text-[10px] font-orbitron font-bold tracking-wider mb-1">
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span>SYSTEM LOAD</span>
          </div>
          <div className="font-mono-tech text-[9px] sm:text-[10px] text-cyan-300 space-y-0.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-cyan-500/70">CPU/GPU:</span>
              <span className="text-cyan-100 font-bold">{systemLoadPercent}%</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-cyan-500/70">MEMORY:</span>
              <span className="text-emerald-400 font-semibold">STABLE // 1.2 GB</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-cyan-500/70">THERMAL:</span>
              <span className="text-cyan-300">{liveTemp}°C NOMINAL</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: LIVE SYSTEM DATA TELEMETRY STRIP (ACROSS TOP/CENTER)
          CORE TEMP 32.4°C | ENERGY OUTPUT 98.7% | PROCESSING 12.4 TOK/S | ...
      ========================================================================== */}
      <div className="w-full overflow-hidden border-y border-cyan-500/20 bg-[#020409]/90 py-1 px-4 text-[9px] sm:text-[10px] font-mono-tech tracking-wider text-cyan-400/80 select-none z-10">
        <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-cyan-500/60">CORE TEMP:</span>
            <span className="text-cyan-200 font-bold">{liveTemp}°C</span>
          </div>
          <span className="text-cyan-600/40 hidden sm:inline">|</span>

          <div className="flex items-center gap-1">
            <span className="text-cyan-500/60">ENERGY OUTPUT:</span>
            <span className="text-cyan-200 font-bold">{liveOutput}%</span>
          </div>
          <span className="text-cyan-600/40 hidden sm:inline">|</span>

          <div className="flex items-center gap-1">
            <span className="text-cyan-500/60">PROCESSING:</span>
            <span className="text-cyan-200 font-bold">{liveTokensPerSec} TOK/S</span>
          </div>
          <span className="text-cyan-600/40 hidden md:inline">|</span>

          <div className="flex items-center gap-1 hidden md:flex">
            <span className="text-cyan-500/60">NETWORK:</span>
            <span className="text-cyan-200 font-bold">{liveLatencyMs}ms</span>
          </div>
          <span className="text-cyan-600/40 hidden lg:inline">|</span>

          <div className="flex items-center gap-1 hidden lg:flex">
            <span className="text-cyan-500/60">VOICE SIGNAL:</span>
            <span className="text-cyan-200 font-bold">{liveVoiceDb}dB</span>
          </div>
          <span className="text-cyan-600/40 hidden lg:inline">|</span>

          <div className="flex items-center gap-1 hidden lg:flex">
            <span className="text-cyan-500/60">AI LATENCY:</span>
            <span className="text-cyan-200 font-bold">{liveAiLatency}s</span>
          </div>
          <span className="text-cyan-600/40 hidden xl:inline">|</span>

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">SYSTEM STATUS NOMINAL</span>
            <span className="text-[8px] text-cyan-600/60">[TELEMETRY]</span>
          </div>
        </div>
      </div>
    </>
  );
};

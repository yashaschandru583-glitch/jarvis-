import React, { useState, useEffect } from 'react';
import { X, Cpu, Activity, Zap, Radio, Globe, ShieldCheck, RefreshCw, Layers } from 'lucide-react';
import { SystemTelemetry } from '../types';

interface SystemInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: SystemTelemetry;
  onReplayBoot: () => void;
}

export const SystemInfoModal: React.FC<SystemInfoModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  onReplayBoot,
}) => {
  const [pingMs, setPingMs] = useState<number>(38);
  const [isPinging, setIsPinging] = useState(false);

  // Measure latency to backend
  const measurePing = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      await fetch('/api/health');
      const elapsed = Math.round(performance.now() - start);
      setPingMs(elapsed);
    } catch (_) {
      setPingMs(42);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      measurePing();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="hud-panel w-full max-w-xl max-h-[85vh] rounded-xl border border-cyan-500/40 flex flex-col overflow-hidden shadow-2xl bg-[#030814]/95">
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* Header */}
        <div className="p-4 border-b border-cyan-800/40 flex items-center justify-between bg-cyan-950/40">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="font-orbitron font-bold text-sm text-cyan-100 tracking-wider">
                SYSTEM DIAGNOSTICS & TELEMETRY
              </div>
              <div className="text-[10px] font-mono-tech text-cyan-400/70">
                MARK LXXXV ARC REACTOR CORE DIAGNOSTIC
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-900/40 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto space-y-4 font-mono-tech text-xs">
          {/* Main Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-cyan-400/70 text-[10px] mb-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>CORE OUTPUT</span>
              </div>
              <div className="font-orbitron text-sm font-bold text-cyan-200">
                {telemetry.coreOutputGW.toFixed(2)} GW
              </div>
              <div className="text-[9px] text-emerald-400">98.7% HARMONIC</div>
            </div>

            <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-cyan-400/70 text-[10px] mb-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>CORE TEMP</span>
              </div>
              <div className="font-orbitron text-sm font-bold text-cyan-200">
                32.4°C / {telemetry.coreTempKelvin.toFixed(1)}K
              </div>
              <div className="text-[9px] text-cyan-400">THERMAL NOMINAL</div>
            </div>

            <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-cyan-400/70 text-[10px] mb-1">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>NEURAL CORE</span>
              </div>
              <div className="font-orbitron text-xs font-bold text-cyan-200 truncate">
                {telemetry.activeModel}
              </div>
              <div className="text-[9px] text-emerald-400">STREAMING ACTIVE</div>
            </div>

            <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-cyan-400/70 text-[10px] mb-1">
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>NETWORK LATENCY</span>
              </div>
              <div className="font-orbitron text-sm font-bold text-cyan-200 flex items-center gap-1.5">
                <span>{pingMs} ms</span>
                <button
                  onClick={measurePing}
                  className="text-cyan-400 hover:text-white cursor-pointer"
                  title="Ping server"
                >
                  <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="text-[9px] text-cyan-400">LOW JITTER &lt;2ms</div>
            </div>

            <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-cyan-400/70 text-[10px] mb-1">
                <Radio className="w-3 h-3 text-cyan-400" />
                <span>AUDIO FREQ</span>
              </div>
              <div className="font-orbitron text-sm font-bold text-cyan-200">
                {telemetry.frequencyHz.toFixed(1)} Hz
              </div>
              <div className="text-[9px] text-cyan-400">16-BIT 48kHz HD</div>
            </div>

            <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-cyan-400/70 text-[10px] mb-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>SYSTEM INTEGRITY</span>
              </div>
              <div className="font-orbitron text-sm font-bold text-emerald-300">
                NOMINAL
              </div>
              <div className="text-[9px] text-emerald-400">0 CRITICAL FAULTS</div>
            </div>
          </div>

          {/* Architecture Details */}
          <div className="p-3 rounded bg-[#02050c] border border-cyan-500/30 space-y-2">
            <div className="text-[11px] font-orbitron text-cyan-300 font-bold border-b border-cyan-900/40 pb-1 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>SUBSYSTEM MATRIX SPECIFICATIONS</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-cyan-300/80">
              <div>
                <span className="text-cyan-500/70">ARCH: </span>
                <span>Palladium-Isotope Tri-Toroid</span>
              </div>
              <div>
                <span className="text-cyan-500/70">NEURAL LINK: </span>
                <span>Bi-Directional Streaming SSE</span>
              </div>
              <div>
                <span className="text-cyan-500/70">AUDIO SYNTH: </span>
                <span>Streaming Speech Pipeline</span>
              </div>
              <div>
                <span className="text-cyan-500/70">SECURITY PROTOCOL: </span>
                <span>OMEGA-LEVEL CLEARANCE</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => {
                onClose();
                onReplayBoot();
              }}
              className="px-3 py-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono-tech transition-colors cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              <span>REPLAY BOOT SEQUENCE</span>
            </button>

            <span className="text-[10px] text-cyan-500/60">
              STARK LABS // MALIBU FACILITY
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

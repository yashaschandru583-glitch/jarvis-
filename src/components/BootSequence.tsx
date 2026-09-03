import React, { useState, useEffect } from 'react';
import { Zap, Shield, Cpu, Activity, Radio, CheckCircle2 } from 'lucide-react';

interface BootSequenceProps {
  onComplete: () => void;
}

interface BootStep {
  text: string;
  icon: React.ReactNode;
  duration: number;
}

const BOOT_STEPS: BootStep[] = [
  { text: 'INITIALIZING JARVIS CORE...', icon: <Cpu className="w-4 h-4 text-cyan-400" />, duration: 400 },
  { text: 'LOADING NEURAL ENGINE...', icon: <Activity className="w-4 h-4 text-cyan-400" />, duration: 450 },
  { text: 'VOICE SYSTEM ONLINE...', icon: <Radio className="w-4 h-4 text-cyan-400" />, duration: 400 },
  { text: 'NETWORK CONNECTION ESTABLISHED...', icon: <Shield className="w-4 h-4 text-cyan-400" />, duration: 450 },
  { text: 'ARC REACTOR SYNCHRONIZATION...', icon: <Zap className="w-4 h-4 text-cyan-400" />, duration: 500 },
  { text: 'JARVIS ONLINE', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, duration: 450 },
];

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(10);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onComplete]);

  useEffect(() => {
    if (currentStepIndex >= BOOT_STEPS.length) {
      setIsFinishing(true);
      const finishTimer = setTimeout(() => {
        onComplete();
      }, 350);
      return () => clearTimeout(finishTimer);
    }

    const currentStep = BOOT_STEPS[currentStepIndex];
    const targetPercent = Math.min(100, Math.round(((currentStepIndex + 1) / BOOT_STEPS.length) * 100));

    const stepTimer = setTimeout(() => {
      setProgressPercent(targetPercent);
      setCurrentStepIndex((prev) => prev + 1);
    }, currentStep.duration);

    return () => clearTimeout(stepTimer);
  }, [currentStepIndex, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020408] text-cyan-400 select-none transition-opacity duration-500 ${
        isFinishing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Matrix Grid & Arc Silhouette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,145,178,0.15)_0%,rgba(2,4,8,0.95)_70%)] pointer-events-none" />
      <div className="absolute inset-0 scanlines opacity-50 pointer-events-none" />

      {/* Decorative Corner Brackets */}
      <div className="absolute top-6 left-6 text-[10px] font-mono-tech text-cyan-500/60 flex flex-col">
        <span>SYS.BOOT // MK-LXXXV</span>
        <span>SECURITY LEVEL: STARK OMEGA</span>
      </div>
      <div className="absolute top-6 right-6 text-[10px] font-mono-tech text-cyan-500/60 text-right">
        <span>DIAGNOSTIC MATRIX: ACTIVE</span>
        <span>LATENCY: 1.2ms</span>
      </div>
      <div className="absolute bottom-6 left-6 text-[10px] font-mono-tech text-cyan-500/60">
        <span>FUSION COMPRESSION: NOMINAL</span>
      </div>

      {/* Central Holographic Boot Core */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
        {/* Animated Arc Mini Core */}
        <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/40 animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border border-cyan-400/60 animate-spin-reverse-medium" />
          <div className="absolute inset-4 rounded-full border border-cyan-300/30" />
          
          {/* Central Glowing Core */}
          <div className="w-12 h-12 rounded-full bg-cyan-400/20 border border-cyan-300/80 flex items-center justify-center core-glow">
            <div className="w-6 h-6 rounded-full bg-white animate-ping" />
          </div>

          <div className="absolute -bottom-6 text-[9px] font-mono-tech text-cyan-300/80 tracking-widest">
            CORE SYNCHRONIZING
          </div>
        </div>

        {/* Stark Industries Brand Label */}
        <div className="text-center mb-6">
          <div className="text-xs font-orbitron font-extrabold tracking-[0.3em] text-cyan-100 glow-cyan">
            STARK INDUSTRIES
          </div>
          <div className="text-[10px] font-mono-tech tracking-[0.2em] text-cyan-400/60 mt-0.5">
            JUST A RATHER VERY INTELLIGENT SYSTEM
          </div>
        </div>

        {/* Boot Terminal Output */}
        <div className="w-full p-4 rounded-lg bg-[#040914]/90 border border-cyan-500/30 backdrop-blur-md mb-6 relative overflow-hidden">
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          <div className="space-y-2 font-mono-tech text-xs min-h-[140px] flex flex-col justify-end">
            {BOOT_STEPS.slice(0, currentStepIndex + 1).map((step, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isLast = idx === BOOT_STEPS.length - 1 && currentStepIndex >= BOOT_STEPS.length - 1;

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between transition-all duration-200 ${
                    isCurrent ? 'text-cyan-200 font-bold' : 'text-cyan-400/70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="opacity-75">{step.icon}</span>
                    <span className="tracking-wider">{step.text}</span>
                  </div>
                  <span
                    className={`text-[10px] tracking-widest ${
                      isLast
                        ? 'text-emerald-400 font-bold'
                        : isCurrent
                        ? 'text-cyan-300 animate-pulse'
                        : 'text-cyan-500/50'
                    }`}
                  >
                    {isLast ? '[ READY ]' : isCurrent ? '[ SYNCING ]' : '[ OK ]'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between text-[10px] font-mono-tech text-cyan-400/80 mb-1">
            <span>SEQUENCE PROGRESS</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-cyan-950/80 rounded-full overflow-hidden border border-cyan-500/30">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-white transition-all duration-300 glow-cyan-box"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Skip Sequence Option */}
        <button
          onClick={onComplete}
          className="px-4 py-1.5 rounded border border-cyan-500/30 hover:border-cyan-400 text-[11px] font-mono-tech text-cyan-400/70 hover:text-cyan-200 transition-all cursor-pointer hover:bg-cyan-950/40"
        >
          [ SKIP SEQUENCE // ESC ]
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Mic, MicOff, Square, Send, Terminal, Sparkles, ArrowRight, CornerDownLeft } from 'lucide-react';
import { AssistantState } from '../types';

interface CommandConsoleProps {
  state: AssistantState;
  onActivateMic: () => void;
  onStop: () => void;
  onSubmitText: (text: string) => void;
  liveTranscript?: string;
  disabled?: boolean;
}

const TACTICAL_SHORTCUTS = [
  { label: 'What is the current time in Tokyo?', short: 'TIME' },
  { label: "What's the weather telemetry for today?", short: 'WEATHER' },
  { label: 'Calculate 144 * 12 + 58', short: 'MATH' },
  { label: 'Search web for latest advancements in quantum AI', short: 'RECON' },
  { label: 'Add task: Recalibrate Stark repulsor coils', short: 'TASK' },
];

export const CommandConsole: React.FC<CommandConsoleProps> = ({
  state,
  onActivateMic,
  onStop,
  onSubmitText,
  liveTranscript,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');

  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';
  const isExecuting = state === 'executing';
  const isGenerating = state === 'generating';
  const isBusy = isListening || isThinking || isSpeaking || isExecuting || isGenerating;

  const handleMicToggle = () => {
    if (isListening || isSpeaking || isThinking || isExecuting) {
      onStop();
    } else {
      onActivateMic();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled) return;
    const text = inputText.trim();
    setInputText('');
    onSubmitText(text);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-2 flex flex-col items-center gap-2 select-none z-30">
      {/* Live Voice Real-Time Transcription HUD Banner (Section 6) */}
      {(liveTranscript || isListening || isThinking) && (
        <div className="w-full p-2 rounded bg-cyan-950/70 border border-cyan-500/40 backdrop-blur-md flex items-center justify-between text-xs font-mono-tech animate-pulse">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping flex-shrink-0" />
            <span className="text-cyan-300 font-bold flex-shrink-0">&gt;</span>
            <span className="text-cyan-100 truncate">
              {liveTranscript || (isListening ? 'CAPTURE IN PROGRESS... SPEAK DIRECTIVE' : 'SYNAPSE REASONING...')}
            </span>
          </div>
          <span className="text-[10px] text-cyan-400/80 font-bold ml-2 flex-shrink-0">
            {isListening ? '[ LIVE AUDIO ]' : '[ STREAMING ]'}
          </span>
        </div>
      )}

      {/* Main Terminal Command Console (Section 6) */}
      <div className="w-full hud-panel rounded-xl border border-cyan-500/40 bg-[#030714]/90 p-2 sm:p-2.5 shadow-2xl relative overflow-hidden">
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* Scan beam animation across terminal */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent pointer-events-none animate-scan-beam opacity-40" />

        {/* Command Form */}
        <form onSubmit={handleFormSubmit} className="relative z-10 flex items-center gap-2">
          {/* Futuristic Microphone Activation Button */}
          <button
            type="button"
            onClick={handleMicToggle}
            disabled={disabled}
            className={`p-2.5 sm:p-3 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer flex-shrink-0 ${
              isListening
                ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.8)] animate-pulse'
                : isSpeaking
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/80 hover:bg-amber-500/30'
                : isThinking || isExecuting
                ? 'bg-sky-950/80 text-sky-300 border-sky-400/60 animate-pulse'
                : 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border-cyan-500/40 hover:border-cyan-400'
            }`}
            title={
              isSpeaking
                ? 'Halt J.A.R.V.I.S. voice output'
                : isListening
                ? 'Stop listening'
                : 'Activate microphone input'
            }
            aria-label="Toggle Voice"
          >
            {isSpeaking ? (
              <Square className="w-4 h-4 fill-current" />
            ) : isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Terminal Input Line */}
          <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#02050c] border border-cyan-900/50 focus-within:border-cyan-400/70 transition-colors">
            <span className="text-cyan-500 font-mono-tech text-xs font-bold">&gt;</span>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="ENTER COMMAND OR ACTIVATE VOICE..."
              disabled={disabled || (isBusy && !isSpeaking)}
              className="w-full bg-transparent border-none text-cyan-100 placeholder-cyan-600/60 text-xs sm:text-sm font-mono-tech focus:outline-none tracking-wide"
            />
            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="text-cyan-500/70 hover:text-cyan-300 text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Terminal Send Command Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || disabled || (isBusy && !isSpeaking)}
            className="px-3 sm:px-4 py-2.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 transition-all font-orbitron text-xs font-bold flex items-center gap-1.5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
            title="Execute directive"
          >
            <span className="hidden sm:inline">TRANSMIT</span>
            <Send className="w-3.5 h-3.5 text-cyan-300" />
          </button>
        </form>

        {/* Terminal Status Bar Footnote */}
        <div className="mt-1.5 pt-1.5 border-t border-cyan-950/60 flex items-center justify-between text-[9px] font-mono-tech text-cyan-500/70 px-1">
          <div className="flex items-center gap-2">
            <span className={isListening ? 'text-cyan-300 font-bold' : isSpeaking ? 'text-amber-300 font-bold' : 'text-cyan-500'}>
              {isListening ? '● MIC ACTIVE (16kHz PCM)' : isSpeaking ? '▲ VOCAL STREAM ACTIVE' : '○ VOICE ENGINE READY'}
            </span>
            <span className="hidden sm:inline">// PRESS ENTER TO EXECUTE</span>
          </div>

          <div className="flex items-center gap-1">
            <span>TERMINAL: </span>
            <span className="text-cyan-300 font-bold">TTY-01</span>
          </div>
        </div>
      </div>

      {/* Quick Tactical Command Chips (Stark Directives) */}
      <div className="w-full flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
        {TACTICAL_SHORTCUTS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSubmitText(item.label)}
            disabled={disabled || (isBusy && !isSpeaking)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#02050e]/85 border border-cyan-500/20 hover:border-cyan-400/60 text-[10px] sm:text-[11px] font-mono-tech text-cyan-400/80 hover:text-cyan-100 transition-all cursor-pointer disabled:opacity-40"
          >
            <span className="text-cyan-500/60 font-bold">[{item.short}]</span>
            <span className="truncate max-w-[140px] sm:max-w-[210px]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

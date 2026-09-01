import React, { useState } from 'react';
import { Mic, MicOff, Square, Send, Sparkles, Terminal, ArrowUpRight } from 'lucide-react';
import { AssistantState } from '../types';

interface MicControllerProps {
  state: AssistantState;
  onActivateMic: () => void;
  onStop: () => void;
  onSubmitText: (text: string) => void;
  disabled?: boolean;
}

const QUICK_ACTIONS = [
  { label: "What's the weather today?", icon: '🌤️' },
  { label: 'Search the web for the latest AI news', icon: '🌐' },
  { label: 'Calculate 245 × 89', icon: '🧮' },
  { label: 'Create a reminder for tomorrow', icon: '⏰' },
  { label: 'Explain this programming error', icon: '💻' },
  { label: 'Translate this into Hindi', icon: '🗣️' },
  { label: 'Open YouTube', icon: '▶️' },
];

export const MicController: React.FC<MicControllerProps> = ({
  state,
  onActivateMic,
  onStop,
  onSubmitText,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [isInputExpanded, setIsInputExpanded] = useState(false);

  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';
  const isExecuting = state === 'executing';
  const isBusy = isListening || isThinking || isSpeaking || isExecuting;

  const handleMainButtonClick = () => {
    if (isListening || isSpeaking || isThinking || isExecuting) {
      onStop();
    } else {
      onActivateMic();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled) return;
    const text = inputText.trim();
    setInputText('');
    onSubmitText(text);
  };

  // Button label and styling
  let buttonLabel = 'ACTIVATE JARVIS';
  let buttonSub = 'CLICK TO SPEAK';
  let buttonGlow = 'border-cyan-500/40 hover:border-cyan-400 text-cyan-300 reactor-glow';
  let iconBg = 'bg-cyan-950/80 border-cyan-400/40 text-cyan-300';

  if (isListening) {
    buttonLabel = 'LISTENING...';
    buttonSub = 'CLICK TO COMPLETE';
    buttonGlow = 'border-cyan-400 glow-cyan-box-intense text-cyan-100';
    iconBg = 'bg-cyan-400 text-slate-950 animate-pulse';
  } else if (isThinking || isExecuting) {
    buttonLabel = 'PROCESSING...';
    buttonSub = 'REASONING DIRECTIVE';
    buttonGlow = 'border-sky-400 text-sky-200';
    iconBg = 'bg-sky-600 text-white animate-spin';
  } else if (isSpeaking) {
    buttonLabel = 'STOP';
    buttonSub = 'HALT VOCAL OUTPUT';
    buttonGlow = 'border-amber-500/80 glow-amber-box text-amber-300';
    iconBg = 'bg-amber-500/20 border-amber-400 text-amber-400';
  }

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-3">
      {/* Primary Futuristic Circular Microphone Controller */}
      <div className="flex flex-col items-center">
        <button
          id="main-mic-button"
          onClick={handleMainButtonClick}
          disabled={disabled}
          className={`group relative flex items-center justify-center gap-3.5 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full bg-[#02040a]/90 border ${buttonGlow} backdrop-blur-md transition-all duration-300 active:scale-95 cursor-pointer`}
          aria-label={buttonLabel}
        >
          {/* Animated radar ring outline */}
          <div
            className={`absolute -inset-1 rounded-full border border-cyan-400/25 pointer-events-none ${
              isListening ? 'animate-ping opacity-40' : 'group-hover:border-cyan-400/50'
            }`}
          />

          {/* Central Circular Icon */}
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 ${iconBg}`}
          >
            {isSpeaking ? (
              <Square className="w-4 h-4 fill-current" />
            ) : isListening ? (
              <MicOff className="w-4 h-4 animate-bounce" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </div>

          {/* Text Labels */}
          <div className="flex flex-col text-left">
            <span className="font-orbitron text-xs sm:text-sm font-bold tracking-wider uppercase text-cyan-200">
              {buttonLabel}
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono-tech tracking-widest text-cyan-400/70 uppercase">
              {buttonSub}
            </span>
          </div>
        </button>
      </div>

      {/* Alternative Command Input (Text Box) */}
      <div className="w-full">
        {!isInputExpanded ? (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setIsInputExpanded(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-cyan-500/30 bg-[#02040a]/80 text-cyan-400/80 hover:text-cyan-200 hover:border-cyan-400/60 text-xs font-mono-tech transition-colors cursor-pointer"
            >
              <Terminal className="w-3 h-3 text-cyan-400" />
              <span>OR TYPE DIRECTIVE</span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleTextSubmit}
            className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-[#02040a]/95 border border-cyan-500/40 backdrop-blur-md shadow-lg"
          >
            <div className="pl-2 text-cyan-400/60">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter command (e.g. What's the weather today?)..."
              disabled={disabled || isBusy}
              className="flex-1 bg-transparent border-none text-cyan-200 placeholder-cyan-600/60 text-xs sm:text-sm focus:outline-none font-rajdhani"
              autoFocus
            />
            <button
              type="submit"
              disabled={!inputText.trim() || disabled || isBusy}
              className="px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-orbitron transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsInputExpanded(false)}
              className="px-2 py-1 text-cyan-400/50 hover:text-cyan-300 text-xs font-mono-tech cursor-pointer"
            >
              ✕
            </button>
          </form>
        )}
      </div>

      {/* Quick Tactical Protocol Action Chips */}
      <div className="w-full flex flex-wrap items-center justify-center gap-1.5 max-h-16 overflow-y-auto pt-1">
        {QUICK_ACTIONS.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onSubmitText(action.label)}
            disabled={disabled || isBusy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#02040a]/80 border border-cyan-500/20 hover:border-cyan-400/60 text-[11px] sm:text-xs text-cyan-300/80 hover:text-cyan-100 transition-all active:scale-95 disabled:opacity-40 cursor-pointer backdrop-blur-sm"
          >
            <span>{action.icon}</span>
            <span className="truncate max-w-[150px] sm:max-w-[200px]">{action.label}</span>
            <ArrowUpRight className="w-2.5 h-2.5 opacity-50" />
          </button>
        ))}
      </div>
    </div>
  );
};

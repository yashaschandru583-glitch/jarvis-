import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Keyboard, 
  Mic, 
  X,
  Sparkles,
  Terminal,
  Cpu,
  Volume2
} from 'lucide-react';
import { ArcReactor } from './ArcReactor';
import { AssistantState, Message, DesktopActionDetail, ToolExecution } from '../types';
import { ttsService } from '../utils/ttsService';

interface JarvisCenterColumnProps {
  state: AssistantState;
  audioLevel: number;
  messages: Message[];
  currentMessage: Message | null;
  activeTool?: ToolExecution | null;
  desktopAction?: DesktopActionDetail | null;
  liveTranscript?: string;
  isAutoplayBlocked?: boolean;
  onDismissAutoplay?: () => void;
  onActivateMic: () => void;
  onStop: () => void;
  onSubmitText: (text: string) => void;
  onSelectState?: (state: AssistantState) => void;
  reactorIntensity?: number;
  animationSpeed?: number;
  reducedMotion?: boolean;
}

export const JarvisCenterColumn: React.FC<JarvisCenterColumnProps> = ({
  state,
  audioLevel,
  messages,
  currentMessage,
  activeTool,
  desktopAction,
  liveTranscript,
  isAutoplayBlocked,
  onDismissAutoplay,
  onActivateMic,
  onStop,
  onSubmitText,
  onSelectState,
  reactorIntensity = 85,
  animationSpeed = 1,
  reducedMotion = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(true);
  const [isFeedVisible, setIsFeedVisible] = useState(true);
  const feedScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll feed on new messages or streaming chunks
  useEffect(() => {
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTop = feedScrollRef.current.scrollHeight;
    }
  }, [messages, currentMessage, liveTranscript]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSubmitText(inputText.trim());
    setInputText('');
  };

  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking' || state === 'executing' || state === 'generating';

  // Seed default dialogue from screenshot if conversation is empty
  const displayMessages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    statusTag?: string;
  }> = messages.length > 0 
    ? messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      }))
    : [
        {
          id: 'default-user',
          role: 'user',
          content: 'hi',
          timestamp: '10:01:12 PM',
        },
        {
          id: 'default-jarvis',
          role: 'assistant',
          content:
            'I encountered an anomaly in the neural pipeline. This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.\n\n[STATUS: SERVICE UNAVAILABLE | CODE: 503]',
          timestamp: '10:01:13 PM',
          statusTag: 'STATUS: SERVICE UNAVAILABLE | CODE: 503',
        },
      ];

  // Mode pill list
  const modes: Array<{ id: AssistantState; label: string }> = [
    { id: 'idle', label: 'IDLE' },
    { id: 'listening', label: 'LISTENING' },
    { id: 'thinking', label: 'PROCESSING' },
    { id: 'speaking', label: 'SPEAKING' },
    { id: 'success', label: 'COMPLETE' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-start w-full max-w-[620px] mx-auto select-none font-mono-tech relative z-10 px-2 sm:px-4">
      {/* 1. ARC REACTOR DISPLAY CONTAINER */}
      <div className="relative w-full flex items-center justify-center pt-1 pb-2">
        {/* Flanking Sci-Fi HUD Bracket Markings (Left) */}
        <div className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 flex-col gap-4 text-[9px] text-cyan-500/50 pointer-events-none">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-cyan-400" />
            <span>0100110</span>
          </div>
          <div className="w-8 h-[1px] bg-cyan-500/30" />
          <div className="text-[8px] text-cyan-400/60 font-mono-tech">
            SYS_ENG: ONLINE
          </div>
        </div>

        {/* Flanking Sci-Fi HUD Bracket Markings (Right) */}
        <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 flex-col gap-4 text-[9px] text-cyan-500/50 pointer-events-none items-end">
          <div className="flex items-center gap-1">
            <span>CORE_SYNC</span>
            <span className="w-1.5 h-1.5 bg-cyan-400" />
          </div>
          <div className="w-8 h-[1px] bg-cyan-500/30" />
          <div className="text-[8px] text-cyan-400/60 font-mono-tech">
            FLUX: 3.42 GW
          </div>
        </div>

        {/* Arc Reactor Centerpiece */}
        <div className="transform scale-90 sm:scale-95 md:scale-100 transition-transform">
          <ArcReactor
            state={state}
            audioLevel={audioLevel}
            onClick={onActivateMic}
            intensity={reactorIntensity}
            animationSpeed={animationSpeed}
            reducedMotion={reducedMotion}
            activeActionLabel={activeTool?.displayName}
            desktopAction={desktopAction}
          />
        </div>
      </div>

      {/* 2. MODE SWITCHER PILL BAR */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 my-2.5 w-full max-w-lg z-20">
        {modes.map((m) => {
          const isActive =
            state === m.id ||
            (m.id === 'thinking' && isThinking) ||
            (m.id === 'success' && state === 'success');

          return (
            <button
              key={m.id}
              onClick={() => {
                if (m.id === 'listening') onActivateMic();
                else if (m.id === 'idle') onStop();
                else if (onSelectState) onSelectState(m.id);
              }}
              className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-sm text-[10px] sm:text-xs font-bold tracking-widest transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.7)] scale-105 border border-cyan-300'
                  : 'bg-[#030915]/80 text-cyan-400/80 border border-cyan-500/30 hover:border-cyan-400 hover:text-cyan-200'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Autoplay restriction warning banner */}
      {isAutoplayBlocked && (
        <div 
          onClick={() => {
            ttsService.unlockAudioContext();
            onDismissAutoplay?.();
          }}
          className="w-full mb-2.5 p-2 rounded bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs font-mono-tech flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(245,158,11,0.25)] cursor-pointer animate-pulse"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Click the microphone or Test Voice button to enable voice.</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ttsService.unlockAudioContext();
              onDismissAutoplay?.();
              ttsService.speak('Hello. I am JARVIS. Voice communication is online.');
            }}
            className="px-2.5 py-1 rounded bg-amber-500/30 hover:bg-amber-500/50 text-amber-100 text-[10px] font-bold border border-amber-400/60 uppercase tracking-wider transition-colors cursor-pointer"
          >
            ENABLE VOICE
          </button>
        </div>
      )}

      {/* 3. COMMAND INPUT BOX WITH PROTRUDING CENTER MIC BUTTON */}
      <div className="w-full relative mt-1 mb-6">
        <div className="relative rounded p-3 bg-[#030914]/90 border border-cyan-500/35 backdrop-blur-md shadow-[0_0_20px_rgba(0,240,255,0.08)]">
          {/* Header Label */}
          <div className="text-[10px] sm:text-[11px] font-bold tracking-widest text-cyan-300 uppercase pb-1.5 mb-2 border-b border-cyan-500/20">
            ENTER COMMAND OR ACTIVATE VOICE
          </div>

          {/* Input Row */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold text-sm sm:text-base">&gt;</span>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={liveTranscript ? liveTranscript : '|'}
              className="flex-1 bg-transparent text-cyan-200 font-mono-tech text-xs sm:text-sm placeholder:text-cyan-500/40 focus:outline-none tracking-wide"
            />

            {/* Action Icons */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="text-cyan-400/80 hover:text-cyan-200 transition-colors p-1 cursor-pointer"
                title="Send Command"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
                className="text-cyan-400/80 hover:text-cyan-200 transition-colors p-1 cursor-pointer"
                title="Toggle Virtual Input"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Large Protruding Glowing Circular Microphone Button */}
        <div className="absolute left-1/2 -bottom-5 -translate-x-1/2 z-30">
          <button
            type="button"
            onClick={isListening ? onStop : onActivateMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-xl ${
              isListening
                ? 'bg-rose-500 border-2 border-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.9)] animate-pulse'
                : 'bg-[#180d19] border-2 border-rose-500/80 hover:border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
            }`}
            title={isListening ? 'Stop Listening' : 'Activate Voice Command'}
          >
            {/* Inner Ring */}
            <div className="w-9 h-9 rounded-full border border-cyan-400/40 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>
      </div>

      {/* 4. COMMAND FEED CARD */}
      {isFeedVisible && (
        <div className="w-full relative mt-2 rounded bg-[#030914]/90 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.05)] p-3">
          {/* Feed Header */}
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-cyan-500/20">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-cyan-300 uppercase">
              COMMAND FEED
            </span>
            <button
              onClick={() => setIsFeedVisible(false)}
              className="text-cyan-500/60 hover:text-cyan-300 p-0.5 transition-colors cursor-pointer"
              title="Close Feed"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Feed Content Box */}
          <div
            ref={feedScrollRef}
            className="space-y-3 max-h-56 overflow-y-auto pr-1 text-[11px] sm:text-xs font-mono-tech leading-relaxed scrollbar-thin scrollbar-thumb-cyan-500/30"
          >
            {displayMessages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                {msg.role === 'user' ? (
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-400">YOU &gt;</span>
                    <span className="text-white font-medium">{msg.content}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 tracking-wider">
                        JARVIS &gt;
                      </span>
                      <span className="text-[10px] text-cyan-500/70">
                        {msg.timestamp}
                      </span>
                    </div>
                    <div className="text-cyan-100/90 whitespace-pre-wrap pl-3 border-l-2 border-emerald-500/40">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Currently streaming message - rendered strictly when not already committed to messages */}
            {currentMessage && currentMessage.role === 'assistant' && !messages.some((m) => m.id === currentMessage.id) && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 tracking-wider">
                    JARVIS &gt;
                  </span>
                  <span className="text-[10px] text-cyan-400 animate-pulse">STREAMING</span>
                </div>
                <div className="text-cyan-100/90 whitespace-pre-wrap pl-3 border-l-2 border-cyan-400">
                  {currentMessage.content}
                  <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1 animate-pulse" />
                </div>
              </div>
            )}

            {/* Live speech transcript preview */}
            {liveTranscript && isListening && (
              <div className="flex items-start gap-1.5 pl-2 py-1 bg-cyan-950/40 border-l-2 border-cyan-400 rounded">
                <span className="font-bold text-cyan-300 animate-pulse">LISTENING &gt;</span>
                <span className="text-cyan-100 italic">{liveTranscript}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

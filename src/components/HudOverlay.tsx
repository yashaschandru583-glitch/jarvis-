import React from 'react';
import { AssistantState, ExecutionStep, Message, ToolExecution } from '../types';
import { 
  CloudSun, 
  Search, 
  Calculator, 
  CheckCircle2, 
  ListTodo, 
  Cpu, 
  ArrowRight,
  ExternalLink,
  Clock,
  Globe
} from 'lucide-react';

interface HudOverlayProps {
  state: AssistantState;
  currentMessage: Message | null;
  liveTranscript?: string;
  executionSteps: ExecutionStep[];
  activeTool?: ToolExecution;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  state,
  currentMessage,
  liveTranscript,
  executionSteps,
  activeTool,
}) => {
  const isListening = state === 'listening';
  const isUnderstanding = state === 'understanding';
  const isThinking = state === 'thinking';
  const isGenerating = state === 'generating';
  const isSpeaking = state === 'speaking';
  const isExecuting = state === 'executing';
  const isSuccess = state === 'success';

  // 5-Stage Protocol Pipeline Visualizer
  const stages = [
    { key: 'listening', label: 'LISTENING...' },
    { key: 'understanding', label: 'UNDERSTANDING...' },
    { key: 'thinking', label: 'SEARCHING / THINKING...' },
    { key: 'generating', label: 'GENERATING RESPONSE...' },
    { key: 'speaking', label: 'SPEAKING...' },
  ];

  // Determine current active stage index
  let activeIndex = -1;
  if (isListening) activeIndex = 0;
  else if (isUnderstanding) activeIndex = 1;
  else if (isThinking || isExecuting) activeIndex = 2;
  else if (isGenerating) activeIndex = 3;
  else if (isSpeaking) activeIndex = 4;
  else if (isSuccess || (state === 'idle' && currentMessage)) {
    activeIndex = 4;
  }

  // Render Sources section below answer
  const renderSources = (sources?: Array<{ title: string; url: string; domain?: string; snippet?: string }>) => {
    if (!sources || sources.length === 0) return null;

    return (
      <div className="mt-3 pt-2.5 border-t border-cyan-900/40">
        <div className="flex items-center gap-1.5 text-[10px] font-orbitron text-cyan-400 uppercase tracking-wider mb-2">
          <Globe className="w-3 h-3 text-cyan-400" />
          <span>SOURCES</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sources.slice(0, 4).map((source, idx) => (
            <a
              key={idx}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/40 hover:border-cyan-400 text-[11px] text-cyan-200 transition-all font-mono-tech max-w-xs truncate"
              title={source.snippet || source.title}
            >
              <ExternalLink className="w-3 h-3 text-cyan-400 group-hover:text-cyan-200 transition-colors flex-shrink-0" />
              <span className="truncate">{source.domain || source.title}</span>
            </a>
          ))}
        </div>
      </div>
    );
  };

  // Render Tool Execution Result Card
  const renderToolResult = (tool: ToolExecution) => {
    const { name, args, result } = tool;

    if (name === 'get_current_time' && result) {
      return (
        <div className="mt-2.5 p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-cyan-900/40 border border-cyan-500/40 text-cyan-300">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono-tech text-cyan-400/70">ATOMIC TIME TELEMETRY</div>
              <div className="text-xs text-cyan-200 font-semibold">{result.currentDate}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono-tech text-cyan-400">{result.requestedTimezone || 'LOCAL'}</div>
            <div className="text-sm font-orbitron font-bold text-cyan-200 glow-cyan">
              {result.currentTime}
            </div>
          </div>
        </div>
      );
    }

    if (name === 'get_weather' && result) {
      return (
        <div className="mt-2.5 p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-cyan-800/40 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5 text-cyan-300 font-orbitron text-xs">
              <CloudSun className="w-4 h-4 text-cyan-400" />
              <span>METEOROLOGICAL TELEMETRY // {result.location || args.location}</span>
            </div>
            <span className="text-[10px] font-mono-tech text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
              LIVE SATELLITE
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-1.5 rounded bg-black/40 border border-cyan-900/30">
              <div className="text-[9px] text-cyan-400/60 font-mono-tech">TEMPERATURE</div>
              <div className="text-cyan-200 font-bold text-sm">{result.temperature}</div>
            </div>
            <div className="p-1.5 rounded bg-black/40 border border-cyan-900/30">
              <div className="text-[9px] text-cyan-400/60 font-mono-tech">CONDITION</div>
              <div className="text-cyan-200 font-medium truncate">{result.condition}</div>
            </div>
            <div className="p-1.5 rounded bg-black/40 border border-cyan-900/30">
              <div className="text-[9px] text-cyan-400/60 font-mono-tech">HUMIDITY</div>
              <div className="text-cyan-200 font-semibold">{result.humidity}</div>
            </div>
            <div className="p-1.5 rounded bg-black/40 border border-cyan-900/30">
              <div className="text-[9px] text-cyan-400/60 font-mono-tech">WIND</div>
              <div className="text-cyan-200 font-semibold">{result.windSpeed}</div>
            </div>
          </div>
        </div>
      );
    }

    if (name === 'calculate_math' && result) {
      return (
        <div className="mt-2.5 p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-cyan-900/40 border border-cyan-500/40 text-cyan-300">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono-tech text-cyan-400/70">ARITHMETIC EVALUATION</div>
              <div className="text-sm font-mono-tech text-cyan-200">{result.expression}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono-tech text-emerald-400">COMPUTED RESULT</div>
            <div className="text-base sm:text-lg font-orbitron font-bold text-emerald-300 glow-cyan">
              = {result.result}
            </div>
          </div>
        </div>
      );
    }

    if (name === 'manage_stark_task' && result) {
      return (
        <div className="mt-2.5 p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-cyan-800/40 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5 text-cyan-300 font-orbitron text-xs">
              <ListTodo className="w-4 h-4 text-cyan-400" />
              <span>STARK TASK PROTOCOL</span>
            </div>
            <span className="text-[10px] font-mono-tech text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> SCHEDULED
            </span>
          </div>
          {result.task && (
            <div className="p-2 rounded bg-black/50 border border-cyan-900/40 flex items-center justify-between text-xs">
              <div className="font-semibold text-cyan-200">{result.task.title}</div>
              <div className="text-[10px] font-mono-tech text-cyan-400">{result.task.due}</div>
            </div>
          )}
        </div>
      );
    }

    if (name === 'open_url' && result) {
      return (
        <div className="mt-2.5 p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-cyan-200 font-mono-tech">DISPATCHED URL: {result.url}</span>
          </div>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400 text-cyan-200 text-xs font-orbitron"
          >
            OPEN EXTERNAL
          </a>
        </div>
      );
    }

    return null;
  };

  // If no conversation yet and idle, show high-tech HUD ready prompt
  if (!currentMessage && !liveTranscript && !isListening && !isUnderstanding && !isThinking && !isGenerating && !isExecuting) {
    return (
      <div className="w-full max-w-2xl px-4 text-center">
        <div className="hud-panel p-3.5 rounded-lg border border-cyan-500/20 text-cyan-400/80 text-xs sm:text-sm font-rajdhani">
          <div className="flex items-center justify-center gap-2 text-cyan-300 font-orbitron text-xs tracking-wider mb-1">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>AI NEURAL MATRIX ONLINE // REAL-TIME KNOWLEDGE ACTIVE</span>
          </div>
          <p className="text-cyan-300/70 text-[11px] sm:text-xs">
            Speak naturally to JARVIS or type your directive below. Live web search, satellite telemetry, and precision math are active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl px-2 sm:px-4 flex flex-col gap-2.5">
      {/* 5-Stage Protocol Pipeline Visualizer */}
      <div className="w-full p-2 rounded-lg bg-slate-950/80 border border-cyan-900/50 backdrop-blur-md flex items-center justify-between gap-1 overflow-x-auto text-[10px] font-mono-tech">
        {stages.map((stage, idx) => {
          const isActive = activeIndex === idx;
          const isPassed = activeIndex > idx;
          return (
            <div
              key={stage.key}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200 glow-cyan'
                  : isPassed
                  ? 'text-cyan-400/70'
                  : 'text-cyan-800/60'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isActive
                    ? 'bg-cyan-300 animate-ping'
                    : isPassed
                    ? 'bg-emerald-400'
                    : 'bg-cyan-900'
                }`}
              />
              <span>{stage.label}</span>
              {idx < stages.length - 1 && <ArrowRight className="w-2.5 h-2.5 opacity-40 ml-1" />}
            </div>
          );
        })}
      </div>

      {/* Main Holographic Interaction Overlay Card */}
      <div className="hud-panel p-3.5 sm:p-4 rounded-xl border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        {/* Holographic Top Tag */}
        <div className="flex items-center justify-between border-b border-cyan-800/40 pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-orbitron text-xs font-bold text-cyan-300 tracking-wider">
              HOLOGRAPHIC HUD CONVERSATION
            </span>
          </div>
          <span className="text-[10px] font-mono-tech text-cyan-400/60">
            {new Date().toLocaleTimeString()}
          </span>
        </div>

        {/* Live User Transcript or Current User Prompt */}
        {(liveTranscript || (currentMessage && currentMessage.role === 'user')) && (
          <div className="mb-2.5 p-2.5 rounded bg-cyan-950/30 border border-cyan-800/30">
            <div className="flex items-center gap-1.5 text-[10px] font-orbitron text-cyan-400 uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>USER DIRECTIVE</span>
            </div>
            <p className="text-xs sm:text-sm text-cyan-100 font-medium italic">
              "{liveTranscript || currentMessage?.content}"
            </p>
          </div>
        )}

        {/* Instant PROCESSING... status banner before first token arrives */}
        {(isThinking || isUnderstanding) && (!currentMessage || currentMessage.role === 'user' || !currentMessage.content) && (
          <div className="p-3 rounded bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between animate-pulse mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-orbitron text-xs font-bold text-cyan-300 tracking-wider">
                PROCESSING...
              </span>
            </div>
            <span className="text-[10px] font-mono-tech text-cyan-400/70">
              SYNAPSE ACTIVE // STREAMING TOKENS
            </span>
          </div>
        )}

        {/* JARVIS Live Response & Tool Result */}
        {currentMessage && currentMessage.role === 'assistant' && (
          <div className="p-2.5 rounded bg-slate-900/60 border border-cyan-500/20">
            <div className="flex items-center justify-between text-[10px] font-orbitron text-cyan-300 uppercase tracking-wider mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-cyan-300 animate-ping' : 'bg-cyan-400'}`} />
                <span>J.A.R.V.I.S. RESPONSE</span>
              </div>
              <span className="text-cyan-400/60 font-mono-tech">
                {isSpeaking ? 'STREAMING VOCAL' : 'STARK AI v4.8'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-cyan-100 leading-relaxed font-rajdhani whitespace-pre-wrap">
              {currentMessage.content}
              {(isSpeaking || isGenerating) && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
              )}
            </p>

            {/* Tool Output Rendering if any */}
            {currentMessage.toolExecution && renderToolResult(currentMessage.toolExecution)}

            {/* Sources section if available */}
            {renderSources(currentMessage.sources || currentMessage.toolExecution?.result?.sources)}
          </div>
        )}

        {/* Active Tool in progress (Thinking / Executing) */}
        {(isThinking || isExecuting || isUnderstanding || isGenerating) && activeTool && (
          <div className="mt-2 p-2 rounded bg-cyan-950/60 border border-cyan-400/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-cyan-200">
              <Cpu className="w-4 h-4 text-cyan-300 animate-spin" />
              <span className="font-mono-tech">DISPATCHING TOOL: {activeTool.displayName || activeTool.name}...</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono-tech animate-pulse">RUNNING</span>
          </div>
        )}
      </div>
    </div>
  );
};

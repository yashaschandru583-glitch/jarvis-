import React, { useState } from 'react';
import { Message, ToolExecution, AssistantState } from '../types';
import { 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  ExternalLink, 
  Clock, 
  CloudSun, 
  Calculator, 
  ListTodo, 
  CheckCircle2, 
  Cpu, 
  Sparkles 
} from 'lucide-react';

interface ConversationTerminalProps {
  messages: Message[];
  currentMessage: Message | null;
  state: AssistantState;
  activeTool?: ToolExecution;
}

export const ConversationTerminal: React.FC<ConversationTerminalProps> = ({
  messages,
  currentMessage,
  state,
  activeTool,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isSpeaking = state === 'speaking';
  const isGenerating = state === 'generating';
  const isThinking = state === 'thinking';
  const isUnderstanding = state === 'understanding';

  // Format timestamp into HH:MM:SS
  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
  };

  // Get older messages (excluding the currently active one)
  const olderMessages = messages.filter((m) => !currentMessage || m.id !== currentMessage.id);

  // Render Tool Execution Result Card
  const renderToolExecution = (tool: ToolExecution) => {
    const { name, args, result } = tool;

    if (name === 'get_current_time' && result) {
      return (
        <div className="mt-2 p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs font-mono-tech">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-cyan-500">ATOMIC TIME TELEMETRY</div>
              <div className="text-cyan-200 font-bold">{result.currentDate}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-cyan-500">{result.requestedTimezone || 'LOCAL'}</div>
            <div className="text-sm font-orbitron font-bold text-cyan-100 glow-cyan">
              {result.currentTime}
            </div>
          </div>
        </div>
      );
    }

    if (name === 'get_weather' && result) {
      return (
        <div className="mt-2 p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono-tech">
          <div className="flex items-center justify-between border-b border-cyan-900/40 pb-1 mb-1.5">
            <div className="flex items-center gap-1.5 text-cyan-300 font-orbitron text-xs">
              <CloudSun className="w-4 h-4 text-cyan-400" />
              <span>METEOROLOGICAL // {result.location || args.location}</span>
            </div>
            <span className="text-[10px] text-emerald-400">RADAR SYNC</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-[9px] text-cyan-500">TEMP: </span>
              <span className="text-cyan-100 font-bold">{result.temperatureC}°C</span>
            </div>
            <div>
              <span className="text-[9px] text-cyan-500">CONDITION: </span>
              <span className="text-cyan-200">{result.condition}</span>
            </div>
            <div>
              <span className="text-[9px] text-cyan-500">HUMIDITY: </span>
              <span className="text-cyan-200">{result.humidityPercent}%</span>
            </div>
            <div>
              <span className="text-[9px] text-cyan-500">WIND: </span>
              <span className="text-cyan-200">{result.windSpeedKmh} km/h</span>
            </div>
          </div>
        </div>
      );
    }

    if (name === 'calculate_math' && result) {
      return (
        <div className="mt-2 p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs font-mono-tech">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-cyan-500">QUANTUM CALCULATION</div>
              <div className="text-cyan-300">{result.expression}</div>
            </div>
          </div>
          <div className="font-orbitron text-base font-bold text-cyan-100 glow-cyan">
            = {result.result}
          </div>
        </div>
      );
    }

    if (name === 'manage_stark_task' && result) {
      return (
        <div className="mt-2 p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono-tech">
          <div className="flex items-center gap-1.5 text-cyan-300 font-orbitron mb-1">
            <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
            <span>TASK PROTOCOL DISPATCHED</span>
          </div>
          <div className="text-cyan-200">{result.message || 'Task list synchronized.'}</div>
        </div>
      );
    }

    if (name === 'search_web' && result) {
      return (
        <div className="mt-2 p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono-tech">
          <div className="flex items-center gap-1.5 text-cyan-300 font-orbitron mb-1">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXTERNAL RECONNAISSANCE SEARCH</span>
          </div>
          <div className="text-cyan-300/80 text-[11px]">{result.summary || 'Search complete.'}</div>
        </div>
      );
    }

    return null;
  };

  // Render Web Sources
  const renderSources = (sources?: Array<{ title: string; url: string; domain?: string; snippet?: string }>) => {
    if (!sources || sources.length === 0) return null;
    return (
      <div className="mt-2 pt-2 border-t border-cyan-950/60">
        <div className="flex items-center gap-1 text-[10px] font-orbitron text-cyan-400/80 uppercase mb-1.5">
          <Globe className="w-3 h-3 text-cyan-400" />
          <span>SOURCES</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sources.slice(0, 4).map((src, i) => (
            <a
              key={i}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-700/40 hover:border-cyan-400 text-[10px] font-mono-tech text-cyan-300 hover:text-white transition-colors"
            >
              <ExternalLink className="w-2.5 h-2.5 text-cyan-400" />
              <span className="truncate max-w-[120px]">{src.domain || src.title}</span>
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-2 select-none z-20">
      {/* Collapsible History Header if older messages exist */}
      {olderMessages.length > 0 && (
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-[10px] font-mono-tech text-cyan-400/70 hover:text-cyan-200 transition-colors cursor-pointer"
          >
            <Terminal className="w-3 h-3 text-cyan-500" />
            <span>
              {isExpanded ? 'HIDE ARCHIVED LOGS' : `VIEW PREVIOUS DIRECTIVES (${olderMessages.length})`}
            </span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <span className="text-[9px] font-mono-tech text-cyan-600/60">STARK MEMORY BUFFER</span>
        </div>
      )}

      {/* Older Archived Messages (Faded slightly into background) */}
      {isExpanded && olderMessages.length > 0 && (
        <div className="mb-3 space-y-2.5 max-h-56 overflow-y-auto pr-1 border-b border-cyan-900/40 pb-3">
          {olderMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`p-2.5 rounded bg-[#030712]/70 border ${
                  isUser ? 'border-cyan-900/30' : 'border-cyan-700/30'
                } text-xs font-mono-tech opacity-75 hover:opacity-100 transition-opacity`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className={isUser ? 'text-cyan-500 font-bold' : 'text-cyan-300 font-bold'}>
                    {isUser ? 'USER //' : 'JARVIS //'} {formatTime(msg.timestamp)}
                  </span>
                  <span className="text-[9px] text-cyan-600/70">ARCHIVED</span>
                </div>
                <p className="text-cyan-200/90 whitespace-pre-wrap leading-relaxed">
                  {isUser ? `> ${msg.content}` : msg.content}
                </p>
                {msg.toolExecution && renderToolExecution(msg.toolExecution)}
                {msg.sources && renderSources(msg.sources)}
              </div>
            );
          })}
        </div>
      )}

      {/* Processing State Indicator before first token arrives */}
      {(isThinking || isUnderstanding) && (!currentMessage || currentMessage.role === 'user' || !currentMessage.content) && (
        <div className="hud-panel p-3 rounded-xl border border-cyan-500/30 bg-[#030814]/90 flex items-center justify-between animate-pulse mb-2 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-orbitron text-xs font-bold text-cyan-200 tracking-wider">
              NEURAL PROCESSING...
            </span>
          </div>
          <span className="text-[10px] font-mono-tech text-cyan-400/80">
            STREAMING DIRECTIVE // 0ms BUFFER
          </span>
        </div>
      )}

      {/* Prominent Current / Latest Message Display (Section 7) */}
      {currentMessage && (
        <div className="hud-panel p-3 sm:p-4 rounded-xl border border-cyan-400/40 bg-[#030816]/95 shadow-[0_0_25px_rgba(0,240,255,0.15)] relative">
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Header readout: USER // HH:MM:SS or JARVIS // HH:MM:SS */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-900/50 text-xs font-mono-tech">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  currentMessage.role === 'assistant'
                    ? isSpeaking
                      ? 'bg-cyan-300 animate-ping'
                      : 'bg-cyan-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="font-orbitron font-bold tracking-wider text-cyan-200">
                {currentMessage.role === 'assistant' ? 'JARVIS' : 'USER'} // {formatTime(currentMessage.timestamp)}
              </span>
            </div>

            <div className="text-[10px] text-cyan-400/80 font-mono-tech flex items-center gap-1.5">
              {currentMessage.role === 'assistant' && (
                <span className="text-emerald-400 font-semibold">
                  {isSpeaking ? '● VOCAL EMISSION' : '● DIRECTIVE COMPLETE'}
                </span>
              )}
              <span>STARK OS v4.8</span>
            </div>
          </div>

          {/* Transcript Content with futuristic font and live blinking cursor */}
          <div className="text-xs sm:text-sm text-cyan-100 font-mono-tech leading-relaxed whitespace-pre-wrap">
            <span className="text-cyan-400 font-bold mr-1">&gt;</span>
            <span>{currentMessage.content}</span>
            {(isSpeaking || isGenerating || isThinking) && (
              <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
            )}
          </div>

          {/* Tool Result Rendering if executed */}
          {(currentMessage.toolExecution || activeTool) && (
            renderToolExecution((currentMessage.toolExecution || activeTool)!)
          )}

          {/* Sources Section if available */}
          {currentMessage.sources && renderSources(currentMessage.sources)}
        </div>
      )}
    </div>
  );
};

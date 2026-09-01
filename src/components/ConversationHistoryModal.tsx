import React, { useState } from 'react';
import { X, Trash2, Download, Search, Terminal, Bot, User, Clock } from 'lucide-react';
import { Message } from '../types';

interface ConversationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onClearHistory: () => void;
}

export const ConversationHistoryModal: React.FC<ConversationHistoryModalProps> = ({
  isOpen,
  onClose,
  messages,
  onClearHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredMessages = messages.filter((m) =>
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    const dataStr = JSON.stringify(messages, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-mission-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="hud-panel w-full max-w-2xl max-h-[85vh] rounded-xl border border-cyan-500/40 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-cyan-800/40 flex items-center justify-between bg-cyan-950/30">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <span className="font-orbitron font-bold text-sm sm:text-base text-cyan-200 tracking-wider">
              MISSION LOGS & CONVERSATION ARCHIVE
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-900/40 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Action Toolbar */}
        <div className="p-3 border-b border-cyan-900/40 flex flex-wrap items-center justify-between gap-2 bg-slate-950/60">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search historical logs..."
              className="w-full pl-8 pr-3 py-1.5 rounded bg-black/50 border border-cyan-900/60 text-cyan-200 placeholder-cyan-600 text-xs focus:outline-none focus:border-cyan-400 font-rajdhani"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={messages.length === 0}
              className="px-3 py-1.5 rounded bg-cyan-900/30 hover:bg-cyan-900/60 border border-cyan-600/40 text-cyan-300 text-xs font-mono-tech flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> EXPORT
            </button>
            <button
              onClick={onClearHistory}
              disabled={messages.length === 0}
              className="px-3 py-1.5 rounded bg-red-950/30 hover:bg-red-900/50 border border-red-800/40 text-red-300 text-xs font-mono-tech flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> CLEAR
            </button>
          </div>
        </div>

        {/* Message Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="py-12 text-center text-cyan-600 font-mono-tech text-xs">
              NO CONVERSATION LOGS IN BUFFER
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg border text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-950/20 border-cyan-800/40 ml-4'
                    : 'bg-slate-900/60 border-cyan-500/30 mr-4'
                }`}
              >
                <div className="flex items-center justify-between font-orbitron text-[10px] text-cyan-400 mb-1">
                  <div className="flex items-center gap-1.5">
                    {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-cyan-300" />}
                    <span>{msg.role === 'user' ? 'USER' : 'J.A.R.V.I.S.'}</span>
                  </div>
                  <span className="font-mono-tech text-cyan-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-cyan-100 font-rajdhani">{msg.content}</p>

                {msg.toolExecution && (
                  <div className="mt-2 p-2 rounded bg-black/40 border border-cyan-900/40 text-[11px] font-mono-tech text-cyan-300">
                    <span className="text-cyan-500">TOOL:</span> {msg.toolExecution.displayName || msg.toolExecution.name}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cyan-900/40 flex items-center justify-between text-[11px] font-mono-tech text-cyan-500 bg-black/40">
          <span>BUFFER ENTRIES: {messages.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-orbitron text-xs cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

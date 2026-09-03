import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  Download,
  Activity,
  AlertCircle,
  RefreshCw,
  Cpu,
  Lock,
  ExternalLink
} from 'lucide-react';
import { desktopAgent } from '../utils/desktopAgentService';
import { DesktopAgentState } from '../types';

interface DesktopAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopAgentModal: React.FC<DesktopAgentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [agentState, setAgentState] = useState<DesktopAgentState>(desktopAgent.getState());
  const [agentUrl, setAgentUrl] = useState(desktopAgent.getAgentUrl());
  const [authToken, setAuthToken] = useState(desktopAgent.getAuthToken());
  const [isTesting, setIsTesting] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    const unsub = desktopAgent.subscribeState((state) => {
      setAgentState(state);
      setAgentUrl(state.agentUrl);
      setAuthToken(state.authToken);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const testConnection = async () => {
    setIsTesting(true);
    await desktopAgent.checkHealth();
    setIsTesting(false);
  };

  const saveConfig = () => {
    desktopAgent.setAgentUrl(agentUrl.trim());
    desktopAgent.setAuthToken(authToken.trim());
  };

  const copyRunCommand = () => {
    navigator.clipboard.writeText('node desktop-agent.mjs');
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(authToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const downloadScript = async () => {
    try {
      // Fetch the script file from root
      const res = await fetch('/desktop-agent.mjs');
      let text = '';
      if (res.ok) {
        text = await res.text();
      } else {
        text = `// JARVIS Desktop Agent script\nconsole.log("Run with node desktop-agent.mjs");`;
      }
      const blob = new Blob([text], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'desktop-agent.mjs';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#030914]/95 border border-cyan-500/40 rounded-lg shadow-[0_0_50px_rgba(0,240,255,0.25)] overflow-hidden font-mono-tech text-cyan-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/30 bg-[#061226]/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-950/80 border border-cyan-500/50 rounded text-cyan-300">
              <Cpu size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-orbitron text-base sm:text-lg font-bold tracking-wider text-cyan-100 uppercase">
                  JARVIS DESKTOP CONTROL AGENT
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 font-bold">
                  v2.5.0
                </span>
              </div>
              <p className="text-xs text-cyan-400/70 tracking-widest uppercase mt-0.5">
                SECURE LOCAL OS BRIDGE // CROSS-PLATFORM DAEMON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-cyan-400 hover:text-cyan-100 hover:bg-cyan-900/40 rounded border border-transparent hover:border-cyan-500/40 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Link Status Banner */}
        <div className="px-5 py-3 border-b border-cyan-500/25 bg-[#020712] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                agentState.isConnected
                  ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse'
                  : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]'
              }`}
            />
            <div>
              <span className="text-cyan-300 font-bold tracking-wider">
                STATUS:{' '}
                <span className={agentState.isConnected ? 'text-emerald-400' : 'text-rose-400'}>
                  {agentState.isConnected ? 'CONNECTED & AUTHORIZED' : 'AGENT DISCONNECTED'}
                </span>
              </span>
              {agentState.platform && (
                <span className="text-[11px] text-cyan-400/70 ml-2">
                  (PLATFORM: {agentState.platform.toUpperCase()})
                </span>
              )}
            </div>
          </div>

          <button
            onClick={testConnection}
            disabled={isTesting}
            className="px-3 py-1 text-xs rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/80 flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw size={13} className={isTesting ? 'animate-spin' : ''} />
            <span>{isTesting ? 'TESTING...' : 'PING AGENT'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Quick Start instructions */}
          <div className="p-4 rounded border border-cyan-500/30 bg-[#040e21]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-orbitron text-xs font-bold text-cyan-200 tracking-wider flex items-center gap-1.5">
                <Terminal size={15} className="text-cyan-400" />
                START LOCAL AGENT ON YOUR COMPUTER
              </span>
              <button
                onClick={downloadScript}
                className="px-2.5 py-1 rounded bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-800/60 text-[11px] flex items-center space-x-1 transition-colors"
              >
                <Download size={12} />
                <span>DOWNLOAD AGENT SCRIPT</span>
              </button>
            </div>
            <p className="text-cyan-300/80 mb-3 leading-relaxed">
              To allow JARVIS to open/close applications like Chrome, Calculator, VS Code, or Spotify, run the secure desktop agent in your local terminal:
            </p>

            <div className="flex items-center justify-between p-2.5 rounded bg-black/70 border border-cyan-500/40 font-mono text-cyan-200">
              <span>$ node desktop-agent.mjs</span>
              <button
                onClick={copyRunCommand}
                className="px-2 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:text-white text-[10px] flex items-center space-x-1"
              >
                {copiedCommand ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedCommand ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
          </div>

          {/* Connection Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded border border-cyan-500/25 bg-[#030c1c]">
              <label className="block text-[11px] text-cyan-400/80 font-bold uppercase tracking-wider mb-1">
                AGENT HOST / PORT
              </label>
              <input
                type="text"
                value={agentUrl}
                onChange={(e) => setAgentUrl(e.target.value)}
                onBlur={saveConfig}
                className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-cyan-500/40 text-cyan-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
                placeholder="http://127.0.0.1:39281"
              />
              <span className="text-[10px] text-cyan-500/60 mt-1 block">
                Localhost address (127.0.0.1) only.
              </span>
            </div>

            <div className="p-3 rounded border border-cyan-500/25 bg-[#030c1c]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-cyan-400/80 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Lock size={12} />
                  AUTHORIZATION TOKEN
                </label>
                <button
                  onClick={copyToken}
                  className="text-[10px] text-cyan-400 hover:text-cyan-200"
                >
                  {copiedToken ? 'COPIED' : 'COPY'}
                </button>
              </div>
              <input
                type="text"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                onBlur={saveConfig}
                className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-cyan-500/40 text-cyan-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
                placeholder="STARK-JARVIS-SECURE-LOCAL-KEY"
              />
              <span className="text-[10px] text-cyan-500/60 mt-1 block">
                Required Bearer authorization token.
              </span>
            </div>
          </div>

          {/* Security Protocols Verification Checklist */}
          <div className="p-3.5 rounded border border-cyan-500/20 bg-[#020914] space-y-2">
            <span className="font-orbitron text-xs font-bold text-cyan-300 tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              STARK SECURITY SPECIFICATION (SECTION 7 COMPLIANCE)
            </span>

            <ul className="space-y-1.5 text-[11px] text-cyan-300/80">
              <li className="flex items-center space-x-2">
                <Check size={13} className="text-emerald-400 shrink-0" />
                <span>
                  <strong>Localhost-only:</strong> Agent binds strictly to <code>127.0.0.1</code> and rejects non-local routing.
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <Check size={13} className="text-emerald-400 shrink-0" />
                <span>
                  <strong>Authentication:</strong> All IPC calls require <code>Bearer</code> token matching local config.
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <Check size={13} className="text-emerald-400 shrink-0" />
                <span>
                  <strong>Registry Allowlist:</strong> Only pre-approved applications can be executed. Arbitrary shell injection is strictly blocked.
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <Check size={13} className="text-emerald-400 shrink-0" />
                <span>
                  <strong>Safety Confirmation:</strong> Closing sensitive applications requires explicit user confirmation.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-cyan-500/30 bg-[#040e21] flex items-center justify-between text-xs">
          <span className="text-cyan-400/60">
            STARK-OS ARCHITECTURE // DESKTOP CONTROL LAYER
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-100 font-orbitron text-xs font-bold tracking-wider transition-colors"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};

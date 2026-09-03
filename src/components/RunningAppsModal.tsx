import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Power,
  Play,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Laptop,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { RunningApplication } from '../types';
import { APPLICATION_REGISTRY } from '../utils/appRegistry';
import { desktopAgent } from '../utils/desktopAgentService';

interface RunningAppsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAgentSetup: () => void;
  onLaunchApp: (appId: string) => void;
  onRequestCloseApp: (appId: string) => void;
}

export const RunningAppsModal: React.FC<RunningAppsModalProps> = ({
  isOpen,
  onClose,
  onOpenAgentSetup,
  onLaunchApp,
  onRequestCloseApp,
}) => {
  const [runningApps, setRunningApps] = useState<RunningApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());
  const [confirmAppToClose, setConfirmAppToClose] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    const health = await desktopAgent.checkHealth();
    setIsConnected(health.isConnected);

    if (health.isConnected) {
      const res = await desktopAgent.getRunningApplications();
      if (res.success) {
        setRunningApps(res.runningApps);
      }
    } else {
      setRunningApps([]);
    }
    setLastRefreshed(Date.now());
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAppRunning = (appId: string) => {
    return runningApps.some((r) => r.id === appId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#030914]/95 border border-cyan-500/40 rounded-lg shadow-[0_0_50px_rgba(0,240,255,0.25)] overflow-hidden font-mono-tech text-cyan-100 flex flex-col max-h-[90vh]">
        {/* Header HUD */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/30 bg-[#061226]/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-950/80 border border-cyan-500/50 rounded text-cyan-300">
              <Laptop size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-orbitron text-base sm:text-lg font-bold tracking-wider text-cyan-100 uppercase">
                  SYSTEM APPLICATIONS MONITOR
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 font-bold">
                  ACTIVE REGISTRY
                </span>
              </div>
              <p className="text-xs text-cyan-400/70 tracking-widest uppercase mt-0.5">
                LOCAL DESKTOP PROCESS ENUMERATION // STARK OS
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

        {/* Connection Status Banner */}
        <div className="px-5 py-2.5 border-b border-cyan-500/20 bg-[#020712] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse'
              }`}
            />
            <span className="text-cyan-300 font-medium">
              AGENT LINK:{' '}
              <strong className={isConnected ? 'text-emerald-400' : 'text-amber-400'}>
                {isConnected ? 'ONLINE (127.0.0.1:39281)' : 'STANDALONE BROWSER (AGENT OFFLINE)'}
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {!isConnected && (
              <button
                onClick={onOpenAgentSetup}
                className="text-[11px] px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60 transition-colors"
              >
                CONNECT AGENT
              </button>
            )}
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="p-1.5 text-cyan-400 hover:text-cyan-200 hover:bg-cyan-900/30 rounded border border-cyan-500/30 transition-colors flex items-center space-x-1"
              title="Refresh Process List"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span className="text-[10px]">REFRESH</span>
            </button>
          </div>
        </div>

        {/* Confirmation Overlay for terminating app */}
        {confirmAppToClose && (
          <div className="p-4 bg-rose-950/90 border-b border-rose-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="text-rose-400 shrink-0" size={24} />
              <div>
                <div className="text-sm font-bold text-rose-100 font-orbitron">
                  CONFIRM APPLICATION TERMINATION
                </div>
                <div className="text-xs text-rose-300/90 mt-0.5">
                  Terminating{' '}
                  <strong>
                    {APPLICATION_REGISTRY.find((a) => a.id === confirmAppToClose)?.name || confirmAppToClose}
                  </strong>{' '}
                  may result in loss of unsaved changes or active sessions.
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
              <button
                onClick={() => setConfirmAppToClose(null)}
                className="px-3 py-1.5 text-xs rounded border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  const target = confirmAppToClose;
                  setConfirmAppToClose(null);
                  onRequestCloseApp(target);
                }}
                className="px-3 py-1.5 text-xs rounded bg-rose-600 hover:bg-rose-500 text-white font-bold tracking-wider transition-colors"
              >
                KILL PROCESS
              </button>
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between text-xs text-cyan-400/80 mb-2">
            <span>ALLOWED APPLICATIONS REGISTRY ({APPLICATION_REGISTRY.length})</span>
            <span>
              STATUS: {runningApps.length} ACTIVE / {APPLICATION_REGISTRY.length - runningApps.length} IDLE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {APPLICATION_REGISTRY.map((app) => {
              const running = isAppRunning(app.id);

              return (
                <div
                  key={app.id}
                  className={`p-3.5 rounded border transition-all duration-200 ${
                    running
                      ? 'border-emerald-500/50 bg-[#041926]/70 shadow-[0_0_15px_rgba(52,211,153,0.15)]'
                      : 'border-cyan-500/25 bg-[#030d1e]/50 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-orbitron font-semibold text-sm text-cyan-100">
                          {app.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-cyan-400/70 mt-0.5 line-clamp-1">
                        {app.description}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1 ${
                        running
                          ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                          : 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-400/70'
                      }`}
                    >
                      {running ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          RUNNING
                        </>
                      ) : (
                        'INACTIVE'
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2.5 border-t border-cyan-500/15 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-cyan-500/70 font-mono tracking-wider uppercase">
                      ID: {app.id}
                    </span>

                    <div className="flex items-center space-x-2">
                      {running ? (
                        <button
                          onClick={() => setConfirmAppToClose(app.id)}
                          className="px-2.5 py-1 text-[11px] rounded bg-rose-950/70 border border-rose-500/40 text-rose-300 hover:bg-rose-900/80 hover:text-rose-100 flex items-center space-x-1 transition-colors"
                          title="Terminate running application"
                        >
                          <Power size={12} />
                          <span>CLOSE</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onLaunchApp(app.id)}
                          className="px-2.5 py-1 text-[11px] rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/80 hover:text-cyan-100 flex items-center space-x-1 transition-colors"
                          title="Launch application"
                        >
                          <Play size={12} />
                          <span>LAUNCH</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-cyan-500/30 bg-[#040e21] flex flex-col sm:flex-row items-center justify-between text-[11px] text-cyan-400/70 gap-2">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Voice command authorized: &quot;Jarvis, open [App]&quot; or &quot;Close [App]&quot;</span>
          </div>
          <span className="text-cyan-500/60 font-mono">
            UPDATED: {new Date(lastRefreshed).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};

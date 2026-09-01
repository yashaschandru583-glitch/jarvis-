import React, { useState, useEffect } from 'react';
import { X, Sliders, Volume2, Cpu, Eye, Shield, Check, RotateCcw } from 'lucide-react';
import { AssistantSettings } from '../types';
import { getAvailableVoices } from '../utils/speech';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantSettings;
  onUpdateSettings: (newSettings: AssistantSettings) => void;
  onClearData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearData,
}) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'ai' | 'interface' | 'privacy'>('voice');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        setVoices(getAvailableVoices());
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  if (!isOpen) return null;

  const handleChange = <K extends keyof AssistantSettings>(key: K, value: AssistantSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const handleResetDefaults = () => {
    onUpdateSettings({
      voiceEnabled: true,
      voicePitch: 0.95,
      voiceRate: 1.05,
      voiceVolume: 1.0,
      aiStyle: 'concise',
      reactorIntensity: 85,
      animationSpeed: 1.0,
      hudDensity: 'balanced',
      soundEffects: true,
      ambientHum: false,
      reducedMotion: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="hud-panel w-full max-w-xl max-h-[85vh] rounded-xl border border-cyan-500/40 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-cyan-800/40 flex items-center justify-between bg-cyan-950/30">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span className="font-orbitron font-bold text-sm sm:text-base text-cyan-200 tracking-wider">
              TACTICAL SYSTEM CONFIGURATION
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

        {/* Tab Navigation */}
        <div className="flex border-b border-cyan-900/40 bg-slate-950/60 overflow-x-auto text-xs font-orbitron">
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'voice'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40 glow-cyan'
                : 'border-transparent text-cyan-500 hover:text-cyan-300'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" /> VOICE
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40 glow-cyan'
                : 'border-transparent text-cyan-500 hover:text-cyan-300'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> AI CORE
          </button>
          <button
            onClick={() => setActiveTab('interface')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'interface'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40 glow-cyan'
                : 'border-transparent text-cyan-500 hover:text-cyan-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> INTERFACE
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40 glow-cyan'
                : 'border-transparent text-cyan-500 hover:text-cyan-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> PRIVACY
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-rajdhani">
          {/* VOICE TAB */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded bg-cyan-950/20 border border-cyan-900/40">
                <div>
                  <div className="font-orbitron font-semibold text-cyan-200 text-xs">VOCAL SYNTHESIS (TTS)</div>
                  <div className="text-cyan-400/60 text-[11px]">Enable JARVIS spoken responses</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.voiceEnabled}
                  onChange={(e) => handleChange('voiceEnabled', e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>

              {settings.voiceEnabled && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-cyan-300 font-mono-tech block">SYNTHETIC VOICE PROFILE</label>
                    <select
                      value={settings.preferredVoice || ''}
                      onChange={(e) => handleChange('preferredVoice', e.target.value)}
                      className="w-full p-2 rounded bg-black/60 border border-cyan-900/60 text-cyan-200 text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="">Default British JARVIS Profile</option>
                      {voices.map((v, i) => (
                        <option key={i} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono-tech text-cyan-400">
                      <span>VOICE PITCH</span>
                      <span>{settings.voicePitch}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.4"
                      step="0.05"
                      value={settings.voicePitch}
                      onChange={(e) => handleChange('voicePitch', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono-tech text-cyan-400">
                      <span>SPEECH CADENCE / RATE</span>
                      <span>{settings.voiceRate}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.4"
                      step="0.05"
                      value={settings.voiceRate}
                      onChange={(e) => handleChange('voiceRate', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono-tech text-cyan-400">
                      <span>VOLUME</span>
                      <span>{Math.round(settings.voiceVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.voiceVolume}
                      onChange={(e) => handleChange('voiceVolume', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI TAB */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-cyan-300 font-orbitron text-xs block">AI RESPONSE STYLE</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['concise', 'detailed', 'technical'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => handleChange('aiStyle', style)}
                      className={`p-2.5 rounded border text-center transition-all cursor-pointer ${
                        settings.aiStyle === style
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold glow-cyan'
                          : 'bg-black/40 border-cyan-900/60 text-cyan-400/60 hover:text-cyan-300'
                      }`}
                    >
                      <div className="font-orbitron uppercase text-xs">{style}</div>
                      <div className="text-[10px] font-mono-tech opacity-70 mt-0.5">
                        {style === 'concise' ? 'Crisp & Direct' : style === 'detailed' ? 'Comprehensive' : 'Stark Engineering'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded bg-cyan-950/20 border border-cyan-900/40 space-y-1">
                <div className="font-orbitron font-semibold text-cyan-200 text-xs">CORE MODEL STATUS</div>
                <div className="text-cyan-400/70 text-xs">
                  Connected via Server-Side Gemini API (gemini-3.7-flash) with dynamic tool execution.
                </div>
              </div>
            </div>
          )}

          {/* INTERFACE TAB */}
          {activeTab === 'interface' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono-tech text-cyan-400">
                  <span>ARC REACTOR INTENSITY</span>
                  <span>{settings.reactorIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={settings.reactorIntensity}
                  onChange={(e) => handleChange('reactorIntensity', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-mono-tech text-cyan-400">
                  <span>RING ROTATION SPEED</span>
                  <span>{settings.animationSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.animationSpeed}
                  onChange={(e) => handleChange('animationSpeed', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-cyan-300 font-orbitron text-xs block">HUD DENSITY</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['minimal', 'balanced', 'cyberpunk'] as const).map((density) => (
                    <button
                      key={density}
                      onClick={() => handleChange('hudDensity', density)}
                      className={`p-2 rounded border text-center transition-all cursor-pointer ${
                        settings.hudDensity === density
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-black/40 border-cyan-900/60 text-cyan-400/60'
                      }`}
                    >
                      <div className="font-orbitron uppercase text-xs">{density}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-cyan-950/20 border border-cyan-900/40">
                <div>
                  <div className="font-orbitron font-semibold text-cyan-200 text-xs">SOUND FX SYNTHESIZER</div>
                  <div className="text-cyan-400/60 text-[11px]">Holographic beeps & completion chimes</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={(e) => handleChange('soundEffects', e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-cyan-950/20 border border-cyan-900/40">
                <div>
                  <div className="font-orbitron font-semibold text-cyan-200 text-xs">REDUCE MOTION</div>
                  <div className="text-cyan-400/60 text-[11px]">Dampen high-speed rotations & flashes</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(e) => handleChange('reducedMotion', e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* PRIVACY TAB */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-3 rounded bg-cyan-950/20 border border-cyan-900/40 space-y-1">
                <div className="font-orbitron font-semibold text-cyan-200 text-xs">MICROPHONE ACCESS</div>
                <div className="text-cyan-400/70 text-xs">
                  Microphone audio is strictly captured locally and analyzed in memory via Web Audio API. No audio stream is retained on disk.
                </div>
              </div>

              <div className="p-3 rounded bg-cyan-950/20 border border-cyan-900/40 space-y-2">
                <div className="font-orbitron font-semibold text-cyan-200 text-xs">CONVERSATION MEMORY</div>
                <div className="text-cyan-400/70 text-xs">
                  Clear mission conversation memory and task caches from this browser instance.
                </div>
                <button
                  onClick={() => {
                    onClearData();
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 text-xs font-mono-tech cursor-pointer transition-colors"
                >
                  PURGE LOCAL MEMORY BUFFER
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cyan-900/40 flex items-center justify-between bg-black/40">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-300 font-mono-tech cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> RESET DEFAULTS
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-orbitron text-xs cursor-pointer flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> SAVE & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

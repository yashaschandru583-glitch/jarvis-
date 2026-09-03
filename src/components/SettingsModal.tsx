import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  Volume2, 
  Zap, 
  Shield, 
  Activity, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Sliders, 
  Wifi, 
  Mic, 
  Database,
  Play,
  Radio
} from 'lucide-react';
import { AssistantSettings, SystemTelemetry, VoiceMetrics } from '../types';
import { ttsService } from '../utils/ttsService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantSettings;
  onSaveSettings: (settings: AssistantSettings) => void;
  telemetry: SystemTelemetry;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings: initialSettings,
  onSaveSettings,
  telemetry,
}) => {
  const [settings, setSettings] = useState<AssistantSettings>(initialSettings);
  const [activeSection, setActiveSection] = useState<'ai' | 'voice' | 'reactor' | 'system'>('ai');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetrics>(() => ttsService.getMetrics());

  useEffect(() => {
    return ttsService.subscribeMetrics((m) => setVoiceMetrics(m));
  }, []);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, isOpen]);

  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  if (!isOpen) return null;

  const handleChange = <K extends keyof AssistantSettings>(key: K, value: AssistantSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    onSaveSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1500);
  };

  const handleReset = () => {
    const defaults: AssistantSettings = {
      voiceEnabled: true,
      voicePitch: 0.90, // Low & deep mature resonance
      voiceRate: 1.20, // Fast 1.20x cadence
      voiceVolume: 0.80, // 80% volume
      autoListen: false,
      interruptOnSpeech: true,
      streamingTts: true,
      preferredVoice: '',
      aiModel: 'gemini-3.6-flash',
      aiStyle: 'concise',
      contextMemory: 10,
      reactorIntensity: 85,
      animationSpeed: 1.0,
      hudDensity: 'balanced',
      soundEffects: true,
      ambientHum: true,
      reducedMotion: false,
    };
    setSettings(defaults);
    onSaveSettings(defaults);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm transition-opacity">
      {/* Click outside to close */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Slide-out Panel (Section 10) */}
      <div className="hud-panel w-full max-w-md h-full bg-[#030713]/95 border-l border-cyan-500/40 flex flex-col shadow-2xl relative overflow-hidden animate-in slide-in-from-right duration-300">
        <div className="hud-corner-tl" />
        <div className="hud-corner-bl" />

        {/* Scanline texture */}
        <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />

        {/* Header */}
        <div className="p-4 border-b border-cyan-800/40 flex items-center justify-between bg-cyan-950/40 relative z-10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="font-orbitron font-bold text-sm text-cyan-100 tracking-wider">
                SYSTEM CONFIGURATION
              </div>
              <div className="text-[10px] font-mono-tech text-cyan-400/60">
                MARK LXXXV SUBSYSTEM CONTROLS
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-900/40 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs (Section 10: AI CORE, VOICE, REACTOR, SYSTEM) */}
        <div className="flex border-b border-cyan-900/50 bg-[#02050c] text-[11px] font-mono-tech relative z-10">
          <button
            onClick={() => setActiveSection('ai')}
            className={`flex-1 py-2.5 px-2 text-center border-b-2 font-bold transition-all cursor-pointer ${
              activeSection === 'ai'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40'
                : 'border-transparent text-cyan-500/80 hover:text-cyan-300'
            }`}
          >
            AI CORE
          </button>
          <button
            onClick={() => setActiveSection('voice')}
            className={`flex-1 py-2.5 px-2 text-center border-b-2 font-bold transition-all cursor-pointer ${
              activeSection === 'voice'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40'
                : 'border-transparent text-cyan-500/80 hover:text-cyan-300'
            }`}
          >
            VOICE
          </button>
          <button
            onClick={() => setActiveSection('reactor')}
            className={`flex-1 py-2.5 px-2 text-center border-b-2 font-bold transition-all cursor-pointer ${
              activeSection === 'reactor'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40'
                : 'border-transparent text-cyan-500/80 hover:text-cyan-300'
            }`}
          >
            REACTOR
          </button>
          <button
            onClick={() => setActiveSection('system')}
            className={`flex-1 py-2.5 px-2 text-center border-b-2 font-bold transition-all cursor-pointer ${
              activeSection === 'system'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40'
                : 'border-transparent text-cyan-500/80 hover:text-cyan-300'
            }`}
          >
            SYSTEM
          </button>
        </div>

        {/* Section Content with technical controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs font-mono-tech relative z-10">
          {/* =========================================================================
              SECTION 10.1: AI CORE
              Model, Response style, Context memory
          ========================================================================== */}
          {activeSection === 'ai' && (
            <div className="space-y-4">
              {/* Model Selection */}
              <div className="space-y-1.5">
                <label className="text-cyan-300 font-bold block flex items-center justify-between">
                  <span>NEURAL MODEL</span>
                  <span className="text-[10px] text-emerald-400">STREAMING ACTIVE</span>
                </label>
                <select
                  value={settings.aiModel || 'gemini-3.6-flash'}
                  onChange={(e) => handleChange('aiModel', e.target.value)}
                  className="w-full p-2 rounded bg-black/70 border border-cyan-800/60 text-cyan-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash (Ultra-Low Latency & High Speed)</option>
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (Balanced Precision)</option>
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (Speed Priority)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Reasoning)</option>
                </select>
                <span className="text-[10px] text-cyan-500/70">
                  Primary model powering real-time SSE streaming synthesis.
                </span>
              </div>

              {/* Response Style */}
              <div className="space-y-1.5">
                <label className="text-cyan-300 font-bold block">RESPONSE STYLE</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['concise', 'detailed', 'technical'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => handleChange('aiStyle', style)}
                      className={`p-2 rounded border text-center uppercase text-[11px] font-bold cursor-pointer transition-all ${
                        settings.aiStyle === style
                          ? 'border-cyan-400 bg-cyan-950/70 text-cyan-100 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                          : 'border-cyan-900/40 bg-black/40 text-cyan-500 hover:text-cyan-300'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-cyan-500/70">
                  {settings.aiStyle === 'concise'
                    ? 'Immediate punchy answers tailored for fast voice synthesis.'
                    : settings.aiStyle === 'detailed'
                    ? 'In-depth comprehensive analysis with thorough explanations.'
                    : 'Heavy analytical and engineering terminology.'}
                </span>
              </div>

              {/* Context Memory */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>CONTEXT MEMORY WINDOW</span>
                  <span className="text-cyan-100">{settings.contextMemory || 10} TURNS</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="1"
                  value={settings.contextMemory || 10}
                  onChange={(e) => handleChange('contextMemory', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <span className="text-[10px] text-cyan-500/70">
                  Number of previous conversation directives kept in active working memory.
                </span>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 10.2: VOICE
              Deep British Male AI Voice, Speed, Pitch, Volume, Streaming, Interrupt
          ========================================================================== */}
          {activeSection === 'voice' && (
            <div className="space-y-4">
              {/* Vocal Synthesis Master Switch */}
              <div className="flex items-center justify-between p-3 rounded bg-cyan-950/30 border border-cyan-500/30">
                <div>
                  <div className="font-bold text-cyan-200 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    VOCAL SYNTHESIS (TTS)
                  </div>
                  <div className="text-cyan-500 text-[10px]">Enable JARVIS deep British spoken output</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.voiceEnabled}
                    onChange={(e) => handleChange('voiceEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
                </label>
              </div>

              {/* Streaming TTS Engine Toggle */}
              <div className="flex items-center justify-between p-3 rounded bg-cyan-950/20 border border-cyan-500/20">
                <div>
                  <div className="font-bold text-cyan-200 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    STREAMING TTS PIPELINE
                  </div>
                  <div className="text-cyan-500 text-[10px]">Speak first sentence immediately as tokens arrive</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.streamingTts ?? true}
                    onChange={(e) => handleChange('streamingTts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
                </label>
              </div>

              {/* Interrupt on User Speech Toggle */}
              <div className="flex items-center justify-between p-3 rounded bg-cyan-950/20 border border-cyan-500/20">
                <div>
                  <div className="font-bold text-cyan-200 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-cyan-400" />
                    INTERRUPT ON USER SPEECH
                  </div>
                  <div className="text-cyan-500 text-[10px]">Instantly halt voice and re-arm mic when you speak</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.interruptOnSpeech ?? true}
                    onChange={(e) => handleChange('interruptOnSpeech', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
                </label>
              </div>

              {/* Voice Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>SYNTHETIC VOICE PROFILE</span>
                  <span className="text-[10px] text-cyan-400/80 uppercase">DEEP MALE // UK ENGLISH</span>
                </div>
                <select
                  value={settings.preferredVoice || ''}
                  onChange={(e) => handleChange('preferredVoice', e.target.value)}
                  className="w-full p-2 rounded bg-black/70 border border-cyan-800/60 text-cyan-200 focus:outline-none focus:border-cyan-400 font-mono-tech text-xs"
                >
                  <option value="">Cinematic British JARVIS Profile (Auto-Detect)</option>
                  {voices.map((v, i) => (
                    <option key={i} value={v.name}>
                      {v.name} [{v.lang}] {v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('George') ? '★ MALE' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speech Speed with Slider Scale: 0.8x ─── 1.0x ─── 1.2x ─── 1.4x ─── 1.6x */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>SPEECH SPEED / CADENCE</span>
                  <span className="text-cyan-100 font-bold text-xs bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                    {settings.voiceRate.toFixed(2)}x {settings.voiceRate === 1.20 ? '(RECOMMENDED)' : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="1.60"
                  step="0.05"
                  value={settings.voiceRate}
                  onChange={(e) => handleChange('voiceRate', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                {/* Scale labels matching prompt specification */}
                <div className="flex justify-between text-[9px] font-mono-tech text-cyan-500/80 px-0.5">
                  <span>0.8x</span>
                  <span>1.0x</span>
                  <span className="text-cyan-300 font-bold">1.2x [DEFAULT]</span>
                  <span>1.4x</span>
                  <span>1.6x</span>
                </div>
              </div>

              {/* Pitch Slider: Low / Natural Deep Tone */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>VOICE PITCH / TONE DEPTH</span>
                  <span className="text-cyan-100 font-bold text-xs bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                    {settings.voicePitch <= 0.92 ? 'DEEP & MATURE' : 'NATURAL'} ({settings.voicePitch.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.70"
                  max="1.15"
                  step="0.02"
                  value={settings.voicePitch}
                  onChange={(e) => handleChange('voicePitch', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono-tech text-cyan-500/80 px-0.5">
                  <span>0.70 (Deep Bass)</span>
                  <span className="text-cyan-300 font-bold">0.90 (Cinematic AI)</span>
                  <span>1.15 (High)</span>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>SYNTHESIS VOLUME</span>
                  <span className="text-cyan-100">{Math.round(settings.voiceVolume * 100)}%</span>
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

              {/* Auto-Listen Toggle */}
              <div className="flex items-center justify-between p-3 rounded bg-cyan-950/30 border border-cyan-500/30">
                <div>
                  <div className="font-bold text-cyan-200">AUTO-LISTEN MODE</div>
                  <div className="text-cyan-500 text-[10px]">Automatically arm mic after JARVIS finishes speaking</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoListen || false}
                    onChange={(e) => handleChange('autoListen', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
                </label>
              </div>

              {/* TEST VOICE BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isTestingVoice) {
                      ttsService.interrupt();
                      setIsTestingVoice(false);
                    } else {
                      setIsTestingVoice(true);
                      ttsService.speak(
                        'J.A.R.V.I.S. vocal synthesis online, sir. Calibrated for maximum operational efficiency and clarity.',
                        {
                          pitch: settings.voicePitch,
                          rate: settings.voiceRate,
                          volume: settings.voiceVolume,
                          preferredVoice: settings.preferredVoice,
                          onEnd: () => setIsTestingVoice(false),
                          onInterrupted: () => setIsTestingVoice(false),
                        }
                      );
                    }
                  }}
                  className={`w-full py-2.5 px-4 rounded border flex items-center justify-center gap-2 font-orbitron font-bold text-xs tracking-wider cursor-pointer transition-all ${
                    isTestingVoice
                      ? 'border-amber-400 bg-amber-950/60 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse'
                      : 'border-cyan-400 bg-cyan-950/60 text-cyan-100 hover:bg-cyan-900/60 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                  }`}
                >
                  <Play className={`w-3.5 h-3.5 ${isTestingVoice ? 'fill-amber-400 text-amber-400' : 'fill-cyan-400 text-cyan-400'}`} />
                  {isTestingVoice ? 'STOPPING VOICE TEST...' : 'TEST VOICE SYNTHESIS'}
                </button>
              </div>

              {/* Real-time Technical Voice Metrics Telemetry Box */}
              <div className="p-2.5 rounded bg-black/80 border border-cyan-500/25 font-mono-tech text-[10px] space-y-1 text-cyan-400/80">
                <div className="text-cyan-300 font-bold uppercase tracking-wider pb-1 border-b border-cyan-500/20 flex justify-between items-center">
                  <span>TTS TELEMETRY BENCHMARK</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${voiceMetrics.voiceActive ? 'bg-cyan-300 animate-ping' : 'bg-emerald-400'}`} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div>AI RESPONSE: <span className="text-cyan-100 font-bold">{voiceMetrics.aiResponseTime}s</span></div>
                  <div>TTS START: <span className="text-cyan-100 font-bold">{voiceMetrics.ttsStartTime}s</span></div>
                  <div>AUDIO BUFFER: <span className="text-cyan-100 font-bold">{voiceMetrics.audioBufferTime}ms</span></div>
                  <div>VOICE: <span className={`font-bold ${voiceMetrics.voiceActive ? 'text-cyan-300 animate-pulse' : 'text-emerald-400'}`}>{voiceMetrics.voiceActive ? 'ACTIVE' : 'READY'}</span></div>
                </div>
                {voiceMetrics.providerName && (
                  <div className="text-[9px] text-cyan-500/70 truncate pt-0.5">
                    PROFILE: {voiceMetrics.providerName}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 10.3: REACTOR
              Glow intensity, Animation intensity, HUD density
          ========================================================================== */}
          {activeSection === 'reactor' && (
            <div className="space-y-4">
              {/* Glow Intensity */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>GLOW INTENSITY</span>
                  <span className="text-cyan-100">{settings.reactorIntensity}%</span>
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

              {/* Animation Intensity / Speed */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span>ANIMATION INTENSITY</span>
                  <span className="text-cyan-100">{settings.animationSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.animationSpeed}
                  onChange={(e) => handleChange('animationSpeed', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* HUD Density */}
              <div className="space-y-1.5">
                <label className="text-cyan-300 font-bold block">HUD DENSITY</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['minimal', 'balanced', 'cyberpunk'] as const).map((density) => (
                    <button
                      key={density}
                      type="button"
                      onClick={() => handleChange('hudDensity', density)}
                      className={`p-2 rounded border text-center uppercase text-[11px] font-bold cursor-pointer transition-all ${
                        settings.hudDensity === density
                          ? 'border-cyan-400 bg-cyan-950/70 text-cyan-100 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                          : 'border-cyan-900/40 bg-black/40 text-cyan-500 hover:text-cyan-300'
                      }`}
                    >
                      {density}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Effects & Ambient Hum */}
              <div className="flex items-center justify-between p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20">
                <span className="text-cyan-300">AUDIO SFX</span>
                <input
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={(e) => handleChange('soundEffects', e.target.checked)}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20">
                <span className="text-cyan-300">AMBIENT REACTOR HUM</span>
                <input
                  type="checkbox"
                  checked={settings.ambientHum}
                  onChange={(e) => handleChange('ambientHum', e.target.checked)}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 10.4: SYSTEM
              Network status, Microphone status, API status
          ========================================================================== */}
          {activeSection === 'system' && (
            <div className="space-y-4">
              {/* Network Status */}
              <div className="p-3 rounded bg-cyan-950/30 border border-cyan-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                    <span>NETWORK STATUS</span>
                  </span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ONLINE
                  </span>
                </div>
                <div className="text-[10px] text-cyan-500">
                  Sub-millisecond loopback container proxy // HTTP/2 SSE active
                </div>
              </div>

              {/* Microphone Status */}
              <div className="p-3 rounded bg-cyan-950/30 border border-cyan-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-cyan-400" />
                    <span>MICROPHONE STATUS</span>
                  </span>
                  <span className="text-cyan-200 font-bold">ARMED / READY</span>
                </div>
                <div className="text-[10px] text-cyan-500">
                  Web Speech API + Web Audio API 16-bit 48kHz analyzer active
                </div>
              </div>

              {/* API Status */}
              <div className="p-3 rounded bg-cyan-950/30 border border-cyan-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>API STATUS</span>
                  </span>
                  <span className="text-emerald-400 font-bold">OPERATIONAL</span>
                </div>
                <div className="text-[10px] text-cyan-500">
                  Google Gemini Developer API // Endpoint: /api/assistant/stream
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Reset and Live Saved status */}
        <div className="p-4 border-t border-cyan-900/50 bg-[#02050c] flex items-center justify-between relative z-10 text-xs font-mono-tech">
          <button
            type="button"
            onClick={handleReset}
            className="text-cyan-500 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTORE DEFAULTS</span>
          </button>

          {isSaved && (
            <span className="text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
              <Check className="w-3.5 h-3.5" />
              <span>SAVED</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

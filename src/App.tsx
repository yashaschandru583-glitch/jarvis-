import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AssistantState, 
  AssistantSettings, 
  ExecutionStep, 
  Message, 
  StarkTask, 
  SystemTelemetry, 
  ToolExecution 
} from './types';
import { ArcReactor } from './components/ArcReactor';
import { MicController } from './components/MicController';
import { HudOverlay } from './components/HudOverlay';
import { HudTelemetry } from './components/HudTelemetry';
import { ConversationHistoryModal } from './components/ConversationHistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { TaskTrackerModal } from './components/TaskTrackerModal';
import { soundFx } from './utils/audioSynthesizer';
import { 
  startSpeechRecognition, 
  stopSpeechRecognition, 
  speakJarvis, 
  stopJarvisSpeech 
} from './utils/speech';

const DEFAULT_SETTINGS: AssistantSettings = {
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
};

export default function App() {
  const [state, setState] = useState<AssistantState>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [activeTool, setActiveTool] = useState<ToolExecution | undefined>(undefined);
  const [tasks, setTasks] = useState<StarkTask[]>([]);
  
  const [settings, setSettings] = useState<AssistantSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jarvis_settings');
      if (saved) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch (_) {}
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    coreOutputGW: 3.42,
    coreTempKelvin: 418.5,
    efficiencyPercent: 99.4,
    frequencyHz: 60.02,
    batteryStatus: 'FUSION COUPLING (99.8%)',
    networkStatus: 'STARK SATELLITE 10 Gbps',
    activeModel: 'gemini-3.7-flash',
    demoMode: false,
  });

  // Modal open states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem('jarvis_settings', JSON.stringify(settings));
    soundFx.setAmbientHum(settings.ambientHum && state !== 'speaking');
  }, [settings, state]);

  // Fetch initial telemetry and tasks from server
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [telRes, taskRes] = await Promise.all([
          fetch('/api/system/telemetry'),
          fetch('/api/tasks')
        ]);
        if (telRes.ok) {
          const telData = await telRes.json();
          setTelemetry(telData);
        }
        if (taskRes.ok) {
          const taskData = await taskRes.json();
          setTasks(taskData.tasks || []);
        }
      } catch (err) {
        console.warn('Init fetch error:', err);
      }
    };
    fetchInitData();
  }, []);

  // Stop vocal and speech recognition
  const handleStop = useCallback(() => {
    stopSpeechRecognition();
    stopJarvisSpeech();
    setState('idle');
    setAudioLevel(0);
    setLiveTranscript('');
    soundFx.playClick(settings.soundEffects);
  }, [settings.soundEffects]);

  // Process directive with Gemini server-side endpoint
  const processDirective = async (prompt: string) => {
    if (!prompt.trim()) return;

    // Create User Message
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setCurrentMessage(userMsg);
    setLiveTranscript('');
    setState('understanding');
    soundFx.playProcessingPulse(settings.soundEffects);

    // Initial steps
    const initSteps: ExecutionStep[] = [
      { stage: 'listening', label: 'Captured Voice Input', timestamp: Date.now() },
      { stage: 'understanding', label: 'Semantic & Intent Analysis', timestamp: Date.now() },
      { stage: 'thinking', label: 'Accessing AI Neural Core', timestamp: Date.now() },
    ];
    setExecutionSteps(initSteps);

    try {
      // Transition from understanding to thinking/searching
      await new Promise((r) => setTimeout(r, 250));
      setState('thinking');

      const res = await fetch('/api/assistant/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          style: settings.aiStyle,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned error ${res.status}`);
      }

      const data = await res.json();

      // If tool was executed
      if (data.toolUsed) {
        setState('executing');
        setActiveTool({
          name: data.toolUsed.name,
          displayName: data.toolUsed.name.replace(/_/g, ' ').toUpperCase(),
          args: data.toolUsed.args,
          result: data.toolUsed.result,
          status: 'success',
        });
        soundFx.playProcessingPulse(settings.soundEffects);
        await new Promise((r) => setTimeout(r, 450));

        // Refresh tasks if manage_stark_task was run
        if (data.toolUsed.name === 'manage_stark_task') {
          fetch('/api/tasks')
            .then((r) => r.json())
            .then((d) => setTasks(d.tasks || []))
            .catch(() => {});
        }
      }

      // Generating response stage
      setState('generating');
      await new Promise((r) => setTimeout(r, 200));

      // Success indicator
      setState('success');
      soundFx.playSuccess(settings.soundEffects);

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply,
        sources: data.sources || data.toolUsed?.result?.sources,
        timestamp: Date.now(),
        toolExecution: data.toolUsed ? {
          name: data.toolUsed.name,
          displayName: data.toolUsed.name.replace(/_/g, ' ').toUpperCase(),
          args: data.toolUsed.args,
          result: data.toolUsed.result,
          status: 'success',
        } : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentMessage(assistantMsg);

      // Completed stage step
      setExecutionSteps((prev) => [
        ...prev,
        { stage: 'completed', label: 'Protocol Completed', timestamp: Date.now() },
      ]);

      // Speak response if enabled
      if (settings.voiceEnabled) {
        setState('speaking');
        speakJarvis(data.reply, {
          pitch: settings.voicePitch,
          rate: settings.voiceRate,
          volume: settings.voiceVolume,
          preferredVoice: settings.preferredVoice,
          onAudioLevel: (lvl) => setAudioLevel(lvl),
          onEnd: () => {
            setState('idle');
            setAudioLevel(0);
          },
        });
      } else {
        setTimeout(() => {
          setState('idle');
          setAudioLevel(0);
        }, 1200);
      }
    } catch (err: any) {
      console.error('Directive execution error:', err);
      setState('error');
      soundFx.playError(settings.soundEffects);

      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `My apologies, sir. An anomaly occurred in the execution matrix: ${err.message || 'Unknown exception'}.`,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, errorMsg]);
      setCurrentMessage(errorMsg);

      if (settings.voiceEnabled) {
        setState('speaking');
        speakJarvis(errorMsg.content, {
          pitch: settings.voicePitch,
          rate: settings.voiceRate,
          volume: settings.voiceVolume,
          onAudioLevel: (lvl) => setAudioLevel(lvl),
          onEnd: () => {
            setState('idle');
            setAudioLevel(0);
          },
        });
      } else {
        setTimeout(() => setState('idle'), 2000);
      }
    }
  };

  // Activate microphone listening
  const handleActivateMic = () => {
    handleStop();
    soundFx.playReactorCharge(settings.soundEffects);
    setState('listening');
    setLiveTranscript('');

    startSpeechRecognition({
      onStart: () => {
        setState('listening');
      },
      onResult: (transcript, isFinal) => {
        setLiveTranscript(transcript);
        if (isFinal && transcript.trim()) {
          stopSpeechRecognition();
          processDirective(transcript.trim());
        }
      },
      onAudioLevel: (lvl) => {
        setAudioLevel(lvl);
      },
      onError: (err) => {
        console.warn('Speech recognition error callback:', err);
        setState('error');
        soundFx.playError(settings.soundEffects);
        setTimeout(() => setState('idle'), 1800);
      },
      onEnd: () => {
        // If ended without final result while still listening
        if (state === 'listening' && liveTranscript.trim()) {
          processDirective(liveTranscript.trim());
        }
      },
    });
  };

  // Keyboard shortcut: Space to activate voice when not in an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (state === 'idle') {
          handleActivateMic();
        } else if (state === 'listening' || state === 'speaking') {
          handleStop();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, settings.soundEffects, handleStop]);

  // Task actions
  const handleAddTask = async (taskData: { title: string; due?: string; priority: 'low' | 'medium' | 'high' }) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
        soundFx.playClick(settings.soundEffects);
      }
    } catch (e) {
      console.warn('Add task error:', e);
    }
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
        soundFx.playClick(settings.soundEffects);
      }
    } catch (e) {
      console.warn('Toggle task error:', e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
        soundFx.playClick(settings.soundEffects);
      }
    } catch (e) {
      console.warn('Delete task error:', e);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    setCurrentMessage(null);
    setLiveTranscript('');
    soundFx.playClick(settings.soundEffects);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between relative overflow-x-hidden scanlines">
      {/* Background Arc Energy Flare Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      {/* TOP HEADER HUD TELEMETRY */}
      <HudTelemetry
        state={state}
        telemetry={telemetry}
        soundEnabled={settings.soundEffects}
        onToggleSound={() => setSettings((s) => ({ ...s, soundEffects: !s.soundEffects }))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenTasks={() => setIsTasksOpen(true)}
        density={settings.hudDensity}
      />

      {/* MAIN CENTERPIECE: THE ARC REACTOR & HOLOGRAPHIC HUD */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 relative z-10 gap-3 sm:gap-5 w-full max-w-5xl mx-auto my-auto">
        {/* Centerpiece Mechanical Arc Reactor */}
        <ArcReactor
          state={state}
          audioLevel={audioLevel}
          onClick={handleActivateMic}
          intensity={settings.reactorIntensity}
          animationSpeed={settings.animationSpeed}
          activeActionLabel={activeTool?.displayName}
          reducedMotion={settings.reducedMotion}
        />

        {/* Dynamic Holographic Dialogue HUD Overlay */}
        <HudOverlay
          state={state}
          currentMessage={currentMessage}
          liveTranscript={liveTranscript}
          executionSteps={executionSteps}
          activeTool={activeTool}
        />

        {/* Microphone Controller & Directive Dispatcher */}
        <MicController
          state={state}
          onActivateMic={handleActivateMic}
          onStop={handleStop}
          onSubmitText={processDirective}
          disabled={false}
        />
      </main>

      {/* FOOTER HUD STATUS BAR */}
      <footer className="w-full max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between border-t border-cyan-500/20 bg-[#02040a]/85 text-[10px] font-mono-tech text-cyan-500/80 z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            S.H.I.E.L.D. ENCRYPTED TERMINAL // ID: 884-JVS
          </span>
          <span className="hidden sm:inline text-cyan-600">|</span>
          <span className="hidden sm:inline">ARC FUSION: 12.4 GW</span>
          <span className="hidden md:inline text-cyan-600">|</span>
          <span className="hidden md:inline">QUANTUM ENCRYPTION: ACTIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-cyan-500/70">JARVIS CLOUD COMPUTE // NODE: 14-B</span>
          <span className="text-cyan-300 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            ONLINE
          </span>
        </div>
      </footer>

      {/* MODALS */}
      <ConversationHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        messages={messages}
        onClearHistory={handleClearHistory}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onClearData={handleClearHistory}
      />

      <TaskTrackerModal
        isOpen={isTasksOpen}
        onClose={() => setIsTasksOpen(false)}
        tasks={tasks}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
}

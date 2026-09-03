import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AssistantState, 
  AssistantSettings, 
  DesktopActionDetail,
  DesktopAgentState,
  ExecutionStep, 
  Message, 
  StarkTask, 
  SystemTelemetry, 
  ToolExecution 
} from './types';
import { ArcReactor } from './components/ArcReactor';
import { ReactorHudSurround } from './components/ReactorHudSurround';
import { CommandConsole } from './components/CommandConsole';
import { ConversationTerminal } from './components/ConversationTerminal';
import { HudTelemetry } from './components/HudTelemetry';
import { JarvisTopBar } from './components/JarvisTopBar';
import { JarvisLeftColumn } from './components/JarvisLeftColumn';
import { JarvisRightColumn } from './components/JarvisRightColumn';
import { JarvisCenterColumn } from './components/JarvisCenterColumn';
import { ConversationHistoryModal } from './components/ConversationHistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { SystemInfoModal } from './components/SystemInfoModal';
import { TaskTrackerModal } from './components/TaskTrackerModal';
import { DesktopAgentModal } from './components/DesktopAgentModal';
import { RunningAppsModal } from './components/RunningAppsModal';
import { BootSequence } from './components/BootSequence';
import { soundFx } from './utils/audioSynthesizer';
import { desktopAgent } from './utils/desktopAgentService';
import { 
  startSpeechRecognition, 
  stopSpeechRecognition, 
  speakJarvis, 
  stopJarvisSpeech,
  streamingSpeaker 
} from './utils/speech';
import { ttsService } from './utils/ttsService';

const DEFAULT_SETTINGS: AssistantSettings = {
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
  
  // Boot Sequence State (Section 11)
  const [isBooting, setIsBooting] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('jarvis_booted');
    }
    return true;
  });

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
    activeModel: 'gemini-3.6-flash',
    demoMode: false,
  });

  // Modal open states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isSystemInfoOpen, setIsSystemInfoOpen] = useState(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState(false);
  const [isRunningAppsOpen, setIsRunningAppsOpen] = useState(false);

  // Desktop Control Action HUD state
  const [desktopAction, setDesktopAction] = useState<DesktopActionDetail | null>(null);
  const [desktopAgentState, setDesktopAgentState] = useState<DesktopAgentState>(() => desktopAgent.getState());

  // Listen to desktop agent connection and action lifecycle stages
  useEffect(() => {
    const unsubState = desktopAgent.subscribeState((newState) => {
      setDesktopAgentState(newState);
    });
    const unsubAction = desktopAgent.subscribeAction((action) => {
      setDesktopAction(action);
      if (action.stage === 'success' || action.stage === 'failed') {
        setTimeout(() => {
          setDesktopAction((curr) => (curr?.id === action.id ? null : curr));
        }, 4500);
      }
    });
    desktopAgent.checkHealth();
    return () => {
      unsubState();
      unsubAction();
    };
  }, []);

  // Helper to dispatch desktop action lifecycle to HUD and local daemon
  const dispatchDesktopActionFromTool = useCallback((tool: { name: string; args?: any; result?: any }) => {
    if (tool.name === 'open_desktop_application') {
      const targetName = tool.args?.applicationName || tool.result?.app || 'Application';
      desktopAgent.openApp(targetName);
    } else if (tool.name === 'close_desktop_application') {
      const targetName = tool.args?.applicationName || tool.result?.app || 'Application';
      desktopAgent.closeApp(targetName, true);
    } else if (tool.name === 'open_website') {
      const url = tool.args?.url || tool.result?.url || '';
      desktopAgent.openWebsite(url);
    }
  }, []);

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

  const handleBootComplete = () => {
    setIsBooting(false);
    sessionStorage.setItem('jarvis_booted', 'true');
    soundFx.playReactorCharge(settings.soundEffects);
  };

  const handleReplayBoot = () => {
    setIsBooting(true);
  };

  // Request locking, deduplication, and streaming management refs
  const isProcessingRef = useRef<boolean>(false);
  const activePromptNormalizedRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const lastSubmittedTranscriptRef = useRef<string>('');
  const lastSubmittedTimeRef = useRef<number>(0);

  // Stop vocal and speech recognition
  const handleStop = useCallback(() => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    activeRequestIdRef.current = null;
    isProcessingRef.current = false;
    activePromptNormalizedRef.current = null;
    stopSpeechRecognition();
    stopJarvisSpeech();
    setState('idle');
    setAudioLevel(0);
    setLiveTranscript('');
    setCurrentMessage(null);
    soundFx.playClick(settings.soundEffects);
  }, [settings.soundEffects]);

  // Process directive with ultra-low-latency streaming pipeline
  const processDirective = async (prompt: string) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    const normalized = cleanPrompt.toLowerCase().replace(/\s+/g, ' ').replace(/[.,!?]+$/, '');
    const now = Date.now();

    // 1. TRANSCRIPT DEDUPLICATION: Ignore duplicate command within 3s window
    if (
      normalized === lastSubmittedTranscriptRef.current &&
      now - lastSubmittedTimeRef.current < 3000
    ) {
      console.log(`[JARVIS DEDUPLICATION] Duplicate directive ignored within 3s: "${cleanPrompt}"`);
      return;
    }

    // 2. REQUEST LOCK: If already processing the EXACT SAME command, reject duplicate
    if (isProcessingRef.current && normalized === activePromptNormalizedRef.current) {
      console.log(`[JARVIS REQUEST LOCK] Already processing this directive, ignoring duplicate.`);
      return;
    }

    // 3. User intentionally interrupting with a new directive while processing or speaking
    if (isProcessingRef.current) {
      console.log(`[JARVIS INTERRUPT] Interrupting active directive with new directive: "${cleanPrompt}"`);
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }
      stopJarvisSpeech();
      stopSpeechRecognition();
    }

    // Update trackers and acquire request lock
    lastSubmittedTranscriptRef.current = normalized;
    lastSubmittedTimeRef.current = now;
    activePromptNormalizedRef.current = normalized;
    isProcessingRef.current = true;

    // Create unique request ID for this interaction
    const requestId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    activeRequestIdRef.current = requestId;

    console.log(`[JARVIS] REQUEST CREATED\nrequestId: ${requestId}\nprompt: "${cleanPrompt}"`);

    // Create and attach single AbortController for this stream
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    // Interrupt any active voice playback immediately
    stopJarvisSpeech();
    stopSpeechRecognition();

    // Create and display User Directive message with unique ID
    const userMsgId = `user-${requestId}`;
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: cleanPrompt,
      timestamp: Date.now(),
    };

    setMessages((prev) => {
      if (prev.some((m) => m.id === userMsgId)) return prev;
      return [...prev, userMsg];
    });

    setLiveTranscript('');
    setState('thinking');
    soundFx.playProcessingPulse(settings.soundEffects);

    const initSteps: ExecutionStep[] = [
      { stage: 'listening', label: 'Captured Voice Input', timestamp: Date.now() },
      { stage: 'understanding', label: 'Semantic Directive Classification', timestamp: Date.now() },
      { stage: 'thinking', label: 'Accessing Neural AI Stream', timestamp: Date.now() },
    ];
    setExecutionSteps(initSteps);

    const assistantMsgId = `asst-${requestId}`;
    let accumulatedText = '';
    let toolUsedData: ToolExecution | undefined = undefined;
    let sourcesData: any[] | undefined = undefined;
    let hasStartedVoice = false;
    const aiStartTime = performance.now();

    // Prepare streaming speech engine
    if (settings.voiceEnabled) {
      streamingSpeaker.start(
        {
          pitch: settings.voicePitch,
          rate: settings.voiceRate,
          volume: settings.voiceVolume,
          preferredVoice: settings.preferredVoice,
          onStart: () => {
            if (activeRequestIdRef.current === requestId) {
              console.log(`[JARVIS] TTS STARTED\nrequestId: ${requestId}`);
              setState('speaking');
            }
          },
          onAudioLevel: (lvl) => {
            if (activeRequestIdRef.current === requestId) {
              setAudioLevel(lvl);
            }
          },
          onInterrupted: () => {
            if (activeRequestIdRef.current === requestId) {
              setState('interrupted');
              setAudioLevel(0);
            }
          },
          onEnd: () => {
            if (activeRequestIdRef.current === requestId) {
              console.log(`[JARVIS] TTS COMPLETED\nrequestId: ${requestId}`);
              setState('idle');
              setAudioLevel(0);
              if (settings.autoListen) {
                setTimeout(() => {
                  if (activeRequestIdRef.current === requestId && !isProcessingRef.current) {
                    handleActivateMic();
                  }
                }, 200);
              }
            }
          },
        },
        aiStartTime,
        requestId
      );
    }

    try {
      console.log(`[JARVIS] AI REQUEST SENT\nrequestId: ${requestId}`);
      const memoryLimit = settings.contextMemory || 10;
      const res = await fetch('/api/assistant/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          prompt: cleanPrompt,
          history: messages.slice(-memoryLimit).map((m) => ({ role: m.role, content: m.content })),
          style: settings.aiStyle,
        }),
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server returned stream error: ${res.status}`);
      }

      console.log(`[JARVIS] STREAM STARTED\nrequestId: ${requestId}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (activeRequestIdRef.current !== requestId || abortController.signal.aborted) {
          reader.cancel().catch(() => {});
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const chunk of parts) {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (!payload) continue;

            try {
              const event = JSON.parse(payload);

              if (event.type === 'token' && typeof event.delta === 'string') {
                accumulatedText += event.delta;

                if (!hasStartedVoice) {
                  hasStartedVoice = true;
                  console.log(`[JARVIS] FIRST TOKEN\nrequestId: ${requestId}`);
                  const firstTokenTime = performance.now();
                  const aiLatency = parseFloat(((firstTokenTime - aiStartTime) / 1000).toFixed(2));
                  ttsService.setMetrics({
                    aiFirstTokenLatency: Math.max(0.05, aiLatency),
                    aiResponseTime: Math.max(0.05, aiLatency),
                  });
                  setState('speaking');
                  soundFx.playProcessingPulse(settings.soundEffects);
                }

                // Progressive UI display for single in-flight assistant response
                const progressiveMsg: Message = {
                  id: assistantMsgId,
                  role: 'assistant',
                  content: accumulatedText,
                  sources: sourcesData,
                  toolExecution: toolUsedData,
                  timestamp: Date.now(),
                };
                setCurrentMessage(progressiveMsg);

                if (settings.voiceEnabled) {
                  streamingSpeaker.pushToken(event.delta);
                }
              } else if (event.type === 'tool' && event.tool) {
                toolUsedData = {
                  name: event.tool.name,
                  displayName: event.tool.name.replace(/_/g, ' ').toUpperCase(),
                  args: event.tool.args,
                  result: event.tool.result,
                  status: 'success',
                };
                setActiveTool(toolUsedData);
                dispatchDesktopActionFromTool(event.tool);

                if (event.tool.name === 'manage_stark_task') {
                  fetch('/api/tasks')
                    .then((r) => r.json())
                    .then((d) => setTasks(d.tasks || []))
                    .catch(() => {});
                }
              } else if (event.type === 'step' && event.step) {
                setExecutionSteps((prev) => [
                  ...prev,
                  { stage: 'thinking', label: event.step, timestamp: Date.now() },
                ]);
              } else if (event.type === 'done') {
                if (event.reply && !accumulatedText) {
                  accumulatedText = event.reply;
                }
                if (event.sources) sourcesData = event.sources;
                if (event.toolUsed && !toolUsedData) {
                  toolUsedData = {
                    name: event.toolUsed.name,
                    displayName: event.toolUsed.name.replace(/_/g, ' ').toUpperCase(),
                    args: event.toolUsed.args,
                    result: event.toolUsed.result,
                    status: 'success',
                  };
                  setActiveTool(toolUsedData);
                  dispatchDesktopActionFromTool(event.toolUsed);
                }
              }
            } catch (pErr) {
              console.warn('Stream chunk parse error:', pErr);
            }
          }
        }
      }

      console.log(`[JARVIS] STREAM COMPLETED\nrequestId: ${requestId}`);

      if (activeRequestIdRef.current !== requestId || abortController.signal.aborted) {
        return;
      }

      // Finish streaming TTS chunk queue
      if (settings.voiceEnabled) {
        streamingSpeaker.finishStream();
      } else {
        setState('idle');
      }

      // Commit finalized assistant message to history
      const finalAssistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: accumulatedText || 'Directive executed, sir.',
        sources: sourcesData,
        toolExecution: toolUsedData,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === assistantMsgId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = finalAssistantMsg;
          return updated;
        }
        return [...prev, finalAssistantMsg];
      });

      // Clear currentMessage so it NEVER renders twice alongside the finalized message
      setCurrentMessage(null);

      setExecutionSteps((prev) => [
        ...prev,
        { stage: 'completed', label: 'Protocol Completed', timestamp: Date.now() },
      ]);
      console.log(`[JARVIS] REQUEST FINISHED\nrequestId: ${requestId}`);
    } catch (err: any) {
      if (err.name === 'AbortError' || activeRequestIdRef.current !== requestId) {
        console.log(`[JARVIS] Request aborted or superseded: ${requestId}`);
        return;
      }

      console.warn('Streaming failed, invoking standard assistant endpoint:', err);
      try {
        const fbRes = await fetch('/api/assistant/interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId,
            prompt: cleanPrompt,
            history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
            style: settings.aiStyle,
          }),
          signal: abortController.signal,
        });

        if (fbRes.ok && activeRequestIdRef.current === requestId) {
          const fbData = await fbRes.json();
          const fallbackMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: fbData.reply,
            sources: fbData.sources,
            toolExecution: fbData.toolUsed
              ? {
                  name: fbData.toolUsed.name,
                  displayName: fbData.toolUsed.name.replace(/_/g, ' ').toUpperCase(),
                  args: fbData.toolUsed.args,
                  result: fbData.toolUsed.result,
                  status: 'success',
                }
              : undefined,
            timestamp: Date.now(),
          };

          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === assistantMsgId);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = fallbackMsg;
              return updated;
            }
            return [...prev, fallbackMsg];
          });
          setCurrentMessage(null);

          if (fbData.toolUsed) {
            dispatchDesktopActionFromTool(fbData.toolUsed);
          }

          if (settings.voiceEnabled) {
            setState('speaking');
            speakJarvis(
              fbData.reply,
              {
                pitch: settings.voicePitch,
                rate: settings.voiceRate,
                volume: settings.voiceVolume,
                preferredVoice: settings.preferredVoice,
                onAudioLevel: (lvl) => setAudioLevel(lvl),
                onEnd: () => {
                  setState('idle');
                  setAudioLevel(0);
                },
              },
              requestId
            );
          } else {
            setState('idle');
          }
          console.log(`[JARVIS] REQUEST FINISHED\nrequestId: ${requestId}`);
          return;
        }
      } catch (fbErr: any) {
        if (fbErr.name === 'AbortError' || activeRequestIdRef.current !== requestId) return;
      }

      if (activeRequestIdRef.current === requestId) {
        setState('error');
        soundFx.playError(settings.soundEffects);
        const errorMsg: Message = {
          id: assistantMsgId,
          role: 'assistant',
          content: `My apologies, sir. An anomaly occurred in the execution matrix: ${err.message || 'Unknown exception'}.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === assistantMsgId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = errorMsg;
            return updated;
          }
          return [...prev, errorMsg];
        });
        setCurrentMessage(null);
        setTimeout(() => {
          if (activeRequestIdRef.current === requestId) setState('idle');
        }, 1000);
      }
    } finally {
      if (activeRequestIdRef.current === requestId) {
        isProcessingRef.current = false;
        activePromptNormalizedRef.current = null;
        if (activeAbortControllerRef.current === abortController) {
          activeAbortControllerRef.current = null;
        }
      }
    }
  };

  // Activate microphone listening with instant playback interruption
  const handleActivateMic = () => {
    ttsService.unlockAudioContext();
    if (state === 'speaking' || ttsService.getMetrics().voiceActive) {
      stopJarvisSpeech();
      setState('interrupted');
      setAudioLevel(0);
      soundFx.playClick(settings.soundEffects);
      armMicrophone();
      return;
    }
    armMicrophone();
  };

  const armMicrophone = () => {
    stopJarvisSpeech();
    stopSpeechRecognition();
    soundFx.playReactorCharge(settings.soundEffects);
    setState('listening');
    setLiveTranscript('');

    startSpeechRecognition({
      onStart: () => {
        setState('listening');
      },
      onResult: (transcript, isFinal) => {
        if (!isFinal) {
          // Interim transcription updates display view only
          setLiveTranscript(transcript);
          return;
        }
        // Final transcript: submit directive ONCE
        setLiveTranscript(transcript);
        stopSpeechRecognition();
        processDirective(transcript.trim());
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
        // Do NOT submit any directive here!
        // The final transcript is handled strictly by onResult(..., true).
        if (!isProcessingRef.current) {
          setState((curr) => (curr === 'listening' ? 'idle' : curr));
          setAudioLevel(0);
        }
      },
    });
  };

  // Keyboard shortcut: Space to activate voice when not in an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target === document.body || (e.target as HTMLElement).tagName === 'BODY')) {
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
    <div className="min-h-screen w-full flex flex-col justify-between relative overflow-x-hidden bg-[#020408] text-cyan-400 select-none scanlines">
      {/* System Boot Sequence Modal (Section 11) */}
      {isBooting && <BootSequence onComplete={handleBootComplete} />}

      {/* Background Arc Energy Field Gradient & Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.08)_0%,rgba(8,145,178,0.03)_50%,transparent_75%)] blur-[100px]" />
        <div className="absolute inset-0 hex-bg" />
      </div>

      {/* TOP HEADER: < JARVIS OS > v7.2.1 | JARVIS AI SYSTEM ONLINE | 10:01:13 PM SATURDAY */}
      <JarvisTopBar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* 3-COLUMN MAIN HUD INTERFACE MATCHING SCREENSHOT */}
      <div className="flex-1 w-full max-w-[1560px] mx-auto p-2 sm:p-3.5 relative z-10">
        {/* Futuristic Outer Tech Boundary Line & Corner Brackets */}
        <div className="relative w-full h-full p-2 sm:p-3 rounded-lg border border-cyan-500/20 bg-[#020612]/70 backdrop-blur-md shadow-[0_0_30px_rgba(0,240,255,0.03)]">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

          {/* Grid Layout: Left Column (Widgets), Center Column (Arc Reactor & Command Feed), Right Column (Status & Apps) */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] xl:grid-cols-[310px_1fr_310px] 2xl:grid-cols-[330px_1fr_330px] gap-3 lg:gap-4 items-start">
            {/* LEFT COLUMN */}
            <div className="flex justify-center w-full">
              <JarvisLeftColumn
                state={state}
                audioLevel={audioLevel}
                onOpenTasks={() => setIsTasksOpen(true)}
                onOpenHistory={() => setIsHistoryOpen(true)}
                onOpenSystemInfo={() => setIsSystemInfoOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onToggleMic={handleActivateMic}
              />
            </div>

            {/* CENTER COLUMN: ARC REACTOR, MODE PILLS, ENTER COMMAND BOX, COMMAND FEED */}
            <div className="flex justify-center w-full">
              <JarvisCenterColumn
                state={state}
                audioLevel={audioLevel}
                messages={messages}
                currentMessage={currentMessage}
                activeTool={activeTool}
                desktopAction={desktopAction}
                liveTranscript={liveTranscript}
                onActivateMic={handleActivateMic}
                onStop={handleStop}
                onSubmitText={processDirective}
                onSelectState={(s) => setState(s)}
                reactorIntensity={settings.reactorIntensity}
                animationSpeed={settings.animationSpeed}
                reducedMotion={settings.reducedMotion}
              />
            </div>

            {/* RIGHT COLUMN */}
            <div className="flex justify-center w-full">
              <JarvisRightColumn
                onOpenRunningApps={() => setIsRunningAppsOpen(true)}
                onOpenSystemInfo={() => setIsSystemInfoOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODALS & PANELS */}
      {/* 1. Mission History Logs */}
      <ConversationHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        messages={messages}
        onClearHistory={handleClearHistory}
      />

      {/* 2. Slide-out Settings Drawer (Section 10) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        telemetry={telemetry}
      />

      {/* 3. System Telemetry & Diagnostics Modal */}
      <SystemInfoModal
        isOpen={isSystemInfoOpen}
        onClose={() => setIsSystemInfoOpen(false)}
        telemetry={telemetry}
        onReplayBoot={handleReplayBoot}
      />

      {/* 4. Stark Task Protocol Tracker */}
      <TaskTrackerModal
        isOpen={isTasksOpen}
        onClose={() => setIsTasksOpen(false)}
        tasks={tasks}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
      />

      {/* 5. Desktop Control Agent Configuration Modal */}
      <DesktopAgentModal
        isOpen={isDesktopModalOpen}
        onClose={() => setIsDesktopModalOpen(false)}
      />

      {/* 6. Running OS Applications Monitor Modal */}
      <RunningAppsModal
        isOpen={isRunningAppsOpen}
        onClose={() => setIsRunningAppsOpen(false)}
        onOpenAgentSetup={() => {
          setIsRunningAppsOpen(false);
          setIsDesktopModalOpen(true);
        }}
        onLaunchApp={(appId) => desktopAgent.openApp(appId)}
        onRequestCloseApp={(appId) => desktopAgent.closeApp(appId, true)}
      />
    </div>
  );
}

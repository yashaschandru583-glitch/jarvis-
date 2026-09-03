import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

import {
  AssistantState,
  AssistantSettings,
  DesktopActionDetail,
  DesktopAgentState,
  ExecutionStep,
  Message,
  StarkTask,
  SystemTelemetry,
  ToolExecution,
} from './types';

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
  streamingSpeaker,
} from './utils/speech';

import { ttsService } from './utils/ttsService';

/* =========================================================
   BACKEND URL
   ========================================================= */

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/+$/, '');

function apiUrl(path: string): string {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  return `${API_BASE}${path}`;
}

/* =========================================================
   DEFAULT SETTINGS
   ========================================================= */

const DEFAULT_SETTINGS: AssistantSettings = {
  voiceEnabled: true,
  voicePitch: 0.90,
  voiceRate: 1.20,
  voiceVolume: 1.0,
  autoListen: false,
  interruptOnSpeech: true,
  streamingTts: true,
  preferredVoice: '',
  aiModel: 'gemini-2.5-flash',
  aiStyle: 'concise',
  contextMemory: 10,
  reactorIntensity: 85,
  animationSpeed: 1.0,
  hudDensity: 'balanced',
  soundEffects: true,
  ambientHum: false,
  reducedMotion: false,
};

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  const [state, setState] =
    useState<AssistantState>('idle');

  const [audioLevel, setAudioLevel] =
    useState<number>(0);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [currentMessage, setCurrentMessage] =
    useState<Message | null>(null);

  const [liveTranscript, setLiveTranscript] =
    useState<string>('');

  const [executionSteps, setExecutionSteps] =
    useState<ExecutionStep[]>([]);

  const [activeTool, setActiveTool] =
    useState<ToolExecution | undefined>(
      undefined
    );

  const [tasks, setTasks] =
    useState<StarkTask[]>([]);

  /* =========================================================
     BOOT
     ========================================================= */

  const [isBooting, setIsBooting] =
    useState<boolean>(() => {
      if (typeof window !== 'undefined') {
        return !sessionStorage.getItem(
          'jarvis_booted'
        );
      }

      return true;
    });

  /* =========================================================
     SETTINGS
     ========================================================= */

  const [settings, setSettings] =
    useState<AssistantSettings>(() => {
      if (typeof window !== 'undefined') {
        const saved =
          localStorage.getItem(
            'jarvis_settings'
          );

        if (saved) {
          try {
            return {
              ...DEFAULT_SETTINGS,
              ...JSON.parse(saved),
            };
          } catch {
            return DEFAULT_SETTINGS;
          }
        }
      }

      return DEFAULT_SETTINGS;
    });

  /* =========================================================
     TELEMETRY
     ========================================================= */

  const [telemetry, setTelemetry] =
    useState<SystemTelemetry>({
      coreOutputGW: 3.42,
      coreTempKelvin: 418.5,
      efficiencyPercent: 99.4,
      frequencyHz: 60.02,
      batteryStatus:
        'FUSION COUPLING (99.8%)',
      networkStatus:
        'STARK SATELLITE 10 Gbps',
      activeModel:
        'gemini-2.5-flash',
      demoMode: false,
    });

  /* =========================================================
     MODALS
     ========================================================= */

  const [isHistoryOpen, setIsHistoryOpen] =
    useState(false);

  const [isSettingsOpen, setIsSettingsOpen] =
    useState(false);

  const [isTasksOpen, setIsTasksOpen] =
    useState(false);

  const [isSystemInfoOpen, setIsSystemInfoOpen] =
    useState(false);

  const [isDesktopModalOpen, setIsDesktopModalOpen] =
    useState(false);

  const [isRunningAppsOpen, setIsRunningAppsOpen] =
    useState(false);

  const [isAutoplayBlocked, setIsAutoplayBlocked] =
    useState(false);

  /* =========================================================
     DESKTOP AGENT
     ========================================================= */

  const [desktopAction, setDesktopAction] =
    useState<DesktopActionDetail | null>(null);

  const [desktopAgentState, setDesktopAgentState] =
    useState<DesktopAgentState>(() =>
      desktopAgent.getState()
    );

  /* =========================================================
     AUDIO UNLOCK
     ========================================================= */

  useEffect(() => {
    const unsubscribe =
      ttsService.subscribeAutoplayBlocked(
        (blocked) => {
          setIsAutoplayBlocked(blocked);
        }
      );

    const unlockAudio = () => {
      ttsService.unlockAudioContext();
      setIsAutoplayBlocked(false);
    };

    window.addEventListener(
      'click',
      unlockAudio,
      { passive: true }
    );

    window.addEventListener(
      'touchstart',
      unlockAudio,
      { passive: true }
    );

    window.addEventListener(
      'keydown',
      unlockAudio,
      { passive: true }
    );

    return () => {
      unsubscribe();

      window.removeEventListener(
        'click',
        unlockAudio
      );

      window.removeEventListener(
        'touchstart',
        unlockAudio
      );

      window.removeEventListener(
        'keydown',
        unlockAudio
      );
    };
  }, []);

  /* =========================================================
     DESKTOP AGENT EVENTS
     ========================================================= */

  useEffect(() => {
    const unsubscribeState =
      desktopAgent.subscribeState(
        (newState) => {
          setDesktopAgentState(
            newState
          );
        }
      );

    const unsubscribeAction =
      desktopAgent.subscribeAction(
        (action) => {
          setDesktopAction(action);

          if (
            action.stage === 'success' ||
            action.stage === 'failed'
          ) {
            setTimeout(() => {
              setDesktopAction(
                (current) =>
                  current?.id === action.id
                    ? null
                    : current
              );
            }, 4500);
          }
        }
      );

    desktopAgent.checkHealth();

    return () => {
      unsubscribeState();
      unsubscribeAction();
    };
  }, []);

  /* =========================================================
     DESKTOP TOOL DISPATCH
     ========================================================= */

  const dispatchDesktopActionFromTool =
    useCallback(
      (tool: {
        name: string;
        args?: any;
        result?: any;
      }) => {
        if (
          tool.name ===
          'open_desktop_application'
        ) {
          const appName =
            tool.args?.applicationName ||
            tool.result?.app ||
            'Application';

          desktopAgent.openApp(
            appName
          );

          return;
        }

        if (
          tool.name ===
          'close_desktop_application'
        ) {
          const appName =
            tool.args?.applicationName ||
            tool.result?.app ||
            'Application';

          desktopAgent.closeApp(
            appName,
            true
          );

          return;
        }

        if (
          tool.name ===
          'open_website'
        ) {
          const url =
            tool.args?.url ||
            tool.result?.url ||
            '';

          if (url) {
            desktopAgent.openWebsite(
              url
            );
          }
        }
      },
      []
    );

  /* =========================================================
     SAVE SETTINGS
     ========================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        'jarvis_settings',
        JSON.stringify(settings)
      );
    } catch {
      // Ignore localStorage errors
    }

    soundFx.setAmbientHum(
      settings.ambientHum &&
        state !== 'speaking'
    );
  }, [settings, state]);

  /* =========================================================
     LOAD INITIAL DATA
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [
          telemetryResponse,
          tasksResponse,
        ] = await Promise.all([
          fetch(
            apiUrl(
              '/api/system/telemetry'
            )
          ),
          fetch(
            apiUrl('/api/tasks')
          ),
        ]);

        if (
          !cancelled &&
          telemetryResponse.ok
        ) {
          const data =
            await telemetryResponse.json();

          setTelemetry(data);
        }

        if (
          !cancelled &&
          tasksResponse.ok
        ) {
          const data =
            await tasksResponse.json();

          setTasks(
            data.tasks || []
          );
        }
      } catch (error) {
        console.warn(
          'Initial API error:',
          error
        );
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     BOOT HANDLERS
     ========================================================= */

  const handleBootComplete =
    () => {
      setIsBooting(false);

      sessionStorage.setItem(
        'jarvis_booted',
        'true'
      );

      soundFx.playReactorCharge(
        settings.soundEffects
      );
    };

  const handleReplayBoot =
    () => {
      sessionStorage.removeItem(
        'jarvis_booted'
      );

      setIsBooting(true);
    };

  /* =========================================================
     REQUEST CONTROL
     ========================================================= */

  const isProcessingRef =
    useRef(false);

  const activePromptNormalizedRef =
    useRef<string | null>(null);

  const activeRequestIdRef =
    useRef<string | null>(null);

  const activeAbortControllerRef =
    useRef<AbortController | null>(
      null
    );

  const lastSubmittedTranscriptRef =
    useRef('');

  const lastSubmittedTimeRef =
    useRef(0);

  /* =========================================================
     STOP EVERYTHING
     ========================================================= */

  const handleStop =
    useCallback(() => {
      if (
        activeAbortControllerRef.current
      ) {
        activeAbortControllerRef.current.abort();

        activeAbortControllerRef.current =
          null;
      }

      activeRequestIdRef.current =
        null;

      isProcessingRef.current =
        false;

      activePromptNormalizedRef.current =
        null;

      stopSpeechRecognition();

      stopJarvisSpeech();

      setState('idle');

      setAudioLevel(0);

      setLiveTranscript('');

      setCurrentMessage(null);

      soundFx.playClick(
        settings.soundEffects
      );
    }, [
      settings.soundEffects,
    ]);

  /* =========================================================
     FALLBACK API
     ========================================================= */

  const runFallbackRequest =
    async (
      requestId: string,
      assistantMessageId: string,
      prompt: string,
      abortController: AbortController
    ): Promise<boolean> => {
      try {
        const response =
          await fetch(
            apiUrl(
              '/api/assistant/interact'
            ),
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                requestId,

                prompt,

                history:
                  messages
                    .slice(-4)
                    .map(
                      (message) => ({
                        role:
                          message.role,
                        content:
                          message.content,
                      })
                    ),

                style:
                  settings.aiStyle,
              }),

              signal:
                abortController.signal,
            }
          );

        if (
          !response.ok
        ) {
          return false;
        }

        if (
          activeRequestIdRef.current !==
          requestId
        ) {
          return false;
        }

        const data =
          await response.json();

        const reply =
          data.reply ||
          'Directive processed, sir.';

        const message:
          Message = {
          id:
            assistantMessageId,

          role:
            'assistant',

          content:
            reply,

          sources:
            data.sources,

          toolExecution:
            data.toolUsed
              ? {
                  name:
                    data.toolUsed
                      .name,

                  displayName:
                    data.toolUsed
                      .name
                      .replace(
                        /_/g,
                        ' '
                      )
                      .toUpperCase(),

                  args:
                    data.toolUsed
                      .args,

                  result:
                    data.toolUsed
                      .result,

                  status:
                    'success',
                }
              : undefined,

          timestamp:
            Date.now(),
        };

        setMessages(
          (previous) => {
            const index =
              previous.findIndex(
                (item) =>
                  item.id ===
                  assistantMessageId
              );

            if (index >= 0) {
              const updated =
                [...previous];

              updated[index] =
                message;

              return updated;
            }

            return [
              ...previous,
              message,
            ];
          }
        );

        setCurrentMessage(
          null
        );

        if (
          data.toolUsed
        ) {
          setActiveTool({
            name:
              data.toolUsed
                .name,

            displayName:
              data.toolUsed
                .name
                .replace(
                  /_/g,
                  ' '
                )
                .toUpperCase(),

            args:
              data.toolUsed
                .args,

            result:
              data.toolUsed
                .result,

            status:
              'success',
          });

          dispatchDesktopActionFromTool(
            data.toolUsed
          );
        }

        if (
          settings.voiceEnabled
        ) {
          setState(
            'speaking'
          );

          speakJarvis(
            reply,
            {
              pitch:
                settings.voicePitch,

              rate:
                settings.voiceRate,

              volume:
                settings.voiceVolume,

              preferredVoice:
                settings.preferredVoice,

              onAudioLevel:
                (level) => {
                  if (
                    activeRequestIdRef.current ===
                    requestId
                  ) {
                    setAudioLevel(
                      level
                    );
                  }
                },

              onEnd: () => {
                if (
                  activeRequestIdRef.current ===
                  requestId
                ) {
                  setState(
                    'idle'
                  );

                  setAudioLevel(
                    0
                  );
                }
              },
            },
            requestId
          );
        } else {
          setState('idle');
        }

        return true;
      } catch (error: any) {
        if (
          error?.name ===
          'AbortError'
        ) {
          return false;
        }

        console.warn(
          'Fallback API error:',
          error
        );

        return false;
      }
    };

  /* =========================================================
     PROCESS DIRECTIVE
     ========================================================= */

  const processDirective =
    async (
      prompt: string
    ) => {
      const cleanPrompt =
        prompt.trim();

      if (!cleanPrompt) {
        return;
      }

      const normalized =
        cleanPrompt
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .replace(/[.,!?]+$/, '');

      const now =
        Date.now();

      /* -----------------------------------------------------
         DUPLICATE PROTECTION
         ----------------------------------------------------- */

      if (
        normalized ===
          lastSubmittedTranscriptRef.current &&
        now -
          lastSubmittedTimeRef.current <
          3000
      ) {
        console.log(
          '[JARVIS] Duplicate directive ignored.'
        );

        return;
      }

      /* -----------------------------------------------------
         SAME ACTIVE REQUEST
         ----------------------------------------------------- */

      if (
        isProcessingRef.current &&
        normalized ===
          activePromptNormalizedRef.current
      ) {
        console.log(
          '[JARVIS] Active duplicate ignored.'
        );

        return;
      }

      /* -----------------------------------------------------
         INTERRUPT OLD REQUEST
         ----------------------------------------------------- */

      if (
        isProcessingRef.current
      ) {
        if (
          activeAbortControllerRef.current
        ) {
          activeAbortControllerRef.current.abort();

          activeAbortControllerRef.current =
            null;
        }

        stopJarvisSpeech();

        stopSpeechRecognition();
      }

      /* -----------------------------------------------------
         LOCK REQUEST
         ----------------------------------------------------- */

      lastSubmittedTranscriptRef.current =
        normalized;

      lastSubmittedTimeRef.current =
        now;

      activePromptNormalizedRef.current =
        normalized;

      isProcessingRef.current =
        true;

      /* -----------------------------------------------------
         REQUEST ID
         ----------------------------------------------------- */

      const requestId =
        typeof crypto !==
          'undefined' &&
        crypto.randomUUID
          ? crypto.randomUUID()
          : `req-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 10)}`;

      activeRequestIdRef.current =
        requestId;

      const abortController =
        new AbortController();

      activeAbortControllerRef.current =
        abortController;

      console.log(
        `[JARVIS] REQUEST CREATED: ${requestId}`
      );

      /* -----------------------------------------------------
         STOP PREVIOUS AUDIO
         ----------------------------------------------------- */

      stopJarvisSpeech();

      stopSpeechRecognition();

      /* -----------------------------------------------------
         USER MESSAGE
         ----------------------------------------------------- */

      const userMessageId =
        `user-${requestId}`;

      const userMessage:
        Message = {
        id:
          userMessageId,

        role:
          'user',

        content:
          cleanPrompt,

        timestamp:
          Date.now(),
      };

      setMessages(
        (previous) => {
          if (
            previous.some(
              (item) =>
                item.id ===
                userMessageId
            )
          ) {
            return previous;
          }

          return [
            ...previous,
            userMessage,
          ];
        }
      );

      setCurrentMessage(
        null
      );

      setLiveTranscript('');

      setActiveTool(
        undefined
      );

      setExecutionSteps([
        {
          stage:
            'listening',

          label:
            'Captured Voice Input',

          timestamp:
            Date.now(),
        },

        {
          stage:
            'understanding',

          label:
            'Semantic Directive Classification',

          timestamp:
            Date.now(),
        },

        {
          stage:
            'thinking',

          label:
            'Accessing Neural AI Stream',

          timestamp:
            Date.now(),
        },
      ]);

      setState('thinking');

      soundFx.playProcessingPulse(
        settings.soundEffects
      );

      /* -----------------------------------------------------
         RESPONSE DATA
         ----------------------------------------------------- */

      const assistantMessageId =
        `asst-${requestId}`;

      let accumulatedText =
        '';

      let toolUsedData:
        | ToolExecution
        | undefined;

      let sourcesData:
        | any[]
        | undefined;

      let firstTokenReceived =
        false;

      const aiStartTime =
        performance.now();

      /* -----------------------------------------------------
         START TTS STREAM
         ----------------------------------------------------- */

      if (
        settings.voiceEnabled
      ) {
        streamingSpeaker.start(
          {
            pitch:
              settings.voicePitch,

            rate:
              settings.voiceRate,

            volume:
              settings.voiceVolume,

            preferredVoice:
              settings.preferredVoice,

            onStart: () => {
              if (
                activeRequestIdRef.current ===
                requestId
              ) {
                setState(
                  'speaking'
                );
              }
            },

            onAudioLevel:
              (level) => {
                if (
                  activeRequestIdRef.current ===
                  requestId
                ) {
                  setAudioLevel(
                    level
                  );
                }
              },

            onInterrupted:
              () => {
                if (
                  activeRequestIdRef.current ===
                  requestId
                ) {
                  setState(
                    'interrupted'
                  );

                  setAudioLevel(
                    0
                  );
                }
              },

            onEnd: () => {
              if (
                activeRequestIdRef.current ===
                requestId
              ) {
                setState(
                  'idle'
                );

                setAudioLevel(
                  0
                );
              }
            },
          },

          aiStartTime,

          requestId
        );
      }

      /* =====================================================
         MAIN REQUEST
         ===================================================== */

      try {
        const response =
          await fetch(
            apiUrl(
              '/api/assistant/stream'
            ),
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                requestId,

                prompt:
                  cleanPrompt,

                history:
                  messages
                    .slice(
                      -(
                        settings.contextMemory ||
                        10
                      )
                    )
                    .map(
                      (message) => ({
                        role:
                          message.role,

                        content:
                          message.content,
                      })
                    ),

                style:
                  settings.aiStyle,
              }),

              signal:
                abortController.signal,
            }
          );

        /* ---------------------------------------------------
           RESPONSE VALIDATION
           --------------------------------------------------- */

        if (
          !response.ok ||
          !response.body
        ) {
          let errorText =
            '';

          try {
            const errorData =
              await response.json();

            errorText =
              errorData?.error ||
              errorData?.message ||
              '';
          } catch {
            // Not JSON
          }

          throw new Error(
            errorText ||
              `Backend returned HTTP ${response.status}`
          );
        }

        console.log(
          `[JARVIS] STREAM CONNECTED: ${requestId}`
        );

        /* ---------------------------------------------------
           SSE READER
           --------------------------------------------------- */

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder();

        let buffer =
          '';

        while (true) {
          const {
            done,
            value,
          } =
            await reader.read();

          if (done) {
            break;
          }

          if (
            activeRequestIdRef.current !==
              requestId ||
            abortController.signal
              .aborted
          ) {
            try {
              await reader.cancel();
            } catch {
              // Ignore
            }

            return;
          }

          buffer +=
            decoder.decode(
              value,
              {
                stream: true,
              }
            );

          const blocks =
            buffer.split(
              '\n\n'
            );

          buffer =
            blocks.pop() ||
            '';

          for (
            const block of blocks
          ) {
            const lines =
              block.split('\n');

            for (
              const line of lines
            ) {
              if (
                !line.startsWith(
                  'data: '
                )
              ) {
                continue;
              }

              const payload =
                line
                  .slice(6)
                  .trim();

              if (
                !payload
              ) {
                continue;
              }

              let event: any;

              try {
                event =
                  JSON.parse(
                    payload
                  );
              } catch {
                console.warn(
                  '[JARVIS] Invalid SSE event'
                );

                continue;
              }

              /* ---------------------------------------------
                 TOKEN
                 --------------------------------------------- */

              if (
                event.type ===
                  'token' &&
                typeof event.delta ===
                  'string'
              ) {
                accumulatedText +=
                  event.delta;

                if (
                  !firstTokenReceived
                ) {
                  firstTokenReceived =
                    true;

                  const latency =
                    Math.max(
                      0.05,
                      (
                        performance.now() -
                        aiStartTime
                      ) /
                        1000
                    );

                  ttsService.setMetrics(
                    {
                      aiFirstTokenLatency:
                        latency,

                      aiResponseTime:
                        latency,
                    }
                  );

                  setState(
                    'speaking'
                  );

                  console.log(
                    `[JARVIS] FIRST TOKEN: ${requestId}`
                  );
                }

                const progressiveMessage:
                  Message = {
                  id:
                    assistantMessageId,

                  role:
                    'assistant',

                  content:
                    accumulatedText,

                  sources:
                    sourcesData,

                  toolExecution:
                    toolUsedData,

                  timestamp:
                    Date.now(),
                };

                setCurrentMessage(
                  progressiveMessage
                );

                if (
                  settings.voiceEnabled
                ) {
                  streamingSpeaker.pushToken(
                    event.delta
                  );
                }
              }

              /* ---------------------------------------------
                 TOOL
                 --------------------------------------------- */

              else if (
                event.type ===
                  'tool' &&
                event.tool
              ) {
                toolUsedData = {
                  name:
                    event.tool.name,

                  displayName:
                    event.tool.name
                      .replace(
                        /_/g,
                        ' '
                      )
                      .toUpperCase(),

                  args:
                    event.tool.args,

                  result:
                    event.tool.result,

                  status:
                    'success',
                };

                setActiveTool(
                  toolUsedData
                );

                dispatchDesktopActionFromTool(
                  event.tool
                );

                if (
                  event.tool.name ===
                  'manage_stark_task'
                ) {
                  fetch(
                    apiUrl(
                      '/api/tasks'
                    )
                  )
                    .then(
                      (result) =>
                        result.json()
                    )
                    .then(
                      (data) => {
                        setTasks(
                          data.tasks ||
                            []
                        );
                      }
                    )
                    .catch(
                      () => {}
                    );
                }
              }

              /* ---------------------------------------------
                 EXECUTION STEP
                 --------------------------------------------- */

              else if (
                event.type ===
                  'step' &&
                event.step
              ) {
                setExecutionSteps(
                  (previous) => [
                    ...previous,
                    {
                      stage:
                        'thinking',

                      label:
                        event.step,

                      timestamp:
                        Date.now(),
                    },
                  ]
                );
              }

              /* ---------------------------------------------
                 DONE
                 --------------------------------------------- */

              else if (
                event.type ===
                  'done'
              ) {
                if (
                  event.reply &&
                  !accumulatedText
                ) {
                  accumulatedText =
                    event.reply;
                }

                if (
                  Array.isArray(
                    event.sources
                  )
                ) {
                  sourcesData =
                    event.sources;
                }

                if (
                  event.toolUsed &&
                  !toolUsedData
                ) {
                  toolUsedData = {
                    name:
                      event.toolUsed
                        .name,

                    displayName:
                      event.toolUsed
                        .name
                        .replace(
                          /_/g,
                          ' '
                        )
                        .toUpperCase(),

                    args:
                      event.toolUsed
                        .args,

                    result:
                      event.toolUsed
                        .result,

                    status:
                      'success',
                  };

                  setActiveTool(
                    toolUsedData
                  );

                  dispatchDesktopActionFromTool(
                    event.toolUsed
                  );
                }
              }

              /* ---------------------------------------------
                 SERVER ERROR
                 --------------------------------------------- */

              else if (
                event.type ===
                  'error'
              ) {
                throw new Error(
                  event.error ||
                    event.message ||
                    'AI stream error'
                );
              }
            }
          }
        }

        /* ---------------------------------------------------
           VERIFY REQUEST
           --------------------------------------------------- */

        if (
          activeRequestIdRef.current !==
            requestId ||
          abortController.signal
            .aborted
        ) {
          return;
        }

        /* ---------------------------------------------------
           FINISH TTS
           --------------------------------------------------- */

        if (
          settings.voiceEnabled
        ) {
          streamingSpeaker.finishStream();
        } else {
          setState('idle');
        }

        /* ---------------------------------------------------
           FINAL ASSISTANT MESSAGE
           --------------------------------------------------- */

        const finalMessage:
          Message = {
          id:
            assistantMessageId,

          role:
            'assistant',

          content:
            accumulatedText ||
            'Directive executed, sir.',

          sources:
            sourcesData,

          toolExecution:
            toolUsedData,

          timestamp:
            Date.now(),
        };

        setMessages(
          (previous) => {
            const index =
              previous.findIndex(
                (message) =>
                  message.id ===
                  assistantMessageId
              );

            if (index >= 0) {
              const updated =
                [...previous];

              updated[index] =
                finalMessage;

              return updated;
            }

            return [
              ...previous,
              finalMessage,
            ];
          }
        );

        setCurrentMessage(
          null
        );

        setExecutionSteps(
          (previous) => [
            ...previous,
            {
              stage:
                'completed',

              label:
                'Protocol Completed',

              timestamp:
                Date.now(),
            },
          ]
        );

        console.log(
          `[JARVIS] REQUEST COMPLETED: ${requestId}`
        );
      }

      /* =====================================================
         CATCH
         ===================================================== */

      catch (error: any) {
        if (
          error?.name ===
            'AbortError' ||
          activeRequestIdRef.current !==
            requestId
        ) {
          console.log(
            `[JARVIS] REQUEST ABORTED: ${requestId}`
          );

          return;
        }

        console.warn(
          '[JARVIS] STREAM ERROR:',
          error
        );

        /* ---------------------------------------------------
           FALLBACK
           --------------------------------------------------- */

        const fallbackSucceeded =
          await runFallbackRequest(
            requestId,
            assistantMessageId,
            cleanPrompt,
            abortController
          );

        if (
          fallbackSucceeded
        ) {
          return;
        }

        /* ---------------------------------------------------
           ERROR MESSAGE
           --------------------------------------------------- */

        if (
          activeRequestIdRef.current ===
          requestId
        ) {
          setState('error');

          soundFx.playError(
            settings.soundEffects
          );

          const errorMessage:
            Message = {
            id:
              assistantMessageId,

            role:
              'assistant',

            content:
              'My apologies, sir. The J.A.R.V.I.S. backend is currently unavailable. Please verify the Render backend URL and server status.',

            timestamp:
              Date.now(),
          };

          setMessages(
            (previous) => {
              const index =
                previous.findIndex(
                  (message) =>
                    message.id ===
                    assistantMessageId
                );

              if (index >= 0) {
                const updated =
                  [...previous];

                updated[index] =
                  errorMessage;

                return updated;
              }

              return [
                ...previous,
                errorMessage,
              ];
            }
          );

          setCurrentMessage(
            null
          );

          setTimeout(() => {
            if (
              activeRequestIdRef.current ===
              requestId
            ) {
              setState(
                'idle'
              );
            }
          }, 1500);
        }
      }

      /* =====================================================
         FINALLY
         ===================================================== */

      finally {
        if (
          activeRequestIdRef.current ===
          requestId
        ) {
          isProcessingRef.current =
            false;

          activePromptNormalizedRef.current =
            null;

          if (
            activeAbortControllerRef.current ===
            abortController
          ) {
            activeAbortControllerRef.current =
              null;
          }
        }
      }
    };

  /* =========================================================
     MICROPHONE
     ========================================================= */

  const handleActivateMic =
    () => {
      ttsService.unlockAudioContext();

      if (
        state === 'speaking' ||
        ttsService
          .getMetrics()
          .voiceActive
      ) {
        stopJarvisSpeech();

        setState(
          'interrupted'
        );

        setAudioLevel(0);

        soundFx.playClick(
          settings.soundEffects
        );

        armMicrophone();

        return;
      }

      armMicrophone();
    };

  /* =========================================================
     ARM MICROPHONE
     ========================================================= */

  const armMicrophone =
    () => {
      stopJarvisSpeech();

      stopSpeechRecognition();

      ttsService.unlockAudioContext();

      soundFx.playReactorCharge(
        settings.soundEffects
      );

      setState('listening');

      setLiveTranscript('');

      startSpeechRecognition({
        onStart: () => {
          setState(
            'listening'
          );
        },

        onResult: (
          transcript,
          isFinal
        ) => {
          if (!isFinal) {
            setLiveTranscript(
              transcript
            );

            return;
          }

          const finalText =
            transcript.trim();

          if (!finalText) {
            return;
          }

          setLiveTranscript(
            finalText
          );

          stopSpeechRecognition();

          processDirective(
            finalText
          );
        },

        onAudioLevel:
          (level) => {
            setAudioLevel(
              level
            );
          },

        onError:
          (error) => {
            console.warn(
              'Speech recognition error:',
              error
            );

            if (
              !isProcessingRef.current
            ) {
              setState(
                'error'
              );

              soundFx.playError(
                settings.soundEffects
              );

              setTimeout(() => {
                if (
                  !isProcessingRef.current
                ) {
                  setState(
                    'idle'
                  );
                }
              }, 1800);
            }
          },

        onEnd: () => {
          /*
           * Final speech is submitted only
           * through onResult(..., true).
           */

          if (
            !isProcessingRef.current
          ) {
            setState(
              (current) =>
                current ===
                'listening'
                  ? 'idle'
                  : current
            );

            setAudioLevel(0);
          }
        },
      });
    };

  /* =========================================================
     SPACEBAR
     ========================================================= */

  useEffect(() => {
    const handleKeyDown =
      (event: KeyboardEvent) => {
        if (
          event.code !==
          'Space'
        ) {
          return;
        }

        const target =
          event.target as HTMLElement;

        const typing =
          target?.tagName ===
            'INPUT' ||
          target?.tagName ===
            'TEXTAREA' ||
          target?.isContentEditable;

        if (typing) {
          return;
        }

        event.preventDefault();

        if (
          state === 'idle'
        ) {
          handleActivateMic();
        } else if (
          state === 'listening' ||
          state === 'speaking'
        ) {
          handleStop();
        }
      };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    state,
    settings.soundEffects,
    handleStop,
  ]);

  /* =========================================================
     ADD TASK
     ========================================================= */

  const handleAddTask =
    async (taskData: {
      title: string;
      due?: string;
      priority:
        | 'low'
        | 'medium'
        | 'high';
    }) => {
      try {
        const response =
          await fetch(
            apiUrl('/api/tasks'),
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  taskData
                ),
            }
          );

        if (
          response.ok
        ) {
          const data =
            await response.json();

          setTasks(
            data.tasks || []
          );

          soundFx.playClick(
            settings.soundEffects
          );
        }
      } catch (error) {
        console.warn(
          'Add task error:',
          error
        );
      }
    };

  /* =========================================================
     TOGGLE TASK
     ========================================================= */

  const handleToggleTask =
    async (
      id: string,
      completed: boolean
    ) => {
      try {
        const response =
          await fetch(
            apiUrl(
              `/api/tasks/${id}`
            ),
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  completed,
                }),
            }
          );

        if (
          response.ok
        ) {
          const data =
            await response.json();

          setTasks(
            data.tasks || []
          );

          soundFx.playClick(
            settings.soundEffects
          );
        }
      } catch (error) {
        console.warn(
          'Toggle task error:',
          error
        );
      }
    };

  /* =========================================================
     DELETE TASK
     ========================================================= */

  const handleDeleteTask =
    async (id: string) => {
      try {
        const response =
          await fetch(
            apiUrl(
              `/api/tasks/${id}`
            ),
            {
              method:
                'DELETE',
            }
          );

        if (
          response.ok
        ) {
          const data =
            await response.json();

          setTasks(
            data.tasks || []
          );

          soundFx.playClick(
            settings.soundEffects
          );
        }
      } catch (error) {
        console.warn(
          'Delete task error:',
          error
        );
      }
    };

  /* =========================================================
     CLEAR HISTORY
     ========================================================= */

  const handleClearHistory =
    () => {
      setMessages([]);

      setCurrentMessage(
        null
      );

      setLiveTranscript('');

      setActiveTool(
        undefined
      );

      setExecutionSteps([]);

      soundFx.playClick(
        settings.soundEffects
      );
    };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="min-h-screen w-full flex flex-col justify-between relative overflow-x-hidden bg-[#020408] text-cyan-400 select-none scanlines">

      {/* BOOT */}

      {isBooting && (
        <BootSequence
          onComplete={
            handleBootComplete
          }
        />
      )}

      {/* BACKGROUND */}

      <div className="fixed inset-0 pointer-events-none z-0">

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.08)_0%,rgba(8,145,178,0.03)_50%,transparent_75%)] blur-[100px]" />

        <div className="absolute inset-0 hex-bg" />

      </div>

      {/* TOP BAR */}

      <JarvisTopBar
        onOpenSettings={() =>
          setIsSettingsOpen(
            true
          )
        }
      />

      {/* MAIN HUD */}

      <div className="flex-1 w-full max-w-[1560px] mx-auto p-2 sm:p-3.5 relative z-10">

        <div className="relative w-full h-full p-2 sm:p-3 rounded-lg border border-cyan-500/20 bg-[#020612]/70 backdrop-blur-md shadow-[0_0_30px_rgba(0,240,255,0.03)]">

          {/* CORNER BRACKETS */}

          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />

          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />

          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />

          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

          {/* THREE COLUMNS */}

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] xl:grid-cols-[310px_1fr_310px] 2xl:grid-cols-[330px_1fr_330px] gap-3 lg:gap-4 items-start">

            {/* LEFT */}

            <div className="flex justify-center w-full">

              <JarvisLeftColumn
                state={
                  state
                }

                audioLevel={
                  audioLevel
                }

                onOpenTasks={() =>
                  setIsTasksOpen(
                    true
                  )
                }

                onOpenHistory={() =>
                  setIsHistoryOpen(
                    true
                  )
                }

                onOpenSystemInfo={() =>
                  setIsSystemInfoOpen(
                    true
                  )
                }

                onOpenSettings={() =>
                  setIsSettingsOpen(
                    true
                  )
                }

                onToggleMic={
                  handleActivateMic
                }
              />

            </div>

            {/* CENTER */}

            <div className="flex justify-center w-full">

              <JarvisCenterColumn
                state={
                  state
                }

                audioLevel={
                  audioLevel
                }

                messages={
                  messages
                }

                currentMessage={
                  currentMessage
                }

                activeTool={
                  activeTool
                }

                desktopAction={
                  desktopAction
                }

                liveTranscript={
                  liveTranscript
                }

                isAutoplayBlocked={
                  isAutoplayBlocked
                }

                onDismissAutoplay={() =>
                  setIsAutoplayBlocked(
                    false
                  )
                }

                onActivateMic={
                  handleActivateMic
                }

                onStop={
                  handleStop
                }

                onSubmitText={
                  processDirective
                }

                onSelectState={(
                  selectedState
                ) =>
                  setState(
                    selectedState
                  )
                }

                reactorIntensity={
                  settings.reactorIntensity
                }

                animationSpeed={
                  settings.animationSpeed
                }

                reducedMotion={
                  settings.reducedMotion
                }
              />

            </div>

            {/* RIGHT */}

            <div className="flex justify-center w-full">

              <JarvisRightColumn
                onOpenRunningApps={() =>
                  setIsRunningAppsOpen(
                    true
                  )
                }

                onOpenSystemInfo={() =>
                  setIsSystemInfoOpen(
                    true
                  )
                }
              />

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          MODALS
          ===================================================== */}

      <ConversationHistoryModal
        isOpen={
          isHistoryOpen
        }

        onClose={() =>
          setIsHistoryOpen(
            false
          )
        }

        messages={
          messages
        }

        onClearHistory={
          handleClearHistory
        }
      />

      <SettingsModal
        isOpen={
          isSettingsOpen
        }

        onClose={() =>
          setIsSettingsOpen(
            false
          )
        }

        settings={
          settings
        }

        onSaveSettings={
          setSettings
        }

        telemetry={
          telemetry
        }
      />

      <SystemInfoModal
        isOpen={
          isSystemInfoOpen
        }

        onClose={() =>
          setIsSystemInfoOpen(
            false
          )
        }

        telemetry={
          telemetry
        }

        onReplayBoot={
          handleReplayBoot
        }
      />

      <TaskTrackerModal
        isOpen={
          isTasksOpen
        }

        onClose={() =>
          setIsTasksOpen(
            false
          )
        }

        tasks={
          tasks
        }

        onAddTask={
          handleAddTask
        }

        onToggleTask={
          handleToggleTask
        }

        onDeleteTask={
          handleDeleteTask
        }
      />

      <DesktopAgentModal
        isOpen={
          isDesktopModalOpen
        }

        onClose={() =>
          setIsDesktopModalOpen(
            false
          )
        }
      />

      <RunningAppsModal
        isOpen={
          isRunningAppsOpen
        }

        onClose={() =>
          setIsRunningAppsOpen(
            false
          )
        }

        onOpenAgentSetup={() => {
          setIsRunningAppsOpen(
            false
          );

          setIsDesktopModalOpen(
            true
          );
        }}

        onLaunchApp={(
          appId
        ) =>
          desktopAgent.openApp(
            appId
          )
        }

        onRequestCloseApp={(
          appId
        ) =>
          desktopAgent.closeApp(
            appId,
            true
          )
        }
      />

    </div>
  );
}

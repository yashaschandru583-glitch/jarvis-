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
} from './utils/speech';

/* =========================================================
   JARVIS CLIENT-SIDE CONFIGURATION
   ========================================================= */

const GEMINI_MODEL = 'gemini-2.5-flash';

const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

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
  aiModel: GEMINI_MODEL,
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
   TYPES
   ========================================================= */

interface GeminiSource {
  title?: string;
  url?: string;
  domain?: string;
  snippet?: string;
}

/* =========================================================
   GEMINI API KEY
   ========================================================= */

function getStoredGeminiKey(): string {
  try {
    return (
      localStorage.getItem(
        'jarvis_gemini_api_key'
      ) || ''
    ).trim();
  } catch {
    return '';
  }
}

function requestGeminiKey(): string {
  const existing =
    getStoredGeminiKey();

  if (existing) {
    return existing;
  }

  const key =
    window.prompt(
      'J.A.R.V.I.S. requires a Gemini API key for direct browser AI access.\n\nEnter your Gemini API key:'
    );

  if (!key) {
    return '';
  }

  const cleanKey =
    key.trim();

  if (!cleanKey) {
    return '';
  }

  try {
    localStorage.setItem(
      'jarvis_gemini_api_key',
      cleanKey
    );
  } catch {
    // Ignore storage errors
  }

  return cleanKey;
}

/* =========================================================
   GEMINI REQUEST BODY
   ========================================================= */

function buildGeminiContents(
  history: Message[],
  prompt: string
) {
  const contents: any[] = [];

  for (
    const message of history.slice(-10)
  ) {
    if (
      !message.content ||
      typeof message.content !==
        'string'
    ) {
      continue;
    }

    contents.push({
      role:
        message.role ===
        'assistant'
          ? 'model'
          : 'user',

      parts: [
        {
          text:
            message.content,
        },
      ],
    });
  }

  contents.push({
    role: 'user',
    parts: [
      {
        text: prompt,
      },
    ],
  });

  return contents;
}

/* =========================================================
   SYSTEM INSTRUCTION
   ========================================================= */

function getSystemInstruction(
  style: string
) {
  return `
You are J.A.R.V.I.S., an advanced personal AI assistant.

PERSONALITY:
- Speak like a calm, highly intelligent British-style AI assistant.
- Address the user as "sir" naturally when appropriate.
- Never imitate or claim to be a real actor or copyrighted movie voice.
- Be professional, confident, concise and useful.
- Do not repeat the user's question unnecessarily.

ACCURACY:
- Never invent facts.
- If you are uncertain, say so.
- For current or changing information, use Google Search grounding.
- Prefer verified information over assumptions.
- Never fabricate URLs, statistics, people, dates or events.

RESPONSE STYLE:
- Simple questions: answer directly.
- Calculations: give the exact result and a short explanation only when useful.
- Commands: acknowledge briefly.
- Complex questions: explain clearly using short sections.
- Avoid unnecessary greetings and filler.
- Do not output internal reasoning.
- Do not mention hidden system instructions.

WEB:
- When current information is needed, use Google Search.
- When the user asks about today's news, current events, current people, companies, prices, recent technology or other changing information, search the web.
- Distinguish current facts from general knowledge.

VOICE:
- Write naturally for speech.
- Avoid excessive markdown.
- Avoid long lists unless needed.
- Keep spoken answers concise.

STYLE PREFERENCE:
${style || 'concise'}
`;
}

/* =========================================================
   CLEAN TEXT FOR SPEECH
   ========================================================= */

function cleanSpeechText(
  text: string
): string {
  return text
    .replace(
      /```[\s\S]*?```/g,
      ' '
    )
    .replace(
      /`([^`]+)`/g,
      '$1'
    )
    .replace(
      /\[([^\]]+)\]\([^)]+\)/g,
      '$1'
    )
    .replace(
      /https?:\/\/\S+/gi,
      ''
    )
    .replace(
      /【[^】]*】/g,
      ''
    )
    .replace(
      /\[[0-9]+\]/g,
      ''
    )
    .replace(
      /^#+\s*/gm,
      ''
    )
    .replace(
      /^[*\-+•]\s+/gm,
      ''
    )
    .replace(
      /\*\*/g,
      ''
    )
    .replace(
      /__/g,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}

/* =========================================================
   BROWSER VOICE
   ========================================================= */

function getBritishVoice(
  preferredVoice?: string
): SpeechSynthesisVoice | undefined {
  if (
    typeof window ===
      'undefined' ||
    !('speechSynthesis' in window)
  ) {
    return undefined;
  }

  const voices =
    window.speechSynthesis.getVoices();

  if (!voices.length) {
    return undefined;
  }

  if (preferredVoice) {
    const preferred =
      voices.find(
        (voice) =>
          voice.name
            .toLowerCase()
            .includes(
              preferredVoice.toLowerCase()
            )
      );

    if (preferred) {
      return preferred;
    }
  }

  const britishMale =
    voices.find(
      (voice) => {
        const name =
          voice.name.toLowerCase();

        const lang =
          voice.lang.toLowerCase();

        return (
          (
            lang ===
              'en-gb' ||
            lang.startsWith(
              'en-gb'
            )
          ) &&
          !(
            name.includes('female') ||
            name.includes('zira') ||
            name.includes('hazel')
          )
        );
      }
    );

  if (britishMale) {
    return britishMale;
  }

  const british =
    voices.find(
      (voice) =>
        voice.lang
          .toLowerCase()
          .startsWith(
            'en-gb'
          )
    );

  if (british) {
    return british;
  }

  const englishMale =
    voices.find(
      (voice) => {
        const name =
          voice.name.toLowerCase();

        return (
          voice.lang
            .toLowerCase()
            .startsWith('en') &&
          !name.includes(
            'female'
          ) &&
          !name.includes(
            'zira'
          )
        );
      }
    );

  return (
    englishMale ||
    voices.find(
      (voice) =>
        voice.lang
          .toLowerCase()
          .startsWith('en')
    )
  );
}

/* =========================================================
   SPEECH ENGINE
   ========================================================= */

function speakBrowser(
  text: string,
  settings: AssistantSettings,
  requestId: string,
  isActive: () => boolean,
  onStart?: () => void,
  onEnd?: () => void,
  onLevel?: (level: number) => void
) {
  if (
    typeof window ===
      'undefined' ||
    !('speechSynthesis' in window)
  ) {
    onEnd?.();
    return;
  }

  const clean =
    cleanSpeechText(text);

  if (!clean) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      clean
    );

  const voice =
    getBritishVoice(
      settings.preferredVoice
    );

  if (voice) {
    utterance.voice =
      voice;
  }

  utterance.lang =
    'en-GB';

  utterance.rate =
    Math.max(
      0.8,
      Math.min(
        1.6,
        settings.voiceRate ||
          1.2
      )
    );

  utterance.pitch =
    Math.max(
      0.7,
      Math.min(
        1.2,
        settings.voicePitch ||
          0.9
      )
    );

  utterance.volume =
    Math.max(
      0,
      Math.min(
        1,
        settings.voiceVolume ??
          1
      )
    );

  let levelTimer:
    number | undefined;

  utterance.onstart = () => {
    if (!isActive()) {
      window.speechSynthesis.cancel();
      return;
    }

    onStart?.();

    levelTimer =
      window.setInterval(
        () => {
          if (
            !isActive()
          ) {
            window.speechSynthesis.cancel();

            if (
              levelTimer
            ) {
              clearInterval(
                levelTimer
              );
            }

            return;
          }

          const level =
            0.25 +
            Math.random() *
              0.55;

          onLevel?.(
            Math.min(
              1,
              level
            )
          );
        },
        80
      );
  };

  utterance.onend = () => {
    if (
      levelTimer
    ) {
      clearInterval(
        levelTimer
      );
    }

    onLevel?.(0);

    if (isActive()) {
      onEnd?.();
    }
  };

  utterance.onerror = () => {
    if (
      levelTimer
    ) {
      clearInterval(
        levelTimer
      );
    }

    onLevel?.(0);

    if (isActive()) {
      onEnd?.();
    }
  };

  window.speechSynthesis.speak(
    utterance
  );

  /*
   * Chrome sometimes pauses long SpeechSynthesis
   * utterances. Keep the queue alive.
   */
  window.setTimeout(() => {
    if (
      isActive() &&
      window.speechSynthesis.paused
    ) {
      window.speechSynthesis.resume();
    }
  }, 250);
}

/* =========================================================
   STOP BROWSER SPEECH
   ========================================================= */

function stopBrowserSpeech() {
  if (
    typeof window !==
      'undefined' &&
    'speechSynthesis' in window
  ) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {
      // Ignore
    }
  }
}

/* =========================================================
   PARSE GEMINI STREAM
   ========================================================= */

function extractTextFromGeminiChunk(
  data: any
): string {
  let result = '';

  const candidates =
    data?.candidates;

  if (
    Array.isArray(
      candidates
    )
  ) {
    for (
      const candidate of candidates
    ) {
      const parts =
        candidate?.content?.parts;

      if (
        Array.isArray(parts)
      ) {
        for (
          const part of parts
        ) {
          if (
            typeof part?.text ===
            'string'
          ) {
            result +=
              part.text;
          }
        }
      }
    }
  }

  return result;
}

/* =========================================================
   EXTRACT SOURCES
   ========================================================= */

function extractGeminiSources(
  data: any
): GeminiSource[] {
  const sources: GeminiSource[] =
    [];

  const chunks =
    data?.groundingMetadata
      ?.groundingChunks;

  if (
    Array.isArray(chunks)
  ) {
    for (
      const chunk of chunks
    ) {
      const web =
        chunk?.web;

      if (
        web?.uri
      ) {
        sources.push({
          title:
            web.title ||
            web.uri,

          url:
            web.uri,

          domain:
            (() => {
              try {
                return new URL(
                  web.uri
                ).hostname;
              } catch {
                return '';
              }
            })(),
        });
      }
    }
  }

  return sources;
}

/* =========================================================
   JARVIS APP
   ========================================================= */

export default function App() {
  const [state, setState] =
    useState<AssistantState>(
      'idle'
    );

  const [audioLevel, setAudioLevel] =
    useState(0);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [currentMessage, setCurrentMessage] =
    useState<Message | null>(
      null
    );

  const [liveTranscript, setLiveTranscript] =
    useState('');

  const [executionSteps, setExecutionSteps] =
    useState<ExecutionStep[]>(
      []
    );

  const [activeTool, setActiveTool] =
    useState<
      ToolExecution | undefined
    >(undefined);

  const [tasks, setTasks] =
    useState<StarkTask[]>([]);

  /* =======================================================
     BOOT
     ======================================================= */

  const [isBooting, setIsBooting] =
    useState(() => {
      if (
        typeof window !==
        'undefined'
      ) {
        return !sessionStorage.getItem(
          'jarvis_booted'
        );
      }

      return true;
    });

  /* =======================================================
     SETTINGS
     ======================================================= */

  const [settings, setSettings] =
    useState<AssistantSettings>(
      () => {
        try {
          const saved =
            localStorage.getItem(
              'jarvis_settings'
            );

          if (saved) {
            return {
              ...DEFAULT_SETTINGS,
              ...JSON.parse(saved),
            };
          }
        } catch {
          // Ignore
        }

        return DEFAULT_SETTINGS;
      }
    );

  /* =======================================================
     TELEMETRY
     ======================================================= */

  const [telemetry, setTelemetry] =
    useState<SystemTelemetry>({
      coreOutputGW: 3.42,
      coreTempKelvin: 418.5,
      efficiencyPercent: 99.4,
      frequencyHz: 60.02,
      batteryStatus:
        'FUSION COUPLING (99.8%)',
      networkStatus:
        'GEMINI DIRECT LINK',
      activeModel:
        GEMINI_MODEL,
      demoMode: false,
    });

  /* =======================================================
     MODALS
     ======================================================= */

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

  /* =======================================================
     AUTOPLAY
     ======================================================= */

  const [isAutoplayBlocked, setIsAutoplayBlocked] =
    useState(false);

  /* =======================================================
     DESKTOP AGENT
     ======================================================= */

  const [desktopAction, setDesktopAction] =
    useState<DesktopActionDetail | null>(
      null
    );

  const [desktopAgentState, setDesktopAgentState] =
    useState<DesktopAgentState>(() =>
      desktopAgent.getState()
    );

  /* =======================================================
     REQUEST REFS
     ======================================================= */

  const isProcessingRef =
    useRef(false);

  const activeRequestIdRef =
    useRef<string | null>(
      null
    );

  const activeAbortControllerRef =
    useRef<AbortController | null>(
      null
    );

  const lastPromptRef =
    useRef('');

  const lastPromptTimeRef =
    useRef(0);

  /* =======================================================
     AUDIO UNLOCK
     ======================================================= */

  useEffect(() => {
    const unlock =
      () => {
        setIsAutoplayBlocked(
          false
        );

        if (
          'speechSynthesis' in
          window
        ) {
          try {
            window.speechSynthesis.resume();
          } catch {
            // Ignore
          }
        }
      };

    window.addEventListener(
      'click',
      unlock
    );

    window.addEventListener(
      'touchstart',
      unlock
    );

    window.addEventListener(
      'keydown',
      unlock
    );

    return () => {
      window.removeEventListener(
        'click',
        unlock
      );

      window.removeEventListener(
        'touchstart',
        unlock
      );

      window.removeEventListener(
        'keydown',
        unlock
      );
    };
  }, []);

  /* =======================================================
     DESKTOP AGENT
     ======================================================= */

  useEffect(() => {
    const unsubState =
      desktopAgent.subscribeState(
        (newState) => {
          setDesktopAgentState(
            newState
          );
        }
      );

    const unsubAction =
      desktopAgent.subscribeAction(
        (action) => {
          setDesktopAction(
            action
          );

          if (
            action.stage ===
              'success' ||
            action.stage ===
              'failed'
          ) {
            setTimeout(() => {
              setDesktopAction(
                (current) =>
                  current?.id ===
                  action.id
                    ? null
                    : current
              );
            }, 4500);
          }
        }
      );

    desktopAgent.checkHealth();

    return () => {
      unsubState();
      unsubAction();
    };
  }, []);

  /* =======================================================
     DESKTOP TOOL ACTIONS
     ======================================================= */

  const dispatchDesktopAction =
    useCallback(
      (
        tool: {
          name: string;
          args?: any;
          result?: any;
        }
      ) => {
        if (
          tool.name ===
          'open_desktop_application'
        ) {
          const appName =
            tool.args
              ?.applicationName ||
            tool.result?.app;

          if (appName) {
            desktopAgent.openApp(
              appName
            );
          }

          return;
        }

        if (
          tool.name ===
          'close_desktop_application'
        ) {
          const appName =
            tool.args
              ?.applicationName ||
            tool.result?.app;

          if (appName) {
            desktopAgent.closeApp(
              appName,
              true
            );
          }

          return;
        }

        if (
          tool.name ===
          'open_website'
        ) {
          const url =
            tool.args?.url ||
            tool.result?.url;

          if (url) {
            desktopAgent.openWebsite(
              url
            );
          }
        }
      },
      []
    );

  /* =======================================================
     SETTINGS
     ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        'jarvis_settings',
        JSON.stringify(
          settings
        )
      );
    } catch {
      // Ignore
    }

    soundFx.setAmbientHum(
      settings.ambientHum &&
        state !== 'speaking'
    );
  }, [
    settings,
    state,
  ]);

  /* =======================================================
     LOCAL TASKS
     ======================================================= */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          'jarvis_tasks'
        );

      if (saved) {
        setTasks(
          JSON.parse(saved)
        );
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'jarvis_tasks',
        JSON.stringify(tasks)
      );
    } catch {
      // Ignore
    }
  }, [tasks]);

  /* =======================================================
     BOOT
     ======================================================= */

  const handleBootComplete =
    () => {
      setIsBooting(false);

      try {
        sessionStorage.setItem(
          'jarvis_booted',
          'true'
        );
      } catch {
        // Ignore
      }

      soundFx.playReactorCharge(
        settings.soundEffects
      );
    };

  const handleReplayBoot =
    () => {
      setIsBooting(true);
    };

  /* =======================================================
     STOP
     ======================================================= */

  const handleStop =
    useCallback(() => {
      activeAbortControllerRef.current?.abort();

      activeAbortControllerRef.current =
        null;

      activeRequestIdRef.current =
        null;

      isProcessingRef.current =
        false;

      stopSpeechRecognition();

      stopBrowserSpeech();

      setState('idle');

      setAudioLevel(0);

      setLiveTranscript('');

      setCurrentMessage(
        null
      );

      soundFx.playClick(
        settings.soundEffects
      );
    }, [
      settings.soundEffects,
    ]);

  /* =======================================================
     SPEAK RESPONSE
     ======================================================= */

  const speakResponse = useCallback(
    (
      text: string,
      requestId: string
    ) => {
      if (
        !settings.voiceEnabled
      ) {
        setState('idle');
        return;
      }

      setState(
        'speaking'
      );

      speakBrowser(
        text,
        settings,
        requestId,
        () =>
          activeRequestIdRef.current ===
          requestId,
        () => {
          if (
            activeRequestIdRef.current ===
            requestId
          ) {
            setState(
              'idle'
            );

            setAudioLevel(0);
          }
        },
        (level) => {
          if (
            activeRequestIdRef.current ===
            requestId
          ) {
            setAudioLevel(
              level
            );
          }
        }
      );
    },
    [settings]
  );

  /* =======================================================
     MAIN GEMINI STREAM
     ======================================================= */

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
          .replace(
            /\s+/g,
            ' '
          )
          .replace(
            /[.,!?]+$/,
            ''
          );

      const now =
        Date.now();

      /* ---------------------------------------------------
         DUPLICATE PROTECTION
         --------------------------------------------------- */

      if (
        normalized ===
          lastPromptRef.current &&
        now -
          lastPromptTimeRef.current <
          3000
      ) {
        console.log(
          '[JARVIS] Duplicate request ignored.'
        );

        return;
      }

      lastPromptRef.current =
        normalized;

      lastPromptTimeRef.current =
        now;

      /* ---------------------------------------------------
         STOP OLD REQUEST
         --------------------------------------------------- */

      if (
        isProcessingRef.current
      ) {
        activeAbortControllerRef.current?.abort();

        stopBrowserSpeech();

        stopSpeechRecognition();
      }

      isProcessingRef.current =
        true;

      const requestId =
        typeof crypto !==
          'undefined' &&
        crypto.randomUUID
          ? crypto.randomUUID()
          : `jarvis-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`;

      activeRequestIdRef.current =
        requestId;

      const controller =
        new AbortController();

      activeAbortControllerRef.current =
        controller;

      /* ---------------------------------------------------
         GEMINI KEY
         --------------------------------------------------- */

      const apiKey =
        getStoredGeminiKey() ||
        requestGeminiKey();

      if (!apiKey) {
        isProcessingRef.current =
          false;

        activeRequestIdRef.current =
          null;

        setState('idle');

        return;
      }

      /* ---------------------------------------------------
         USER MESSAGE
         --------------------------------------------------- */

      const userMessage:
        Message = {
        id:
          `user-${requestId}`,

        role:
          'user',

        content:
          cleanPrompt,

        timestamp:
          Date.now(),
      };

      setMessages(
        (previous) => [
          ...previous,
          userMessage,
        ]
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
            'Voice directive captured',

          timestamp:
            Date.now(),
        },

        {
          stage:
            'understanding',

          label:
            'Processing semantic directive',

          timestamp:
            Date.now(),
        },

        {
          stage:
            'thinking',

          label:
            'Connecting directly to Gemini',

          timestamp:
            Date.now(),
        },
      ]);

      setState('thinking');

      soundFx.playProcessingPulse(
        settings.soundEffects
      );

      const assistantMessageId =
        `assistant-${requestId}`;

      let fullResponse =
        '';

      let sources:
        GeminiSource[] =
        [];

      const responseStart =
        performance.now();

      /* ===================================================
         REQUEST
         =================================================== */

      try {
        const response =
          await fetch(
            GEMINI_ENDPOINT,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                'x-goog-api-key':
                  apiKey,
              },

              body: JSON.stringify({
                contents:
                  buildGeminiContents(
                    messages,
                    cleanPrompt
                  ),

                systemInstruction: {
                  parts: [
                    {
                      text:
                        getSystemInstruction(
                          settings.aiStyle
                        ),
                    },
                  ],
                },

                tools: [
                  {
                    google_search: {},
                  },
                ],

                generationConfig: {
                  temperature:
                    0.3,

                  maxOutputTokens:
                    2048,
                },
              }),

              signal:
                controller.signal,
            }
          );

        /* -------------------------------------------------
           API ERROR
           ------------------------------------------------- */

        if (!response.ok) {
          let errorMessage =
            `Gemini API returned HTTP ${response.status}.`;

          try {
            const errorData =
              await response.json();

            const apiError =
              errorData?.error
                ?.message;

            if (apiError) {
              errorMessage =
                apiError;
            }
          } catch {
            // Ignore
          }

          if (
            response.status ===
            400
          ) {
            errorMessage =
              `Gemini rejected the request. ${errorMessage}`;
          }

          if (
            response.status ===
            401 ||
            response.status ===
            403
          ) {
            try {
              localStorage.removeItem(
                'jarvis_gemini_api_key'
              );
            } catch {
              // Ignore
            }

            errorMessage =
              'Gemini API key was rejected. Please enter a valid Gemini API key on the next request.';
          }

          throw new Error(
            errorMessage
          );
        }

        if (
          !response.body
        ) {
          throw new Error(
            'Gemini returned an empty response stream.'
          );
        }

        setExecutionSteps(
          (previous) => [
            ...previous,
            {
              stage:
                'thinking',

              label:
                'Gemini connection established',

              timestamp:
                Date.now(),
            },
          ]
        );

        /* -------------------------------------------------
           SSE READER
           ------------------------------------------------- */

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder();

        let buffer =
          '';

        let firstToken =
          false;

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
            controller.signal
              .aborted ||
            activeRequestIdRef.current !==
              requestId
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
                stream:
                  true,
              }
            );

          const lines =
            buffer.split(
              '\n'
            );

          buffer =
            lines.pop() ||
            '';

          for (
            const line of lines
          ) {
            const trimmed =
              line.trim();

            if (
              !trimmed.startsWith(
                'data:'
              )
            ) {
              continue;
            }

            const jsonText =
              trimmed
                .slice(5)
                .trim();

            if (
              !jsonText ||
              jsonText ===
                '[DONE]'
            ) {
              continue;
            }

            let chunk:
              any;

            try {
              chunk =
                JSON.parse(
                  jsonText
                );
            } catch {
              continue;
            }

            const chunkText =
              extractTextFromGeminiChunk(
                chunk
              );

            const chunkSources =
              extractGeminiSources(
                chunk
              );

            if (
              chunkSources.length
            ) {
              sources = [
                ...sources,
                ...chunkSources,
              ].filter(
                (
                  source,
                  index,
                  array
                ) =>
                  index ===
                  array.findIndex(
                    (
                      item
                    ) =>
                      item.url ===
                      source.url
                  )
              );
            }

            if (
              chunkText
            ) {
              fullResponse +=
                chunkText;

              if (
                !firstToken
              ) {
                firstToken =
                  true;

                const latency =
                  (
                    performance.now() -
                    responseStart
                  ) / 1000;

                console.log(
                  `[JARVIS] First token in ${latency.toFixed(
                    2
                  )}s`
                );

                setState(
                  'speaking'
                );
              }

              const liveMessage:
                Message = {
                id:
                  assistantMessageId,

                role:
                  'assistant',

                content:
                  fullResponse,

                sources:
                  sources,

                timestamp:
                  Date.now(),
              };

              setCurrentMessage(
                liveMessage
              );
            }
          }
        }

        /* -------------------------------------------------
           FINAL RESPONSE
           ------------------------------------------------- */

        if (
          !fullResponse.trim()
        ) {
          throw new Error(
            'Gemini returned no text.'
          );
        }

        const finalMessage:
          Message = {
          id:
            assistantMessageId,

          role:
            'assistant',

          content:
            fullResponse.trim(),

          sources:
            sources,

          timestamp:
            Date.now(),
        };

        setMessages(
          (previous) => [
            ...previous,
            finalMessage,
          ]
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
                'Response received',

              timestamp:
                Date.now(),
            },
          ]
        );

        if (
          settings.voiceEnabled
        ) {
          speakResponse(
            fullResponse,
            requestId
          );
        } else {
          setState('idle');
        }

        console.log(
          `[JARVIS] Request completed: ${requestId}`
        );
      }

      /* ===================================================
         ERROR
         =================================================== */

      catch (error: any) {
        if (
          error?.name ===
          'AbortError'
        ) {
          return;
        }

        if (
          activeRequestIdRef.current !==
          requestId
        ) {
          return;
        }

        console.error(
          '[JARVIS] Gemini error:',
          error
        );

        stopBrowserSpeech();

        setAudioLevel(0);

        setState('error');

        soundFx.playError(
          settings.soundEffects
        );

        const message:
          Message = {
          id:
            assistantMessageId,

          role:
            'assistant',

          content:
            `I'm unable to reach the Gemini AI service. ${error?.message || 'Please check your API key and internet connection.'}`,

          timestamp:
            Date.now(),
        };

        setMessages(
          (previous) => [
            ...previous,
            message,
          ]
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
        }, 1800);
      }

      /* ===================================================
         FINALLY
         =================================================== */

      finally {
        if (
          activeRequestIdRef.current ===
          requestId
        ) {
          isProcessingRef.current =
            false;

          activeRequestIdRef.current =
            null;

          activeAbortControllerRef.current =
            null;

          setAudioLevel(
            0
          );
        }
      }
    };

  /* =======================================================
     MICROPHONE
     ======================================================= */

  const handleActivateMic =
    () => {
      if (
        state === 'speaking'
      ) {
        stopBrowserSpeech();

        setAudioLevel(0);

        setState(
          'interrupted'
        );

        armMicrophone();

        return;
      }

      armMicrophone();
    };

  const armMicrophone =
    () => {
      stopBrowserSpeech();

      stopSpeechRecognition();

      soundFx.playReactorCharge(
        settings.soundEffects
      );

      setState(
        'listening'
      );

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
          const text =
            transcript.trim();

          if (!text) {
            return;
          }

          if (!isFinal) {
            setLiveTranscript(
              text
            );

            return;
          }

          setLiveTranscript(
            text
          );

          stopSpeechRecognition();

          processDirective(
            text
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
              'Speech recognition:',
              error
            );

            setState(
              'error'
            );

            setAudioLevel(0);

            soundFx.playError(
              settings.soundEffects
            );

            setTimeout(
              () =>
                setState(
                  'idle'
                ),
              1500
            );
          },

        onEnd: () => {
          if (
            !isProcessingRef.current
          ) {
            setAudioLevel(
              0
            );

            setState(
              (current) =>
                current ===
                'listening'
                  ? 'idle'
                  : current
            );
          }
        },
      });
    };

  /* =======================================================
     KEYBOARD
     ======================================================= */

  useEffect(() => {
    const handleKeyDown =
      (
        event: KeyboardEvent
      ) => {
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
          state ===
            'listening' ||
          state ===
            'speaking'
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
    handleStop,
  ]);

  /* =======================================================
     TASKS
     ======================================================= */

  const handleAddTask =
    async (taskData: {
      title: string;
      due?: string;
      priority:
        | 'low'
        | 'medium'
        | 'high';
    }) => {
      const task: StarkTask =
        {
          id:
            `task-${Date.now()}`,

          title:
            taskData.title,

          due:
            taskData.due ||
            'Upcoming',

          priority:
            taskData.priority,

          completed:
            false,

          createdAt:
            Date.now(),
        };

      setTasks(
        (previous) => [
          task,
          ...previous,
        ]
      );

      soundFx.playClick(
        settings.soundEffects
      );
    };

  const handleToggleTask =
    async (
      id: string,
      completed: boolean
    ) => {
      setTasks(
        (previous) =>
          previous.map(
            (task) =>
              task.id === id
                ? {
                    ...task,
                    completed,
                  }
                : task
          )
      );

      soundFx.playClick(
        settings.soundEffects
      );
    };

  const handleDeleteTask =
    async (
      id: string
    ) => {
      setTasks(
        (previous) =>
          previous.filter(
            (task) =>
              task.id !== id
          )
      );

      soundFx.playClick(
        settings.soundEffects
      );
    };

  /* =======================================================
     CLEAR HISTORY
     ======================================================= */

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

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="min-h-screen w-full flex flex-col justify-between relative overflow-x-hidden bg-[#020408] text-cyan-400 select-none scanlines">

      {/* ===================================================
          BOOT
          =================================================== */}

      {isBooting && (
        <BootSequence
          onComplete={
            handleBootComplete
          }
        />
      )}

      {/* ===================================================
          BACKGROUND
          =================================================== */}

      <div className="fixed inset-0 pointer-events-none z-0">

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.08)_0%,rgba(8,145,178,0.03)_50%,transparent_75%)] blur-[100px]" />

        <div className="absolute inset-0 hex-bg" />

      </div>

      {/* ===================================================
          TOP BAR
          =================================================== */}

      <JarvisTopBar
        onOpenSettings={() =>
          setIsSettingsOpen(
            true
          )
        }
      />

      {/* ===================================================
          MAIN HUD
          =================================================== */}

      <div className="flex-1 w-full max-w-[1560px] mx-auto p-2 sm:p-3.5 relative z-10">

        <div className="relative w-full h-full p-2 sm:p-3 rounded-lg border border-cyan-500/20 bg-[#020612]/70 backdrop-blur-md shadow-[0_0_30px_rgba(0,240,255,0.03)]">

          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />

          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />

          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />

          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

          {/* =================================================
              COLUMNS
              ================================================= */}

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

      {/* ===================================================
          MODALS
          =================================================== */}

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

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
} from './utils/speech';

/* =========================================================
   GEMINI CONFIGURATION
   ========================================================= */

const GEMINI_MODEL = 'gemini-3.6-flash';

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
   LOCAL STORAGE HELPERS
   ========================================================= */

const GEMINI_KEY_STORAGE =
  'jarvis_gemini_api_key';

const TASK_STORAGE =
  'jarvis_local_tasks';

const MESSAGE_STORAGE =
  'jarvis_messages';

const SETTINGS_STORAGE =
  'jarvis_settings';

function getGeminiKey(): string {
  try {
    return (
      localStorage.getItem(
        GEMINI_KEY_STORAGE
      ) || ''
    ).trim();
  } catch {
    return '';
  }
}

function saveGeminiKey(
  key: string
) {
  try {
    localStorage.setItem(
      GEMINI_KEY_STORAGE,
      key.trim()
    );
  } catch {
    // Ignore storage errors
  }
}

/* =========================================================
   GEMINI KEY REQUEST
   ========================================================= */

function askForGeminiKey(): string {
  const existing =
    getGeminiKey();

  if (existing) {
    return existing;
  }

  const key =
    window.prompt(
      'J.A.R.V.I.S. AI CONNECTION\n\nEnter your Gemini API key from Google AI Studio:'
    );

  if (!key) {
    return '';
  }

  const clean =
    key.trim();

  if (!clean) {
    return '';
  }

  saveGeminiKey(clean);

  return clean;
}

/* =========================================================
   GEMINI HISTORY
   ========================================================= */

function buildGeminiHistory(
  messages: Message[],
  prompt: string,
  memory: number
) {
  const contents: any[] = [];

  const history =
    messages.slice(
      -(memory || 10)
    );

  for (
    const message of history
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
   SYSTEM PROMPT
   ========================================================= */

function getSystemPrompt(
  style: string
) {
  return `
You are J.A.R.V.I.S., an advanced personal AI assistant.

PERSONALITY:
- Calm, intelligent, precise and professional.
- Speak with polished British-style wording.
- Address the user as "sir" naturally when appropriate.
- Do not imitate any real actor or copyrighted character voice.
- Be confident without being arrogant.
- Do not waste time with unnecessary greetings.

ACCURACY:
- Never knowingly invent information.
- Never fabricate names, dates, statistics, URLs or events.
- If you do not know something, clearly say that you are uncertain.
- Do not pretend to have performed an action that you could not perform.

CURRENT DATE:
${new Date().toString()}

RESPONSE STYLE:
${style || 'concise'}

VOICE OPTIMIZATION:
- Write naturally for speech.
- Avoid excessive markdown.
- Avoid huge paragraphs.
- For simple questions, answer directly.
- For calculations, give the exact result.
- For technical questions, explain clearly.
- For commands, acknowledge briefly.

IMPORTANT:
This assistant is running as a browser-only GitHub Pages application.
It does not have direct operating-system privileges.
Do not claim that a Windows/macOS application was opened unless the browser/local desktop agent actually confirms it.
`;
}

/* =========================================================
   GEMINI STREAM PARSER
   ========================================================= */

function extractGeminiText(
  data: any
): string {
  let text = '';

  const candidates =
    data?.candidates;

  if (
    !Array.isArray(
      candidates
    )
  ) {
    return '';
  }

  for (
    const candidate of candidates
  ) {
    const parts =
      candidate?.content
        ?.parts;

    if (
      !Array.isArray(parts)
    ) {
      continue;
    }

    for (
      const part of parts
    ) {
      if (
        typeof part?.text ===
        'string'
      ) {
        text +=
          part.text;
      }
    }
  }

  return text;
}

/* =========================================================
   SOURCE PARSER
   ========================================================= */

function extractSources(
  data: any
) {
  const results: any[] =
    [];

  const chunks =
    data?.groundingMetadata
      ?.groundingChunks;

  if (
    !Array.isArray(chunks)
  ) {
    return results;
  }

  for (
    const chunk of chunks
  ) {
    const web =
      chunk?.web;

    if (
      web?.uri
    ) {
      results.push({
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

  return results;
}

/* =========================================================
   SPEECH CLEANER
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
   BROWSER TTS
   ========================================================= */

function browserSpeak(
  text: string,
  settings: AssistantSettings,
  onStart: () => void,
  onEnd: () => void,
  onLevel: (
    value: number
  ) => void
) {
  if (
    !('speechSynthesis' in
      window)
  ) {
    onEnd();
    return;
  }

  const clean =
    cleanSpeechText(text);

  if (!clean) {
    onEnd();
    return;
  }

  window.speechSynthesis.cancel();

  const voices =
    window.speechSynthesis
      .getVoices();

  const british =
    voices.find(
      (voice) =>
        voice.lang
          .toLowerCase()
          .startsWith('en-gb')
    );

  const english =
    voices.find(
      (voice) =>
        voice.lang
          .toLowerCase()
          .startsWith('en')
    );

  const utterance =
    new SpeechSynthesisUtterance(
      clean
    );

  if (british) {
    utterance.voice =
      british;
  } else if (english) {
    utterance.voice =
      english;
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
    number | null =
    null;

  utterance.onstart =
    () => {
      onStart();

      levelTimer =
        window.setInterval(
          () => {
            onLevel(
              0.25 +
                Math.random() *
                  0.5
            );
          },
          80
        );
    };

  utterance.onend =
    () => {
      if (
        levelTimer !==
        null
      ) {
        clearInterval(
          levelTimer
        );
      }

      onLevel(0);
      onEnd();
    };

  utterance.onerror =
    () => {
      if (
        levelTimer !==
        null
      ) {
        clearInterval(
          levelTimer
        );
      }

      onLevel(0);
      onEnd();
    };

  window.speechSynthesis.speak(
    utterance
  );
}

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  const [state, setState] =
    useState<AssistantState>(
      'idle'
    );

  const [audioLevel, setAudioLevel] =
    useState(0);

  const [messages, setMessages] =
    useState<Message[]>(() => {
      try {
        const saved =
          localStorage.getItem(
            MESSAGE_STORAGE
          );

        return saved
          ? JSON.parse(saved)
          : [];
      } catch {
        return [];
      }
    });

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
    useState<StarkTask[]>(() => {
      try {
        const saved =
          localStorage.getItem(
            TASK_STORAGE
          );

        return saved
          ? JSON.parse(saved)
          : [];
      } catch {
        return [];
      }
    });

  /* =======================================================
     BOOT
     ======================================================= */

  const [isBooting, setIsBooting] =
    useState(() => {
      try {
        return !sessionStorage.getItem(
          'jarvis_booted'
        );
      } catch {
        return true;
      }
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
              SETTINGS_STORAGE
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
      coreOutputGW:
        3.42,

      coreTempKelvin:
        418.5,

      efficiencyPercent:
        99.4,

      frequencyHz:
        60.02,

      batteryStatus:
        'FUSION COUPLING (99.8%)',

      networkStatus:
        'DIRECT GEMINI CONNECTION',

      activeModel:
        GEMINI_MODEL,

      demoMode:
        false,
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
     SAVE LOCAL DATA
     ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        MESSAGE_STORAGE,
        JSON.stringify(
          messages
        )
      );
    } catch {
      // Ignore
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TASK_STORAGE,
        JSON.stringify(tasks)
      );
    } catch {
      // Ignore
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_STORAGE,
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
     DESKTOP AGENT
     ======================================================= */

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
          setDesktopAction(
            action
          );

          if (
            action.stage ===
              'success' ||
            action.stage ===
              'failed'
          ) {
            window.setTimeout(
              () => {
                setDesktopAction(
                  (current) =>
                    current?.id ===
                    action.id
                      ? null
                      : current
                );
              },
              4500
            );
          }
        }
      );

    /*
     * This only checks for the optional
     * local desktop agent.
     *
     * Gemini itself does NOT require it.
     */
    desktopAgent.checkHealth();

    return () => {
      unsubscribeState();
      unsubscribeAction();
    };
  }, []);

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
     STOP EVERYTHING
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

      stopJarvisSpeech();

      if (
        'speechSynthesis' in
        window
      ) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }

      setState('idle');

      setAudioLevel(0);

      setLiveTranscript('');

      setCurrentMessage(
        null
      );

      setActiveTool(
        undefined
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

  const speakResponse =
    useCallback(
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

        browserSpeak(
          text,
          settings,

          () => {
            if (
              activeRequestIdRef.current ===
              requestId
            ) {
              setState(
                'speaking'
              );
            }
          },

          () => {
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
     MAIN GEMINI FUNCTION
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

      /* ---------------------------------------------------
         DUPLICATE PROTECTION
         --------------------------------------------------- */

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

      if (
        normalized ===
          lastPromptRef.current &&
        now -
          lastPromptTimeRef.current <
          3000
      ) {
        return;
      }

      lastPromptRef.current =
        normalized;

      lastPromptTimeRef.current =
        now;

      /* ---------------------------------------------------
         GET KEY
         --------------------------------------------------- */

      const apiKey =
        getGeminiKey() ||
        askForGeminiKey();

      if (!apiKey) {
        return;
      }

      /* ---------------------------------------------------
         STOP PREVIOUS REQUEST
         --------------------------------------------------- */

      activeAbortControllerRef.current?.abort();

      stopJarvisSpeech();

      if (
        'speechSynthesis' in
        window
      ) {
        window.speechSynthesis.cancel();
      }

      const requestId =
        crypto.randomUUID
          ? crypto.randomUUID()
          : `jarvis-${Date.now()}`;

      const controller =
        new AbortController();

      activeRequestIdRef.current =
        requestId;

      activeAbortControllerRef.current =
        controller;

      isProcessingRef.current =
        true;

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

      setLiveTranscript('');

      setCurrentMessage(
        null
      );

      setActiveTool(
        undefined
      );

      /* ---------------------------------------------------
         EXECUTION HUD
         --------------------------------------------------- */

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
            'Understanding directive',

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

      /* ---------------------------------------------------
         ASSISTANT RESPONSE
         --------------------------------------------------- */

      const assistantMessageId =
        `assistant-${requestId}`;

      let accumulatedText =
        '';

      let sourcesData:
        any[] =
        [];

      const startTime =
        performance.now();

      try {
        console.log(
          '[JARVIS] Direct Gemini request:',
          requestId
        );

        /* -------------------------------------------------
           GEMINI REQUEST
           ------------------------------------------------- */

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

              body:
                JSON.stringify({
                  contents:
                    buildGeminiHistory(
                      messages,
                      cleanPrompt,
                      settings.contextMemory
                    ),

                  systemInstruction:
                    {
                      parts: [
                        {
                          text:
                            getSystemPrompt(
                              settings.aiStyle
                            ),
                        },
                      ],
                    },

                  generationConfig:
                    {
                      maxOutputTokens:
                        2048,
                    },
                }),

              signal:
                controller.signal,
            }
          );

        /* -------------------------------------------------
           ERROR RESPONSE
           ------------------------------------------------- */

        if (
          !response.ok
        ) {
          let errorText =
            `Gemini API error: HTTP ${response.status}`;

          try {
            const errorData =
              await response.json();

            if (
              errorData?.error
                ?.message
            ) {
              errorText =
                errorData
                  .error
                  .message;
            }
          } catch {
            // Ignore
          }

          if (
            response.status ===
              400 ||
            response.status ===
              404
          ) {
            errorText =
              `Gemini model/request error. ${errorText}`;
          }

          if (
            response.status ===
              401 ||
            response.status ===
              403
          ) {
            try {
              localStorage.removeItem(
                GEMINI_KEY_STORAGE
              );
            } catch {
              // Ignore
            }

            errorText =
              'Your Gemini API key was rejected. Please enter a valid key from Google AI Studio.';
          }

          if (
            response.status ===
            429
          ) {
            errorText =
              'Gemini rate limit reached. Please wait a moment and try again.';
          }

          throw new Error(
            errorText
          );
        }

        if (
          !response.body
        ) {
          throw new Error(
            'Gemini returned an empty response stream.'
          );
        }

        /* -------------------------------------------------
           FIRST TOKEN
           ------------------------------------------------- */

        let firstTokenReceived =
          false;

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder();

        let buffer =
          '';

        /* -------------------------------------------------
           READ STREAM
           ------------------------------------------------- */

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

          const events =
            buffer.split(
              '\n\n'
            );

          buffer =
            events.pop() ||
            '';

          for (
            const eventBlock of events
          ) {
            const lines =
              eventBlock.split(
                '\n'
              );

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

              const json =
                trimmed
                  .slice(5)
                  .trim();

              if (
                !json ||
                json ===
                  '[DONE]'
              ) {
                continue;
              }

              let data:
                any;

              try {
                data =
                  JSON.parse(
                    json
                  );
              } catch {
                continue;
              }

              /* -------------------------------------------
                 TEXT
                 ------------------------------------------- */

              const chunkText =
                extractGeminiText(
                  data
                );

              /* -------------------------------------------
                 SOURCES
                 ------------------------------------------- */

              const newSources =
                extractSources(
                  data
                );

              if (
                newSources.length
              ) {
                sourcesData = [
                  ...sourcesData,
                  ...newSources,
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

              /* -------------------------------------------
                 UPDATE RESPONSE
                 ------------------------------------------- */

              if (
                chunkText
              ) {
                accumulatedText +=
                  chunkText;

                if (
                  !firstTokenReceived
                ) {
                  firstTokenReceived =
                    true;

                  const latency =
                    (
                      performance.now() -
                      startTime
                    ) /
                    1000;

                  console.log(
                    `[JARVIS] First token: ${latency.toFixed(
                      2
                    )}s`
                  );

                  setState(
                    'speaking'
                  );

                  setExecutionSteps(
                    (previous) => [
                      ...previous,
                      {
                        stage:
                          'thinking',

                        label:
                          'Gemini response stream active',

                        timestamp:
                          Date.now(),
                      },
                    ]
                  );
                }

                const progressiveMessage:
                  Message =
                  {
                    id:
                      assistantMessageId,

                    role:
                      'assistant',

                    content:
                      accumulatedText,

                    sources:
                      sourcesData,

                    timestamp:
                      Date.now(),
                  };

                setCurrentMessage(
                  progressiveMessage
                );
              }
            }
          }
        }

        /* -------------------------------------------------
           FINAL CHECK
           ------------------------------------------------- */

        if (
          !accumulatedText.trim()
        ) {
          throw new Error(
            'Gemini returned no text. Please try again.'
          );
        }

        /* -------------------------------------------------
           FINAL MESSAGE
           ------------------------------------------------- */

        const finalMessage:
          Message = {
          id:
            assistantMessageId,

          role:
            'assistant',

          content:
            accumulatedText.trim(),

          sources:
            sourcesData,

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
                'Protocol completed',

              timestamp:
                Date.now(),
            },
          ]
        );

        /* -------------------------------------------------
           SPEAK
           ------------------------------------------------- */

        if (
          settings.voiceEnabled
        ) {
          speakResponse(
            accumulatedText,
            requestId
          );
        } else {
          setState('idle');
        }

        console.log(
          '[JARVIS] Response complete:',
          requestId
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

        const errorMessage =
          error?.message ||
          'Unknown Gemini connection error.';

        setState('error');

        setAudioLevel(0);

        soundFx.playError(
          settings.soundEffects
        );

        const errorMsg:
          Message = {
          id:
            assistantMessageId,

          role:
            'assistant',

          content:
            `My apologies, sir. ${errorMessage}`,

          timestamp:
            Date.now(),
        };

        setMessages(
          (previous) => [
            ...previous,
            errorMsg,
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
                'Connection exception',

              timestamp:
                Date.now(),
            },
          ]
        );

        window.setTimeout(
          () => {
            if (
              activeRequestIdRef.current ===
              requestId
            ) {
              setState(
                'idle'
              );
            }
          },
          1800
        );
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
      try {
        if (
          'speechSynthesis' in
          window
        ) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // Ignore
      }

      stopJarvisSpeech();

      if (
        state === 'speaking'
      ) {
        setState(
          'interrupted'
        );
      }

      soundFx.playClick(
        settings.soundEffects
      );

      armMicrophone();
    };

  const armMicrophone =
    () => {
      stopSpeechRecognition();

      stopJarvisSpeech();

      setState(
        'listening'
      );

      setLiveTranscript('');

      setAudioLevel(0);

      soundFx.playReactorCharge(
        settings.soundEffects
      );

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

          setLiveTranscript(
            text
          );

          if (
            isFinal
          ) {
            stopSpeechRecognition();

            processDirective(
              text
            );
          }
        },

        onAudioLevel:
          (
            level
          ) => {
            setAudioLevel(
              level
            );
          },

        onError:
          (
            error
          ) => {
            console.warn(
              'Speech recognition:',
              error
            );

            setState(
              'error'
            );

            setAudioLevel(
              0
            );

            soundFx.playError(
              settings.soundEffects
            );

            window.setTimeout(
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
     KEYBOARD SPACE
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

        if (
          target?.tagName ===
            'INPUT' ||
          target?.tagName ===
            'TEXTAREA' ||
          target?.isContentEditable
        ) {
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
     TASKS — LOCAL ONLY
     ======================================================= */

  const handleAddTask =
    async (
      taskData: {
        title: string;
        due?: string;
        priority:
          | 'low'
          | 'medium'
          | 'high';
      }
    ) => {
      const newTask:
        StarkTask =
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
        } as StarkTask;

      setTasks(
        (previous) => [
          newTask,
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

      setExecutionSteps([]);

      setActiveTool(
        undefined
      );

      try {
        localStorage.removeItem(
          MESSAGE_STORAGE
        );
      } catch {
        // Ignore
      }

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
          HISTORY
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

      {/* ===================================================
          SETTINGS
          =================================================== */}

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

      {/* ===================================================
          SYSTEM INFO
          =================================================== */}

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

      {/* ===================================================
          TASK TRACKER
          =================================================== */}

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

      {/* ===================================================
          DESKTOP AGENT
          =================================================== */}

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

      {/* ===================================================
          RUNNING APPS
          =================================================== */}

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

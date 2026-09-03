/**
 * J.A.R.V.I.S. Browser Voice & Streaming TTS Service
 *
 * GitHub Pages compatible:
 * - Does NOT depend on /api/tts/chunk
 * - Uses browser SpeechSynthesis
 * - Prefers British English voices
 * - Prefers male/natural voices when available
 * - Handles Chrome voiceschanged event
 * - Handles Chrome speech pause bug
 * - Prevents duplicate speech
 * - Supports streaming sentence chunks
 * - Supports immediate interruption
 * - Keeps one response -> one speech flow
 */

import { VoiceMetrics } from '../types';

export interface TTSOptions {
  pitch?: number;
  rate?: number;
  volume?: number;
  preferredVoice?: string;
  streaming?: boolean;

  onStart?: () => void;
  onSentenceStart?: (sentence: string, index: number) => void;
  onSentenceEnd?: (index: number) => void;
  onEnd?: () => void;
  onInterrupted?: () => void;
  onAudioLevel?: (level: number) => void;
}

export interface AudioQueueItem {
  id: string;
  text: string;
  index: number;
  status:
    | 'queued'
    | 'fetching'
    | 'ready'
    | 'playing'
    | 'completed'
    | 'failed';

  abortController: AbortController;
  audioBlob?: Blob;
  audioUrl?: string;
  audioElement?: HTMLAudioElement;
  requestStartTime: number;
  firstAudioTime?: number;
  isFallback?: boolean;
}

/* =========================================================
   INSTANT PHRASES
   ========================================================= */

const INSTANT_PHRASES: Record<string, string> = {
  jarvis: 'Yes, sir?',
  'are you there': 'Always.',
  'are you there?': 'Always.',
  stop: 'Understood.',
  halt: 'Understood.',
  cancel: 'Operation cancelled, sir.',
  'open chrome': 'Opening Chrome.',
  'open browser': 'Opening Chrome.',
  search: 'Searching now.',
  status: 'All systems operational, sir.',
  hello: 'Good day, sir. J.A.R.V.I.S. online.',
  'thank you': 'Always at your service, sir.',
  thanks: 'Anytime, sir.',
};

/* =========================================================
   CLEAN SPOKEN TEXT
   ========================================================= */

export function cleanSpokenText(raw: string): string {
  if (!raw) return '';

  return raw
    // Code blocks
    .replace(/```[\s\S]*?```/g, ' ')

    // Inline code
    .replace(/`([^`]+)`/g, '$1')

    // JSON-like blocks
    .replace(/\{[\s\S]*?\}/g, ' ')

    // Citations
    .replace(/\[\d+\]/g, '')
    .replace(/\[citation:[^\]]+\]/gi, '')
    .replace(/【[^】]+】/g, '')

    // Markdown links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

    // URLs
    .replace(/https?:\/\/\S+/gi, '')

    // Markdown headings
    .replace(/^#+\s+/gm, '')

    // Bullets
    .replace(/^[*\-+•]\s+/gm, '')

    // Numbered lists
    .replace(/^\d+\.\s+/gm, '')

    // Blockquotes
    .replace(/^>\s+/gm, '')

    // Markdown symbols
    .replace(/[*_~|]/g, '')

    // System notices
    .replace(/SYSTEM NOTICE:[^\n]*/gi, '')

    // Tool call text
    .replace(/TOOL CALL:[^\n]*/gi, '')

    // Horizontal separators
    .replace(/---+/g, ' ')
    .replace(/===+/g, ' ')

    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/* =========================================================
   BROWSER VOICES
   ========================================================= */

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;

export function loadBrowserVoices(): SpeechSynthesisVoice[] {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window)
  ) {
    return [];
  }

  try {
    const voices = window.speechSynthesis.getVoices();

    if (voices && voices.length > 0) {
      cachedVoices = [...voices];
    }
  } catch (error) {
    console.warn('[JARVIS TTS] Could not load browser voices:', error);
  }

  return cachedVoices;
}

function waitForVoices(timeout = 2500): Promise<SpeechSynthesisVoice[]> {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window)
  ) {
    return Promise.resolve([]);
  }

  const current = loadBrowserVoices();

  if (current.length > 0) {
    return Promise.resolve(current);
  }

  if (voicesReadyPromise) {
    return voicesReadyPromise;
  }

  voicesReadyPromise = new Promise((resolve) => {
    let finished = false;

    const finish = () => {
      if (finished) return;

      finished = true;

      try {
        window.speechSynthesis.removeEventListener(
          'voiceschanged',
          onVoicesChanged
        );
      } catch (_) {}

      const voices = loadBrowserVoices();

      voicesReadyPromise = null;
      resolve(voices);
    };

    const onVoicesChanged = () => {
      finish();
    };

    try {
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        onVoicesChanged
      );
    } catch (_) {}

    // Some browsers don't fire voiceschanged reliably.
    setTimeout(finish, timeout);
  });

  return voicesReadyPromise;
}

/* Load voices immediately when possible */

if (
  typeof window !== 'undefined' &&
  'speechSynthesis' in window
) {
  loadBrowserVoices();

  try {
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        loadBrowserVoices();
      }
    );
  } catch (_) {}
}

/* =========================================================
   VOICE SELECTION
   ========================================================= */

export function selectBritishMaleVoice(
  preferredName?: string
): SpeechSynthesisVoice | undefined {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window)
  ) {
    return undefined;
  }

  const voices = loadBrowserVoices();

  if (!voices.length) {
    return undefined;
  }

  /* 1. Explicit user preference */

  if (preferredName) {
    const exact = voices.find(
      (voice) =>
        voice.name.toLowerCase() === preferredName.toLowerCase()
    );

    if (exact) return exact;

    const partial = voices.find((voice) =>
      voice.name
        .toLowerCase()
        .includes(preferredName.toLowerCase())
    );

    if (partial) return partial;
  }

  /* 2. Strong British male candidates */

  const preferredNames = [
    'Google UK English Male',
    'Microsoft Ryan Online (Natural) - English (United Kingdom)',
    'Microsoft Oliver Online (Natural) - English (United Kingdom)',
    'Microsoft George - English (United Kingdom)',
    'Microsoft Ryan',
    'Daniel',
    'Arthur',
    'Oliver',
    'George',
    'Brian',
    'Malcolm',
    'Ryan',
  ];

  for (const name of preferredNames) {
    const found = voices.find((voice) =>
      voice.name.toLowerCase().includes(name.toLowerCase())
    );

    if (found) {
      return found;
    }
  }

  /* 3. British voices containing male */

  const britishMale = voices.find((voice) => {
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();

    return (
      (lang === 'en-gb' || lang.startsWith('en-gb')) &&
      name.includes('male')
    );
  });

  if (britishMale) {
    return britishMale;
  }

  /* 4. Any British English voice */

  const british = voices.find((voice) => {
    const lang = voice.lang.toLowerCase();

    return (
      lang === 'en-gb' ||
      lang.startsWith('en-gb')
    );
  });

  if (british) {
    return british;
  }

  /* 5. Natural English voice */

  const naturalEnglish = voices.find((voice) => {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();

    return (
      lang.startsWith('en') &&
      (
        name.includes('natural') ||
        name.includes('neural')
      )
    );
  });

  if (naturalEnglish) {
    return naturalEnglish;
  }

  /* 6. Any English voice */

  const english = voices.find((voice) =>
    voice.lang.toLowerCase().startsWith('en')
  );

  if (english) {
    return english;
  }

  return voices[0];
}

/* =========================================================
   JARVIS TTS SERVICE
   ========================================================= */

export class JarvisTTSService {
  public ttsQueue: AudioQueueItem[] = [];
  public currentAudio: AudioQueueItem | null = null;
  public nextAudio: AudioQueueItem | null = null;
  public isSpeaking = false;

  private isInterrupted = false;

  private sentenceBuffer = '';

  private sentenceIndex = 0;

  private options: TTSOptions = {};

  private sessionStartTime = 0;

  private hasEmittedFirstSound = false;

  private activeRequestId = '';

  private processedSentenceIds: Set<string> = new Set();

  private spokenResponseIds: Set<string> = new Set();

  private activeUtterances: Set<SpeechSynthesisUtterance> =
    new Set();

  private resumeHeartbeat: ReturnType<typeof setInterval> | null =
    null;

  private visualizerRaf: number | null = null;

  private metricsListeners: Array<
    (metrics: VoiceMetrics) => void
  > = [];

  private stateListeners: Array<
    (
      state:
        | 'idle'
        | 'generating'
        | 'speaking'
        | 'interrupted'
        | 'error'
    ) => void
  > = [];

  private autoplayBlockedListeners: Array<
    (blocked: boolean) => void
  > = [];

  private activeMetrics: VoiceMetrics = {
    aiResponseTime: 0.38,
    ttsStartTime: 0.22,
    audioBufferTime: 110,
    voiceActive: false,
    providerName: 'Browser British Voice',
    aiFirstTokenLatency: 0.38,
    ttsRequestLatency: 0.01,
    ttsFirstAudioLatency: 0.15,
    totalVoiceLatency: 0.35,
    queueLength: 0,
    currentChunkIndex: 0,
  };

  /* =======================================================
     CONSTRUCTOR
     ======================================================= */

  constructor() {
    loadBrowserVoices();

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      try {
        window.speechSynthesis.addEventListener(
          'voiceschanged',
          () => {
            loadBrowserVoices();
          }
        );
      } catch (_) {}
    }
  }

  /* =======================================================
     AUDIO UNLOCK
     ======================================================= */

  public unlockAudioContext() {
    try {
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.resume();
      }
    } catch (_) {}

    this.notifyAutoplayBlocked(false);
  }

  /* =======================================================
     LISTENERS
     ======================================================= */

  public subscribeMetrics(
    fn: (metrics: VoiceMetrics) => void
  ) {
    this.metricsListeners.push(fn);

    fn({ ...this.activeMetrics });

    return () => {
      this.metricsListeners =
        this.metricsListeners.filter(
          (listener) => listener !== fn
        );
    };
  }

  public subscribeState(
    fn: (
      state:
        | 'idle'
        | 'generating'
        | 'speaking'
        | 'interrupted'
        | 'error'
    ) => void
  ) {
    this.stateListeners.push(fn);

    return () => {
      this.stateListeners =
        this.stateListeners.filter(
          (listener) => listener !== fn
        );
    };
  }

  public subscribeAutoplayBlocked(
    fn: (blocked: boolean) => void
  ) {
    this.autoplayBlockedListeners.push(fn);

    return () => {
      this.autoplayBlockedListeners =
        this.autoplayBlockedListeners.filter(
          (listener) => listener !== fn
        );
    };
  }

  public notifyAutoplayBlocked(blocked: boolean) {
    this.autoplayBlockedListeners.forEach(
      (listener) => listener(blocked)
    );
  }

  private notifyState(
    state:
      | 'idle'
      | 'generating'
      | 'speaking'
      | 'interrupted'
      | 'error'
  ) {
    this.stateListeners.forEach(
      (listener) => listener(state)
    );
  }

  private notifyMetrics() {
    this.activeMetrics.queueLength =
      this.ttsQueue.length;

    this.metricsListeners.forEach(
      (listener) =>
        listener({ ...this.activeMetrics })
    );
  }

  public getMetrics(): VoiceMetrics {
    return { ...this.activeMetrics };
  }

  public setMetrics(
    partial: Partial<VoiceMetrics>
  ) {
    this.activeMetrics = {
      ...this.activeMetrics,
      ...partial,
    };

    this.notifyMetrics();
  }

  /* =======================================================
     START STREAMING
     ======================================================= */

  public startStreaming(
    options: TTSOptions = {},
    promptStartTime?: number,
    requestId?: string
  ) {
    /*
     * Duplicate protection.
     *
     * IMPORTANT:
     * We only mark a request as spoken when requestId
     * actually exists.
     */

    if (requestId) {
      if (
        this.spokenResponseIds.has(requestId)
      ) {
        console.log(
          '[JARVIS TTS] Duplicate response ignored:',
          requestId
        );

        return;
      }

      this.spokenResponseIds.add(requestId);
    }

    /*
     * Stop previous speech WITHOUT triggering the
     * user's interrupted callback.
     */

    this.stopInternal(false);

    this.isInterrupted = false;

    this.unlockAudioContext();

    this.hasEmittedFirstSound = false;

    this.sessionStartTime =
      promptStartTime ?? performance.now();

    this.activeRequestId =
      requestId ??
      (
        typeof crypto !== 'undefined' &&
        crypto.randomUUID
          ? crypto.randomUUID()
          : `tts-${Date.now()}`
      );

    this.processedSentenceIds.clear();

    this.options = {
      pitch: options.pitch ?? 0.90,
      rate: options.rate ?? 1.20,
      volume: options.volume ?? 1.0,
      preferredVoice:
        options.preferredVoice ?? '',
      streaming:
        options.streaming ?? true,

      ...options,
    };

    this.ttsQueue = [];

    this.currentAudio = null;

    this.nextAudio = null;

    this.sentenceBuffer = '';

    this.sentenceIndex = 0;

    this.isSpeaking = false;

    this.activeMetrics.voiceActive = false;

    this.activeMetrics.currentChunkIndex = 0;

    this.notifyMetrics();

    /*
     * Chrome can randomly pause long SpeechSynthesis
     * sessions. Keep it alive while JARVIS is speaking.
     */

    this.startResumeHeartbeat();

    console.log(
      '[JARVIS TTS] Voice session started:',
      this.activeRequestId
    );
  }

  /* =======================================================
     CHROME SPEECH RESUME HEARTBEAT
     ======================================================= */

  private startResumeHeartbeat() {
    this.stopResumeHeartbeat();

    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return;
    }

    this.resumeHeartbeat = setInterval(() => {
      if (
        !this.isSpeaking ||
        this.isInterrupted
      ) {
        this.stopResumeHeartbeat();
        return;
      }

      try {
        if (
          window.speechSynthesis.paused
        ) {
          window.speechSynthesis.resume();
        }
      } catch (_) {}
    }, 1000);
  }

  private stopResumeHeartbeat() {
    if (this.resumeHeartbeat) {
      clearInterval(this.resumeHeartbeat);
      this.resumeHeartbeat = null;
    }
  }

  /* =======================================================
     STREAM TOKEN
     ======================================================= */

  public pushToken(token: string) {
    if (
      this.isInterrupted ||
      !token
    ) {
      return;
    }

    this.sentenceBuffer += token;

    /*
     * Normal sentence ending.
     */

    let match =
      this.sentenceBuffer.match(
        /([.!?]+)(?=\s|$)/
      );

    /*
     * If AI is taking too long to produce a full
     * sentence, speak an early clause.
     */

    if (
      !match &&
      this.sentenceIndex === 0 &&
      this.sentenceBuffer.length >= 70
    ) {
      match =
        this.sentenceBuffer.match(
          /([,;:])\s+/
        );
    }

    while (
      match &&
      match.index !== undefined
    ) {
      const cutIndex =
        match.index + match[0].length;

      const sentenceText =
        this.sentenceBuffer.slice(
          0,
          cutIndex
        );

      this.sentenceBuffer =
        this.sentenceBuffer.slice(
          cutIndex
        );

      const cleaned =
        cleanSpokenText(sentenceText);

      if (cleaned) {
        this.enqueueTTS(cleaned);
      }

      match =
        this.sentenceBuffer.match(
          /([.!?]+)(?=\s|$)/
        );
    }
  }

  /* =======================================================
     FINISH STREAM
     ======================================================= */

  public finishStream() {
    if (this.isInterrupted) {
      return;
    }

    if (
      this.sentenceBuffer.trim()
    ) {
      const cleaned =
        cleanSpokenText(
          this.sentenceBuffer
        );

      if (cleaned) {
        this.enqueueTTS(cleaned);
      }

      this.sentenceBuffer = '';
    }

    /*
     * If nothing was queued, end immediately.
     */

    if (
      this.ttsQueue.length === 0 &&
      !this.isSpeaking
    ) {
      this.activeMetrics.voiceActive =
        false;

      this.notifyMetrics();

      this.notifyState('idle');

      this.options.onEnd?.();
    }
  }

  /* =======================================================
     QUEUE TTS
     ======================================================= */

  public enqueueTTS(text: string) {
    if (
      this.isInterrupted ||
      !text.trim()
    ) {
      return;
    }

    const sentenceId =
      `${this.activeRequestId}-${this.sentenceIndex}`;

    if (
      this.processedSentenceIds.has(
        sentenceId
      )
    ) {
      return;
    }

    this.processedSentenceIds.add(
      sentenceId
    );

    const item: AudioQueueItem = {
      id: sentenceId,
      text: cleanSpokenText(text),
      index: this.sentenceIndex++,
      status: 'ready',
      abortController:
        new AbortController(),
      requestStartTime:
        performance.now(),
      isFallback: true,
    };

    this.ttsQueue.push(item);

    this.notifyMetrics();

    /*
     * Browser SpeechSynthesis is used directly.
     * No backend/API call is required.
     */

    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  /* =======================================================
     PROCESS QUEUE
     ======================================================= */

  public processQueue() {
    if (this.isInterrupted) {
      return;
    }

    const candidate =
      this.ttsQueue.find(
        (item) =>
          item.status === 'ready'
      );

    if (!candidate) {
      /*
       * If items are currently playing,
       * don't switch to idle yet.
       */

      if (this.currentAudio) {
        return;
      }

      this.isSpeaking = false;

      this.activeMetrics.voiceActive =
        false;

      this.notifyMetrics();

      this.stopVisualizer();

      this.stopResumeHeartbeat();

      this.notifyState('idle');

      this.options.onEnd?.();

      return;
    }

    this.playAudio(candidate);
  }

  /* =======================================================
     PLAY AUDIO
     ======================================================= */

  private playAudio(
    task: AudioQueueItem
  ) {
    if (
      this.isInterrupted ||
      task.status !== 'ready'
    ) {
      return;
    }

    this.isSpeaking = true;

    task.status = 'playing';

    this.currentAudio = task;

    this.activeMetrics.voiceActive =
      true;

    this.activeMetrics.currentChunkIndex =
      task.index + 1;

    this.notifyMetrics();

    this.notifyState('speaking');

    if (!this.hasEmittedFirstSound) {
      this.hasEmittedFirstSound = true;

      const latency =
        (
          performance.now() -
          this.sessionStartTime
        ) / 1000;

      this.activeMetrics.totalVoiceLatency =
        Math.max(
          0.05,
          Number(latency.toFixed(2))
        );

      this.activeMetrics.ttsFirstAudioLatency =
        Math.max(
          0.05,
          Number(latency.toFixed(2))
        );

      this.notifyMetrics();

      this.options.onStart?.();
    }

    this.options.onSentenceStart?.(
      task.text,
      task.index
    );

    this.playBrowserSpeech(task);
  }

  /* =======================================================
     BROWSER SPEECH
     ======================================================= */

  private async playBrowserSpeech(
    task: AudioQueueItem
  ) {
    if (this.isInterrupted) {
      return;
    }

    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      console.error(
        '[JARVIS TTS] Browser speech synthesis unavailable'
      );

      task.status = 'completed';

      this.notifyState('error');

      this.playNextAudio();

      return;
    }

    /*
     * Wait briefly for Chrome/Edge/Safari voices
     * to become available.
     */

    const voices =
      await waitForVoices();

    if (
      this.isInterrupted ||
      !this.currentAudio ||
      this.currentAudio.id !== task.id
    ) {
      return;
    }

    /*
     * Make sure browser queue is not stuck.
     */

    try {
      if (
        window.speechSynthesis.paused
      ) {
        window.speechSynthesis.resume();
      }
    } catch (_) {}

    const utterance =
      new SpeechSynthesisUtterance(
        task.text
      );

    this.activeUtterances.add(
      utterance
    );

    /*
     * Select voice.
     */

    let voice:
      SpeechSynthesisVoice | undefined;

    if (voices.length > 0) {
      voice =
        selectBritishMaleVoice(
          this.options.preferredVoice
        );
    }

    if (voice) {
      utterance.voice = voice;

      utterance.lang =
        voice.lang || 'en-GB';

      this.activeMetrics.providerName =
        `${voice.name} [Browser]`;

      console.log(
        '[JARVIS TTS] Voice:',
        voice.name,
        voice.lang
      );
    } else {
      /*
       * Even if the browser doesn't expose voices,
       * force British English.
       */

      utterance.lang = 'en-GB';

      this.activeMetrics.providerName =
        'British English Browser Voice';
    }

    /*
     * Voice tuning.
     *
     * Browser pitch does not literally change a voice
     * into a cinematic actor voice, but lower pitch can
     * make supported voices sound deeper.
     */

    utterance.rate =
      Math.max(
        0.8,
        Math.min(
          1.6,
          this.options.rate ?? 1.20
        )
      );

    utterance.pitch =
      Math.max(
        0.7,
        Math.min(
          1.2,
          this.options.pitch ?? 0.90
        )
      );

    utterance.volume =
      Math.max(
        0,
        Math.min(
          1,
          this.options.volume ?? 1.0
        )
      );

    this.notifyMetrics();

    /* =====================================================
       ON START
       ===================================================== */

    utterance.onstart = () => {
      if (this.isInterrupted) {
        return;
      }

      console.log(
        '[JARVIS TTS] Speech started'
      );

      this.startVisualizer();

      this.notifyState('speaking');
    };

    /* =====================================================
       ON END
       ===================================================== */

    utterance.onend = () => {
      this.activeUtterances.delete(
        utterance
      );

      if (this.isInterrupted) {
        return;
      }

      console.log(
        '[JARVIS TTS] Speech ended'
      );

      task.status = 'completed';

      this.options.onSentenceEnd?.(
        task.index
      );

      this.playNextAudio();
    };

    /* =====================================================
       ON ERROR
       ===================================================== */

    utterance.onerror = (
      event: SpeechSynthesisErrorEvent
    ) => {
      this.activeUtterances.delete(
        utterance
      );

      /*
       * These errors happen when we intentionally
       * cancel speech. Don't treat them as failures.
       */

      if (
        event.error === 'canceled' ||
        event.error === 'interrupted'
      ) {
        return;
      }

      console.warn(
        '[JARVIS TTS] Speech error:',
        event.error
      );

      if (
        event.error === 'not-allowed'
      ) {
        this.notifyAutoplayBlocked(true);
      }

      /*
       * Mark this sentence complete so that
       * the queue cannot become permanently stuck.
       */

      task.status = 'completed';

      this.playNextAudio();
    };

    /*
     * Chrome sometimes needs the utterance to be
     * submitted after resume().
     */

    try {
      window.speechSynthesis.resume();

      window.speechSynthesis.speak(
        utterance
      );

      /*
       * Some Chromium versions occasionally pause
       * immediately after speak().
       */

      setTimeout(() => {
        if (
          !this.isInterrupted &&
          this.isSpeaking
        ) {
          try {
            if (
              window.speechSynthesis.paused
            ) {
              window.speechSynthesis.resume();
            }
          } catch (_) {}
        }
      }, 50);

    } catch (error) {
      console.error(
        '[JARVIS TTS] speak() failed:',
        error
      );

      this.activeUtterances.delete(
        utterance
      );

      task.status = 'completed';

      this.playNextAudio();
    }
  }

  /* =======================================================
     NEXT SENTENCE
     ======================================================= */

  public playNextAudio() {
    if (this.isInterrupted) {
      return;
    }

    if (this.currentAudio) {
      const completedId =
        this.currentAudio.id;

      this.ttsQueue =
        this.ttsQueue.filter(
          (item) =>
            item.id !== completedId
        );

      this.currentAudio = null;
    }

    this.updateNextAudioPointer();

    const next =
      this.ttsQueue.find(
        (item) =>
          item.status === 'ready'
      );

    if (next) {
      this.playAudio(next);
      return;
    }

    /*
     * No more sentences currently available.
     */

    this.isSpeaking = false;

    this.activeMetrics.voiceActive =
      false;

    this.notifyMetrics();

    this.stopVisualizer();

    /*
     * Don't stop heartbeat until queue is
     * definitely empty.
     */

    if (this.ttsQueue.length === 0) {
      this.stopResumeHeartbeat();

      this.notifyState('idle');

      this.options.onEnd?.();
    }
  }

  private updateNextAudioPointer() {
    this.nextAudio =
      this.ttsQueue.find(
        (item) =>
          item.status === 'ready' &&
          item !== this.currentAudio
      ) ?? null;
  }

  /* =======================================================
     CANCEL / INTERRUPT
     ======================================================= */

  public cancelTTS() {
    this.stopInternal(true);
  }

  public interrupt() {
    this.stopInternal(true);
  }

  public stopPlayback() {
    this.stopInternal(true);
  }

  private stopInternal(
    notifyInterrupted: boolean
  ) {
    const wasActive =
      this.isSpeaking ||
      this.ttsQueue.length > 0;

    this.isInterrupted = true;

    this.stopResumeHeartbeat();

    /*
     * Cancel browser speech immediately.
     */

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    /*
     * Abort any future audio requests.
     */

    for (const item of this.ttsQueue) {
      try {
        item.abortController.abort();
      } catch (_) {}

      if (item.audioUrl) {
        try {
          URL.revokeObjectURL(
            item.audioUrl
          );
        } catch (_) {}
      }

      if (item.audioElement) {
        try {
          item.audioElement.pause();
          item.audioElement.src = '';
        } catch (_) {}
      }
    }

    /*
     * Stop active HTML audio if present.
     */

    if (this.currentAudio?.audioElement) {
      try {
        this.currentAudio.audioElement.pause();
        this.currentAudio.audioElement.src = '';
      } catch (_) {}
    }

    this.activeUtterances.clear();

    this.ttsQueue = [];

    this.currentAudio = null;

    this.nextAudio = null;

    this.sentenceBuffer = '';

    this.isSpeaking = false;

    this.activeMetrics.voiceActive =
      false;

    this.notifyMetrics();

    this.stopVisualizer();

    if (
      notifyInterrupted &&
      wasActive
    ) {
      this.notifyState(
        'interrupted'
      );

      this.options.onInterrupted?.();
    }
  }

  /* =======================================================
     SIMPLE SPEAK
     ======================================================= */

  public speak(
    text: string,
    options: TTSOptions = {},
    requestId?: string
  ) {
    const cleaned =
      cleanSpokenText(text);

    if (!cleaned) {
      options.onEnd?.();
      return;
    }

    const effectiveId =
      requestId ||
      `tts-standalone-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    this.startStreaming(
      options,
      performance.now(),
      effectiveId
    );

    /*
     * Push the complete answer.
     * finishStream() guarantees it gets spoken even
     * when there is no punctuation.
     */

    this.pushToken(cleaned);

    this.finishStream();
  }

  /* =======================================================
     INSTANT PHRASES
     ======================================================= */

  public speakInstant(
    keyword: string,
    options: TTSOptions = {}
  ): boolean {
    const lower =
      keyword
        .toLowerCase()
        .trim();

    const phrase =
      INSTANT_PHRASES[lower];

    if (!phrase) {
      return false;
    }

    this.speak(
      phrase,
      options,
      `instant-${lower}-${Date.now()}`
    );

    return true;
  }

  /* =======================================================
     TEST VOICE
     ======================================================= */

  public async testVoice() {
    this.cancelTTS();

    await waitForVoices();

    this.speak(
      'Good day, sir. J.A.R.V.I.S. is online and ready.',
      {
        rate: 1.20,
        pitch: 0.90,
        volume: 1.0,
      },
      `voice-test-${Date.now()}`
    );
  }

  /* =======================================================
     VISUALIZER
     ======================================================= */

  private startVisualizer() {
    if (
      this.visualizerRaf !== null
    ) {
      return;
    }

    let tick = 0;

    const loop = () => {
      if (
        !this.isSpeaking ||
        this.isInterrupted
      ) {
        this.stopVisualizer();
        return;
      }

      tick++;

      const pulse =
        Math.abs(
          Math.sin(tick * 0.18) *
          Math.cos(tick * 0.08)
        );

      const variance =
        (Math.sin(tick * 0.45) + 1) *
        0.2;

      const level =
        Math.min(
          1,
          Math.max(
            0.18,
            0.35 +
              pulse * 0.45 +
              variance
          )
        );

      this.options.onAudioLevel?.(
        level
      );

      this.visualizerRaf =
        requestAnimationFrame(loop);
    };

    this.visualizerRaf =
      requestAnimationFrame(loop);
  }

  private stopVisualizer() {
    if (
      this.visualizerRaf !== null
    ) {
      cancelAnimationFrame(
        this.visualizerRaf
      );

      this.visualizerRaf = null;
    }

    this.options.onAudioLevel?.(0);
  }
}

/* =========================================================
   GLOBAL SINGLETON
   ========================================================= */

export const ttsService =
  new JarvisTTSService();

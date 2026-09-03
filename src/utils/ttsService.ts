/**
 * J.A.R.V.I.S. High-Performance Neural Voice & Streaming TTS Pipeline
 * Ultra-Low Latency Audio Queue Architecture with Pre-Buffering & Zero-Lag Interruption
 */

import { VoiceMetrics } from '../types';

export interface TTSOptions {
  pitch?: number; // 0.7 - 1.2, default 0.90 (deep & mature)
  rate?: number; // 0.8 - 1.6, default 1.20 (fast & natural)
  volume?: number; // 0 - 1, default 0.80
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
  status: 'queued' | 'fetching' | 'ready' | 'playing' | 'completed' | 'failed';
  abortController: AbortController;
  audioBlob?: Blob;
  audioUrl?: string;
  audioElement?: HTMLAudioElement;
  requestStartTime: number;
  firstAudioTime?: number;
  isFallback?: boolean;
}

// Instant local cache for frequent zero-latency vocal responses
const INSTANT_PHRASES: Record<string, string> = {
  'jarvis': 'Yes, sir?',
  'are you there': 'Always.',
  'are you there?': 'Always.',
  'stop': 'Understood.',
  'halt': 'Understood.',
  'cancel': 'Operation cancelled, sir.',
  'open chrome': 'Opening Chrome.',
  'open browser': 'Opening Chrome.',
  'search': 'Searching now.',
  'status': 'All systems operational, sir.',
  'hello': 'Good day, sir. J.A.R.V.I.S. online.',
  'thank you': 'Always at your service, sir.',
  'thanks': 'Anytime, sir.',
};

/**
 * Strips markdown, code blocks, technical markup, and formatting
 * so that the spoken output sounds crisp, natural, and free of syntax tags.
 */
export function cleanSpokenText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/```[\s\S]*?```/g, 'Code block generated.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*#_~]/g, '')
    .replace(/^>\s+/gm, '')
    .replace(/\|.*\|/g, '')
    .replace(/---+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Selects the optimal deep British male voice for browser speech fallback
 */
export function selectBritishMaleVoice(preferredName?: string): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return undefined;

  // 1. Explicit user preference
  if (preferredName) {
    const userChoice = voices.find((v) => v.name === preferredName);
    if (userChoice) return userChoice;
  }

  // 2. High-priority cinematic British male voice candidates
  const prioritizedNames = [
    'Google UK English Male',
    'Microsoft Ryan Online (Natural) - English (United Kingdom)',
    'Microsoft Oliver Online (Natural) - English (United Kingdom)',
    'Microsoft George - English (United Kingdom)',
    'Daniel', // Apple macOS / iOS British Male (calm & authoritative)
    'Arthur',
    'Oliver',
    'George',
    'Brian',
    'Malcolm',
    'en-GB-Neural2-B',
    'en-GB-Standard-B',
  ];

  for (const name of prioritizedNames) {
    const matched = voices.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
    if (matched) return matched;
  }

  // 3. Any UK English voice with 'male' in descriptor
  const ukMale = voices.find(
    (v) => (v.lang === 'en-GB' || v.lang === 'en_GB') && 
           (v.name.toLowerCase().includes('male') || !v.name.toLowerCase().includes('female'))
  );
  if (ukMale) return ukMale;

  // 4. Any en-GB voice
  const ukVoice = voices.find((v) => v.lang === 'en-GB' || v.lang === 'en_GB');
  if (ukVoice) return ukVoice;

  // 5. Any Natural English male voice
  const naturalMale = voices.find(
    (v) => v.lang.startsWith('en') && 
           (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('natural'))
  );
  if (naturalMale) return naturalMale;

  return voices.find((v) => v.lang.startsWith('en')) || voices[0];
}

/**
 * Dedicated Voice Synthesizer & Streaming Audio Queue Service
 * Primary: Server-Side Low-Latency Neural TTS (/api/tts/chunk)
 * Pre-buffering: Generates Chunk N+1 while Chunk N is actively playing
 * Fallback: High-quality British Male Browser SpeechSynthesis
 */
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

  // Telemetry metrics
  private activeMetrics: VoiceMetrics = {
    aiResponseTime: 0.38,
    ttsStartTime: 0.22,
    audioBufferTime: 110,
    voiceActive: false,
    providerName: 'Neural British Male (Ryan)',
    aiFirstTokenLatency: 0.38,
    ttsRequestLatency: 0.05,
    ttsFirstAudioLatency: 0.24,
    totalVoiceLatency: 0.62,
    queueLength: 0,
    currentChunkIndex: 0,
  };

  // Web Audio Context & Real Frequency Analyser
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private visualizerRaf: number | null = null;
  private metricsListeners: Array<(metrics: VoiceMetrics) => void> = [];
  private stateListeners: Array<(state: 'idle' | 'generating' | 'speaking' | 'interrupted') => void> = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Ready voices list
      };
    }
  }

  public unlockAudioContext() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch (_) {}
  }

  public subscribeMetrics(fn: (metrics: VoiceMetrics) => void) {
    this.metricsListeners.push(fn);
    fn(this.activeMetrics);
    return () => {
      this.metricsListeners = this.metricsListeners.filter((l) => l !== fn);
    };
  }

  public subscribeState(fn: (state: 'idle' | 'generating' | 'speaking' | 'interrupted') => void) {
    this.stateListeners.push(fn);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== fn);
    };
  }

  private notifyState(state: 'idle' | 'generating' | 'speaking' | 'interrupted') {
    this.stateListeners.forEach((l) => l(state));
  }

  private notifyMetrics() {
    this.activeMetrics.queueLength = this.ttsQueue.length;
    this.metricsListeners.forEach((l) => l({ ...this.activeMetrics }));
  }

  public getMetrics(): VoiceMetrics {
    return { ...this.activeMetrics };
  }

  public setMetrics(partial: Partial<VoiceMetrics>) {
    this.activeMetrics = { ...this.activeMetrics, ...partial };
    this.notifyMetrics();
  }

  /**
   * Begins a new streaming voice session
   */
  public startStreaming(options: TTSOptions = {}, promptStartTime?: number) {
    this.cancelTTS();
    this.unlockAudioContext();
    this.isInterrupted = false;
    this.hasEmittedFirstSound = false;
    this.sessionStartTime = promptStartTime || performance.now();

    this.options = {
      pitch: options.pitch ?? 0.90, // Deep, calm, mature tone
      rate: options.rate ?? 1.20, // Default 1.20x speed
      volume: options.volume ?? 0.80, // 80% clear volume
      preferredVoice: options.preferredVoice || 'en-GB-RyanNeural',
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
  }

  /**
   * Ingests token chunks from AI streaming connection in real time.
   * Splits into natural sentence chunks immediately upon first terminal punctuation.
   * Dispatches the FIRST usable chunk to TTS with zero delay!
   */
  public pushToken(token: string) {
    if (this.isInterrupted) return;
    this.sentenceBuffer += token;

    // Sentence boundary detection:
    // 1. Natural terminal punctuation (. ! ? \n) followed by space or end
    // 2. Early clause break (, ; :) if buffer exceeds 45 characters on first chunk to start voice immediately
    let match = this.sentenceBuffer.match(/([.!?\n]+)(\s+|$)/);
    if (!match && this.sentenceIndex === 0 && this.sentenceBuffer.length > 45) {
      match = this.sentenceBuffer.match(/([,;:])\s+/);
    }

    while (match && match.index !== undefined) {
      const cutIndex = match.index + match[0].length;
      const sentenceText = this.sentenceBuffer.slice(0, cutIndex);
      this.sentenceBuffer = this.sentenceBuffer.slice(cutIndex);

      const cleaned = cleanSpokenText(sentenceText);
      if (cleaned.length > 0) {
        this.enqueueTTS(cleaned);
      }

      match = this.sentenceBuffer.match(/([.!?\n]+)(\s+|$)/);
    }
  }

  /**
   * Finalizes the incoming stream
   */
  public finishStream() {
    if (this.isInterrupted) return;

    if (this.sentenceBuffer.trim()) {
      const cleaned = cleanSpokenText(this.sentenceBuffer);
      if (cleaned.length > 0) {
        this.enqueueTTS(cleaned);
      }
      this.sentenceBuffer = '';
    }

    if (this.ttsQueue.length === 0 && !this.isSpeaking) {
      this.activeMetrics.voiceActive = false;
      this.notifyMetrics();
      this.notifyState('idle');
      this.options.onEnd?.();
    }
  }

  /**
   * Adds a sentence chunk to the audio queue and immediately initiates fetch
   */
  public enqueueTTS(text: string) {
    if (this.isInterrupted) return;

    const item: AudioQueueItem = {
      id: `chunk-${Date.now()}-${this.sentenceIndex}`,
      text,
      index: this.sentenceIndex++,
      status: 'queued',
      abortController: new AbortController(),
      requestStartTime: performance.now(),
    };

    this.ttsQueue.push(item);
    this.notifyMetrics();

    // Start fetching audio for this chunk immediately
    this.fetchChunkAudio(item);

    // If we're not currently speaking, process the queue right away
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  /**
   * Fetches synthesized audio bytes from server neural TTS (/api/tts/chunk)
   */
  private async fetchChunkAudio(task: AudioQueueItem) {
    if (this.isInterrupted || task.status !== 'queued') return;
    task.status = 'fetching';

    // Record TTS request initiation timestamp
    if (task.index === 0) {
      const reqLatency = parseFloat(((task.requestStartTime - this.sessionStartTime) / 1000).toFixed(2));
      this.activeMetrics.ttsRequestLatency = Math.max(0.01, reqLatency);
      this.notifyMetrics();
    }

    try {
      const res = await fetch('/api/tts/chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: task.text,
          rate: this.options.rate ?? 1.20,
          pitch: this.options.pitch ?? 0.90,
          voice: this.options.preferredVoice || 'en-GB-RyanNeural',
        }),
        signal: task.abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`TTS server HTTP ${res.status}`);
      }

      const blob = await res.blob();
      if (this.isInterrupted || task.abortController.signal.aborted) return;

      task.firstAudioTime = performance.now();
      task.audioBlob = blob;
      task.audioUrl = URL.createObjectURL(blob);
      task.status = 'ready';

      // Record TTFA (Time to First Audio)
      if (task.index === 0) {
        const firstAudioSec = parseFloat(((task.firstAudioTime - task.requestStartTime) / 1000).toFixed(2));
        this.activeMetrics.ttsFirstAudioLatency = Math.max(0.05, firstAudioSec);
        this.activeMetrics.ttsStartTime = firstAudioSec;
        this.notifyMetrics();
      }

      // Update nextAudio buffer pointer for seamless transition
      this.updateNextAudioPointer();

      // If active playback is waiting on this chunk, play it immediately!
      if (!this.isSpeaking) {
        this.processQueue();
      }
    } catch (err: any) {
      if (task.abortController.signal.aborted || this.isInterrupted) return;
      console.warn(`[TTS] Server chunk synthesis failed, using browser fallback:`, err.message || err);
      task.status = 'ready';
      task.isFallback = true;

      this.updateNextAudioPointer();
      if (!this.isSpeaking) {
        this.processQueue();
      }
    }
  }

  private updateNextAudioPointer() {
    const readyItems = this.ttsQueue.filter((item) => item.status === 'ready' && item !== this.currentAudio);
    this.nextAudio = readyItems[0] || null;
  }

  /**
   * Coordinates playback of the current item and triggers pre-buffering of the next item
   */
  public processQueue() {
    if (this.isInterrupted) return;

    // Find the next item to play
    const candidate = this.ttsQueue.find((item) => item.status === 'ready' || item.status === 'queued' || item.status === 'fetching');

    if (!candidate) {
      // Queue is completely drained
      this.isSpeaking = false;
      this.activeMetrics.voiceActive = false;
      this.notifyMetrics();
      this.stopVisualizer();
      this.notifyState('idle');
      this.options.onEnd?.();
      return;
    }

    if (candidate.status === 'ready') {
      this.playAudio(candidate);
    } else {
      // Still fetching; fetchChunkAudio will call processQueue() the instant it resolves
      this.notifyState('generating');
    }

    // PRE-GENERATE NEXT AUDIO: Look ahead in the queue and trigger fetch for the next queued item
    const upcomingQueue = this.ttsQueue.filter((item) => item.status === 'queued');
    for (const upcoming of upcomingQueue) {
      this.fetchChunkAudio(upcoming);
    }
  }

  /**
   * Plays an audio chunk with zero latency
   */
  private playAudio(task: AudioQueueItem) {
    if (this.isInterrupted) return;

    this.isSpeaking = true;
    task.status = 'playing';
    this.currentAudio = task;

    this.activeMetrics.voiceActive = true;
    this.activeMetrics.currentChunkIndex = task.index + 1;
    this.notifyMetrics();
    this.notifyState('speaking');

    // Trigger initial onStart callback once and compute real total voice latency
    if (!this.hasEmittedFirstSound) {
      this.hasEmittedFirstSound = true;
      const totalLatency = parseFloat(((performance.now() - this.sessionStartTime) / 1000).toFixed(2));
      this.activeMetrics.totalVoiceLatency = Math.max(0.15, totalLatency);
      this.notifyMetrics();
      this.options.onStart?.();
    }

    this.options.onSentenceStart?.(task.text, task.index);

    // Fallback path: use browser SpeechSynthesis
    if (task.isFallback || !task.audioUrl) {
      this.playBrowserFallback(task);
      return;
    }

    // Primary path: Instant Web Audio / HTMLAudioElement playback
    try {
      const audio = new Audio(task.audioUrl);
      task.audioElement = audio;
      audio.playbackRate = 1.0; // Speed is baked into neural audio at 1.20x!
      audio.volume = Math.max(0, Math.min(1, this.options.volume ?? 0.80));

      this.connectAudioElementToAnalyser(audio);
      this.startVisualizer();

      audio.onended = () => {
        task.status = 'completed';
        if (task.audioUrl) URL.revokeObjectURL(task.audioUrl);
        this.options.onSentenceEnd?.(task.index);
        this.playNextAudio();
      };

      audio.onerror = (e) => {
        console.warn('Audio element error, falling back to speech synthesis:', e);
        this.playBrowserFallback(task);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio play() autoplay constraint, attempting fallback:', err);
          this.playBrowserFallback(task);
        });
      }
    } catch (err) {
      console.error('Audio initialization failure, trying fallback:', err);
      this.playBrowserFallback(task);
    }
  }

  /**
   * Browser Speech Synthesis fallback
   */
  private playBrowserFallback(task: AudioQueueItem) {
    if (this.isInterrupted) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.playNextAudio();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(task.text);
    const voice = selectBritishMaleVoice(this.options.preferredVoice);
    if (voice) {
      utterance.voice = voice;
      this.activeMetrics.providerName = `${voice.name.replace(/Online \(Natural\)/i, 'Neural')} [Fallback]`;
      this.notifyMetrics();
    }

    utterance.rate = Math.max(0.8, Math.min(1.6, this.options.rate ?? 1.20));
    utterance.pitch = Math.max(0.7, Math.min(1.2, this.options.pitch ?? 0.90));
    utterance.volume = Math.max(0, Math.min(1, this.options.volume ?? 0.80));

    this.startVisualizer();

    utterance.onend = () => {
      task.status = 'completed';
      this.options.onSentenceEnd?.(task.index);
      this.playNextAudio();
    };

    utterance.onerror = () => {
      task.status = 'completed';
      this.playNextAudio();
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      this.playNextAudio();
    }
  }

  /**
   * Advances seamlessly from one sentence chunk to the next
   */
  public playNextAudio() {
    if (this.isInterrupted) return;

    // Remove completed item from queue
    if (this.currentAudio) {
      this.ttsQueue = this.ttsQueue.filter((item) => item.id !== this.currentAudio?.id);
      this.currentAudio = null;
    }

    this.updateNextAudioPointer();

    // Check if next item is already ready
    if (this.nextAudio && this.nextAudio.status === 'ready') {
      this.playAudio(this.nextAudio);
    } else {
      this.isSpeaking = false;
      this.processQueue();
    }
  }

  /**
   * Immediate Interruption Protocol:
   * 1. Stop current audio immediately
   * 2. Cancel all pending TTS fetch requests
   * 3. Clear queue
   * 4. Reset visualizer & state
   */
  public cancelTTS() {
    this.isInterrupted = true;

    // Stop current audio element
    if (this.currentAudio?.audioElement) {
      try {
        this.currentAudio.audioElement.pause();
        this.currentAudio.audioElement.src = '';
      } catch (_) {}
    }

    // Abort all in-flight fetch requests & revoke blob URLs
    for (const item of this.ttsQueue) {
      item.abortController.abort();
      if (item.audioUrl) {
        try { URL.revokeObjectURL(item.audioUrl); } catch (_) {}
      }
      if (item.audioElement) {
        try {
          item.audioElement.pause();
          item.audioElement.src = '';
        } catch (_) {}
      }
    }

    // Cancel browser speech synthesis if running
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    this.ttsQueue = [];
    this.currentAudio = null;
    this.nextAudio = null;
    this.sentenceBuffer = '';
    this.isSpeaking = false;

    this.activeMetrics.voiceActive = false;
    this.notifyMetrics();
    this.stopVisualizer();
    this.notifyState('interrupted');
    this.options.onInterrupted?.();
  }

  public interrupt() {
    this.cancelTTS();
  }

  public stopPlayback() {
    this.cancelTTS();
  }

  /**
   * Fast-path static text speaker
   */
  public speak(text: string, options: TTSOptions = {}) {
    const cleaned = cleanSpokenText(text);
    if (!cleaned) {
      options.onEnd?.();
      return;
    }

    this.startStreaming(options);
    this.pushToken(cleaned);
    this.finishStream();
  }

  /**
   * Fast-path immediate response for keyword commands
   */
  public speakInstant(keyword: string, options: TTSOptions = {}): boolean {
    const lower = keyword.toLowerCase().trim();
    const phrase = INSTANT_PHRASES[lower];
    if (phrase) {
      this.speak(phrase, options);
      return true;
    }
    return false;
  }

  /**
   * Connects HTMLAudioElement to Web Audio AnalyserNode for live Arc Reactor sync
   */
  private connectAudioElementToAnalyser(audio: HTMLAudioElement) {
    try {
      this.unlockAudioContext();
      if (!this.audioCtx) return;

      if (!this.analyser) {
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.5;
        this.analyser.connect(this.audioCtx.destination);
      }

      const source = this.audioCtx.createMediaElementSource(audio);
      source.connect(this.analyser);
    } catch (_) {
      // Browser cross-origin or already connected audio elements fall back to simulated visualizer
    }
  }

  /**
   * Real-time vocal amplitude visualizer loop
   */
  private startVisualizer() {
    if (this.visualizerRaf !== null) return;

    let tick = 0;
    const freqData = this.analyser ? new Uint8Array(this.analyser.frequencyBinCount) : null;

    const loop = () => {
      if (!this.isSpeaking || this.isInterrupted) {
        this.stopVisualizer();
        return;
      }

      tick++;
      let level = 0;

      if (this.analyser && freqData) {
        this.analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        const avg = sum / (freqData.length || 1);
        level = Math.min(1, Math.max(0.1, avg / 110));
      } else {
        // Natural British vocal inflection simulator: rhythmic pulses matching spoken cadences
        const pulse = Math.abs(Math.sin(tick * 0.18) * Math.cos(tick * 0.08));
        const variance = (Math.sin(tick * 0.45) + 1) * 0.2;
        level = Math.min(1, Math.max(0.18, 0.35 + pulse * 0.45 + variance));
      }

      this.options.onAudioLevel?.(level);
      this.visualizerRaf = requestAnimationFrame(loop);
    };

    this.visualizerRaf = requestAnimationFrame(loop);
  }

  private stopVisualizer() {
    if (this.visualizerRaf !== null) {
      cancelAnimationFrame(this.visualizerRaf);
      this.visualizerRaf = null;
    }
    this.options.onAudioLevel?.(0);
  }
}

// Global Singleton Instance
export const ttsService = new JarvisTTSService();

/**
 * Speech Recognition and Speech Synthesis with Web Audio frequency analysis
 */

export interface SpeechListenerCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  onAudioLevel?: (level: number) => void;
}

let recognitionInstance: any = null;
let micAudioContext: AudioContext | null = null;
let micAnalyser: AnalyserNode | null = null;
let micStream: MediaStream | null = null;
let micAnimFrame: number | null = null;
let silenceTimer: any = null;
let currentSessionId = 0;
let hasSubmittedFinalForSession = false;

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function startSpeechRecognition(callbacks: SpeechListenerCallbacks) {
  if (!isSpeechRecognitionSupported()) {
    callbacks.onError?.('Speech recognition is not supported in this browser.');
    return;
  }

  try {
    // Interrupt any ongoing speech synthesis immediately
    stopJarvisSpeech();

    // Stop any previous recognition instance
    stopSpeechRecognition();

    const sessionId = ++currentSessionId;
    hasSubmittedFinalForSession = false;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionInstance = new SpeechRec();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    let hasReceivedSpeech = false;
    let latestTranscript = '';

    // Guard to ensure final transcript is submitted AT MOST ONCE per speech session
    const submitFinalOnce = (finalText: string) => {
      if (hasSubmittedFinalForSession || sessionId !== currentSessionId) return;
      hasSubmittedFinalForSession = true;

      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }

      stopSpeechRecognition();
      callbacks.onResult?.(finalText.trim(), true);
    };

    const resetSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      // Fast, responsive finalization on speech pause (400ms pause)
      silenceTimer = setTimeout(() => {
        if (hasReceivedSpeech && latestTranscript.trim() && !hasSubmittedFinalForSession) {
          submitFinalOnce(latestTranscript.trim());
        }
      }, 400);
    };

    recognitionInstance.onstart = () => {
      if (sessionId !== currentSessionId) return;
      callbacks.onStart?.();
      setupMicAudioAnalysis(callbacks.onAudioLevel);
    };

    recognitionInstance.onresult = (event: any) => {
      if (sessionId !== currentSessionId || hasSubmittedFinalForSession) return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      if (activeText) {
        hasReceivedSpeech = true;
        latestTranscript = activeText;
        // Interim transcription ONLY updates UI display
        callbacks.onResult?.(activeText, false);
        resetSilenceTimer();
      }

      if (finalTranscript.trim()) {
        submitFinalOnce(finalTranscript.trim());
      }
    };

    recognitionInstance.onerror = (event: any) => {
      if (sessionId !== currentSessionId) return;
      if (event.error === 'no-speech') {
        // Ignorable background silence
        return;
      }
      console.warn('Speech recognition notice:', event.error);
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      callbacks.onError?.(event.error || 'Microphone error');
      cleanupMicAudio();
    };

    recognitionInstance.onend = () => {
      if (sessionId !== currentSessionId) return;
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      if (hasReceivedSpeech && latestTranscript.trim() && !hasSubmittedFinalForSession) {
        submitFinalOnce(latestTranscript.trim());
      }
      callbacks.onEnd?.();
      cleanupMicAudio();
    };

    recognitionInstance.start();
  } catch (err: any) {
    console.error('Failed to start speech recognition:', err);
    callbacks.onError?.(err.message || 'Failed to start speech recognition');
    cleanupMicAudio();
  }
}

export function stopSpeechRecognition() {
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch (_) {}
    recognitionInstance = null;
  }
  cleanupMicAudio();
}

async function setupMicAudioAnalysis(onAudioLevel?: (level: number) => void) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    micAudioContext = new AudioCtx();
    const source = micAudioContext.createMediaStreamSource(micStream);
    micAnalyser = micAudioContext.createAnalyser();
    micAnalyser.fftSize = 64;
    micAnalyser.smoothingTimeConstant = 0.6;
    source.connect(micAnalyser);

    const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);

    const analyze = () => {
      if (!micAnalyser) return;
      micAnalyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1, avg / 128);
      onAudioLevel?.(normalized);
      micAnimFrame = requestAnimationFrame(analyze);
    };

    analyze();
  } catch (err) {
    console.warn('Mic audio analysis error:', err);
  }
}

function cleanupMicAudio() {
  if (micAnimFrame) {
    cancelAnimationFrame(micAnimFrame);
    micAnimFrame = null;
  }
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }
  if (micAudioContext && micAudioContext.state !== 'closed') {
    micAudioContext.close().catch(() => {});
    micAudioContext = null;
  }
  micAnalyser = null;
}

// Speech Synthesis (JARVIS British Voice Engine powered by ttsService)
import { ttsService, TTSOptions, selectBritishMaleVoice } from './ttsService';

export type JarvisSpeechOptions = TTSOptions;

export const streamingSpeaker = {
  start(options: TTSOptions = {}, aiStartTime?: number, requestId?: string) {
    ttsService.startStreaming(options, aiStartTime, requestId);
  },
  pushToken(token: string) {
    ttsService.pushToken(token);
  },
  finishStream() {
    ttsService.finishStream();
  },
  stop() {
    ttsService.stopPlayback();
  },
  interrupt() {
    ttsService.interrupt();
  }
};

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

export function speakJarvis(
  text: string,
  options: TTSOptions = {},
  requestId?: string
) {
  ttsService.speak(text, options, requestId);
}

export function stopJarvisSpeech() {
  ttsService.interrupt();
}


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
    // Stop any existing instance
    stopSpeechRecognition();

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionInstance = new SpeechRec();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      callbacks.onStart?.();
      setupMicAudioAnalysis(callbacks.onAudioLevel);
    };

    recognitionInstance.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        callbacks.onResult?.(finalTranscript, true);
      } else if (interimTranscript) {
        callbacks.onResult?.(interimTranscript, false);
      }
    };

    recognitionInstance.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      callbacks.onError?.(event.error || 'Microphone error');
      cleanupMicAudio();
    };

    recognitionInstance.onend = () => {
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

// Speech Synthesis (JARVIS British Voice Engine)
let currentUtterance: SpeechSynthesisUtterance | null = null;
let speechAnimInterval: any = null;

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

export function speakJarvis(
  text: string,
  options: {
    pitch?: number;
    rate?: number;
    volume?: number;
    preferredVoice?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onAudioLevel?: (level: number) => void;
  } = {}
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    options.onEnd?.();
    return;
  }

  stopJarvisSpeech();

  // Strip markdown or code tags for cleaner speech
  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'Code block generated.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*#_~]/g, '')
    .trim();

  if (!cleanText) {
    options.onEnd?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  currentUtterance = utterance;

  utterance.pitch = options.pitch ?? 0.95; // Slightly lower, authoritative pitch
  utterance.rate = options.rate ?? 1.05; // Crisp cadence
  utterance.volume = options.volume ?? 1.0;

  // Find best JARVIS-like voice: British English Male or clean UK voice
  const voices = window.speechSynthesis.getVoices();
  let selectedVoice = voices.find(v => v.name === options.preferredVoice);

  if (!selectedVoice) {
    // Look for UK / British English
    selectedVoice =
      voices.find(v => v.lang === 'en-GB' && (v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('George') || v.name.includes('Oliver'))) ||
      voices.find(v => v.lang === 'en-GB') ||
      voices.find(v => v.name.includes('Google UK English') || v.name.includes('Natural')) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0];
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.onstart = () => {
    options.onStart?.();
    // Simulate real-time speech amplitude modulation for Arc Reactor core
    let step = 0;
    speechAnimInterval = setInterval(() => {
      step++;
      const base = 0.35 + 0.5 * Math.abs(Math.sin(step * 0.4) * Math.cos(step * 0.15));
      const jitter = (Math.random() - 0.5) * 0.2;
      options.onAudioLevel?.(Math.min(1, Math.max(0.1, base + jitter)));
    }, 60);
  };

  utterance.onend = () => {
    if (speechAnimInterval) {
      clearInterval(speechAnimInterval);
      speechAnimInterval = null;
    }
    options.onAudioLevel?.(0);
    options.onEnd?.();
    currentUtterance = null;
  };

  utterance.onerror = () => {
    if (speechAnimInterval) {
      clearInterval(speechAnimInterval);
      speechAnimInterval = null;
    }
    options.onAudioLevel?.(0);
    options.onEnd?.();
    currentUtterance = null;
  };

  window.speechSynthesis.speak(utterance);
}

export function stopJarvisSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (speechAnimInterval) {
    clearInterval(speechAnimInterval);
    speechAnimInterval = null;
  }
  currentUtterance = null;
}

export type AssistantState =
  | 'idle'
  | 'listening'
  | 'understanding'
  | 'thinking'
  | 'generating'
  | 'speaking'
  | 'interrupted'
  | 'executing'
  | 'success'
  | 'error';

export interface VoiceMetrics {
  aiResponseTime: number; // in seconds, e.g. 0.42
  ttsStartTime: number; // in seconds, e.g. 0.18
  audioBufferTime: number; // in milliseconds, e.g. 120
  voiceActive: boolean;
  providerName?: string;
  aiFirstTokenLatency?: number; // in seconds, real measured latency to first AI token
  ttsRequestLatency?: number; // in seconds, real measured time to start TTS request
  ttsFirstAudioLatency?: number; // in seconds, real measured time to first audio byte
  totalVoiceLatency?: number; // in seconds, real measured time from prompt to sound
  speechRecognitionLatency?: number; // in ms, speech transcription latency
  queueLength?: number;
  currentChunkIndex?: number;
}

export interface ExecutionStep {
  stage: 'listening' | 'understanding' | 'searching' | 'thinking' | 'generating' | 'speaking' | 'executing' | 'completed';
  label: string;
  detail?: string;
  timestamp: number;
}

export interface WebSource {
  title: string;
  url: string;
  domain?: string;
  snippet?: string;
}

export interface ToolExecution {
  name: string;
  displayName: string;
  icon?: string;
  args: Record<string, any>;
  result?: any;
  status: 'running' | 'success' | 'error';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sources?: WebSource[];
  toolExecution?: ToolExecution;
  steps?: ExecutionStep[];
}

export interface StarkTask {
  id: string;
  title: string;
  due?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: number;
}

export interface AssistantSettings {
  voiceEnabled: boolean;
  voicePitch: number; // 0.7 - 1.2 (default 0.90 - deep/mature)
  voiceRate: number; // 0.8 - 1.6 (default 1.20)
  voiceVolume: number; // 0 - 1 (default 0.80)
  autoListen: boolean; // Auto-listen after speech
  interruptOnSpeech: boolean; // Interrupt playback when user speaks
  streamingTts: boolean; // Stream first sentence immediately
  preferredVoice?: string;
  voiceProfile?: string; // e.g. 'deep-male-british'
  ttsProvider?: 'auto' | 'neural' | 'browser';
  aiModel: string; // Active model
  aiStyle: 'concise' | 'detailed' | 'technical';
  contextMemory: number; // 5 - 50 message history
  reactorIntensity: number; // 1 - 100
  animationSpeed: number; // 0.5 - 2
  hudDensity: 'minimal' | 'balanced' | 'cyberpunk';
  soundEffects: boolean;
  ambientHum: boolean;
  reducedMotion: boolean;
}

export interface SystemTelemetry {
  coreOutputGW: number;
  coreTempKelvin: number;
  efficiencyPercent: number;
  frequencyHz: number;
  batteryStatus: string;
  networkStatus: string;
  activeModel: string;
  demoMode: boolean;
}

export type DesktopActionType =
  | 'OPEN_APPLICATION'
  | 'CLOSE_APPLICATION'
  | 'OPEN_WEBSITE'
  | 'GET_RUNNING_APPS';

export type DesktopActionStage =
  | 'command_received'
  | 'resolving'
  | 'executing'
  | 'success'
  | 'failed';

export interface DesktopActionDetail {
  id: string;
  type: DesktopActionType;
  stage: DesktopActionStage;
  command: string; // e.g. "OPEN APPLICATION", "CLOSE APPLICATION"
  target: string; // e.g. "VISUAL STUDIO CODE"
  statusText: string; // e.g. "LAUNCHING...", "APPLICATION OPEN", "FAILED"
  appName?: string;
  appId?: string;
  url?: string;
  searchQuery?: string;
  requiresConfirmation?: boolean;
  confirmed?: boolean;
  timestamp: number;
  error?: string;
}

export interface ApplicationRegistryItem {
  id: string;
  name: string;
  aliases: string[];
  executables: {
    windows: string;
    mac: string;
    linux: string;
  };
  processNames: string[];
  icon: string;
  category: 'productivity' | 'development' | 'browser' | 'system' | 'media' | 'communication';
  description: string;
}

export interface RunningApplication {
  id: string;
  name: string;
  processName: string;
  pid?: number;
  cpu?: number;
  memoryMB?: number;
  status: 'running' | 'terminated';
}

export interface DesktopAgentState {
  isConnected: boolean;
  agentUrl: string;
  authToken: string;
  platform?: 'win32' | 'darwin' | 'linux' | 'unknown';
  version?: string;
  lastChecked: number;
  error?: string;
}

export type AssistantState =
  | 'idle'
  | 'listening'
  | 'understanding'
  | 'thinking'
  | 'generating'
  | 'speaking'
  | 'executing'
  | 'success'
  | 'error';

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
  voicePitch: number; // 0.5 - 1.5
  voiceRate: number; // 0.7 - 1.5
  voiceVolume: number; // 0 - 1
  preferredVoice?: string;
  aiStyle: 'concise' | 'detailed' | 'technical';
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

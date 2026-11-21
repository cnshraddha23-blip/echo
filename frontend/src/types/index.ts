export interface Message {
  id?: number;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  language?: string;
  timestamp?: string;
  agent?: Agent;
}

export interface Conversation {
  id: string;
  title: string;
  folder?: string;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  name: string;
  os: string;
  companion_version?: string;
  status: 'online' | 'offline' | 'pairing';
  ip_address?: string;
  capabilities: string[];
  permissions: string[];
  last_seen?: string;
  is_connected?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  code: string;
  role: string;
  description: string;
  tools: string[];
  status: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger_type: 'manual' | 'voice' | 'schedule';
  trigger_value?: string;
  steps: Array<{ action: string; target?: string; desc?: string; [key: string]: any }>;
  is_active: number;
  last_run?: string;
}

export interface Memory {
  id: number;
  user_id?: number;
  category: 'preference' | 'fact' | 'project' | 'productivity';
  key: string;
  value: string;
  importance: number;
  created_at?: string;
  updated_at?: string;
}

export interface ResearchReport {
  topic: string;
  report_markdown: string;
  sources_count: number;
  generated_at: string;
}

export interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size_bytes: number;
  modified: string;
  ext: string;
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  email?: string;
  role: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  category: string;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: number;
  title: string;
  remind_at: string;
  status: 'pending' | 'triggered' | 'dismissed';
  created_at: string;
}

export interface SystemTelemetry {
  status: string;
  timestamp: string;
  cpu: {
    usage_percent: number;
    cores: number;
  };
  memory: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
  };
  network?: {
    bytes_sent: number;
    bytes_recv: number;
  };
  os: string;
  uptime_seconds?: number;
}

export type AssistantVisualizerState = 
  | 'idle' 
  | 'listening' 
  | 'transcribing'
  | 'processing' 
  | 'thinking' 
  | 'speaking' 
  | 'interrupted' 
  | 'offline' 
  | 'error';

export interface DetectedElement {
  id: number;
  type: string;
  label: string;
  bbox: [number, number, number, number];
  center: [number, number];
}

export interface ScreenAnalysis {
  active_application: string;
  screen_summary: string;
  detected_elements: DetectedElement[];
  next_action?: {
    action: string;
    target_description: string;
    center?: [number, number];
    text?: string;
    key?: string;
    reason?: string;
  };
  is_goal_reached?: boolean;
}

export interface VisualStep {
  step: number;
  timestamp: number;
  stage: 'observe' | 'understand' | 'plan' | 'act' | 'verify' | 'completed';
  screenshot_url?: string;
  active_application?: string;
  analysis?: ScreenAnalysis;
  planned_action?: any;
  act_result?: any;
  verified?: boolean;
  verified_screenshot_url?: string;
}

export interface VisualLoopResult {
  task_id: string;
  status: 'completed' | 'failed' | 'cancelled' | 'waiting_for_approval';
  goal: string;
  steps_count: number;
  steps: VisualStep[];
  message: string;
}

export interface ComputerTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

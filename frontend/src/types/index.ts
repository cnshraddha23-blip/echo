export interface Message {
  id?: number;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  language?: string;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
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

export interface AppInfo {
  name: string;
  id: string;
  type: string;
  desc: string;
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
    available_gb: number;
    percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
  };
  battery: {
    percent: number;
    power_plugged: boolean;
    secsleft: number;
  } | null;
}

export type AssistantVisualizerState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

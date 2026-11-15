import { io, Socket } from 'socket.io-client';
import { Note, Task, Reminder, SystemTelemetry, Message } from '../types';

const API_BASE = '/api';

export const socket: Socket = io('http://127.0.0.1:5000', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

export const api = {
  // System
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
  async getSystemInfo(): Promise<SystemTelemetry> {
    const res = await fetch(`${API_BASE}/system/info`);
    return res.json();
  },
  async getStatus() {
    const res = await fetch(`${API_BASE}/status`);
    return res.json();
  },

  // Chat & AI
  async sendMessage(message: string, conversationId = 'default', language = 'en-IN', speak = false) {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversation_id: conversationId, language, speak_response: speak })
    });
    return res.json();
  },
  async getConversations() {
    const res = await fetch(`${API_BASE}/conversations`);
    return res.json();
  },
  async getMessages(conversationId: string): Promise<{ messages: Message[] }> {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`);
    return res.json();
  },
  async deleteConversation(conversationId: string) {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, { method: 'DELETE' });
    return res.json();
  },

  // Voice Controls
  async startVoice(language = 'en-IN') {
    const res = await fetch(`${API_BASE}/voice/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language })
    });
    return res.json();
  },
  async stopVoice() {
    const res = await fetch(`${API_BASE}/voice/stop`, { method: 'POST' });
    return res.json();
  },
  async speakText(text: string, language = 'en-IN') {
    const res = await fetch(`${API_BASE}/voice/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language })
    });
    return res.json();
  },
  async stopSpeaking() {
    const res = await fetch(`${API_BASE}/voice/stop-speaking`, { method: 'POST' });
    return res.json();
  },

  // Notes
  async getNotes(search?: string): Promise<Note[]> {
    const url = search ? `${API_BASE}/notes?search=${encodeURIComponent(search)}` : `${API_BASE}/notes`;
    const res = await fetch(url);
    return res.json();
  },
  async createNote(title: string, content: string, category = 'general', is_pinned = false): Promise<Note> {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, category, is_pinned })
    });
    return res.json();
  },
  async updateNote(id: number, title: string, content: string, category?: string, is_pinned?: boolean): Promise<Note> {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, category, is_pinned })
    });
    return res.json();
  },
  async deleteNote(id: number) {
    const res = await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Tasks
  async getTasks(status?: string): Promise<Task[]> {
    const url = status ? `${API_BASE}/tasks?status=${status}` : `${API_BASE}/tasks`;
    const res = await fetch(url);
    return res.json();
  },
  async createTask(title: string, description = '', due_date: string | null = null, priority = 'medium'): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, due_date, priority })
    });
    return res.json();
  },
  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async deleteTask(id: number) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Reminders
  async getReminders(status?: string): Promise<Reminder[]> {
    const url = status ? `${API_BASE}/reminders?status=${status}` : `${API_BASE}/reminders`;
    const res = await fetch(url);
    return res.json();
  },
  async createReminder(title: string, remind_at: string): Promise<Reminder> {
    const res = await fetch(`${API_BASE}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, remind_at })
    });
    return res.json();
  },
  async updateReminder(id: number, data: Partial<Reminder>): Promise<Reminder> {
    const res = await fetch(`${API_BASE}/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async deleteReminder(id: number) {
    const res = await fetch(`${API_BASE}/reminders/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Applications
  async getApps() {
    const res = await fetch(`${API_BASE}/apps`);
    return res.json();
  },
  async launchApp(app_key: string) {
    const res = await fetch(`${API_BASE}/apps/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_key })
    });
    return res.json();
  },
  async closeApp(app_key: string) {
    const res = await fetch(`${API_BASE}/apps/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_key })
    });
    return res.json();
  },

  // Settings
  async getSettings(): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },
  async updateSettings(preferences: Record<string, string>) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences })
    });
    return res.json();
  },

  // Tools
  async calculate(expression: string) {
    const res = await fetch(`${API_BASE}/tools/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression })
    });
    return res.json();
  },
  async getWeather(city = 'Bengaluru') {
    const res = await fetch(`${API_BASE}/tools/weather?city=${encodeURIComponent(city)}`);
    return res.json();
  },
  async translate(text: string, source_lang = 'en', target_lang = 'kn') {
    const res = await fetch(`${API_BASE}/tools/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source_lang, target_lang })
    });
    return res.json();
  }
};

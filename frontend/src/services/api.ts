import { io, Socket } from 'socket.io-client';
import { 
  Conversation, Message, Note, Task, Reminder, 
  SystemTelemetry, Device, Agent, Workflow, Memory, ResearchReport, FileItem, User 
} from '../types';

const API_BASE = '/api';

export const socket: Socket = io('/', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('echo_auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export const api = {
  // Authentication
  async register(username: string, password: string, displayName = '', email = '') {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, display_name: displayName, email })
    });
    return res.json();
  },

  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader()
    });
    return res.json();
  },

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
    const res = await fetch(`${API_BASE}/status`, { headers: getAuthHeader() });
    return res.json();
  },

  // Multi-Agent Chat
  async sendMessage(message: string, conversationId = 'default', language = 'en-IN', speak = false, targetDeviceId?: string) {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ 
        message, 
        conversation_id: conversationId, 
        language, 
        speak_response: speak, 
        is_voice: false,
        target_device_id: targetDeviceId 
      })
    });
    return res.json();
  },

  async sendVoiceCommand(message: string, language = 'en-IN', targetDeviceId?: string) {
    const res = await fetch(`${API_BASE}/voice/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ 
        message, 
        conversation_id: 'voice-session', 
        language, 
        is_voice: true, 
        speak_response: false,
        target_device_id: targetDeviceId
      })
    });
    return res.json();
  },

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/conversations`);
    return res.json();
  },

  async createConversation(id: string, title: string, folder = 'Echo Assistant') {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, folder })
    });
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

  // Connected Devices & Pairing
  async getDevices(): Promise<Device[]> {
    const res = await fetch(`${API_BASE}/devices`, { headers: getAuthHeader() });
    return res.json();
  },

  async getPairingCode(): Promise<{ pairing_code: string; expires_at: string }> {
    const res = await fetch(`${API_BASE}/devices/pairing-code`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    return res.json();
  },

  async removeDevice(deviceId: string) {
    const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return res.json();
  },

  async updateDevicePermissions(deviceId: string, permissions: string[]) {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ permissions })
    });
    return res.json();
  },

  async sendDeviceCommand(deviceId: string, commandType: string, payload: any = {}) {
    const res = await fetch(`${API_BASE}/devices/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({
        target_device_id: deviceId,
        command_type: commandType,
        payload
      })
    });
    return res.json();
  },

  // Specialized Agents
  async getAgents(): Promise<Agent[]> {
    const res = await fetch(`${API_BASE}/agents`);
    return res.json();
  },

  async getAgentExecutions() {
    const res = await fetch(`${API_BASE}/agents/executions`, { headers: getAuthHeader() });
    return res.json();
  },

  // Workflows
  async getWorkflows(): Promise<Workflow[]> {
    const res = await fetch(`${API_BASE}/workflows`, { headers: getAuthHeader() });
    return res.json();
  },

  async createWorkflow(name: string, description: string, steps: any[], triggerType = 'manual', triggerValue = '') {
    const res = await fetch(`${API_BASE}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ name, description, steps, trigger_type: triggerType, trigger_value: triggerValue })
    });
    return res.json();
  },

  async executeWorkflow(workflowId: string) {
    const res = await fetch(`${API_BASE}/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    return res.json();
  },

  async getWorkflowExecutions() {
    const res = await fetch(`${API_BASE}/workflows/executions`, { headers: getAuthHeader() });
    return res.json();
  },

  // Browser Research
  async conductResearch(topic: string, language = 'en-IN'): Promise<ResearchReport> {
    const res = await fetch(`${API_BASE}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, language })
    });
    return res.json();
  },

  // File Manager
  async listFiles(dir = ''): Promise<{ success: boolean; items: FileItem[]; total: number; current_path: string }> {
    const res = await fetch(`${API_BASE}/files?dir=${encodeURIComponent(dir)}`);
    return res.json();
  },

  async readFile(path: string) {
    const res = await fetch(`${API_BASE}/files/read?path=${encodeURIComponent(path)}`);
    return res.json();
  },

  async summarizeFile(path: string) {
    const res = await fetch(`${API_BASE}/files/summarize?path=${encodeURIComponent(path)}`, {
      method: 'POST'
    });
    return res.json();
  },

  async searchFiles(keyword: string): Promise<FileItem[]> {
    const res = await fetch(`${API_BASE}/files/search?keyword=${encodeURIComponent(keyword)}`);
    return res.json();
  },

  // Persistent Memory
  async getMemories(category?: string, search?: string): Promise<Memory[]> {
    let url = `${API_BASE}/memories?`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    if (search) url += `search=${encodeURIComponent(search)}`;
    const res = await fetch(url, { headers: getAuthHeader() });
    return res.json();
  },

  async createMemory(key: string, value: string, category = 'preference', importance = 3) {
    const res = await fetch(`${API_BASE}/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ key, value, category, importance })
    });
    return res.json();
  },

  async deleteMemory(memoryId: number) {
    const res = await fetch(`${API_BASE}/memories/${memoryId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return res.json();
  },

  // Notes, Tasks, Reminders
  async getNotes(category?: string, search?: string): Promise<Note[]> {
    let url = `${API_BASE}/notes?`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    if (search) url += `search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    return res.json();
  },

  async createNote(title: string, content: string, category = 'general', isPinned = false) {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, category, is_pinned: isPinned })
    });
    return res.json();
  },

  async deleteNote(id: number) {
    const res = await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async getTasks(status?: string): Promise<Task[]> {
    const url = status ? `${API_BASE}/tasks?status=${status}` : `${API_BASE}/tasks`;
    const res = await fetch(url);
    return res.json();
  },

  async createTask(title: string, description = '', dueDate?: string, priority = 'medium') {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, due_date: dueDate, priority })
    });
    return res.json();
  },

  async updateTask(id: number, updates: Partial<Task>) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteTask(id: number) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async getReminders(status?: string): Promise<Reminder[]> {
    const url = status ? `${API_BASE}/reminders?status=${status}` : `${API_BASE}/reminders`;
    const res = await fetch(url);
    return res.json();
  },

  async createReminder(title: string, remindAt: string) {
    const res = await fetch(`${API_BASE}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, remind_at: remindAt })
    });
    return res.json();
  },

  async deleteReminder(id: number) {
    const res = await fetch(`${API_BASE}/reminders/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Settings
  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async updateSettings(settingsData: any) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsData)
    });
    return res.json();
  },

  // Computer Control & Visual Perception
  async getComputerTools() {
    const res = await fetch(`${API_BASE}/computer/tools`);
    return res.json();
  },

  async executeComputerTool(toolName: string, parameters: any = {}, targetDeviceId?: string) {
    const res = await fetch(`${API_BASE}/computer/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ tool_name: toolName, parameters, target_device_id: targetDeviceId })
    });
    return res.json();
  },

  async captureScreenshot() {
    const res = await fetch(`${API_BASE}/visual/screenshot`, { method: 'POST' });
    return res.json();
  },

  async inspectScreen(userGoal = 'Inspect active interface', targetDeviceId?: string) {
    const res = await fetch(`${API_BASE}/visual/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_goal: userGoal, target_device_id: targetDeviceId })
    });
    return res.json();
  },

  async triggerVisualLoop(goal: string, maxSteps = 3, targetDeviceId?: string) {
    const res = await fetch(`${API_BASE}/visual/loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, max_steps: maxSteps, target_device_id: targetDeviceId })
    });
    return res.json();
  },

  async cancelVisualTask() {
    const res = await fetch(`${API_BASE}/visual/cancel`, { method: 'POST' });
    return res.json();
  }
};

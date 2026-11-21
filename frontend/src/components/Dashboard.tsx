import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Mic, MicOff, Calendar, Clock, CheckCircle2, 
  FileText, ArrowUpRight, Cpu, HardDrive, Activity, 
  Laptop, Bot, Workflow as WorkflowIcon, Globe, FolderOpen, 
  Volume2, Eye, Terminal, Send, Search, Shield, Zap, RefreshCw, Smartphone, Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AssistantVisualizer } from './AssistantVisualizer';
import { KineticText } from './KineticText';
import { ScrambleText } from './ScrambleText';
import { Note, Task, Reminder, SystemTelemetry, AssistantVisualizerState, Device } from '../types';

interface DashboardProps {
  onStartVoice: () => void;
  onStopVoice: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  visualizerState: AssistantVisualizerState;
  notes: Note[];
  tasks: Task[];
  reminders: Reminder[];
  telemetry: SystemTelemetry | null;
  devices: Device[];
  onNavigate: (tab: string) => void;
  onQuickAction: (action: string) => void;
  userName: string;
  transcriptFeedback?: string;
  activeLanguage: string;
  onToggleLanguage: (lang: string) => void;
  onOpenVisualPerception?: () => void;
  onExecuteCommand?: (command: string) => void;
  onOpenCommandPalette?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onStartVoice,
  onStopVoice,
  isListening,
  isSpeaking,
  visualizerState,
  notes,
  tasks,
  reminders,
  telemetry,
  devices,
  onNavigate,
  onQuickAction,
  userName = "Shraddha",
  transcriptFeedback,
  activeLanguage,
  onToggleLanguage,
  onOpenVisualPerception,
  onExecuteCommand,
  onOpenCommandPalette
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [naturalCommand, setNaturalCommand] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const upcomingReminders = reminders.filter(r => r.status === 'pending');
  const onlineDevicesCount = devices.filter(d => d.status === 'online' || d.is_connected).length;

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalCommand.trim()) return;
    if (onExecuteCommand) {
      onExecuteCommand(naturalCommand.trim());
    } else {
      onQuickAction(naturalCommand.trim());
    }
    setNaturalCommand('');
  };

  const statusLabel = 
    visualizerState === 'listening' ? (activeLanguage === 'kn-IN' ? 'ಧ್ವನಿ ಆಲಿಸುತ್ತಿದೆ...' : 'Listening to voice...') : 
    visualizerState === 'speaking' ? (activeLanguage === 'kn-IN' ? 'ಎಕೋ ಮಾತನಾಡುತ್ತಿದೆ...' : 'Echo Speaking...') : 
    visualizerState === 'processing' || visualizerState === 'thinking' ? (activeLanguage === 'kn-IN' ? 'ಚಿಂತಿಸುತ್ತಿದೆ...' : 'Thinking & Orchestrating...') : 
    (activeLanguage === 'kn-IN' ? 'ಎಕೋ ಧ್ವನಿ ಸಿದ್ಧವಾಗಿದೆ' : 'Echo Ecosystem Armed');

  // Realistic fallback devices if list is empty
  const displayDevices = devices.length > 0 ? devices : [
    { id: 'dev_primary', name: 'Host Workstation', os: 'Windows 11 Pro', status: 'online', ip_address: '127.0.0.1', is_connected: true, capabilities_json: '["app_launcher", "vision", "files", "audio"]' },
    { id: 'dev_companion', name: 'Echo Companion', os: 'Windows 11', status: 'online', ip_address: '192.168.1.104', is_connected: true, capabilities_json: '["remote_control", "screenshot"]' },
    { id: 'dev_cloud', name: 'Echo Cloud Brain', os: 'Ubuntu 24.04 LTS', status: 'online', ip_address: '10.0.0.1', is_connected: true, capabilities_json: '["gemini_llm", "workflows"]' },
    { id: 'dev_mobile', name: 'Mobile Companion', os: 'Android 14', status: 'offline', ip_address: '192.168.1.115', is_connected: false, capabilities_json: '["voice_mic", "telemetry"]' },
  ];

  const agentFleet = [
    { code: 'CC-02', name: 'Computer Control', desc: 'App Launch, Window & Volume OS Automation', icon: Terminal, tools: 12, status: 'Ready' },
    { code: 'VP-03', name: 'Visual Perception', desc: 'Screen Capture & Multimodal Bounding Box UI', icon: Eye, tools: 5, status: 'Active' },
    { code: 'BR-04', name: 'Browser Research', desc: 'Web Sweep, DuckDuckGo & Wikipedia Synthesis', icon: Globe, tools: 4, status: 'Standby' },
    { code: 'PR-07', name: 'Productivity Fleet', desc: 'Persistent Notes, Tasks & Deadline Alarms', icon: CheckCircle2, tools: 6, status: 'Armed' },
    { code: 'AU-09', name: 'Workflow Engine', desc: 'Multi-Step Autonomous Event Execution', icon: WorkflowIcon, tools: 8, status: 'Armed' },
    { code: 'SI-08', name: 'System Telemetry', desc: 'Live CPU, RAM, Disk & Diagnostics Stream', icon: Cpu, tools: 4, status: 'Streaming' },
  ];

  const recentOperations = [
    { id: 'op-1', action: 'Visual screen inspection cycle', target: 'Host Display 1', time: 'Just now', status: 'VERIFIED' },
    { id: 'op-2', action: 'Gemini Flash REST transport handshake', target: 'Cloud Brain', time: '1m ago', status: 'COMPLETED' },
    { id: 'op-3', action: 'Continuous memory learner sync', target: 'SQLite db', time: '3m ago', status: 'SAVED' },
    { id: 'op-4', action: 'Bilingual voice synthesizer primed', target: 'WebSpeech / Edge', time: '5m ago', status: 'ONLINE' },
    { id: 'op-5', action: 'Local Tool Registry initialized', target: 'Windows API', time: '12m ago', status: 'ARMED' },
  ];

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-6 max-w-[1500px] mx-auto space-y-6 relative z-10 select-none">
      
      {/* 1. TOP HEADER: High-Density Operating Environment Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-[#E8DCCD] gap-4"
      >
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#D97745] bg-[#EFE3D3] px-3 py-1 rounded-full border border-[#E8DCCD] shadow-2xs">
              <ScrambleText text="MULTI-AGENT AI OPERATING SYSTEM v2.0" hoverScramble />
            </span>

            {/* Language Switcher */}
            <div className="inline-flex items-center p-0.5 bg-[#EFE3D3] border border-[#E8DCCD] rounded-full shadow-2xs">
              <button
                type="button"
                onClick={() => onToggleLanguage('en-IN')}
                className={`px-3 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeLanguage === 'en-IN'
                    ? 'bg-[#D97745] text-white shadow-xs'
                    : 'text-[#81766B] hover:text-[#29241F]'
                }`}
              >
                English (IN)
              </button>
              <button
                type="button"
                onClick={() => onToggleLanguage('kn-IN')}
                className={`px-3 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeLanguage === 'kn-IN'
                    ? 'bg-[#D97745] text-white shadow-xs'
                    : 'text-[#81766B] hover:text-[#29241F]'
                }`}
              >
                ಕನ್ನಡ (Kannada)
              </button>
            </div>

            {/* Status Live Pulse */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>9 Agents Online</span>
            </div>
          </div>

          <h1 className="font-serif-display text-2xl sm:text-3xl font-bold text-[#29241F] mt-2 tracking-tight">
            <KineticText text={`Good day, ${userName}`} />
          </h1>
          <p className="text-xs text-[#81766B] mt-0.5 font-normal">
            {activeLanguage === 'kn-IN' 
              ? "ಕೇಂದ್ರೀಕೃತ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ವ್ಯವಸ್ಥೆ ಸಿದ್ಧವಾಗಿದೆ. ಧ್ವನಿ ಆಜ್ಞೆ ನೀಡಿ ಅಥವಾ ಕಮಾಂಡ್ ಟೈಪ್ ಮಾಡಿ." 
              : "Autonomous personal operating system online. Ready for natural-language desktop control & voice interactions."}
          </p>
        </div>

        {/* Right Tools HUD: Command Palette Trigger & Time */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onOpenCommandPalette ? onOpenCommandPalette() : onQuickAction('command_palette')}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#FFFDF9] border border-[#E8DCCD] hover:border-[#D97745] text-[#29241F] transition-all shadow-2xs text-xs font-medium cursor-pointer"
          >
            <Search size={14} className="text-[#D97745]" />
            <span>Command Palette</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-[#EFE3D3] rounded border border-[#E8DCCD] text-[#81766B] font-mono">Ctrl+K</kbd>
          </button>

          <div className="flex items-center gap-4 text-[#81766B] bg-[#FFFDF9] border border-[#E8DCCD] px-4 py-2 rounded-xl shadow-2xs shrink-0">
            <div className="flex items-center gap-1.5">
              <Clock size={15} className="text-[#D97745]" />
              <span className="text-xs font-semibold text-[#29241F]">{currentTime}</span>
            </div>
            <div className="h-3.5 w-px bg-[#E8DCCD]" />
            <div className="flex items-center gap-1.5">
              <Calendar size={15} className="text-[#D97745]" />
              <span className="text-xs font-semibold text-[#29241F]">{currentDate}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. MAIN HERO SECTION: 3D Visualizer Deck (7 cols) + Spatial Device Topology (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Signature AI Visualizer & Instant Natural-Language Command Deck */}
        <div className="lg:col-span-7 bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          {/* Top Status Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E8DCCD]/80">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97745] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D97745]"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#81766B]">
                <ScrambleText text={statusLabel} trigger={statusLabel} />
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#81766B] bg-[#EFE3D3] px-2 py-0.5 rounded border border-[#E8DCCD]">
                Latency: 14ms
              </span>
              <span className="text-[10px] font-bold uppercase text-[#D97745] bg-[#EFE3D3] px-2 py-0.5 rounded border border-[#E8DCCD]">
                Neural Core Active
              </span>
            </div>
          </div>

          {/* Central 3D Three.js Visualizer Canvas */}
          <div className="flex flex-col items-center justify-center py-4 relative">
            <AssistantVisualizer 
              state={visualizerState} 
              size={230} 
              onMicClick={isListening ? onStopVoice : onStartVoice}
            />

            {/* Live Audio Transcript Feedback Banner */}
            {transcriptFeedback && (
              <motion.div 
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 px-4 py-1.5 bg-[#EFE3D3] border border-[#D97745]/40 rounded-xl text-xs font-medium text-[#B95F38] text-center max-w-md shadow-2xs"
              >
                {transcriptFeedback}
              </motion.div>
            )}
          </div>

          {/* Embedded Natural-Language Command Bar */}
          <div className="mt-2 space-y-3">
            <form onSubmit={handleCommandSubmit} className="relative flex items-center">
              <div className="absolute left-3.5 text-[#D97745] pointer-events-none">
                <Terminal size={16} />
              </div>
              <input
                type="text"
                value={naturalCommand}
                onChange={(e) => setNaturalCommand(e.target.value)}
                placeholder="Echo, open Chrome, take screenshot, or ask any question..."
                className="w-full bg-[#F8F1E7]/70 border border-[#E8DCCD] rounded-xl pl-10 pr-24 py-2.5 text-xs font-medium text-[#29241F] placeholder:text-[#81766B] focus:border-[#D97745] focus:bg-[#FFFDF9] outline-none transition-all shadow-inner"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={isListening ? onStopVoice : onStartVoice}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isListening ? 'bg-[#B95F38] text-white animate-pulse' : 'text-[#81766B] hover:text-[#D97745]'
                  }`}
                  title={isListening ? "Stop listening" : "Speak command"}
                >
                  <Mic size={16} />
                </button>
                <button
                  type="submit"
                  disabled={!naturalCommand.trim()}
                  className="px-2.5 py-1.5 rounded-lg bg-[#D97745] text-white hover:bg-[#B95F38] disabled:opacity-40 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Send size={12} />
                  <span>Execute</span>
                </button>
              </div>
            </form>

            {/* Quick Action Badges & Buttons */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[#E8DCCD]/60">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-[#81766B] mr-1">Quick:</span>
                {[
                  { label: 'Chrome', cmd: 'open Chrome' },
                  { label: 'Spotify', cmd: 'open Spotify' },
                  { label: 'VS Code', cmd: 'open VS Code' },
                  { label: 'Screenshot', cmd: 'capture screenshot' },
                  { label: 'System Health', cmd: 'system health report' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onExecuteCommand ? onExecuteCommand(item.cmd) : onQuickAction(item.cmd)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#EFE3D3] text-[#29241F] hover:bg-[#D97745] hover:text-white transition-colors cursor-pointer border border-[#E8DCCD]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('chat')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#EFE3D3] text-[#29241F] hover:bg-[#D97745] hover:text-white transition-colors cursor-pointer border border-[#E8DCCD]"
                >
                  <Sparkles size={13} className="text-[#D97745]" />
                  <span>Chat Interface</span>
                </button>

                <button
                  onClick={() => onOpenVisualPerception && onOpenVisualPerception()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#EFE3D3] text-[#29241F] hover:bg-[#D97745] hover:text-white transition-colors cursor-pointer border border-[#E8DCCD]"
                >
                  <Eye size={13} className="text-[#D97745]" />
                  <span>Perceive Screen</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Spatial Multi-Device Management Network (5 cols) */}
        <div className="lg:col-span-5 bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCCD]/80 mb-3">
              <div className="flex items-center gap-2">
                <Laptop size={16} className="text-[#D97745]" />
                <h3 className="font-serif-display text-sm font-bold text-[#29241F]">Spatial Device Network</h3>
              </div>
              <button 
                onClick={() => onNavigate('devices')}
                className="text-xs font-semibold text-[#D97745] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Manage Fleet ({onlineDevicesCount}/{displayDevices.length})</span>
                <ArrowUpRight size={13} />
              </button>
            </div>

            {/* Visual Node Diagram (Echo Core connected to devices) */}
            <div className="relative py-2 px-3 bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl mb-3 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#D97745] text-white flex items-center justify-center text-[10px] font-bold">
                    E
                  </div>
                  <span className="text-xs font-bold text-[#29241F]">Echo Core Hub</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Mesh Sync Active
                </span>
              </div>

              {/* Connected Nodes List */}
              <div className="grid grid-cols-2 gap-2">
                {displayDevices.map((dev) => {
                  const isOnline = dev.status === 'online' || dev.is_connected;
                  const isSelected = selectedDevice === dev.id;
                  return (
                    <div
                      key={dev.id}
                      onClick={() => setSelectedDevice(dev.id)}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#EFE3D3] border-[#D97745] shadow-xs' 
                          : 'bg-[#FFFDF9] border-[#E8DCCD] hover:border-[#D97745]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          {dev.os?.toLowerCase().includes('windows') ? <Laptop size={12} className="text-[#D97745]" /> :
                           dev.os?.toLowerCase().includes('android') ? <Smartphone size={12} className="text-[#D97745]" /> :
                           <Server size={12} className="text-[#D97745]" />}
                          <span className="text-xs font-semibold text-[#29241F] truncate max-w-[100px]">{dev.name}</span>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#81766B]">
                        <span className="truncate">{dev.os}</span>
                        <span className="font-mono">{isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Device Info & Pairing Dispatch Deck */}
            <div className="p-3 bg-[#EFE3D3]/50 border border-[#E8DCCD] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#81766B]">Pair Remote Computer</span>
                <p className="text-xs font-medium text-[#29241F]">Use 6-digit companion code</p>
              </div>
              <button
                onClick={() => onNavigate('devices')}
                className="px-3 py-1.5 rounded-lg bg-[#D97745] text-white text-xs font-semibold hover:bg-[#B95F38] transition-colors cursor-pointer shadow-2xs"
              >
                + Pair Device
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E8DCCD]/80 text-[11px] text-[#81766B] flex items-center justify-between">
            <span>Encrypted WebSocket Protocol (TLS/AES-256)</span>
            <span className="font-mono font-medium text-[#D97745]">Zero-Deflection Engine</span>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE SECTION: Specialized Agent Swarm Matrix (8 cols) + Live Activity Stream (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Specialized Agent Swarm Matrix (8 cols) */}
        <div className="lg:col-span-8 bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8DCCD]/80 mb-3">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-[#D97745]" />
              <h3 className="font-serif-display text-sm font-bold text-[#29241F]">Specialized Agent Swarm Matrix</h3>
            </div>
            <button 
              onClick={() => onNavigate('agents')}
              className="text-xs font-semibold text-[#D97745] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View All 9 Agents</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {agentFleet.map((ag) => {
              const IconComp = ag.icon;
              return (
                <div 
                  key={ag.code}
                  className="p-3 rounded-xl bg-[#F8F1E7] border border-[#E8DCCD] hover:border-[#D97745] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EFE3D3] text-[#B95F38] border border-[#E8DCCD]">
                        {ag.code}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {ag.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <IconComp size={15} className="text-[#D97745]" />
                      <h4 className="text-xs font-bold text-[#29241F]">{ag.name}</h4>
                    </div>
                    <p className="text-[11px] text-[#81766B] line-clamp-2 leading-tight">
                      {ag.desc}
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#E8DCCD]/70 flex items-center justify-between">
                    <span className="text-[10px] text-[#81766B] font-mono">{ag.tools} Active Tools</span>
                    <button
                      onClick={() => onNavigate('agents')}
                      className="text-[10px] font-bold text-[#D97745] hover:underline cursor-pointer"
                    >
                      Inspect →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Operations & Audit Stream (4 cols) */}
        <div className="lg:col-span-4 bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCCD]/80 mb-3">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#D97745]" />
                <h3 className="font-serif-display text-sm font-bold text-[#29241F]">Operations & Audit Feed</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Live
              </span>
            </div>

            <div className="space-y-2.5">
              {recentOperations.map((op) => (
                <div key={op.id} className="p-2.5 rounded-xl bg-[#F8F1E7] border border-[#E8DCCD] flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-[#29241F] text-[11px] truncate">{op.action}</p>
                    <span className="text-[10px] text-[#81766B]">{op.target} • {op.time}</span>
                  </div>
                  <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#EFE3D3] text-[#B95F38] border border-[#E8DCCD] shrink-0 font-mono">
                    {op.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E8DCCD]/80 flex items-center justify-between text-[11px] text-[#81766B]">
            <span>Security Sandbox: Armed</span>
            <button 
              onClick={() => onNavigate('history')}
              className="font-semibold text-[#D97745] hover:underline cursor-pointer"
            >
              Audit Log →
            </button>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM SECTION: Telemetry HUD (4 cols) + Autonomous Workflows (4 cols) + Pending Tasks (4 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-4">
        
        {/* Card 1: System Telemetry HUD */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-[#D97745] transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCCD] mb-3">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-[#D97745]" />
                <h3 className="font-serif-display text-sm font-bold text-[#29241F]">System Hardware HUD</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                Optimal
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#81766B] mb-1">
                  <span className="flex items-center gap-1.5"><Cpu size={13} className="text-[#D97745]" /> CPU Utilization</span>
                  <span className="text-[#29241F] font-bold">{telemetry?.cpu?.usage_percent || 12}%</span>
                </div>
                <div className="w-full bg-[#EFE3D3] rounded-full h-1.5 overflow-hidden">
                  <motion.div 
                    className="bg-gradient-to-r from-[#D97745] to-[#B95F38] h-1.5 rounded-full" 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(telemetry?.cpu?.usage_percent || 12, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-[#81766B] mb-1">
                  <span className="flex items-center gap-1.5"><HardDrive size={13} className="text-[#D97745]" /> Memory (RAM)</span>
                  <span className="text-[#29241F] font-bold">{telemetry?.memory?.percent || 48}%</span>
                </div>
                <div className="w-full bg-[#EFE3D3] rounded-full h-1.5 overflow-hidden">
                  <motion.div 
                    className="bg-gradient-to-r from-[#B95F38] to-[#D97745] h-1.5 rounded-full" 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(telemetry?.memory?.percent || 48, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8DCCD] flex justify-between text-[11px] text-[#81766B] font-medium">
                <span>Cores: {telemetry?.cpu?.cores || 8} Active</span>
                <span>RAM Used: {telemetry?.memory?.used_gb || 7.2} GB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Autonomous Workflows */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-[#D97745] transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCCD] mb-3">
              <div className="flex items-center gap-2">
                <WorkflowIcon size={16} className="text-[#D97745]" />
                <h3 className="font-serif-display text-sm font-bold text-[#29241F]">Active Workflows</h3>
              </div>
              <button onClick={() => onNavigate('workflows')} className="text-xs font-semibold text-[#D97745] hover:underline cursor-pointer">
                View All →
              </button>
            </div>

            <div className="space-y-2">
              {[
                { id: 'wf_morning', title: 'Morning Intelligence Briefing', steps: '3 steps', icon: Zap },
                { id: 'wf_deep_work', title: 'Deep Work Lockdown', steps: '4 steps', icon: Shield },
                { id: 'wf_meeting_prep', title: 'Meeting Prep & Document Indexing', steps: '3 steps', icon: FileText }
              ].map((wf) => (
                <div key={wf.id} className="p-2.5 bg-[#F8F1E7] rounded-xl border border-[#E8DCCD] flex items-center justify-between hover:border-[#D97745] transition-colors">
                  <div className="flex items-center gap-2">
                    <wf.icon size={14} className="text-[#D97745]" />
                    <div>
                      <p className="text-xs font-semibold text-[#29241F] line-clamp-1">{wf.title}</p>
                      <span className="text-[10px] text-[#81766B]">{wf.steps}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('workflows')}
                    className="px-2 py-1 rounded bg-[#EFE3D3] hover:bg-[#D97745] hover:text-white text-[10px] font-semibold text-[#29241F] transition-colors cursor-pointer border border-[#E8DCCD]"
                  >
                    Run
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Pending Tasks & Agenda */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-[#D97745] transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCCD] mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#D97745]" />
                <h3 className="font-serif-display text-sm font-bold text-[#29241F]">Pending Tasks & Agenda</h3>
              </div>
              <button onClick={() => onNavigate('tasks')} className="text-xs font-semibold text-[#D97745] hover:underline cursor-pointer">
                View All ({pendingTasks.length})
              </button>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="py-5 text-center">
                <p className="text-xs text-[#81766B] italic">All tasks completed. You are at peak efficiency!</p>
                <button onClick={() => onQuickAction('add_task')} className="mt-2 text-xs font-bold text-[#D97745] hover:underline cursor-pointer">
                  + Add task
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="p-2.5 bg-[#F8F1E7] rounded-xl border border-[#E8DCCD] flex items-center justify-between hover:border-[#D97745] transition-colors">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-[#29241F] truncate">{task.title}</p>
                      <span className="text-[10px] uppercase font-bold text-[#D97745]">{task.priority}</span>
                    </div>
                    <span className="text-[11px] text-[#81766B] shrink-0">{task.due_date || 'Today'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

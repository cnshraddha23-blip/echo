import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ArrowUpRight,
  Cpu,
  HardDrive
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AssistantVisualizer } from './AssistantVisualizer';
import { Note, Task, Reminder, SystemTelemetry, AssistantVisualizerState } from '../types';

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
  onNavigate: (tab: string) => void;
  onQuickAction: (action: string) => void;
  userName: string;
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
  onNavigate,
  onQuickAction,
  userName
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

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

  return (
    <div className="h-full overflow-y-auto px-8 py-6 space-y-8">
      {/* 1. Header / Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#E8DCCD] pb-6 gap-4"
      >
        <div>
          <span className="text-xs font-bold tracking-widest uppercase text-[#D97745] bg-[#F4E1D2] px-3 py-1 rounded-full">
            Intelligent AI Workspace
          </span>
          <h1 className="font-serif-display text-4xl font-bold text-[#29241F] mt-2 tracking-tight">
            Good day, {userName}
          </h1>
          <p className="text-sm text-[#81766B] mt-1">
            Echo is active, listening and ready to assist you in English and Kannada.
          </p>
        </div>

        <div className="flex items-center gap-6 text-[#81766B] bg-[#FFFDF9] border border-[#E8DCCD] px-5 py-3 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#D97745]" />
            <span className="text-sm font-semibold text-[#29241F]">{currentTime}</span>
          </div>
          <div className="h-4 w-px bg-[#E8DCCD]" />
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[#D97745]" />
            <span className="text-sm font-semibold text-[#29241F]">{currentDate}</span>
          </div>
        </div>
      </motion.div>

      {/* 2. Central Hero: Visualizer & Real-Time Voice Interaction */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-gradient-to-b from-[#FFFDF9] to-[#F8F1E7] border border-[#E8DCCD] rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-xs"
      >
        <div className="absolute top-6 left-8 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97745] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D97745]"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#81766B]">
            {visualizerState === 'listening' ? 'Listening...' : visualizerState === 'speaking' ? 'Speaking...' : 'Ready'}
          </span>
        </div>

        <div className="my-4">
          <AssistantVisualizer 
            state={visualizerState} 
            size={240} 
            onMicClick={isListening ? onStopVoice : onStartVoice}
          />
        </div>

        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={isListening ? onStopVoice : onStartVoice}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-medium text-sm transition-all duration-300 shadow-md ${
              isListening
                ? 'bg-[#B95F38] text-white hover:bg-[#A04F2E]'
                : 'bg-[#D97745] text-white hover:bg-[#C26535]'
            }`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            <span>{isListening ? "Stop Listening" : "Tap to Speak (Voice)"}</span>
          </button>

          <button
            onClick={() => onNavigate('assistant')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-medium text-sm bg-[#FFFDF9] border border-[#E8DCCD] text-[#29241F] hover:bg-[#EFE3D3] transition-colors"
          >
            <Sparkles size={16} className="text-[#D97745]" />
            <span>Interactive Chat</span>
          </button>
        </div>
      </motion.div>

      {/* 3. Quick Actions Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Save Note', icon: FileText, action: 'save_note', desc: 'Capture thoughts' },
          { label: 'Add Task', icon: CheckCircle2, action: 'add_task', desc: 'Todo tracker' },
          { label: 'Google Search', icon: Search, action: 'google_search', desc: 'Instant search' },
          { label: 'Study Mode', icon: Sparkles, action: 'study_mode', desc: 'Focused workspace' }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.05 }}
              onClick={() => onQuickAction(item.action)}
              className="flex items-center justify-between p-4 bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl hover:border-[#D97745] hover:shadow-xs transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#F4E1D2] text-[#D97745] group-hover:bg-[#D97745] group-hover:text-white transition-colors">
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#29241F] leading-tight">{item.label}</h4>
                  <p className="text-xs text-[#81766B]">{item.desc}</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-[#81766B] group-hover:text-[#D97745] transition-colors" />
            </motion.button>
          );
        })}
      </div>

      {/* 4. Productivity & Real Database Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-display text-lg font-bold text-[#29241F]">Pending Tasks</h3>
              <button onClick={() => onNavigate('tasks')} className="text-xs font-semibold text-[#D97745] hover:underline">
                View All ({pendingTasks.length})
              </button>
            </div>
            {pendingTasks.length === 0 ? (
              <p className="text-xs text-[#81766B] py-6 text-center italic">No pending tasks. You are all caught up!</p>
            ) : (
              <div className="space-y-2.5">
                {pendingTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="p-3 bg-[#F8F1E7]/60 rounded-xl border border-[#E8DCCD]/80 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#29241F] line-clamp-1">{task.title}</p>
                      <span className="text-[10px] uppercase font-bold text-[#D97745]">{task.priority} Priority</span>
                    </div>
                    <span className="text-xs text-[#81766B]">{task.due_date || 'No due date'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Reminders */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-display text-lg font-bold text-[#29241F]">Reminders</h3>
              <button onClick={() => onNavigate('reminders')} className="text-xs font-semibold text-[#D97745] hover:underline">
                View All ({upcomingReminders.length})
              </button>
            </div>
            {upcomingReminders.length === 0 ? (
              <p className="text-xs text-[#81766B] py-6 text-center italic">No upcoming reminders set.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingReminders.slice(0, 3).map((rem) => (
                  <div key={rem.id} className="p-3 bg-[#F8F1E7]/60 rounded-xl border border-[#E8DCCD]/80 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#29241F] line-clamp-1">{rem.title}</p>
                    <span className="text-xs font-medium text-[#B95F38] bg-[#F4E1D2] px-2 py-0.5 rounded-md">
                      {rem.remind_at}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Telemetry */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-display text-lg font-bold text-[#29241F]">Live Telemetry</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#81766B] mb-1">
                  <span className="flex items-center gap-1.5"><Cpu size={14} className="text-[#D97745]" /> CPU Load</span>
                  <span className="text-[#29241F]">{telemetry?.cpu?.usage_percent || 0}%</span>
                </div>
                <div className="w-full bg-[#EFE3D3] rounded-full h-2">
                  <div 
                    className="bg-[#D97745] h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(telemetry?.cpu?.usage_percent || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-[#81766B] mb-1">
                  <span className="flex items-center gap-1.5"><HardDrive size={14} className="text-[#D97745]" /> RAM Usage</span>
                  <span className="text-[#29241F]">{telemetry?.memory?.percent || 0}%</span>
                </div>
                <div className="w-full bg-[#EFE3D3] rounded-full h-2">
                  <div 
                    className="bg-[#B95F38] h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(telemetry?.memory?.percent || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8DCCD] flex justify-between text-xs text-[#81766B]">
                <span>Cores: {telemetry?.cpu?.cores || 4}</span>
                <span>Memory: {telemetry?.memory?.used_gb || 0}GB / {telemetry?.memory?.total_gb || 16}GB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

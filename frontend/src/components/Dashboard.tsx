import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ArrowUpRight,
  Cpu,
  HardDrive,
  Activity,
  Compass,
  Zap,
  TrendingUp,
  Volume2
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
  transcriptFeedback?: string;
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
  userName,
  transcriptFeedback
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
    <div className="h-full overflow-y-auto px-10 py-7 max-w-7xl mx-auto space-y-6">
      {/* 1. Header / Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#E8DCCD] gap-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#D97745] bg-[#F4E1D2] px-3 py-1 rounded-full">
              Bilingual Voice Workspace
            </span>
            <span className="text-[11px] font-semibold text-[#81766B] bg-[#FFFDF9] border border-[#E8DCCD] px-3 py-1 rounded-full">
              English & Kannada
            </span>
          </div>
          <h1 className="font-serif-display text-3xl font-bold text-[#29241F] mt-2 tracking-tight">
            Good day, {userName}
          </h1>
          <p className="text-xs text-[#81766B] mt-0.5">
            Voice system is armed and ready. Click "Tap to Speak" or say your command anytime.
          </p>
        </div>

        <div className="flex items-center gap-5 text-[#81766B] bg-[#FFFDF9] border border-[#E8DCCD] px-5 py-2.5 rounded-2xl shadow-xs shrink-0">
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

      {/* 2. Central Hero: Voice Assistant & Visualizer Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-b from-[#FFFDF9] to-[#F8F1E7] border border-[#E8DCCD] rounded-3xl p-7 flex flex-col items-center justify-center relative shadow-xs"
      >
        <div className="absolute top-5 left-7 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97745] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D97745]"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#81766B]">
            {visualizerState === 'listening' ? 'Listening to voice...' : visualizerState === 'speaking' ? 'Echo Speaking...' : visualizerState === 'processing' ? 'Thinking...' : 'Echo Voice Ready'}
          </span>
        </div>

        <div className="my-2">
          <AssistantVisualizer 
            state={visualizerState} 
            size={240} 
            onMicClick={isListening ? onStopVoice : onStartVoice}
          />
        </div>

        {/* Live Audio Transcript Feedback Banner */}
        {transcriptFeedback && (
          <motion.div 
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-6 py-2 bg-[#F4E1D2] border border-[#D97745]/30 rounded-xl text-xs font-medium text-[#B95F38] text-center max-w-lg shadow-xs"
          >
            {transcriptFeedback}
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={isListening ? onStopVoice : onStartVoice}
            className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-medium text-sm transition-all duration-300 shadow-sm cursor-pointer ${
              isListening
                ? 'bg-[#B95F38] text-white hover:bg-[#A04F2E] animate-pulse ring-4 ring-[#D97745]/30'
                : 'bg-[#D97745] text-white hover:bg-[#C26535]'
            }`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            <span>{isListening ? "Listening... (Tap to Cancel)" : "Tap to Speak (Voice)"}</span>
          </button>

          <button
            onClick={() => onNavigate('chat')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-medium text-sm bg-[#FFFDF9] border border-[#E8DCCD] text-[#29241F] hover:bg-[#EFE3D3] transition-colors cursor-pointer"
          >
            <Sparkles size={16} className="text-[#D97745]" />
            <span>Conversational Chat</span>
          </button>
        </div>
      </motion.div>

      {/* 3. Quick Actions Ribbon (Functional and clean) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Save Note', icon: FileText, action: 'save_note', desc: 'Create memo with SQLite persistence' },
          { label: 'Add Task', icon: CheckCircle2, action: 'add_task', desc: 'Track pending todos and deadlines' },
          { label: 'Study Mode', icon: Sparkles, action: 'study_mode', desc: 'Auto-launch Notepad & Calculator' }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + idx * 0.03 }}
              onClick={() => onQuickAction(item.action)}
              className="flex items-center justify-between p-4 bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl hover:border-[#D97745] hover:shadow-xs transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-[#F4E1D2] text-[#D97745] group-hover:bg-[#D97745] group-hover:text-white transition-colors">
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#29241F] leading-tight">{item.label}</h4>
                  <p className="text-xs text-[#81766B] mt-0.5">{item.desc}</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-[#81766B] group-hover:text-[#D97745] transition-colors" />
            </motion.button>
          );
        })}
      </div>

      {/* 4. Rich Information Grid: Tasks, Reminders, and Live Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pending Tasks Card */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#D97745]" />
                <h3 className="font-serif-display text-base font-bold text-[#29241F]">Pending Tasks</h3>
              </div>
              <button onClick={() => onNavigate('tasks')} className="text-xs font-semibold text-[#D97745] hover:underline cursor-pointer">
                View All ({pendingTasks.length})
              </button>
            </div>
            {pendingTasks.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-[#81766B] italic">No pending tasks. You are all caught up!</p>
                <button onClick={() => onQuickAction('add_task')} className="mt-2 text-xs font-semibold text-[#D97745] hover:underline">
                  + Add your first task
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="p-3 bg-[#F8F1E7]/70 rounded-xl border border-[#E8DCCD]/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#29241F] line-clamp-1">{task.title}</p>
                      <span className="text-[10px] uppercase font-bold text-[#D97745]">{task.priority} Priority</span>
                    </div>
                    <span className="text-xs text-[#81766B]">{task.due_date || 'Today'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reminders Card */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#D97745]" />
                <h3 className="font-serif-display text-base font-bold text-[#29241F]">Upcoming Reminders</h3>
              </div>
              <button onClick={() => onNavigate('reminders')} className="text-xs font-semibold text-[#D97745] hover:underline cursor-pointer">
                View All ({upcomingReminders.length})
              </button>
            </div>
            {upcomingReminders.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-[#81766B] italic">No reminders scheduled.</p>
                <button onClick={() => onNavigate('reminders')} className="mt-2 text-xs font-semibold text-[#D97745] hover:underline">
                  + Schedule a reminder
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingReminders.slice(0, 3).map((rem) => (
                  <div key={rem.id} className="p-3 bg-[#F8F1E7]/70 rounded-xl border border-[#E8DCCD]/80 flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#29241F] line-clamp-1">{rem.title}</p>
                    <span className="text-[10px] font-semibold text-[#B95F38] bg-[#F4E1D2] px-2 py-0.5 rounded-md">
                      {rem.remind_at}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Telemetry Card */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#D97745]" />
                <h3 className="font-serif-display text-base font-bold text-[#29241F]">System Hardware</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                Online
              </span>
            </div>
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#81766B] mb-1">
                  <span className="flex items-center gap-1.5"><Cpu size={14} className="text-[#D97745]" /> CPU Utilization</span>
                  <span className="text-[#29241F] font-bold">{telemetry?.cpu?.usage_percent || 0}%</span>
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
                  <span className="flex items-center gap-1.5"><HardDrive size={14} className="text-[#D97745]" /> Memory (RAM)</span>
                  <span className="text-[#29241F] font-bold">{telemetry?.memory?.percent || 0}%</span>
                </div>
                <div className="w-full bg-[#EFE3D3] rounded-full h-2">
                  <div 
                    className="bg-[#B95F38] h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(telemetry?.memory?.percent || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8DCCD] flex justify-between text-[11px] text-[#81766B]">
                <span>Cores: {telemetry?.cpu?.cores || 4} Physical</span>
                <span>Used: {telemetry?.memory?.used_gb || 0}GB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

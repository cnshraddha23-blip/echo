import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ArrowUpRight, 
  Cpu, 
  HardDrive, 
  Activity, 
  TrendingUp 
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
      {/* 1. Top Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#D3C7B5] gap-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#9E5224] bg-[#DFD7C7] px-3 py-1 rounded-full">
              Bilingual Voice Workspace
            </span>
            <span className="text-[11px] font-semibold text-[#786C60] bg-[#F5EFE6] border border-[#D3C7B5] px-3 py-1 rounded-full">
              English & Kannada
            </span>
          </div>
          <h1 className="font-serif-display text-3xl font-bold text-[#2B2620] mt-2 tracking-tight">
            Good day, {userName}
          </h1>
          <p className="text-xs text-[#786C60] mt-0.5">
            Voice system is armed and ready. Click "Tap to Speak" or say your command anytime.
          </p>
        </div>

        <div className="flex items-center gap-5 text-[#786C60] bg-[#F5EFE6] border border-[#D3C7B5] px-5 py-2.5 rounded-2xl shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#C27038]" />
            <span className="text-sm font-semibold text-[#2B2620]">{currentTime}</span>
          </div>
          <div className="h-4 w-px bg-[#D3C7B5]" />
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[#C27038]" />
            <span className="text-sm font-semibold text-[#2B2620]">{currentDate}</span>
          </div>
        </div>
      </motion.div>

      {/* 2. Central Hero: Voice Assistant & Visualizer Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-b from-[#F5EFE6] to-[#EBE3D5] border border-[#D3C7B5] rounded-3xl p-7 flex flex-col items-center justify-center relative shadow-xs"
      >
        <div className="absolute top-5 left-7 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C27038] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C27038]"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#786C60]">
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
            className="mb-4 px-6 py-2 bg-[#DFD7C7] border border-[#C27038]/30 rounded-xl text-xs font-medium text-[#9E5224] text-center max-w-lg shadow-xs"
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
                ? 'bg-[#9E5224] text-white hover:bg-[#85431B] animate-pulse ring-4 ring-[#C27038]/30'
                : 'bg-[#C27038] text-white hover:bg-[#AD602D]'
            }`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            <span>{isListening ? "Listening... (Tap to Cancel)" : "Tap to Speak (Voice)"}</span>
          </button>

          <button
            onClick={() => onNavigate('chat')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-medium text-sm bg-[#F5EFE6] border border-[#D3C7B5] text-[#2B2620] hover:bg-[#DFD7C7] transition-colors cursor-pointer"
          >
            <Sparkles size={16} className="text-[#C27038]" />
            <span>Conversational Chat</span>
          </button>
        </div>
      </motion.div>

      {/* 3. Quick Actions Ribbon */}
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
              className="flex items-center justify-between p-4 bg-[#F5EFE6] border border-[#D3C7B5] rounded-2xl hover:border-[#C27038] hover:shadow-xs transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-[#DFD7C7] text-[#C27038] group-hover:bg-[#C27038] group-hover:text-white transition-colors">
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#2B2620] leading-tight">{item.label}</h4>
                  <p className="text-xs text-[#786C60] mt-0.5">{item.desc}</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-[#786C60] group-hover:text-[#C27038] transition-colors" />
            </motion.button>
          );
        })}
      </div>

      {/* 4. Information Grid: Tasks, Reminders, and Live Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-2">
        {/* Pending Tasks Card */}
        <div className="bg-[#F5EFE6] border border-[#D3C7B5] rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#C27038]" />
                <h3 className="font-serif-display text-base font-bold text-[#2B2620]">Pending Tasks</h3>
              </div>
              <button onClick={() => onNavigate('tasks')} className="text-xs font-semibold text-[#C27038] hover:underline cursor-pointer">
                View All ({pendingTasks.length})
              </button>
            </div>
            {pendingTasks.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-[#786C60] italic">No pending tasks. You are all caught up!</p>
                <button onClick={() => onQuickAction('add_task')} className="mt-2 text-xs font-semibold text-[#C27038] hover:underline">
                  + Add your first task
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="p-3 bg-[#EBE3D5] rounded-xl border border-[#D3C7B5] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#2B2620] line-clamp-1">{task.title}</p>
                      <span className="text-[10px] uppercase font-bold text-[#C27038]">{task.priority} Priority</span>
                    </div>
                    <span className="text-xs text-[#786C60]">{task.due_date || 'Today'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reminders Card */}
        <div className="bg-[#F5EFE6] border border-[#D3C7B5] rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#C27038]" />
                <h3 className="font-serif-display text-base font-bold text-[#2B2620]">Upcoming Reminders</h3>
              </div>
              <button onClick={() => onNavigate('reminders')} className="text-xs font-semibold text-[#C27038] hover:underline cursor-pointer">
                View All ({upcomingReminders.length})
              </button>
            </div>
            {upcomingReminders.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-[#786C60] italic">No reminders scheduled.</p>
                <button onClick={() => onNavigate('reminders')} className="mt-2 text-xs font-semibold text-[#C27038] hover:underline">
                  + Schedule a reminder
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingReminders.slice(0, 3).map((rem) => (
                  <div key={rem.id} className="p-3 bg-[#EBE3D5] rounded-xl border border-[#D3C7B5] flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#2B2620] line-clamp-1">{rem.title}</p>
                    <span className="text-[10px] font-semibold text-[#9E5224] bg-[#DFD7C7] px-2 py-0.5 rounded-md">
                      {rem.remind_at}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Telemetry Card */}
        <div className="bg-[#F5EFE6] border border-[#D3C7B5] rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#C27038]" />
                <h3 className="font-serif-display text-base font-bold text-[#2B2620]">System Hardware</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                Online
              </span>
            </div>
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#786C60] mb-1">
                  <span className="flex items-center gap-1.5"><Cpu size={14} className="text-[#C27038]" /> CPU Utilization</span>
                  <span className="text-[#2B2620] font-bold">{telemetry?.cpu?.usage_percent || 0}%</span>
                </div>
                <div className="w-full bg-[#DFD7C7] rounded-full h-2">
                  <div 
                    className="bg-[#C27038] h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(telemetry?.cpu?.usage_percent || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-[#786C60] mb-1">
                  <span className="flex items-center gap-1.5"><HardDrive size={14} className="text-[#C27038]" /> Memory (RAM)</span>
                  <span className="text-[#2B2620] font-bold">{telemetry?.memory?.percent || 0}%</span>
                </div>
                <div className="w-full bg-[#DFD7C7] rounded-full h-2">
                  <div 
                    className="bg-[#9E5224] h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(telemetry?.memory?.percent || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#D3C7B5] flex justify-between text-[11px] text-[#786C60]">
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

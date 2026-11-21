import React, { useState, useEffect } from 'react';
import { 
  Search, Mic, Bot, Laptop, Workflow, Globe, 
  Eye, CheckCircle2, Clock, Terminal, ArrowRight, X, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onStartVoice: () => void;
  onOpenVisualPerception: () => void;
  onRunWorkflow: (workflowId: string) => void;
  onExecuteCommand: (query: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onStartVoice,
  onOpenVisualPerception,
  onRunWorkflow,
  onExecuteCommand
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const defaultActions = [
    { id: 'voice', title: 'Activate Voice Input', category: 'Voice', icon: Mic, action: () => { onClose(); onStartVoice(); } },
    { id: 'screen', title: 'Inspect Screen (Visual Perception)', category: 'Computer Control', icon: Eye, action: () => { onClose(); onOpenVisualPerception(); } },
    { id: 'chrome', title: 'Open Google Chrome', category: 'Application', icon: Terminal, action: () => { onClose(); onExecuteCommand('open Chrome'); } },
    { id: 'vscode', title: 'Open Visual Studio Code', category: 'Application', icon: Terminal, action: () => { onClose(); onExecuteCommand('open VS Code'); } },
    { id: 'spotify', title: 'Open Spotify Music', category: 'Application', icon: Terminal, action: () => { onClose(); onExecuteCommand('open Spotify'); } },
    { id: 'whatsapp', title: 'Open WhatsApp Desktop', category: 'Application', icon: Terminal, action: () => { onClose(); onExecuteCommand('open WhatsApp'); } },
    { id: 'deep_work', title: 'Trigger Deep Work Lockdown', category: 'Workflow', icon: Workflow, action: () => { onClose(); onRunWorkflow('wf_deep_work'); } },
    { id: 'morning_briefing', title: 'Execute Morning Briefing', category: 'Workflow', icon: Workflow, action: () => { onClose(); onRunWorkflow('wf_morning_briefing'); } },
    { id: 'agents', title: 'Navigate to Specialized Agents (9 Active)', category: 'System', icon: Bot, action: () => { onClose(); onNavigate('agents'); } },
    { id: 'devices', title: 'Navigate to Connected Devices Network', category: 'System', icon: Laptop, action: () => { onClose(); onNavigate('devices'); } },
    { id: 'research', title: 'Open Internet Research Sweep', category: 'Research', icon: Globe, action: () => { onClose(); onNavigate('research'); } },
    { id: 'tasks', title: 'View Pending Tasks & Agenda', category: 'Productivity', icon: CheckCircle2, action: () => { onClose(); onNavigate('tasks'); } },
    { id: 'status', title: 'Check System Telemetry & Health', category: 'Telemetry', icon: Cpu, action: () => { onClose(); onExecuteCommand('system health report'); } },
  ];

  const filtered = defaultActions.filter(a => 
    a.title.toLowerCase().includes(query.toLowerCase()) || 
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        } else if (query.trim()) {
          onClose();
          onExecuteCommand(query.trim());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filtered, query]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          className="w-full max-w-2xl bg-[#FFFDF9] border border-[#D97745]/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Search Header */}
          <div className="flex items-center px-4 py-3.5 border-b border-[#E8DCCD] bg-[#F8F1E7]/70">
            <Search size={18} className="text-[#D97745] mr-3 shrink-0" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
              placeholder="Type a command, ask a question, or search Echo..."
              className="w-full bg-transparent border-none outline-none text-sm font-medium text-[#29241F] placeholder:text-[#81766B]"
            />
            <button 
              onClick={onClose}
              className="p-1 rounded-lg text-[#81766B] hover:text-[#29241F] hover:bg-[#EFE3D3] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Action List */}
          <div className="max-h-96 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div 
                onClick={() => { onClose(); onExecuteCommand(query); }}
                className="p-3 rounded-xl bg-[#F8F1E7] border border-[#E8DCCD] cursor-pointer hover:border-[#D97745] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Terminal size={16} className="text-[#D97745]" />
                  <span className="text-xs font-semibold text-[#29241F]">Execute query: "{query}"</span>
                </div>
                <ArrowRight size={14} className="text-[#81766B]" />
              </div>
            ) : (
              filtered.map((item, idx) => {
                const IconComponent = item.icon;
                const isSel = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                      isSel ? 'bg-[#EFE3D3] border border-[#D97745]/30' : 'hover:bg-[#F8F1E7]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSel ? 'bg-[#D97745] text-white' : 'bg-[#EFE3D3] text-[#D97745]'}`}>
                        <IconComponent size={14} />
                      </div>
                      <span className="text-xs font-medium text-[#29241F]">{item.title}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FFFDF9] border border-[#E8DCCD] text-[#81766B]">
                      {item.category}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-4 py-2 bg-[#F8F1E7] border-t border-[#E8DCCD] flex items-center justify-between text-[11px] text-[#81766B]">
            <div className="flex items-center gap-3">
              <span><kbd className="px-1.5 py-0.5 bg-white border border-[#E8DCCD] rounded text-[10px]">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-white border border-[#E8DCCD] rounded text-[10px]">↵</kbd> Execute</span>
              <span><kbd className="px-1.5 py-0.5 bg-white border border-[#E8DCCD] rounded text-[10px]">ESC</kbd> Close</span>
            </div>
            <span className="font-mono text-[10px] text-[#D97745]">Echo Command Palette</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

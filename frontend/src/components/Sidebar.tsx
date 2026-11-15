import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  CheckSquare, 
  Bell, 
  Settings, 
  Info,
  ChevronLeft,
  ChevronRight,
  Radio
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  isConnected
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Conversational Chat', icon: MessageSquare },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'about', label: 'About Echo', icon: Info },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 255 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen bg-[#1C1815]/95 border-r border-[#2F2822] flex flex-col justify-between p-4 z-20 shadow-xl relative shrink-0 backdrop-blur-md"
    >
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#2F2822] mb-5">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E07A44] to-[#C8622F] flex items-center justify-center text-white font-serif-display font-bold text-xl shadow-lg shadow-[#E07A44]/20 shrink-0">
              E
            </div>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
                <span className="font-serif-display text-lg font-bold text-[#FDFBF7] tracking-wider leading-tight">
                  ECHO
                </span>
                <span className="text-[10px] font-semibold tracking-widest text-[#E07A44] uppercase">
                  Bilingual Voice OS
                </span>
              </motion.div>
            )}
          </div>
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-[#2A241F] text-[#A89C90] hover:text-[#FDFBF7] transition-colors cursor-pointer"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
                  isActive
                    ? 'text-white font-medium shadow-md shadow-[#E07A44]/20'
                    : 'text-[#A89C90] hover:text-[#FDFBF7] hover:bg-[#25201B]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavBackground"
                    className="absolute inset-0 bg-[#E07A44] rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <Icon size={19} className={`relative z-10 shrink-0 ${isActive ? 'text-white' : 'text-[#A89C90] group-hover:text-[#E07A44]'}`} />
                {!collapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative z-10 text-sm tracking-wide truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Connection & Status Footer */}
      <div className="pt-4 border-t border-[#2F2822]">
        <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${collapsed ? 'justify-center' : ''} ${isConnected ? 'bg-[#E07A44]/10 border border-[#E07A44]/20 text-[#E07A44]' : 'bg-red-950/40 border border-red-800/30 text-red-400'}`}>
          <Radio size={16} className={isConnected ? 'animate-pulse text-[#E07A44]' : 'text-red-400'} />
          {!collapsed && (
            <div className="flex flex-col text-xs">
              <span className="font-semibold">{isConnected ? "Engine Connected" : "Engine Offline"}</span>
              <span className="text-[10px] opacity-75">{isConnected ? "127.0.0.1:5000" : "Reconnecting..."}</span>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

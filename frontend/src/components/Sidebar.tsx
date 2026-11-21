import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Laptop, 
  Bot, 
  Workflow as WorkflowIcon, 
  Globe, 
  FolderOpen, 
  FileText, 
  CheckSquare, 
  Bell, 
  History, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Radio, 
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrambleText } from './ScrambleText';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isConnected: boolean;
  currentUser?: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  isConnected,
  currentUser,
  onOpenAuth,
  onLogout
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
    { id: 'devices', label: 'Devices', icon: Laptop },
    { id: 'agents', label: 'Agents', icon: Bot },
    { id: 'workflows', label: 'Workflows', icon: WorkflowIcon },
    { id: 'research', label: 'Browser Research', icon: Globe },
    { id: 'files', label: 'File Manager', icon: FolderOpen },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'history', label: 'Conversation History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="h-screen bg-[#F5EFE6] border-r border-[#D3C7B5] flex flex-col justify-between p-3.5 z-20 shadow-xs relative shrink-0 select-none"
    >
      <div className="flex flex-col h-[calc(100%-80px)] overflow-hidden">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#D3C7B5] mb-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D97745] to-[#B95F38] flex items-center justify-center text-white font-serif-display font-bold text-lg shadow-md shrink-0">
              E
            </div>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
                <span className="font-serif-display text-base font-bold text-[#29241F] tracking-wide leading-tight">
                  <ScrambleText text="ECHO" hoverScramble />
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-[#81766B] uppercase">
                  Multi-Agent OS
                </span>
              </motion.div>
            )}
          </div>
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-[#DFD7C7] text-[#81766B] hover:text-[#29241F] transition-colors cursor-pointer"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group text-left cursor-pointer ${
                  isActive
                    ? 'text-white font-medium shadow-xs'
                    : 'text-[#81766B] hover:text-[#29241F] hover:bg-[#EBE3D5]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-[#D97745] rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}

                <Icon 
                  size={18} 
                  className={`relative z-10 shrink-0 transition-transform duration-200 ${
                    isActive ? 'text-white scale-105' : 'text-[#81766B] group-hover:text-[#29241F] group-hover:scale-105'
                  }`} 
                />

                {!collapsed && (
                  <span className="relative z-10 text-xs tracking-tight truncate">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User & Cloud Status Footer */}
      <div className="pt-3 border-t border-[#D3C7B5] space-y-2">
        {/* User Profile Bar */}
        <div 
          onClick={currentUser ? undefined : onOpenAuth}
          className="flex items-center justify-between p-2 rounded-xl bg-[#EBE3D5] border border-[#D3C7B5] cursor-pointer hover:border-[#D97745] transition-colors"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-[#D97745] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {currentUser?.display_name ? currentUser.display_name[0].toUpperCase() : <UserIcon size={14} />}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#29241F] truncate">
                  {currentUser?.display_name || "Sign In / Register"}
                </span>
                <span className="text-[10px] text-[#81766B] truncate">
                  {currentUser?.role ? `${currentUser.role} account` : "Guest session"}
                </span>
              </div>
            )}
          </div>

          {!collapsed && currentUser && (
            <button
              onClick={(e) => { e.stopPropagation(); onLogout(); }}
              className="p-1 text-[#81766B] hover:text-red-600 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>

        {/* Engine Socket Status */}
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-[#81766B]">
          <div className="flex items-center gap-1.5">
            <Radio size={12} className={isConnected ? "text-green-600 animate-pulse" : "text-amber-600"} />
            {!collapsed && <span>{isConnected ? "Cloud Connected" : "Connecting..."}</span>}
          </div>
          {!collapsed && <span className="font-mono text-[10px]">v2.0</span>}
        </div>
      </div>
    </motion.aside>
  );
};

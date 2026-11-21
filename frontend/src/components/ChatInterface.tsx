import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, Copy, Trash2, Volume2, Sparkles, Folder, FolderPlus, 
  Plus, MessageSquare, ChevronDown, ChevronRight, SlidersHorizontal, Settings as SettingsIcon,
  Terminal, MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrambleText } from './ScrambleText';
import { Message, Conversation } from '../types';

interface ChatInterfaceProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onCreateNewChat: (folderName?: string) => void;
  onDeleteConversation: (id: string) => void;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  isProcessing: boolean;
  activeLanguage: string;
  onToggleLanguage: (lang: string) => void;
  onSpeakText: (text: string) => void;
  onOpenSettings?: () => void;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '1d';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return 'now';
    if (diffDays === 0) return 'Today';
    if (diffDays < 30) return `${diffDays}d`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo`;
  } catch {
    return '1d';
  }
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateNewChat,
  onDeleteConversation,
  messages,
  onSendMessage,
  onClearChat,
  isProcessing,
  activeLanguage,
  onToggleLanguage,
  onSpeakText,
  onOpenSettings
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Group conversations by Folder (matching Project/Folder hierarchy from user reference)
  const groupedConversations = useMemo(() => {
    const map: Record<string, Conversation[]> = {};

    conversations.forEach((conv) => {
      const folder = conv.folder || 'Echo Voice Assistant';
      if (!map[folder]) {
        map[folder] = [];
      }
      map[folder].push(conv);
    });

    return map;
  }, [conversations]);

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateNewChat(newFolderName.trim());
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeConv = conversations.find(c => c.id === activeConversationId);
  const activeTitle = activeConv?.title || "Project Echo Full-Stack UI";

  return (
    <div className="flex h-full w-full bg-[#18181B] text-[#EDEDED] overflow-hidden select-none">
      {/* 1. Left Sidebar: Projects & Multi-Chat Hierarchy (Styled exactly like user reference) */}
      <div className="w-80 shrink-0 bg-[#121214] border-r border-[#27272A] flex flex-col h-full">
        {/* Header: Projects title, filter and new folder actions */}
        <div className="p-4 px-5 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight text-[#E4E4E7]">
              Projects
            </h2>
            <span className="text-[11px] font-mono font-medium text-[#71717A] bg-[#27272A] px-2 py-0.5 rounded-full">
              {conversations.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[#A1A1AA]">
            <button
              onClick={() => setShowFilterBar(!showFilterBar)}
              className="p-1.5 hover:text-[#FAFAFA] hover:bg-[#27272A] rounded-lg transition-colors cursor-pointer"
              title="Filter chats"
            >
              <SlidersHorizontal size={15} />
            </button>
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="p-1.5 hover:text-[#FAFAFA] hover:bg-[#27272A] rounded-lg transition-colors cursor-pointer"
              title="New project folder"
            >
              <FolderPlus size={16} />
            </button>
            <button
              onClick={() => onCreateNewChat('Echo Voice Assistant')}
              className="p-1.5 hover:text-[#FAFAFA] hover:bg-[#27272A] rounded-lg transition-colors cursor-pointer"
              title="New Chat"
            >
              <Plus size={17} />
            </button>
          </div>
        </div>

        {/* Filter input if toggled */}
        {showFilterBar && (
          <div className="p-2.5 px-4 border-b border-[#27272A] bg-[#18181B]">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter projects & chats..."
              className="w-full bg-[#27272A] text-xs text-white px-3 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#C27038]"
              autoFocus
            />
          </div>
        )}

        {/* Inline New Folder Form */}
        {isCreatingFolder && (
          <form onSubmit={handleCreateFolderSubmit} className="p-3 border-b border-[#27272A] bg-[#1C1C1F]">
            <div className="flex items-center gap-2">
              <Folder size={14} className="text-[#C27038]" />
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder / Project Name"
                className="flex-1 bg-[#27272A] text-xs text-white px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#C27038]"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="text-[11px] text-[#A1A1AA] hover:text-white px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-[11px] bg-[#C27038] hover:bg-[#AD602D] text-white px-3 py-1 rounded font-medium"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Projects / Folders list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {Object.entries(groupedConversations).map(([folderName, folderChats]) => {
            const isCollapsed = collapsedFolders[folderName];
            const filteredChats = searchFilter 
              ? folderChats.filter(c => c.title.toLowerCase().includes(searchFilter.toLowerCase()))
              : folderChats;

            if (searchFilter && filteredChats.length === 0 && !folderName.toLowerCase().includes(searchFilter.toLowerCase())) {
              return null;
            }

            return (
              <div key={folderName} className="space-y-1">
                {/* Folder Header */}
                <div 
                  onClick={() => toggleFolder(folderName)}
                  className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#1E1E22] cursor-pointer text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[#71717A] group-hover:text-[#A1A1AA]">
                      {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    </span>
                    <Folder size={15} className="shrink-0 text-[#8B8B94] group-hover:text-[#FAFAFA]" />
                    <span className="text-xs font-medium tracking-tight truncate">
                      {folderName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateNewChat(folderName);
                      }}
                      className="p-1 hover:text-white rounded transition-colors"
                      title={`New chat in ${folderName}`}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Folder Chat Items */}
                {!isCollapsed && (
                  <div className="pl-5 space-y-0.5">
                    {filteredChats.length === 0 ? (
                      <div 
                        onClick={() => onCreateNewChat(folderName)}
                        className="px-3 py-1.5 text-[11px] text-[#52525B] hover:text-[#A1A1AA] cursor-pointer italic"
                      >
                        + Add chat to this folder
                      </div>
                    ) : (
                      filteredChats.map((conv) => {
                        const isActive = conv.id === activeConversationId;
                        return (
                          <div
                            key={conv.id}
                            onClick={() => onSelectConversation(conv.id)}
                            className={`group relative flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                              isActive
                                ? 'bg-[#27272A] text-white font-medium shadow-sm'
                                : 'text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#1C1C1F]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                              <span className="text-xs truncate tracking-tight">
                                {conv.title || 'Project Echo Full-Stack UI'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isActive ? (
                                <span className="text-[#C27038] font-mono text-xs flex items-center">
                                  <Terminal size={13} className="mr-0.5" />
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#71717A] font-mono">
                                  {formatRelativeTime(conv.updated_at || conv.created_at)}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteConversation(conv.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-[#71717A] transition-opacity cursor-pointer"
                                title="Delete chat"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Settings Navigation item (matching user reference) */}
        <div className="p-3 border-t border-[#27272A] bg-[#121214]">
          <button
            onClick={() => onOpenSettings && onOpenSettings()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1E1E22] transition-colors cursor-pointer"
          >
            <SettingsIcon size={15} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* 2. Right Pane: Selected Conversation Message Stream */}
      <div className="flex-1 flex flex-col h-full bg-[#18181B] overflow-hidden">
        {/* Chat Top Navigation Bar */}
        <div className="flex items-center justify-between px-7 py-3.5 border-b border-[#27272A] bg-[#18181B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#27272A] flex items-center justify-center text-[#C27038]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#FAFAFA] leading-tight">
                <ScrambleText text={activeTitle} trigger={activeTitle} hoverScramble />
              </h2>
              <p className="text-[11px] text-[#71717A]">Pure Text-Based Interaction (Voice commands remain isolated)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center bg-[#27272A] border border-[#3F3F46] rounded-lg p-0.5 text-xs font-semibold">
              <button
                onClick={() => onToggleLanguage('en-IN')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeLanguage === 'en-IN' ? 'bg-[#C27038] text-white shadow-xs' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                English (IN)
              </button>
              <button
                onClick={() => onToggleLanguage('kn-IN')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeLanguage === 'kn-IN' ? 'bg-[#C27038] text-white shadow-xs' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                ಕನ್ನಡ (Kannada)
              </button>
            </div>

            <button
              onClick={onClearChat}
              className="p-2 text-[#71717A] hover:text-red-400 hover:bg-[#27272A] rounded-lg transition-colors cursor-pointer"
              title="Clear Current Chat History"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#A1A1AA]">
              <div className="w-14 h-14 rounded-2xl bg-[#27272A] flex items-center justify-center text-[#C27038] mb-3 shadow-sm">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-1">
                {activeTitle === "Conversational Chat" ? "Start a New Chat" : activeTitle}
              </h3>
              <p className="text-xs max-w-md text-[#71717A] mb-5">
                Type any query below. Audio voice assistant commands are processed independently and will not appear in this session.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  "What is quantum computing?",
                  "Write a Python script to sort an array",
                  "Explain the theory of relativity",
                  "ಕರ್ನಾಟಕದ ಪ್ರಮುಖ ನದಿಗಳು ಯಾವುವು?"
                ].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => onSendMessage(sample)}
                    className="px-3.5 py-1.5 bg-[#27272A] border border-[#3F3F46] hover:border-[#C27038] text-[#EDEDED] text-xs font-medium rounded-full transition-all cursor-pointer"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={msg.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-[#C27038] text-white flex items-center justify-center text-xs font-serif-display font-bold shrink-0 mt-1 shadow-xs">
                      E
                    </div>
                  )}

                  <div className={`max-w-[75%] rounded-2xl px-5 py-3.5 shadow-xs relative group ${
                    isUser 
                      ? 'bg-[#C27038] text-white rounded-tr-xs' 
                      : 'bg-[#27272A] border border-[#3F3F46] text-[#EDEDED] rounded-tl-xs'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">{msg.content}</p>

                    <div className={`flex items-center gap-2 mt-2 pt-1 border-t text-[11px] ${
                      isUser ? 'border-white/20 text-white/80 justify-end' : 'border-[#3F3F46] text-[#71717A] justify-between'
                    }`}>
                      <span>{msg.timestamp || 'Just now'}</span>

                      {!isUser && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onSpeakText(msg.content)}
                            className="p-1 hover:text-[#C27038] transition-colors cursor-pointer"
                            title="Speak text aloud"
                          >
                            <Volume2 size={14} />
                          </button>
                          <button
                            onClick={() => handleCopy(msg.id || index, msg.content)}
                            className="p-1 hover:text-[#C27038] transition-colors cursor-pointer"
                            title="Copy text"
                          >
                            <Copy size={14} />
                          </button>
                          {copiedId === (msg.id || index) && (
                            <span className="text-[10px] text-green-400">Copied!</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}

          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 items-center"
            >
              <div className="w-8 h-8 rounded-lg bg-[#C27038] text-white flex items-center justify-center text-xs font-serif-display font-bold shadow-xs">
                E
              </div>
              <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl rounded-tl-xs px-5 py-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#C27038] animate-pulse"></span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#C27038] animate-pulse delay-150"></span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#C27038] animate-pulse delay-300"></span>
                <span className="text-xs text-[#A1A1AA] ml-1">Echo is formulating an answer...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer (Purely Text Input) */}
        <div className="p-4 px-8 border-t border-[#27272A] bg-[#18181B] shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={activeLanguage === 'kn-IN' ? "ಕನ್ನಡದಲ್ಲಿ ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ..." : "Ask Echo anything or type a desktop command..."}
              className="flex-1 bg-[#27272A] border border-[#3F3F46] rounded-xl px-4 py-3 text-sm text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#C27038] transition-colors"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className="p-3 bg-[#C27038] hover:bg-[#AD602D] disabled:opacity-40 text-white rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center"
              title="Send text message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

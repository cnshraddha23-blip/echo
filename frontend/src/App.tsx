import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChatInterface } from './components/ChatInterface';
import { DevicesPanel } from './components/DevicesPanel';
import { AgentsPanel } from './components/AgentsPanel';
import { WorkflowsPanel } from './components/WorkflowsPanel';
import { ResearchPanel } from './components/ResearchPanel';
import { FileManagerPanel } from './components/FileManagerPanel';
import { ProductivityPanel } from './components/ProductivityPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { AuthModal } from './components/AuthModal';
import { VisualInteractionModal } from './components/VisualInteractionModal';
import { CommandPalette } from './components/CommandPalette';
import { CustomCursor } from './components/CustomCursor';
import { browserVoice, speakBrowserSpeech } from './services/voice';
import { api, socket } from './services/api';
import { 
  Conversation, Message, Note, Task, Reminder, 
  SystemTelemetry, AssistantVisualizerState, Device, Agent, Workflow, User 
} from './types';

export const App: React.FC = () => {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [visualizerState, setVisualizerState] = useState<AssistantVisualizerState>('idle');
  const [transcriptFeedback, setTranscriptFeedback] = useState<string>('');
  const [userName, setUserName] = useState<string>('Shraddha');
  const [activeLanguage, setActiveLanguage] = useState<string>('en-IN');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showVisualModal, setShowVisualModal] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 1,
    username: 'shraddha',
    display_name: 'Shraddha',
    email: 'shraddha@echo.ai',
    role: 'admin'
  });

  // Voice States
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const isExecutingRef = useRef<boolean>(false);

  // Database Data States
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('default');
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [devices, setDevices] = useState<Device[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  // 1. Initial Data Fetching from SQLite
  const loadEcosystemData = async () => {
    try {
      const [
        notesData, tasksData, remindersData, settingsData, 
        convsData, telemetryData, devicesData, agentsData, workflowsData, userData
      ] = await Promise.all([
        api.getNotes(),
        api.getTasks(),
        api.getReminders(),
        api.getSettings(),
        api.getConversations(),
        api.getSystemInfo(),
        api.getDevices(),
        api.getAgents(),
        api.getWorkflows(),
        api.getMe()
      ]);

      setNotes(notesData || []);
      setTasks(tasksData || []);
      setReminders(remindersData || []);
      setSettings(settingsData || {});
      setTelemetry(telemetryData || null);
      setDevices(devicesData || []);
      setAgents(agentsData || []);
      setWorkflows(workflowsData || []);
      setCurrentUser(userData || null);

      const convsList = (convsData || []).filter(c => c.id !== 'voice-session' && c.id !== 'test-session');
      setConversations(convsList);

      if (convsList.length > 0) {
        const firstId = convsList[0].id;
        setActiveConversationId(firstId);
        const initialMessages = await api.getMessages(firstId);
        setMessages(initialMessages?.messages || []);
      }

      if (settingsData?.user_name) setUserName(settingsData.user_name);
      if (settingsData?.language) setActiveLanguage(settingsData.language);
    } catch (err) {
      console.error("Initial data load error:", err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    loadEcosystemData();

    const telemetryInterval = setInterval(async () => {
      try {
        const t = await api.getSystemInfo();
        setTelemetry(t);
      } catch (e) {}
    }, 5000);

    return () => clearInterval(telemetryInterval);
  }, []);

  // 2. Real-Time Socket.IO Synchronization
  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      console.log("[SocketIO] Connected to Echo Multi-Agent Brain.");
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setVisualizerState('idle');
    });

    socket.on('device_status_change', async () => {
      const updatedDevices = await api.getDevices();
      setDevices(updatedDevices || []);
    });

    socket.on('notes_updated', async () => {
      const updatedNotes = await api.getNotes();
      setNotes(updatedNotes || []);
    });

    socket.on('tasks_updated', async () => {
      const updatedTasks = await api.getTasks();
      setTasks(updatedTasks || []);
    });

    socket.on('reminders_updated', async () => {
      const updatedReminders = await api.getReminders();
      setReminders(updatedReminders || []);
    });

    socket.on('reminder_triggered', (reminder: Reminder) => {
      alert(`⏰ Echo Reminder: ${reminder.title}`);
      api.getReminders().then(r => setReminders(r || []));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('device_status_change');
      socket.off('notes_updated');
      socket.off('tasks_updated');
      socket.off('reminders_updated');
      socket.off('reminder_triggered');
    };
  }, []);

  // 3. User Voice Interaction
  const handleStartVoice = () => {
    if (isSpeaking) {
      handleStopVoice();
      return;
    }

    setIsListening(true);
    setVisualizerState('listening');
    setTranscriptFeedback("Listening to your voice... Speak now.");

    browserVoice.startListening(
      activeLanguage,
      (transcript) => {
        setIsListening(false);
        setVisualizerState('processing');
        setTranscriptFeedback(`Heard: "${transcript}"`);
        handleVoiceCommand(transcript);
      },
      (error) => {
        console.warn("[Voice Error]:", error);
        setIsListening(false);
        setVisualizerState('idle');
        const errString = String(error);
        if (errString.includes("not-allowed")) {
          setTranscriptFeedback("Microphone permission denied. Allow mic access in your browser bar.");
        } else if (errString.includes("no-speech")) {
          setTranscriptFeedback("No speech detected. Tap to speak again.");
        } else {
          setTranscriptFeedback("Tap to speak again.");
        }
        setTimeout(() => setTranscriptFeedback(''), 4000);
      },
      () => {
        setIsListening(false);
        if (!isProcessing && !isSpeaking) {
          setVisualizerState('idle');
        }
      }
    );
  };

  const handleStopVoice = () => {
    browserVoice.stopListening();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    setVisualizerState('idle');
    setTranscriptFeedback('');
    isExecutingRef.current = false;
  };

  const handleSpeakText = async (text: string) => {
    setIsSpeaking(true);
    setVisualizerState('speaking');
    try {
      await speakBrowserSpeech(text, activeLanguage);
    } catch (e) {
      console.error("Speak error:", e);
    } finally {
      setIsSpeaking(false);
      setVisualizerState('idle');
      setTranscriptFeedback('');
      isExecutingRef.current = false;
    }
  };

  const handleVoiceCommand = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    // Barge-in interruption
    if (cleanText.toLowerCase() === 'stop' || cleanText.includes('ನಿಲ್ಲಿಸು')) {
      handleStopVoice();
      socket.emit('cancel_task');
      setTranscriptFeedback("Interrupted.");
      setTimeout(() => setTranscriptFeedback(''), 1500);
      return;
    }

    if (isExecutingRef.current) return;

    // Auto-open visual perception modal if user talks about screen
    if (cleanText.toLowerCase().includes('screen') || cleanText.toLowerCase().includes('look at') || cleanText.toLowerCase().includes('screenshot')) {
      setShowVisualModal(true);
    }

    isExecutingRef.current = true;
    setIsProcessing(true);
    setVisualizerState('processing');

    try {
      const res = await api.sendVoiceCommand(cleanText, activeLanguage);
      if (res && res.response) {
        setTranscriptFeedback(`Echo: "${res.response}"`);
        handleSpeakText(res.response);

        // Multi-device mobile launch trigger if on mobile browser or requested
        const mobileIntents = res.data?.mobile_intents || (res.data?.mobile_intent ? [res.data?.mobile_intent] : []);
        if (mobileIntents.length > 0) {
          const isMobileDevice = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          mobileIntents.forEach((m: any) => {
            const targetUrl = isMobileDevice ? (m.url || m.web_url) : (m.web_url || m.url);
            if (targetUrl) {
              try { window.open(targetUrl, '_blank'); } catch (_) {}
            }
          });
        }
      } else {
        setVisualizerState('idle');
        isExecutingRef.current = false;
      }
    } catch (err) {
      console.error("Voice command error:", err);
      setVisualizerState('error');
      setTranscriptFeedback("Error executing request.");
      setTimeout(() => {
        setVisualizerState('idle');
        setTranscriptFeedback('');
      }, 2500);
      isExecutingRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Typed Chat Send Handler
  const handleSendMessage = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    let targetConvId = activeConversationId;
    const exists = conversations.some(c => c.id === targetConvId);
    if (!exists) {
      const title = cleanText.length > 28 ? cleanText.slice(0, 28) + '...' : cleanText;
      await api.createConversation(targetConvId, title, "Echo Voice Assistant");
      const updatedConvs = await api.getConversations();
      setConversations((updatedConvs || []).filter(c => c.id !== 'voice-session' && c.id !== 'test-session'));
    }

    setIsProcessing(true);
    setVisualizerState('processing');

    const optimisticUserMsg: Message = {
      conversation_id: targetConvId,
      role: 'user',
      content: cleanText,
      language: activeLanguage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, optimisticUserMsg]);

    try {
      const res = await api.sendMessage(cleanText, targetConvId, activeLanguage, false);
      const assistantMsg: Message = {
        conversation_id: targetConvId,
        role: 'assistant',
        content: res.response,
        agent: res.agent,
        language: activeLanguage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
      setVisualizerState('idle');

      // Multi-device mobile launch trigger if on mobile browser or requested
      const mobileIntents = res.data?.mobile_intents || (res.data?.mobile_intent ? [res.data?.mobile_intent] : []);
      if (mobileIntents.length > 0) {
        const isMobileDevice = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        mobileIntents.forEach((m: any) => {
          const targetUrl = isMobileDevice ? (m.url || m.web_url) : (m.web_url || m.url);
          if (targetUrl) {
            try { window.open(targetUrl, '_blank'); } catch (_) {}
          }
        });
      }

      const updatedConvs = await api.getConversations();
      setConversations((updatedConvs || []).filter(c => c.id !== 'voice-session' && c.id !== 'test-session'));
    } catch (err) {
      console.error("Send message error:", err);
      setVisualizerState('error');
      setTimeout(() => setVisualizerState('idle'), 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    try {
      const res = await api.getMessages(convId);
      setMessages(res?.messages || []);
    } catch (e) {
      console.error("Failed to load conversation:", e);
      setMessages([]);
    }
  };

  const handleCreateNewChat = async (folderName?: string) => {
    const newId = 'chat_' + Date.now();
    const targetFolder = folderName || 'Echo Voice Assistant';
    try {
      await api.createConversation(newId, 'New Chat', targetFolder);
      const rawConvs = await api.getConversations();
      const updatedConvs = (rawConvs || []).filter(c => c.id !== 'voice-session' && c.id !== 'test-session');
      setConversations(updatedConvs);
    } catch (e) {
      console.error("Create chat error:", e);
    }
    setActiveConversationId(newId);
    setMessages([]);
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await api.deleteConversation(convId);
      const rawConvs = await api.getConversations();
      const updatedConvs = (rawConvs || []).filter(c => c.id !== 'voice-session' && c.id !== 'test-session');
      setConversations(updatedConvs);
      if (activeConversationId === convId) {
        if (updatedConvs.length > 0) {
          handleSelectConversation(updatedConvs[0].id);
        } else {
          setActiveConversationId('default');
          setMessages([]);
        }
      }
    } catch (e) {
      console.error("Delete conversation error:", e);
    }
  };

  const handleClearChat = async () => {
    setMessages([]);
  };

  const handleToggleLanguage = async (newLang: string) => {
    setActiveLanguage(newLang);
    await api.updateSettings({ ...settings, language: newLang });
  };

  const handleQuickAction = async (action: string) => {
    if (action === 'save_note') {
      setActiveTab('notes');
    } else if (action === 'add_task') {
      setActiveTab('tasks');
    } else if (action === 'study_mode') {
      handleVoiceCommand("study mode");
    }
  };

  const handleRemoveDevice = async (id: string) => {
    await api.removeDevice(id);
    const updated = await api.getDevices();
    setDevices(updated || []);
  };

  const handleLogout = () => {
    localStorage.removeItem('echo_auth_token');
    setCurrentUser(null);
    loadEcosystemData();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#EBE3D5] relative selection:bg-[#D97745] selection:text-white">
      {/* Custom Animated Cursor System */}
      <CustomCursor />

      {/* 1. Sidebar Navigation (12 Tabs) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        isConnected={isConnected}
        currentUser={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col bg-transparent relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 h-full overflow-hidden flex flex-col"
          >
            {activeTab === 'dashboard' && (
              <Dashboard
                onStartVoice={handleStartVoice}
                onStopVoice={handleStopVoice}
                isListening={isListening}
                isSpeaking={isSpeaking}
                visualizerState={visualizerState}
                notes={notes}
                tasks={tasks}
                reminders={reminders}
                telemetry={telemetry}
                devices={devices}
                onNavigate={setActiveTab}
                onQuickAction={handleQuickAction}
                userName={userName}
                transcriptFeedback={transcriptFeedback}
                activeLanguage={activeLanguage}
                onToggleLanguage={handleToggleLanguage}
                onOpenVisualPerception={() => setShowVisualModal(true)}
                onExecuteCommand={handleSendMessage}
                onOpenCommandPalette={() => setShowCommandPalette(true)}
              />
            )}

            {(activeTab === 'chat' || activeTab === 'history') && (
              <ChatInterface
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onCreateNewChat={handleCreateNewChat}
                onDeleteConversation={handleDeleteConversation}
                messages={messages}
                onSendMessage={handleSendMessage}
                onClearChat={handleClearChat}
                isProcessing={isProcessing}
                activeLanguage={activeLanguage}
                onToggleLanguage={handleToggleLanguage}
                onSpeakText={handleSpeakText}
                onOpenSettings={() => setActiveTab('settings')}
              />
            )}

            {activeTab === 'devices' && (
              <DevicesPanel
                devices={devices}
                onRefresh={async () => {
                  const d = await api.getDevices();
                  setDevices(d || []);
                }}
                onRemoveDevice={handleRemoveDevice}
              />
            )}

            {activeTab === 'agents' && (
              <AgentsPanel agents={agents} />
            )}

            {activeTab === 'workflows' && (
              <WorkflowsPanel
                workflows={workflows}
                onRefresh={async () => {
                  const wfs = await api.getWorkflows();
                  setWorkflows(wfs || []);
                }}
              />
            )}

            {activeTab === 'research' && (
              <ResearchPanel />
            )}

            {activeTab === 'files' && (
              <FileManagerPanel />
            )}

            {(activeTab === 'notes' || activeTab === 'tasks' || activeTab === 'reminders') && (
              <ProductivityPanel
                type={activeTab as 'notes' | 'tasks' | 'reminders'}
                notes={notes}
                tasks={tasks}
                reminders={reminders}
                onCreateNote={async (title, content, category, is_pinned) => {
                  await api.createNote(title, content, category, is_pinned);
                  const updated = await api.getNotes();
                  setNotes(updated);
                }}
                onDeleteNote={async (id) => {
                  await api.deleteNote(id);
                  const updated = await api.getNotes();
                  setNotes(updated);
                }}
                onCreateTask={async (title, description, due_date, priority) => {
                  await api.createTask(title, description, due_date, priority);
                  const updated = await api.getTasks();
                  setTasks(updated);
                }}
                onUpdateTask={async (id, data) => {
                  await api.updateTask(id, data);
                  const updated = await api.getTasks();
                  setTasks(updated);
                }}
                onDeleteTask={async (id) => {
                  await api.deleteTask(id);
                  const updated = await api.getTasks();
                  setTasks(updated);
                }}
                onCreateReminder={async (title, remind_at) => {
                  await api.createReminder(title, remind_at);
                  const updated = await api.getReminders();
                  setReminders(updated);
                }}
                onDeleteReminder={async (id) => {
                  await api.deleteReminder(id);
                  const updated = await api.getReminders();
                  setReminders(updated);
                }}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPanel
                settings={settings}
                onSaveSettings={async (newSettings) => {
                  await api.updateSettings(newSettings);
                  setSettings(newSettings);
                  if (newSettings.user_name) setUserName(newSettings.user_name);
                  if (newSettings.language) setActiveLanguage(newSettings.language);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          loadEcosystemData();
        }}
      />

      {/* Visual Computer Interaction & Screen Perception Modal */}
      <VisualInteractionModal
        isOpen={showVisualModal}
        onClose={() => setShowVisualModal(false)}
        devices={devices}
        activeLanguage={activeLanguage}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={setActiveTab}
        onStartVoice={handleStartVoice}
        onOpenVisualPerception={() => setShowVisualModal(true)}
        onRunWorkflow={async (wfId) => {
          await api.triggerWorkflow(wfId);
          const updatedWfs = await api.getWorkflows();
          setWorkflows(updatedWfs);
        }}
        onExecuteCommand={handleSendMessage}
      />
    </div>
  );
};

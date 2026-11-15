import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChatInterface } from './components/ChatInterface';
import { ProductivityPanel } from './components/ProductivityPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { AboutPanel } from './components/AboutPanel';
import { api, socket } from './services/api';
import { browserVoice, speakBrowserSpeech } from './services/voice';
import { Note, Task, Reminder, SystemTelemetry, Message, AssistantVisualizerState } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Assistant & Voice states
  const [visualizerState, setVisualizerState] = useState<AssistantVisualizerState>('idle');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeLanguage, setActiveLanguage] = useState<string>('en-IN');
  const [userName, setUserName] = useState<string>('Shraddha');
  const [transcriptFeedback, setTranscriptFeedback] = useState<string>('');

  // Prevent multiple concurrent triggers
  const isExecutingRef = useRef<boolean>(false);

  // Database Data States
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // 1. Initial Data Fetching from SQLite
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [notesData, tasksData, remindersData, settingsData, chatData, telemetryData] = await Promise.all([
          api.getNotes(),
          api.getTasks(),
          api.getReminders(),
          api.getSettings(),
          api.getMessages('default'),
          api.getSystemInfo()
        ]);

        setNotes(notesData || []);
        setTasks(tasksData || []);
        setReminders(remindersData || []);
        setSettings(settingsData || {});
        setMessages(chatData?.messages || []);
        setTelemetry(telemetryData || null);

        if (settingsData?.user_name) setUserName(settingsData.user_name);
        if (settingsData?.language) setActiveLanguage(settingsData.language);
      } catch (err) {
        console.error("Initial data load error:", err);
      }
    };

    fetchInitialData();

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
      console.log("[SocketIO] Connected to Echo backend.");
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setVisualizerState('idle');
      console.log("[SocketIO] Disconnected from Echo backend.");
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
      socket.off('notes_updated');
      socket.off('tasks_updated');
      socket.off('reminders_updated');
      socket.off('reminder_triggered');
    };
  }, []);

  // 3. User Voice Interaction
  const handleStartVoice = () => {
    // If speaking, stop playback
    if (isSpeaking) {
      handleStopVoice();
      return;
    }

    // Reset feedback
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
          setTranscriptFeedback("Microphone permission denied in browser. Please click the mic icon in your address bar to allow.");
        } else if (errString.includes("no-speech")) {
          setTranscriptFeedback("No speech heard. Please tap and speak again.");
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

  // Dedicated Voice Handler
  const handleVoiceCommand = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText || isExecutingRef.current) return;

    isExecutingRef.current = true;
    setIsProcessing(true);
    setVisualizerState('processing');

    try {
      const res = await api.sendMessage(cleanText, 'voice-session', activeLanguage, false);
      
      if (res && res.response) {
        setTranscriptFeedback(`Echo: "${res.response}"`);
        handleSpeakText(res.response);
      } else {
        setVisualizerState('idle');
        isExecutingRef.current = false;
      }

      if (res && res.action === 'create_note') {
        const updatedNotes = await api.getNotes();
        setNotes(updatedNotes || []);
      }
    } catch (err) {
      console.error("Voice command error:", err);
      setVisualizerState('error');
      setTranscriptFeedback("Error communicating with Echo.");
      setTimeout(() => {
        setVisualizerState('idle');
        setTranscriptFeedback('');
      }, 2500);
      isExecutingRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Dedicated Chat Send Handler (For typed messages)
  const handleSendMessage = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    setIsProcessing(true);
    setVisualizerState('processing');

    const optimisticUserMsg: Message = {
      conversation_id: 'default',
      role: 'user',
      content: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, optimisticUserMsg]);

    try {
      const res = await api.sendMessage(cleanText, 'default', activeLanguage, false);
      
      const assistantMsg: Message = {
        conversation_id: 'default',
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (res.response) {
        handleSpeakText(res.response);
      }

      if (res.action === 'create_note') {
        const updatedNotes = await api.getNotes();
        setNotes(updatedNotes || []);
      }
    } catch (err) {
      console.error("Send message error:", err);
      setVisualizerState('error');
      setTimeout(() => setVisualizerState('idle'), 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await api.deleteConversation('default');
      setMessages([]);
    } catch (e) {
      console.error("Clear chat error:", e);
    }
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
    } else if (action === 'google_search') {
      const q = prompt("Enter Google search query:");
      if (q) api.sendMessage(`search for ${q}`, 'voice-session', activeLanguage);
    } else if (action === 'study_mode') {
      handleVoiceCommand("activate study mode");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F1E7]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        isConnected={isConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col bg-[#F8F1E7]">
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
            onNavigate={setActiveTab}
            onQuickAction={handleQuickAction}
            userName={userName}
            transcriptFeedback={transcriptFeedback}
          />
        )}

        {(activeTab === 'assistant' || activeTab === 'chat') && (
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            isProcessing={isProcessing}
            activeLanguage={activeLanguage}
            onToggleLanguage={handleToggleLanguage}
            onStartVoice={handleStartVoice}
            onStopVoice={handleStopVoice}
            isListening={isListening}
            onSpeakText={handleSpeakText}
          />
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

        {activeTab === 'about' && <AboutPanel />}
      </main>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChatInterface } from './components/ChatInterface';
import { ProductivityPanel } from './components/ProductivityPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { AboutPanel } from './components/AboutPanel';
import { api, socket } from './services/api';
import { browserVoice } from './services/voice';
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

    // Telemetry polling every 5 seconds
    const telemetryInterval = setInterval(async () => {
      try {
        const t = await api.getSystemInfo();
        setTelemetry(t);
      } catch (e) {
        // Handled silently
      }
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

    socket.on('microphone_status', (data: { status: string }) => {
      if (data.status === 'listening') {
        setIsListening(true);
        setVisualizerState('listening');
      } else {
        setIsListening(false);
        if (visualizerState === 'listening') setVisualizerState('idle');
      }
    });

    socket.on('assistant_speaking', () => {
      setIsSpeaking(true);
      setVisualizerState('speaking');
    });

    socket.on('assistant_stopped', () => {
      setIsSpeaking(false);
      setVisualizerState('idle');
    });

    socket.on('processing_started', () => {
      setIsProcessing(true);
      setVisualizerState('processing');
    });

    socket.on('processing_finished', () => {
      setIsProcessing(false);
      if (!isSpeaking) setVisualizerState('idle');
    });

    socket.on('speech_recognized', async (data: { text: string; language: string }) => {
      console.log("[SocketIO] Speech recognized:", data.text);
      setTranscriptFeedback(`Heard: "${data.text}"`);
      setTimeout(() => setTranscriptFeedback(''), 4000);
      handleSendMessage(data.text);
    });

    socket.on('assistant_response', async () => {
      const updated = await api.getMessages('default');
      setMessages(updated?.messages || []);
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
      socket.off('microphone_status');
      socket.off('assistant_speaking');
      socket.off('assistant_stopped');
      socket.off('processing_started');
      socket.off('processing_finished');
      socket.off('speech_recognized');
      socket.off('assistant_response');
      socket.off('notes_updated');
      socket.off('tasks_updated');
      socket.off('reminders_updated');
      socket.off('reminder_triggered');
    };
  }, [isSpeaking, visualizerState]);

  // 3. Robust Hybrid Voice Trigger: Browser Web Speech API with Python Backend Fallback
  const handleStartVoice = () => {
    setIsListening(true);
    setVisualizerState('listening');
    setTranscriptFeedback("Listening to your voice... Speak now.");

    if (browserVoice.isSupported()) {
      browserVoice.startListening(
        activeLanguage,
        (transcript) => {
          setIsListening(false);
          setVisualizerState('processing');
          setTranscriptFeedback(`Heard: "${transcript}"`);
          setTimeout(() => setTranscriptFeedback(''), 3000);
          handleSendMessage(transcript);
        },
        (error) => {
          console.warn("[Browser Voice Error, falling back to backend mic]:", error);
          // Fallback to Python PyAudio microphone capture
          api.startVoice(activeLanguage).catch((e) => {
            console.error("Backend voice failed:", e);
            setIsListening(false);
            setVisualizerState('idle');
            setTranscriptFeedback("Microphone access unavailable.");
            setTimeout(() => setTranscriptFeedback(''), 3000);
          });
        },
        () => {
          setIsListening(false);
          if (visualizerState === 'listening') setVisualizerState('idle');
        }
      );
    } else {
      // Direct Python Backend Microphone trigger
      api.startVoice(activeLanguage).catch((e) => {
        console.error("Backend voice failed:", e);
        setIsListening(false);
        setVisualizerState('idle');
      });
    }
  };

  const handleStopVoice = async () => {
    browserVoice.stopListening();
    setIsListening(false);
    setVisualizerState('idle');
    setTranscriptFeedback('');
    try {
      await api.stopVoice();
    } catch (err) {
      console.error("Failed to stop voice:", err);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setVisualizerState('processing');

    const optimisticUserMsg: Message = {
      conversation_id: 'default',
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, optimisticUserMsg]);

    try {
      // Send to backend with speak_response=true
      const res = await api.sendMessage(text, 'default', activeLanguage, true);
      
      const assistantMsg: Message = {
        conversation_id: 'default',
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);

      // If speech synthesis is requested, play audio
      if (res.response) {
        setIsSpeaking(true);
        setVisualizerState('speaking');
        api.speakText(res.response, activeLanguage).catch(() => {});
      }

      // Refresh notes/tasks if command created one
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
      setTimeout(() => {
        if (!isSpeaking) setVisualizerState('idle');
      }, 1500);
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
      if (q) api.sendMessage(`search for ${q}`, 'default', activeLanguage);
    } else if (action === 'study_mode') {
      handleSendMessage("activate study mode");
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
            onSpeakText={(text) => api.speakText(text, activeLanguage)}
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

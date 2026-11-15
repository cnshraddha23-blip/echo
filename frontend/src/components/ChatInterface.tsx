import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Copy, Check, Trash2, Volume2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, speak?: boolean) => void;
  onClearChat: () => void;
  isProcessing: boolean;
  activeLanguage: string;
  onToggleLanguage: (lang: string) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  isListening: boolean;
  onSpeakText: (text: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  isProcessing,
  activeLanguage,
  onToggleLanguage,
  onStartVoice,
  onStopVoice,
  isListening,
  onSpeakText
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

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

  return (
    <div className="flex flex-col h-full bg-[#14110E]">
      {/* Chat Navigation Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-[#2F2822] bg-[#1C1815]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E07A44]/15 border border-[#E07A44]/30 flex items-center justify-center text-[#E07A44]">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="font-serif-display text-lg font-bold text-[#FDFBF7]">Conversational Chat</h2>
            <p className="text-xs text-[#A89C90]">Bilingual Voice & Text Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center bg-[#221D19] border border-[#2F2822] rounded-xl p-1 text-xs font-semibold">
            <button
              onClick={() => onToggleLanguage('en-IN')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeLanguage === 'en-IN' ? 'bg-[#E07A44] text-white shadow-sm' : 'text-[#A89C90] hover:text-[#FDFBF7]'
              }`}
            >
              English (IN)
            </button>
            <button
              onClick={() => onToggleLanguage('kn-IN')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeLanguage === 'kn-IN' ? 'bg-[#E07A44] text-white shadow-sm' : 'text-[#A89C90] hover:text-[#FDFBF7]'
              }`}
            >
              ಕನ್ನಡ (Kannada)
            </button>
          </div>

          <button
            onClick={onClearChat}
            className="p-2 text-[#A89C90] hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#A89C90]">
            <div className="w-16 h-16 rounded-3xl bg-[#E07A44]/15 border border-[#E07A44]/30 flex items-center justify-center text-[#E07A44] mb-4 shadow-lg shadow-[#E07A44]/15">
              <Sparkles size={32} />
            </div>
            <h3 className="font-serif-display text-2xl font-bold text-[#FDFBF7] mb-2">Welcome to Echo Chat</h3>
            <p className="text-xs max-w-md text-[#A89C90]">
              Ask anything in English or Kannada, calculate mathematical expressions, or control your desktop.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-lg">
              {["What time is it?", "Calculate 25 * 4 + 10", "Open Notepad", "ನಮಸ್ಕಾರ, ನೀನು ಹೇಗಿದ್ದೀಯ?"].map((sample) => (
                <button
                  key={sample}
                  onClick={() => onSendMessage(sample)}
                  className="px-3.5 py-1.5 bg-[#1C1815] border border-[#2F2822] hover:border-[#E07A44] text-[#FDFBF7] text-xs font-medium rounded-full transition-all cursor-pointer"
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
                transition={{ duration: 0.3 }}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#E07A44] text-white flex items-center justify-center text-xs font-serif-display font-bold shrink-0 mt-1 shadow-md">
                    E
                  </div>
                )}

                <div className={`max-w-[75%] rounded-2xl px-5 py-3.5 shadow-md relative group ${
                  isUser 
                    ? 'bg-[#E07A44] text-white rounded-tr-xs' 
                    : 'bg-[#1C1815] border border-[#2F2822] text-[#FDFBF7] rounded-tl-xs'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">{msg.content}</p>

                  <div className={`flex items-center gap-2 mt-2 pt-1 border-t text-[11px] ${
                    isUser ? 'border-white/20 text-white/80 justify-end' : 'border-[#2F2822] text-[#A89C90] justify-between'
                  }`}>
                    <span>{msg.timestamp || 'Just now'}</span>

                    {!isUser && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onSpeakText(msg.content)}
                          className="p-1 hover:text-[#E07A44] transition-colors cursor-pointer"
                          title="Speak response"
                        >
                          <Volume2 size={14} />
                        </button>
                        <button
                          onClick={() => handleCopy(msg.id || index, msg.content)}
                          className="p-1 hover:text-[#E07A44] transition-colors cursor-pointer"
                          title="Copy text"
                        >
                          {copiedId === (msg.id || index) ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-[#E07A44] text-white flex items-center justify-center text-xs font-serif-display font-bold shrink-0">
              E
            </div>
            <div className="bg-[#1C1815] border border-[#2F2822] px-4 py-3 rounded-2xl rounded-tl-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E07A44] animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-[#E07A44] animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-[#E07A44] animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs text-[#A89C90] font-medium ml-1">Thinking...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="p-4 px-8 border-t border-[#2F2822] bg-[#1C1815]">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <button
            type="button"
            onClick={isListening ? onStopVoice : onStartVoice}
            className={`p-3 rounded-xl transition-all shadow-xs cursor-pointer ${
              isListening
                ? 'bg-[#C8622F] text-white animate-pulse'
                : 'bg-[#221D19] text-[#A89C90] hover:text-[#E07A44] border border-[#2F2822]'
            }`}
            title={isListening ? "Stop Listening" : "Voice Input"}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={activeLanguage === 'kn-IN' ? "ಕನ್ನಡದಲ್ಲಿ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ..." : "Ask Echo anything or type a desktop command..."}
            className="flex-1 bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-3 text-sm text-[#FDFBF7] placeholder-[#A89C90]/60 focus:outline-none focus:border-[#E07A44] transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="p-3 bg-[#E07A44] hover:bg-[#D06935] disabled:opacity-40 text-white rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

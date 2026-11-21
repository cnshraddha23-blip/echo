import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Globe, Volume2, Shield, Save, Check, Brain, Plus, Trash2 } from 'lucide-react';
import { Memory } from '../types';
import { api } from '../services/api';

interface SettingsPanelProps {
  settings: Record<string, string>;
  onSaveSettings: (newSettings: Record<string, string>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSaveSettings }) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    user_name: settings.user_name || 'Shraddha',
    assistant_name: settings.assistant_name || 'Echo',
    language: settings.language || 'en-IN',
    theme: settings.theme || 'light',
    auto_speak_responses: settings.auto_speak_responses || 'true',
    active_ai_provider: settings.active_ai_provider || 'gemini',
    ai_model: settings.ai_model || 'gemini-flash-lite-latest',
    gemini_api_key: settings.gemini_api_key || ''
  });

  const [memories, setMemories] = useState<Memory[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [newCat, setNewCat] = useState<'preference' | 'fact' | 'project' | 'productivity'>('preference');
  const [saved, setSaved] = useState(false);

  const loadMemories = async () => {
    try {
      const data = await api.getMemories();
      setMemories(data || []);
    } catch (e) {}
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newVal.trim()) return;
    try {
      await api.createMemory(newKey.trim(), newVal.trim(), newCat);
      setNewKey('');
      setNewVal('');
      loadMemories();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMemory = async (id: number) => {
    try {
      await api.deleteMemory(id);
      loadMemories();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 bg-[#F8F1E7] overflow-y-auto max-w-4xl space-y-6 select-none">
      <div className="flex items-center justify-between pb-6 border-b border-[#E8DCCD]">
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#29241F]">Ecosystem Settings</h2>
          <p className="text-xs text-[#81766B]">Configure AI models, voice profiles, persistent memory, and security allowlists</p>
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#D97745] hover:bg-[#B95F38] text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          <span>{saved ? "Saved to SQLite!" : "Save Settings"}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User & Identity */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-6 shadow-xs">
          <h3 className="font-serif-display text-base font-bold text-[#29241F] mb-4">Identity & Personalization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#81766B] mb-1">User Display Name</label>
              <input
                type="text"
                value={formData.user_name}
                onChange={(e) => handleChange('user_name', e.target.value)}
                className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-xs text-[#29241F] focus:outline-none focus:border-[#D97745]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#81766B] mb-1">Assistant Name</label>
              <input
                type="text"
                value={formData.assistant_name}
                onChange={(e) => handleChange('assistant_name', e.target.value)}
                className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-xs text-[#29241F] focus:outline-none focus:border-[#D97745]"
              />
            </div>
          </div>
        </div>

        {/* AI Model & Keys */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-6 shadow-xs">
          <h3 className="font-serif-display text-base font-bold text-[#29241F] mb-4 flex items-center gap-2">
            <Key size={16} className="text-[#D97745]" /> AI Model Configuration
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#81766B] mb-1">Active AI Provider</label>
                <select
                  value={formData.active_ai_provider}
                  onChange={(e) => handleChange('active_ai_provider', e.target.value)}
                  className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-xs text-[#29241F] focus:outline-none focus:border-[#D97745]"
                >
                  <option value="gemini">Google Gemini AI</option>
                  <option value="deepseek">DeepSeek AI</option>
                  <option value="openai">OpenAI GPT</option>
                  <option value="offline">Built-in Offline Intelligence</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#81766B] mb-1">Model Selection</label>
                <input
                  type="text"
                  value={formData.ai_model}
                  onChange={(e) => handleChange('ai_model', e.target.value)}
                  className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-xs text-[#29241F] focus:outline-none focus:border-[#D97745]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#81766B] mb-1">Gemini API Key</label>
              <input
                type="password"
                value={formData.gemini_api_key}
                onChange={(e) => handleChange('gemini_api_key', e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-xs text-[#29241F] focus:outline-none focus:border-[#D97745]"
              />
            </div>
          </div>
        </div>

        {/* Voice & Speech */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-6 shadow-xs">
          <h3 className="font-serif-display text-base font-bold text-[#29241F] mb-4 flex items-center gap-2">
            <Volume2 size={16} className="text-[#D97745]" /> Bilingual Voice Preferences
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#81766B] mb-1">Default Assistant Language</label>
              <select
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-xs text-[#29241F] focus:outline-none focus:border-[#D97745]"
              >
                <option value="en-IN">English (India)</option>
                <option value="kn-IN">ಕನ್ನಡ (Kannada - India)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#81766B] mb-1">Automatic Audio Playback</label>
              <select
                value={formData.auto_speak_responses}
                onChange={(e) => handleChange('auto_speak_responses', e.target.value)}
                className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-xs text-[#29241F] focus:outline-none focus:border-[#D97745]"
              >
                <option value="true">Enabled (Echo speaks responses)</option>
                <option value="false">Muted (Visual text only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Persistent Long-Term Memory Section */}
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8DCCD] pb-3">
            <h3 className="font-serif-display text-base font-bold text-[#29241F] flex items-center gap-2">
              <Brain size={16} className="text-[#D97745]" /> Persistent AI Long-Term Memory
            </h3>
            <span className="text-[11px] font-mono text-[#81766B]">{memories.length} item(s)</span>
          </div>

          <p className="text-xs text-[#81766B]">
            Echo retains user-approved persistent context, preferences, and facts stored securely in SQLite.
          </p>

          {/* Add new memory inline form */}
          <div className="p-3 bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-[#D97745] uppercase">Teach Echo a New Fact / Preference</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Topic / Key (e.g. coffee_pref)"
                className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-lg px-2.5 py-1.5 text-xs text-[#29241F]"
              />
              <input
                type="text"
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                placeholder="Value (e.g. Espresso with no sugar)"
                className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-lg px-2.5 py-1.5 text-xs text-[#29241F]"
              />
              <div className="flex gap-2">
                <select
                  value={newCat}
                  onChange={(e: any) => setNewCat(e.target.value)}
                  className="flex-1 bg-[#FFFDF9] border border-[#E8DCCD] rounded-lg px-2 py-1.5 text-xs text-[#29241F]"
                >
                  <option value="preference">Preference</option>
                  <option value="fact">Fact</option>
                  <option value="project">Project</option>
                  <option value="productivity">Productivity</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddMemory}
                  className="px-3 py-1.5 bg-[#D97745] hover:bg-[#B95F38] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Memories List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {memories.length === 0 ? (
              <p className="text-xs text-[#81766B] italic py-3 text-center">No persistent memories saved yet.</p>
            ) : (
              memories.map((m) => (
                <div key={m.id} className="p-2.5 bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl flex items-center justify-between text-xs">
                  <div className="space-x-2">
                    <span className="font-mono font-bold text-[#D97745]">{m.key}:</span>
                    <span className="text-[#29241F]">{m.value}</span>
                    <span className="text-[10px] text-[#81766B] uppercase font-mono bg-[#EFE3D3] px-1.5 py-0.5 rounded">{m.category}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMemory(m.id)}
                    className="p-1 text-[#81766B] hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete Memory"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

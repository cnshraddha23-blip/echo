import React, { useState } from 'react';
import { Settings as SettingsIcon, Key, Globe, Volume2, Shield, Save, Check } from 'lucide-react';

interface SettingsPanelProps {
  settings: Record<string, string>;
  onSaveSettings: (newSettings: Record<string, string>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSaveSettings }) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    user_name: settings.user_name || 'Shivaraj',
    assistant_name: settings.assistant_name || 'Echo',
    language: settings.language || 'en-IN',
    theme: settings.theme || 'light',
    auto_speak_responses: settings.auto_speak_responses || 'true',
    active_ai_provider: settings.active_ai_provider || 'gemini',
    ai_model: settings.ai_model || 'gemini-2.5-flash',
    gemini_api_key: settings.gemini_api_key || ''
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="h-full flex flex-col p-8 bg-[#FFFDF9] overflow-y-auto max-w-4xl">
      <div className="flex items-center justify-between pb-6 border-b border-[#E8DCCD] mb-6">
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#29241F]">Application Settings</h2>
          <p className="text-xs text-[#81766B]">Configure AI keys, voice profiles, preferences and security allowlists</p>
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#D97745] hover:bg-[#C26535] text-white rounded-xl text-sm font-medium transition-all shadow-xs"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          <span>{saved ? "Saved to SQLite!" : "Save Settings"}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User & Identity */}
        <div className="bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl p-6">
          <h3 className="font-serif-display text-lg font-bold text-[#29241F] mb-4">Identity & Personalization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#81766B] mb-1">User Name</label>
              <input
                type="text"
                value={formData.user_name}
                onChange={(e) => handleChange('user_name', e.target.value)}
                className="w-full bg-[#FFFDF9] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm text-[#29241F] focus:outline-none focus:border-[#D97745]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#81766B] mb-1">Assistant Name</label>
              <input
                type="text"
                value={formData.assistant_name}
                onChange={(e) => handleChange('assistant_name', e.target.value)}
                className="w-full bg-[#FFFDF9] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm text-[#29241F] focus:outline-none focus:border-[#D97745]"
              />
            </div>
          </div>
        </div>

        {/* AI Model & Keys */}
        <div className="bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl p-6">
          <h3 className="font-serif-display text-lg font-bold text-[#29241F] mb-4 flex items-center gap-2">
            <Key size={18} className="text-[#D97745]" /> AI Model Configuration
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#81766B] mb-1">Active AI Provider</label>
                <select
                  value={formData.active_ai_provider}
                  onChange={(e) => handleChange('active_ai_provider', e.target.value)}
                  className="w-full bg-[#FFFDF9] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm text-[#29241F] focus:outline-none focus:border-[#D97745]"
                >
                  <option value="gemini">Google Gemini (Recommended)</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="offline">Offline Local Command Mode</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#81766B] mb-1">Model Selection</label>
                <select
                  value={formData.ai_model}
                  onChange={(e) => handleChange('ai_model', e.target.value)}
                  className="w-full bg-[#FFFDF9] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm text-[#29241F] focus:outline-none focus:border-[#D97745]"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="deepseek-chat">DeepSeek Chat</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#81766B] mb-1">Google Gemini API Key (Saved securely)</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={formData.gemini_api_key}
                onChange={(e) => handleChange('gemini_api_key', e.target.value)}
                className="w-full bg-[#FFFDF9] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm text-[#29241F] focus:outline-none focus:border-[#D97745]"
              />
              <p className="text-[11px] text-[#81766B] mt-1">
                Keys remain private on your Windows machine and are stored parameterised in SQLite / .env.
              </p>
            </div>
          </div>
        </div>

        {/* Speech & Language Settings */}
        <div className="bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl p-6">
          <h3 className="font-serif-display text-lg font-bold text-[#29241F] mb-4 flex items-center gap-2">
            <Volume2 size={18} className="text-[#D97745]" /> Speech & Audio Behavior
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#81766B] mb-1">Default Assistant Language</label>
              <select
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full bg-[#FFFDF9] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm text-[#29241F] focus:outline-none focus:border-[#D97745]"
              >
                <option value="en-IN">English (India) - Neerja Neural</option>
                <option value="kn-IN">Kannada (India) - Sapna Neural</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#81766B] mb-1">Automatic Audio Playback</label>
              <select
                value={formData.auto_speak_responses}
                onChange={(e) => handleChange('auto_speak_responses', e.target.value)}
                className="w-full bg-[#FFFDF9] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm text-[#29241F] focus:outline-none focus:border-[#D97745]"
              >
                <option value="true">Enabled (Echo speaks responses)</option>
                <option value="false">Muted (Text responses only)</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

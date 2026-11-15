import React, { useState } from 'react';
import { Key, Volume2, Save, Check } from 'lucide-react';

interface SettingsPanelProps {
  settings: Record<string, string>;
  onSaveSettings: (newSettings: Record<string, string>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSaveSettings }) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    user_name: settings.user_name || 'Shraddha',
    assistant_name: settings.assistant_name || 'Echo',
    language: settings.language || 'en-IN',
    theme: settings.theme || 'dark',
    auto_speak_responses: settings.auto_speak_responses || 'true',
    active_ai_provider: settings.active_ai_provider || 'gemini',
    ai_model: settings.ai_model || 'gemini-flash-latest',
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
    <div className="h-full flex flex-col p-8 bg-[#14110E] overflow-y-auto max-w-4xl">
      <div className="flex items-center justify-between pb-6 border-b border-[#2F2822] mb-6">
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#FDFBF7]">Application Settings</h2>
          <p className="text-xs text-[#A89C90]">Configure AI keys, voice profiles, preferences and parameters</p>
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#E07A44] hover:bg-[#D06935] text-white rounded-xl text-sm font-medium transition-all shadow-md cursor-pointer"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          <span>{saved ? "Saved to SQLite!" : "Save Settings"}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User & Identity */}
        <div className="bg-[#1C1815] border border-[#2F2822] rounded-2xl p-6 shadow-md">
          <h3 className="font-serif-display text-lg font-bold text-[#FDFBF7] mb-4">Identity & Personalization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#A89C90] mb-1">User Name</label>
              <input
                type="text"
                value={formData.user_name}
                onChange={(e) => handleChange('user_name', e.target.value)}
                className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm text-[#FDFBF7] focus:outline-none focus:border-[#E07A44]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#A89C90] mb-1">Assistant Name</label>
              <input
                type="text"
                value={formData.assistant_name}
                onChange={(e) => handleChange('assistant_name', e.target.value)}
                className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm text-[#FDFBF7] focus:outline-none focus:border-[#E07A44]"
              />
            </div>
          </div>
        </div>

        {/* AI Model & Keys */}
        <div className="bg-[#1C1815] border border-[#2F2822] rounded-2xl p-6 shadow-md">
          <h3 className="font-serif-display text-lg font-bold text-[#FDFBF7] mb-4 flex items-center gap-2">
            <Key size={18} className="text-[#E07A44]" /> AI Model Configuration
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A89C90] mb-1">Active AI Provider</label>
                <select
                  value={formData.active_ai_provider}
                  onChange={(e) => handleChange('active_ai_provider', e.target.value)}
                  className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm text-[#FDFBF7] focus:outline-none focus:border-[#E07A44]"
                >
                  <option value="gemini">Google Gemini (Recommended)</option>
                  <option value="offline">Offline Local Command Mode</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#A89C90] mb-1">Model Selection</label>
                <select
                  value={formData.ai_model}
                  onChange={(e) => handleChange('ai_model', e.target.value)}
                  className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm text-[#FDFBF7] focus:outline-none focus:border-[#E07A44]"
                >
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A89C90] mb-1">Google Gemini API Key (Optional)</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={formData.gemini_api_key}
                onChange={(e) => handleChange('gemini_api_key', e.target.value)}
                className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm text-[#FDFBF7] focus:outline-none focus:border-[#E07A44]"
              />
              <p className="text-[11px] text-[#A89C90] mt-1">
                Keys remain private on your Windows machine and are stored parameterised in SQLite / .env.
              </p>
            </div>
          </div>
        </div>

        {/* Speech & Language Settings */}
        <div className="bg-[#1C1815] border border-[#2F2822] rounded-2xl p-6 shadow-md">
          <h3 className="font-serif-display text-lg font-bold text-[#FDFBF7] mb-4 flex items-center gap-2">
            <Volume2 size={18} className="text-[#E07A44]" /> Speech & Language
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#A89C90] mb-1">Assistant Language</label>
              <select
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm text-[#FDFBF7] focus:outline-none focus:border-[#E07A44]"
              >
                <option value="en-IN">English (India)</option>
                <option value="kn-IN">Kannada (India)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A89C90] mb-1">Automatic Audio Playback</label>
              <select
                value={formData.auto_speak_responses}
                onChange={(e) => handleChange('auto_speak_responses', e.target.value)}
                className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm text-[#FDFBF7] focus:outline-none focus:border-[#E07A44]"
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

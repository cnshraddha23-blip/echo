import React from 'react';
import { Sparkles, Shield, Cpu, Mic, Database, CheckCircle2, Layers } from 'lucide-react';

export const AboutPanel: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-8 bg-[#FFFDF9] overflow-y-auto max-w-4xl space-y-8">
      <div className="border-b border-[#E8DCCD] pb-6">
        <span className="text-xs font-bold uppercase tracking-widest text-[#D97745] bg-[#F4E1D2] px-3 py-1 rounded-full">
          Project Echo v2.0
        </span>
        <h1 className="font-serif-display text-4xl font-bold text-[#29241F] mt-3">
          About Echo Voice Assistant
        </h1>
        <p className="text-sm text-[#81766B] mt-1">
          Next-generation bilingual conversational desktop system built with FastAPI, SQLite, React, and Edge-TTS.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl p-6">
          <div className="p-3 bg-[#F4E1D2] text-[#D97745] rounded-xl w-fit mb-3">
            <Mic size={20} />
          </div>
          <h3 className="font-serif-display text-lg font-bold text-[#29241F] mb-1">Bilingual Voice System</h3>
          <p className="text-xs text-[#81766B] leading-relaxed">
            Native Indian English (en-IN) and Kannada (kn-IN) speech recognition powered by Google Speech Engine, coupled with high-fidelity neural voices (`en-IN-NeerjaNeural` and `kn-IN-SapnaNeural`).
          </p>
        </div>

        <div className="bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl p-6">
          <div className="p-3 bg-[#F4E1D2] text-[#D97745] rounded-xl w-fit mb-3">
            <Shield size={20} />
          </div>
          <h3 className="font-serif-display text-lg font-bold text-[#29241F] mb-1">Air-Tight System Safety</h3>
          <p className="text-xs text-[#81766B] leading-relaxed">
            Strict process whitelisting, AST-parsed mathematical evaluation with zero `eval()` risks, and complete parameterised SQL preventing prompt injection or arbitrary shell exploits.
          </p>
        </div>

        <div className="bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl p-6">
          <div className="p-3 bg-[#F4E1D2] text-[#D97745] rounded-xl w-fit mb-3">
            <Cpu size={20} />
          </div>
          <h3 className="font-serif-display text-lg font-bold text-[#29241F] mb-1">Local Determinism First</h3>
          <p className="text-xs text-[#81766B] leading-relaxed">
            Local applications, calculations, telemetry, weather, and notes trigger in under 10ms locally without calling remote LLMs, while complex conversational queries seamlessly invoke Gemini.
          </p>
        </div>

        <div className="bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl p-6">
          <div className="p-3 bg-[#F4E1D2] text-[#D97745] rounded-xl w-fit mb-3">
            <Database size={20} />
          </div>
          <h3 className="font-serif-display text-lg font-bold text-[#29241F] mb-1">Persistent SQLite Architecture</h3>
          <p className="text-xs text-[#81766B] leading-relaxed">
            Full ACID compliance across conversation sessions, user notes, pending todo tasks, background reminders, and system command audit trails that survive application restarts.
          </p>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-r from-[#F4E1D2] to-[#EFE3D3] rounded-2xl border border-[#E8DCCD] flex items-center justify-between">
        <div>
          <h4 className="font-serif-display text-base font-bold text-[#29241F]">Principal Architect & Engineer</h4>
          <p className="text-xs text-[#81766B]">Created by Shivaraj for Next-Generation Commercial AI Desktop Standard</p>
        </div>
        <span className="text-xs font-bold text-[#B95F38] bg-white/80 px-3 py-1 rounded-lg">
          Version 2.0.0 Stable
        </span>
      </div>
    </div>
  );
};

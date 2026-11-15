import React from 'react';
import { Shield, Cpu, Mic, Database } from 'lucide-react';

export const AboutPanel: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-8 bg-[#14110E] overflow-y-auto max-w-4xl space-y-8">
      <div className="border-b border-[#2F2822] pb-6">
        <span className="text-xs font-bold uppercase tracking-widest text-[#E07A44] bg-[#E07A44]/15 border border-[#E07A44]/30 px-3 py-1 rounded-full">
          Project Echo v2.0
        </span>
        <h1 className="font-serif-display text-4xl font-bold text-[#FDFBF7] mt-3">
          About Echo Voice Assistant
        </h1>
        <p className="text-sm text-[#A89C90] mt-1">
          Next-generation bilingual conversational desktop assistant built with FastAPI, SQLite, React, and Windows SAPI speech synthesis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1C1815] border border-[#2F2822] rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-[#E07A44]/15 text-[#E07A44] rounded-xl w-fit mb-3">
            <Mic size={20} />
          </div>
          <h3 className="font-serif-display text-lg font-bold text-[#FDFBF7] mb-1">Bilingual Voice System</h3>
          <p className="text-xs text-[#A89C90] leading-relaxed">
            Native Indian English (en-IN) and Kannada (kn-IN) speech recognition powered by Web Speech API and local Windows SAPI speech output.
          </p>
        </div>

        <div className="bg-[#1C1815] border border-[#2F2822] rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-[#E07A44]/15 text-[#E07A44] rounded-xl w-fit mb-3">
            <Shield size={20} />
          </div>
          <h3 className="font-serif-display text-lg font-bold text-[#FDFBF7] mb-1">Air-Tight System Safety</h3>
          <p className="text-xs text-[#A89C90] leading-relaxed">
            Strict process whitelisting, AST-parsed mathematical evaluation with zero `eval()` risks, and complete parameterised SQL preventing prompt injection or arbitrary shell exploits.
          </p>
        </div>

        <div className="bg-[#1C1815] border border-[#2F2822] rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-[#E07A44]/15 text-[#E07A44] rounded-xl w-fit mb-3">
            <Cpu size={20} />
          </div>
          <h3 className="font-serif-display text-lg font-bold text-[#FDFBF7] mb-1">Local Determinism First</h3>
          <p className="text-xs text-[#A89C90] leading-relaxed">
            Local applications, calculations, telemetry, weather, and notes trigger in under 10ms locally without calling remote LLMs, with conversational fallback when desired.
          </p>
        </div>

        <div className="bg-[#1C1815] border border-[#2F2822] rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-[#E07A44]/15 text-[#E07A44] rounded-xl w-fit mb-3">
            <Database size={20} />
          </div>
          <h3 className="font-serif-display text-lg font-bold text-[#FDFBF7] mb-1">Persistent SQLite Architecture</h3>
          <p className="text-xs text-[#A89C90] leading-relaxed">
            Full ACID compliance across conversation sessions, user notes, pending todo tasks, background reminders, and system command audit trails that survive application restarts.
          </p>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-r from-[#1C1815] to-[#221D19] rounded-2xl border border-[#2F2822] flex items-center justify-between shadow-lg">
        <div>
          <h4 className="font-serif-display text-base font-bold text-[#FDFBF7]">Principal Architect & Engineer</h4>
          <p className="text-xs text-[#A89C90]">Engineered for Commercial-Grade AI Desktop Assistant Standards</p>
        </div>
        <span className="text-xs font-bold text-[#E07A44] bg-[#E07A44]/15 border border-[#E07A44]/30 px-3 py-1.5 rounded-lg">
          Version 2.0.0 Stable
        </span>
      </div>
    </div>
  );
};

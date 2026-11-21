import React, { useState } from 'react';
import { Globe, Search, Sparkles, Copy, Check, ExternalLink, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { ResearchReport } from '../types';
import { api } from '../services/api';

export const ResearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSearch = async (topicToSearch?: string) => {
    const target = topicToSearch || query;
    if (!target.trim() || loading) return;
    setLoading(true);
    try {
      const res = await api.conductResearch(target.trim());
      setReport(res);
    } catch (e) {
      console.error("Research error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.report_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col p-8 bg-[#F8F1E7] overflow-y-auto max-w-5xl space-y-6 select-none">
      {/* Header */}
      <div className="border-b border-[#E8DCCD] pb-5">
        <h1 className="font-serif-display text-2xl font-bold text-[#29241F]">
          Browser Research Agent
        </h1>
        <p className="text-xs text-[#81766B] mt-0.5">
          Autonomous internet intelligence sweep combining verified encyclopedic sources and search feeds.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-4 shadow-xs space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#81766B]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter subject or research question (e.g. 'Advances in Quantum Computing', 'Zero Trust Architecture')..."
              className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl pl-10 pr-4 py-3 text-xs text-[#29241F] placeholder-[#81766B] focus:outline-none focus:border-[#D97745]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-[#D97745] hover:bg-[#B95F38] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
          >
            {loading ? <Sparkles size={15} className="animate-spin" /> : <Globe size={15} />}
            <span>{loading ? "Synthesizing..." : "Conduct Sweep"}</span>
          </button>
        </form>

        {/* Query Presets */}
        <div className="flex flex-wrap gap-2 items-center text-[11px] text-[#81766B]">
          <span className="font-semibold text-[#29241F]">Preset Inquiries:</span>
          {[
            "Autonomous AI Agents",
            "Quantum Cryptography",
            "FastAPI Architecture",
            "Karnataka History"
          ].map((preset) => (
            <button
              key={preset}
              onClick={() => { setQuery(preset); handleSearch(preset); }}
              className="px-2.5 py-1 bg-[#EFE3D3] hover:bg-[#D97745] hover:text-white rounded-lg transition-colors cursor-pointer text-[#29241F]"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Report Display */}
      {loading ? (
        <div className="p-12 text-center bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F4E1D2] text-[#D97745] flex items-center justify-center mx-auto animate-pulse">
            <Globe size={24} />
          </div>
          <h3 className="text-sm font-bold text-[#29241F]">
            Browser Research Agent Sweeping Internet
          </h3>
          <p className="text-xs text-[#81766B] max-w-sm mx-auto">
            Extracting search results, resolving encyclopedic extracts, and compiling structured markdown...
          </p>
        </div>
      ) : report ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-6 shadow-xs space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#E8DCCD] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EFE3D3] text-[#D97745] flex items-center justify-center">
                <BookOpen size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#29241F]">
                  Intelligence Report: {report.topic}
                </h2>
                <span className="text-[11px] text-[#81766B]">
                  {report.sources_count} Verified Citation(s) Found
                </span>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCCD] bg-[#F8F1E7] hover:bg-[#EFE3D3] text-xs font-medium text-[#29241F] transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy Markdown"}</span>
            </button>
          </div>

          <div className="prose prose-sm max-w-none text-[#29241F] text-xs leading-relaxed space-y-3 whitespace-pre-wrap select-text">
            {report.report_markdown}
          </div>
        </motion.div>
      ) : (
        <div className="p-10 text-center bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl text-[#81766B] text-xs space-y-2">
          <Globe size={32} className="mx-auto text-[#D97745] opacity-60" />
          <p className="font-semibold text-[#29241F]">Ready for Research Task</p>
          <p>Type a topic above to dispatch the Browser Research Agent.</p>
        </div>
      )}
    </div>
  );
};

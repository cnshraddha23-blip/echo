import React, { useState, useEffect } from 'react';
import { Bot, Cpu, ShieldCheck, Zap, Activity, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Agent } from '../types';
import { api } from '../services/api';

interface AgentsPanelProps {
  agents: Agent[];
}

export const AgentsPanel: React.FC<AgentsPanelProps> = ({ agents }) => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'agents' | 'history'>('agents');

  useEffect(() => {
    api.getAgentExecutions().then(res => setExecutions(res || []));
  }, []);

  return (
    <div className="h-full flex flex-col p-8 bg-[#F8F1E7] overflow-y-auto max-w-6xl space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E8DCCD] pb-5">
        <div>
          <h1 className="font-serif-display text-2xl font-bold text-[#29241F]">
            Specialized AI Agents
          </h1>
          <p className="text-xs text-[#81766B] mt-0.5">
            Echo orchestrates 9 specialized intelligent agents equipped with validated tool calling.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-[#EFE3D3] border border-[#E8DCCD] rounded-xl p-0.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'agents' ? 'bg-[#D97745] text-white shadow-xs' : 'text-[#81766B] hover:text-[#29241F]'
            }`}
          >
            Active Agents ({agents.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-[#D97745] text-white shadow-xs' : 'text-[#81766B] hover:text-[#29241F]'
            }`}
          >
            Execution Logs ({executions.length})
          </button>
        </div>
      </div>

      {activeTab === 'agents' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              whileHover={{ y: -3 }}
              className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-[#D97745] transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F4E1D2] text-[#D97745] flex items-center justify-center font-bold text-xs font-mono">
                      {agent.code}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#29241F] leading-tight">
                        {agent.name}
                      </h3>
                      <span className="text-[11px] text-[#D97745] font-medium">
                        {agent.role}
                      </span>
                    </div>
                  </div>

                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                    Ready
                  </span>
                </div>

                <p className="text-xs text-[#81766B] leading-relaxed mb-4">
                  {agent.description}
                </p>
              </div>

              {/* Tools tag */}
              <div className="pt-3 border-t border-[#E8DCCD]">
                <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold text-[#81766B] uppercase tracking-wider">
                  <span>Equipped Tools</span>
                  <span>{agent.tools.length}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {agent.tools.map((t) => (
                    <span key={t} className="text-[10px] bg-[#EFE3D3] text-[#29241F] px-2 py-0.5 rounded font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-[#29241F] mb-2 flex items-center gap-2">
            <Activity size={16} className="text-[#D97745]" />
            <span>Recent Agent Dispatch Audit Trail</span>
          </h3>

          {executions.length === 0 ? (
            <p className="text-xs text-[#81766B] italic p-6 text-center">No agent executions recorded yet.</p>
          ) : (
            <div className="divide-y divide-[#E8DCCD] overflow-hidden">
              {executions.map((item) => (
                <div key={item.id} className="py-3 flex items-start justify-between text-xs gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#D97745] font-mono uppercase bg-[#F4E1D2] px-2 py-0.5 rounded">
                        {item.agent_name}
                      </span>
                      <span className="text-[#81766B] font-mono text-[11px]">{item.created_at}</span>
                    </div>
                    <p className="text-[#29241F] font-medium">Input: "{item.task_input}"</p>
                    <p className="text-[#81766B] text-[11px]">Output: {item.output_summary}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-[#81766B] flex items-center gap-1">
                      <Clock size={11} />
                      {item.execution_time_ms}ms
                    </span>
                    <CheckCircle2 size={14} className="text-green-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

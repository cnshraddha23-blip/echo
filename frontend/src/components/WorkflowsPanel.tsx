import React, { useState } from 'react';
import { Workflow as WorkflowIcon, Play, Plus, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Workflow } from '../types';
import { api } from '../services/api';

interface WorkflowsPanelProps {
  workflows: Workflow[];
  onRefresh: () => void;
}

export const WorkflowsPanel: React.FC<WorkflowsPanelProps> = ({
  workflows,
  onRefresh
}) => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWfName, setNewWfName] = useState('');
  const [newWfDesc, setNewWfDesc] = useState('');
  const [newWfTrigger, setNewWfTrigger] = useState('voice');

  const handleRunWorkflow = async (wf: Workflow) => {
    setRunningId(wf.id);
    setExecutionResult(null);
    try {
      const res = await api.executeWorkflow(wf.id);
      setExecutionResult(res);
      onRefresh();
    } catch (e) {
      console.error("Workflow execution error:", e);
    } finally {
      setRunningId(null);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWfName.trim()) return;
    try {
      await api.createWorkflow(
        newWfName.trim(),
        newWfDesc.trim(),
        [
          { action: "open_app", target: "calc", desc: "Launch tool" },
          { action: "get_tasks", desc: "Summarize pending items" }
        ],
        newWfTrigger
      );
      setShowCreateModal(false);
      setNewWfName('');
      setNewWfDesc('');
      onRefresh();
    } catch (e) {
      console.error("Create workflow error:", e);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 bg-[#F8F1E7] overflow-y-auto max-w-6xl space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E8DCCD] pb-5">
        <div>
          <h1 className="font-serif-display text-2xl font-bold text-[#29241F]">
            Automated Workflows
          </h1>
          <p className="text-xs text-[#81766B] mt-0.5">
            Sequential and conditional macro automations orchestrated across devices and applications.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#D97745] hover:bg-[#B95F38] text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus size={16} />
          <span>New Workflow</span>
        </button>
      </div>

      {/* Execution Progress Banner */}
      {executionResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-[#FFFDF9] border border-green-300 rounded-2xl shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700 font-bold text-xs">
              <CheckCircle2 size={16} />
              <span>Workflow "{executionResult.name}" Executed Successfully</span>
            </div>
            <button
              onClick={() => setExecutionResult(null)}
              className="text-xs text-[#81766B] hover:text-[#29241F] cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {(executionResult.steps || []).map((step: any, i: number) => (
              <div key={i} className="p-2.5 bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl text-xs space-y-1">
                <span className="font-mono text-[10px] text-[#D97745] uppercase">Step {i + 1}: {step.action}</span>
                <p className="text-[#29241F] font-medium text-[11px] truncate">{step.desc}</p>
                <span className="text-[10px] text-green-700 font-medium">Completed</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workflows.map((wf) => {
          const isRunning = runningId === wf.id;
          return (
            <div
              key={wf.id}
              className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-[#D97745] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F4E1D2] text-[#D97745] flex items-center justify-center">
                    <WorkflowIcon size={20} />
                  </div>
                  <span className="text-[10px] font-mono font-medium text-[#81766B] bg-[#EFE3D3] px-2 py-0.5 rounded-full uppercase">
                    {wf.trigger_type} trigger
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#29241F] mb-1">
                  {wf.name}
                </h3>
                <p className="text-xs text-[#81766B] leading-relaxed mb-4">
                  {wf.description}
                </p>

                {/* Steps sequence */}
                <div className="space-y-1 mb-4">
                  <span className="text-[10px] font-bold text-[#81766B] uppercase tracking-wider">
                    Pipeline Steps ({wf.steps.length})
                  </span>
                  <div className="space-y-1">
                    {wf.steps.map((st, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-[#29241F]">
                        <span className="w-4 h-4 rounded-full bg-[#EFE3D3] text-[#D97745] flex items-center justify-center text-[9px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{st.desc || st.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8DCCD] flex items-center justify-between">
                <span className="text-[10px] text-[#81766B] font-mono">
                  {wf.last_run ? `Last run: ${wf.last_run.slice(0, 10)}` : 'Ready to run'}
                </span>

                <button
                  disabled={isRunning}
                  onClick={() => handleRunWorkflow(wf)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D97745] hover:bg-[#B95F38] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Play size={13} />
                  <span>{isRunning ? "Executing..." : "Run"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Workflow Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-3xl p-7 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif-display text-lg font-bold text-[#29241F]">
                  Create Custom Workflow
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-[#81766B] hover:text-[#29241F] cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateWorkflow} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#29241F] mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={newWfName}
                    onChange={(e) => setNewWfName(e.target.value)}
                    placeholder="e.g. Presentation Mode"
                    className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-3 py-2 text-[#29241F] focus:outline-none focus:border-[#D97745]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#29241F] mb-1">Description</label>
                  <input
                    type="text"
                    value={newWfDesc}
                    onChange={(e) => setNewWfDesc(e.target.value)}
                    placeholder="What this workflow automates..."
                    className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-3 py-2 text-[#29241F] focus:outline-none focus:border-[#D97745]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#29241F] mb-1">Trigger Type</label>
                  <select
                    value={newWfTrigger}
                    onChange={(e) => setNewWfTrigger(e.target.value)}
                    className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-3 py-2 text-[#29241F] focus:outline-none focus:border-[#D97745]"
                  >
                    <option value="voice">Voice Command Trigger</option>
                    <option value="manual">Manual Button Trigger</option>
                    <option value="schedule">Scheduled Time Trigger</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-[#81766B] hover:text-[#29241F]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#D97745] hover:bg-[#B95F38] text-white font-semibold rounded-xl"
                  >
                    Save Workflow
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Eye, X, Play, Square, RefreshCw, CheckCircle2, AlertTriangle, 
  Layers, Crosshair, ArrowRight, Laptop, Sparkles, Terminal, ShieldAlert 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, socket } from '../services/api';
import { Device, VisualStep, ScreenAnalysis } from '../types';

interface VisualInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  activeLanguage: string;
}

export const VisualInteractionModal: React.FC<VisualInteractionModalProps> = ({
  isOpen,
  onClose,
  devices,
  activeLanguage
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('local');
  const [goalInput, setGoalInput] = useState<string>('Open YouTube and search for latest AI agent tutorials');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<string>('idle');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ScreenAnalysis | null>(null);
  const [steps, setSteps] = useState<VisualStep[]>([]);
  const [approvalRequest, setApprovalRequest] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to observe and interact with computer screen.');

  useEffect(() => {
    if (!isOpen) return;

    // Listen to real-time visual loop events from Socket.IO
    socket.on('visual_loop_started', (data) => {
      setIsExecuting(true);
      setCurrentStage('observe');
      setStatusMessage(`Starting visual loop: "${data.goal}"`);
      setSteps([]);
    });

    socket.on('visual_loop_step', (data) => {
      setCurrentStage(data.stage);
      if (data.screenshot_url) {
        setScreenshotUrl(data.screenshot_url);
      }
      if (data.detail) {
        setStatusMessage(data.detail);
      }
      setSteps(prev => {
        const existing = prev.findIndex(s => s.step === data.step);
        const newStep: VisualStep = {
          step: data.step,
          timestamp: Date.now(),
          stage: data.stage,
          screenshot_url: data.screenshot_url,
          planned_action: data.action
        };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], ...newStep };
          return updated;
        }
        return [...prev, newStep];
      });
    });

    socket.on('visual_loop_completed', (data) => {
      setIsExecuting(false);
      setCurrentStage('completed');
      setStatusMessage(data.message || 'Visual interaction cycle completed successfully.');
    });

    socket.on('approval_required', (data) => {
      setApprovalRequest(data);
    });

    socket.on('task_cancelled', () => {
      setIsExecuting(false);
      setCurrentStage('cancelled');
      setStatusMessage('Task was interrupted and cancelled.');
    });

    // Initial inspection on open
    handleInspect();

    return () => {
      socket.off('visual_loop_started');
      socket.off('visual_loop_step');
      socket.off('visual_loop_completed');
      socket.off('approval_required');
      socket.off('task_cancelled');
    };
  }, [isOpen]);

  const handleInspect = async () => {
    setCurrentStage('observe');
    setStatusMessage('Capturing screen for visual perception analysis...');
    try {
      const res = await api.inspectScreen(goalInput, selectedDeviceId === 'local' ? undefined : selectedDeviceId);
      if (res && res.success) {
        setScreenshotUrl(res.screenshot_url);
        setAnalysis(res.analysis);
        setCurrentStage('ready');
        setStatusMessage(`Active App: ${res.analysis?.active_application || 'Desktop'}. ${res.analysis?.screen_summary || ''}`);
      } else {
        setStatusMessage(`Perception notice: ${res.error || 'Using local screen stream.'}`);
      }
    } catch (e) {
      console.error("Inspect error:", e);
    }
  };

  const handleStartLoop = async () => {
    if (!goalInput.trim() || isExecuting) return;
    setIsExecuting(true);
    setApprovalRequest(null);
    setCurrentStage('observe');
    setSteps([]);
    try {
      const targetDev = selectedDeviceId === 'local' ? undefined : selectedDeviceId;
      await api.triggerVisualLoop(goalInput.trim(), 3, targetDev);
    } catch (e) {
      console.error("Visual loop error:", e);
      setIsExecuting(false);
    }
  };

  const handleCancel = async () => {
    socket.emit('cancel_task');
    await api.cancelVisualTask();
    setIsExecuting(false);
    setCurrentStage('cancelled');
    setStatusMessage('Visual operation cancelled.');
  };

  const handleApprove = () => {
    setApprovalRequest(null);
    setStatusMessage('Action authorized by user. Resuming execution...');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#29241F]/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8DCCD] flex items-center justify-between bg-[#F8F1E7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D97745] text-white flex items-center justify-center shadow-xs">
              <Eye size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-display text-lg font-bold text-[#29241F]">
                  Visual Computer Intelligence & Perception
                </h2>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D97745] bg-[#EFE3D3] px-2 py-0.5 rounded-full border border-[#E8DCCD]">
                  OBSERVE → UNDERSTAND → ACT
                </span>
              </div>
              <p className="text-xs text-[#81766B]">Real-time screen perception, UI element localization, and computer control loop</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Target Device Dropdown */}
            <div className="flex items-center gap-2 bg-[#FFFDF9] border border-[#E8DCCD] px-3 py-1.5 rounded-xl text-xs">
              <Laptop size={14} className="text-[#D97745]" />
              <select 
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-transparent font-medium text-[#29241F] focus:outline-none cursor-pointer"
              >
                <option value="local">Host Computer (Local)</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.os}) {d.status === 'online' ? '🟢' : '⚪'}
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={onClose}
              className="p-2 text-[#81766B] hover:text-[#29241F] hover:bg-[#EFE3D3] rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body: Split View */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Panel (7 Cols): Screen Viewport with Interactive Bounding Boxes */}
          <div className="lg:col-span-7 border-r border-[#E8DCCD] p-5 flex flex-col bg-[#121214] text-[#EDEDED] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 text-xs text-[#A1A1AA] border-b border-[#27272A] mb-3">
              <div className="flex items-center gap-2">
                <Crosshair size={14} className="text-[#D97745]" />
                <span>Observed Display Feed (1536 x 864)</span>
              </div>
              <button
                onClick={handleInspect}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#27272A] hover:bg-[#3F3F46] text-white text-[11px] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={currentStage === 'observe' ? 'animate-spin' : ''} />
                <span>Refresh Perception</span>
              </button>
            </div>

            {/* Screen Image Display Area */}
            <div className="relative flex-1 rounded-xl overflow-hidden border border-[#27272A] bg-[#18181B] flex items-center justify-center min-h-[340px]">
              {screenshotUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img 
                    src={screenshotUrl} 
                    alt="Active Screen" 
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                  {/* Render detected UI element bounding box overlays */}
                  {analysis?.detected_elements?.map((el) => {
                    const [ymin, xmin, ymax, xmax] = el.bbox;
                    const top = `${ymin * 100}%`;
                    const left = `${xmin * 100}%`;
                    const width = `${(xmax - xmin) * 100}%`;
                    const height = `${(ymax - ymin) * 100}%`;

                    return (
                      <div
                        key={el.id}
                        style={{ top, left, width, height }}
                        className="absolute border border-[#D97745] bg-[#D97745]/15 hover:bg-[#D97745]/30 rounded transition-colors group cursor-pointer"
                        title={`${el.type}: ${el.label}`}
                      >
                        <span className="absolute -top-4 left-0 bg-[#D97745] text-white text-[9px] font-mono px-1 rounded truncate max-w-[120px] opacity-0 group-hover:opacity-100 transition-opacity">
                          {el.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-6 text-[#71717A]">
                  <Layers size={36} className="mx-auto mb-2 text-[#52525B]" />
                  <p className="text-xs">Observing host screen...</p>
                </div>
              )}

              {/* Real-time execution stage pill */}
              <div className="absolute bottom-3 left-3 bg-[#121214]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#27272A] text-xs flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isExecuting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                <span className="font-mono text-[#FAFAFA] uppercase text-[11px]">{currentStage}</span>
                <span className="text-[#71717A]">|</span>
                <span className="text-[#A1A1AA] truncate max-w-[220px]">{analysis?.active_application || 'Desktop'}</span>
              </div>
            </div>

            {/* Detected Elements Tag Strip */}
            <div className="mt-3">
              <span className="text-[11px] font-semibold text-[#71717A] block mb-1.5">
                Identified Interactive Controls ({analysis?.detected_elements?.length || 0}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {analysis?.detected_elements?.map(el => (
                  <span 
                    key={el.id}
                    className="text-[10px] bg-[#27272A] text-[#D4D4D8] px-2 py-0.5 rounded border border-[#3F3F46]"
                  >
                    <strong className="text-[#D97745]">{el.type}</strong>: {el.label}
                  </span>
                )) || <span className="text-[11px] text-[#52525B] italic">No controls detected yet</span>}
              </div>
            </div>
          </div>

          {/* Right Panel (5 Cols): Execution Loop & Natural Language Task Input */}
          <div className="lg:col-span-5 p-6 flex flex-col bg-[#FFFDF9] overflow-y-auto space-y-5">
            {/* Task Prompt Input */}
            <div>
              <label className="block text-xs font-bold text-[#29241F] mb-1.5">
                Natural-Language Visual Task
              </label>
              <textarea
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g. Open YouTube, search for AI agent tutorials, and open the first result"
                className="w-full h-20 bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl p-3 text-xs text-[#29241F] focus:outline-none focus:border-[#D97745] resize-none"
                disabled={isExecuting}
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3">
              {!isExecuting ? (
                <button
                  onClick={handleStartLoop}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#D97745] hover:bg-[#B95F38] text-white rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Play size={15} />
                  <span>Execute Visual Loop</span>
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Square size={15} />
                  <span>Stop / Cancel Operation</span>
                </button>
              )}
            </div>

            {/* Approval Banner if sensitive action detected */}
            {approvalRequest && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold">
                  <ShieldAlert size={16} />
                  <span>Explicit Authorization Required</span>
                </div>
                <p className="text-amber-700 leading-relaxed">
                  Echo detected a sensitive action: <strong>{approvalRequest.action?.target_description}</strong>.
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    Deny
                  </button>
                  <button
                    onClick={handleApprove}
                    className="px-4 py-1 bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Confirm & Proceed
                  </button>
                </div>
              </div>
            )}

            {/* Status Feedback Pill */}
            <div className="p-3 bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl text-xs text-[#81766B]">
              <span className="font-semibold text-[#29241F] block mb-0.5">Live Status:</span>
              <span>{statusMessage}</span>
            </div>

            {/* Execution Steps Timeline */}
            <div className="flex-1">
              <h3 className="font-serif-display text-sm font-bold text-[#29241F] mb-3">
                Autonomous Execution Steps
              </h3>

              <div className="space-y-2.5">
                {steps.length === 0 ? (
                  <div className="text-xs text-[#81766B] italic p-4 text-center border border-dashed border-[#E8DCCD] rounded-2xl">
                    Steps will display here as Echo observes, plans, and acts on your computer interface.
                  </div>
                ) : (
                  steps.map((st) => (
                    <div 
                      key={st.step}
                      className="p-3.5 bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#D97745]">Step {st.step}</span>
                        <span className="uppercase font-mono text-[10px] text-[#81766B] bg-[#EFE3D3] px-2 py-0.5 rounded-full">
                          {st.stage}
                        </span>
                      </div>
                      {st.planned_action && (
                        <p className="text-xs text-[#29241F]">
                          Action: <strong>{st.planned_action.action?.toUpperCase()}</strong> on {st.planned_action.target_description}
                        </p>
                      )}
                      {st.verified && (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
                          <CheckCircle2 size={13} />
                          <span>Screen outcome verified</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

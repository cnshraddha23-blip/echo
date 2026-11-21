import React, { useState } from 'react';
import { 
  Laptop, Plus, RefreshCw, Trash2, CheckCircle2, 
  XCircle, Shield, Play, Terminal, Download, Copy, Check 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Device } from '../types';
import { api } from '../services/api';

interface DevicesPanelProps {
  devices: Device[];
  onRefresh: () => void;
  onRemoveDevice: (id: string) => void;
}

export const DevicesPanel: React.FC<DevicesPanelProps> = ({
  devices,
  onRefresh,
  onRemoveDevice
}) => {
  const [pairingModal, setPairingModal] = useState<{ open: boolean; code?: string; expires?: string }>({ open: false });
  const [loadingCode, setLoadingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string>('');
  const [isExecutingCmd, setIsExecutingCmd] = useState<string | null>(null);

  const handleGenerateCode = async () => {
    setLoadingCode(true);
    try {
      const res = await api.getPairingCode();
      setPairingModal({ open: true, code: res.pairing_code, expires: res.expires_at });
    } catch (e) {
      console.error("Pairing code error:", e);
    } finally {
      setLoadingCode(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleQuickCommand = async (deviceId: string, cmdType: string, payload: any) => {
    setIsExecutingCmd(deviceId);
    setCommandFeedback(`Dispatching '${cmdType}' to device...`);
    try {
      const res = await api.sendDeviceCommand(deviceId, cmdType, payload);
      if (res.success) {
        setCommandFeedback(`Success: Command executed by companion!`);
      } else {
        setCommandFeedback(`Reported: ${res.error || 'Failed to execute'}`);
      }
    } catch (e) {
      setCommandFeedback(`Error dispatching command.`);
    } finally {
      setIsExecutingCmd(null);
      setTimeout(() => setCommandFeedback(''), 4000);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 bg-[#F8F1E7] overflow-y-auto max-w-6xl space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E8DCCD] pb-5">
        <div>
          <h1 className="font-serif-display text-2xl font-bold text-[#29241F]">
            Connected Devices
          </h1>
          <p className="text-xs text-[#81766B] mt-0.5">
            Pair and manage computers running the authorized Echo Companion agent.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl border border-[#E8DCCD] bg-[#FFFDF9] hover:bg-[#EFE3D3] text-[#81766B] hover:text-[#29241F] transition-colors cursor-pointer"
            title="Refresh Devices"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={handleGenerateCode}
            disabled={loadingCode}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#D97745] hover:bg-[#B95F38] text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            <span>Pair New Device</span>
          </button>
        </div>
      </div>

      {/* Action feedback bar */}
      {commandFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 px-4 rounded-xl bg-[#FFFDF9] border border-[#D97745] text-xs font-medium text-[#29241F] flex items-center justify-between"
        >
          <span>{commandFeedback}</span>
        </motion.div>
      )}

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-[#F4E1D2] text-[#D97745] flex items-center justify-center mx-auto mb-3">
              <Laptop size={28} />
            </div>
            <h3 className="font-serif-display text-lg font-bold text-[#29241F] mb-1">
              No Devices Connected Yet
            </h3>
            <p className="text-xs text-[#81766B] max-w-md mx-auto mb-5 leading-relaxed">
              Install Echo Companion on your computer and pair it using an authenticated 6-digit code to enable remote desktop control.
            </p>
            <button
              onClick={handleGenerateCode}
              className="px-5 py-2.5 bg-[#D97745] hover:bg-[#B95F38] text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <Plus size={15} />
              <span>Generate Pairing Code</span>
            </button>
          </div>
        ) : (
          devices.map((device) => {
            const isOnline = device.status === 'online' || device.is_connected;
            return (
              <motion.div
                key={device.id}
                layout
                className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-[#D97745] transition-colors relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#EFE3D3] flex items-center justify-center text-[#D97745]">
                        <Laptop size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#29241F] leading-tight">
                          {device.name}
                        </h3>
                        <span className="text-[10px] text-[#81766B] font-mono">
                          {device.os} • v{device.companion_version || '2.0.0'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                         style={{
                           backgroundColor: isOnline ? '#DCFCE7' : '#F3F4F6',
                           color: isOnline ? '#15803D' : '#6B7280',
                           borderColor: isOnline ? '#BBF7D0' : '#E5E7EB'
                         }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`}></span>
                      <span>{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>

                  {/* Capabilities Tags */}
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[10px] font-bold text-[#81766B] uppercase tracking-wider">
                      Authorized Capabilities
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(device.capabilities || ["app_launch", "telemetry"]).map(cap => (
                        <span key={cap} className="text-[10px] bg-[#EFE3D3] text-[#29241F] px-2 py-0.5 rounded-md font-mono">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-[#E8DCCD] flex items-center justify-between">
                  {isOnline ? (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={isExecutingCmd === device.id}
                        onClick={() => handleQuickCommand(device.id, "launch_app", { app: "whatsapp" })}
                        className="px-2.5 py-1 bg-[#EFE3D3] hover:bg-[#D97745] hover:text-white text-[#29241F] text-[11px] font-medium rounded-lg transition-colors cursor-pointer"
                        title="Open WhatsApp on this device"
                      >
                        WhatsApp
                      </button>
                      <button
                        disabled={isExecutingCmd === device.id}
                        onClick={() => handleQuickCommand(device.id, "launch_app", { app: "code" })}
                        className="px-2.5 py-1 bg-[#EFE3D3] hover:bg-[#D97745] hover:text-white text-[#29241F] text-[11px] font-medium rounded-lg transition-colors cursor-pointer"
                        title="Open VS Code on this device"
                      >
                        VS Code
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#81766B] italic">Offline</span>
                  )}

                  <button
                    onClick={() => onRemoveDevice(device.id)}
                    className="p-1.5 text-[#81766B] hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                    title="Disconnect / Revoke Device"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Pairing Modal */}
      <AnimatePresence>
        {pairingModal.open && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-3xl p-7 max-w-md w-full shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#D97745] text-white flex items-center justify-center font-bold text-sm">
                    E
                  </div>
                  <h3 className="font-serif-display text-lg font-bold text-[#29241F]">
                    Pair Echo Companion
                  </h3>
                </div>
                <button
                  onClick={() => setPairingModal({ open: false })}
                  className="p-1 text-[#81766B] hover:text-[#29241F] cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="p-4 bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl text-center space-y-2">
                <span className="text-xs text-[#81766B] uppercase tracking-wider font-semibold">
                  Expiring 6-Digit Pairing Code
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-3xl font-extrabold tracking-widest text-[#D97745]">
                    {pairingModal.code}
                  </span>
                  <button
                    onClick={() => handleCopyCode(pairingModal.code || '')}
                    className="p-2 rounded-xl bg-[#EFE3D3] hover:bg-[#D97745] hover:text-white transition-colors cursor-pointer text-[#81766B]"
                    title="Copy Code"
                  >
                    {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-[#81766B]">
                  Valid for 10 minutes. Enter this code into your computer's Echo Companion.
                </p>
              </div>

              <div className="space-y-2 text-xs text-[#29241F] leading-relaxed">
                <p className="font-semibold text-[#D97745]">How to connect:</p>
                <ol className="list-decimal list-inside space-y-1 text-[#81766B]">
                  <li>Run <code className="bg-[#EFE3D3] px-1.5 py-0.5 rounded text-[#29241F]">companion/run_companion.bat</code> on your computer.</li>
                  <li>Click <b>Pair Device</b> in the Companion window.</li>
                  <li>Enter the 6-digit code shown above.</li>
                  <li>Your computer immediately registers as an online device.</li>
                </ol>
              </div>

              <button
                onClick={() => setPairingModal({ open: false })}
                className="w-full py-2.5 bg-[#D97745] hover:bg-[#B95F38] text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useState } from 'react';
import { XCircle, Lock, User as UserIcon, Mail, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register(username, password, displayName, email);
        if (res.success && res.token) {
          localStorage.setItem('echo_auth_token', res.token);
          onSuccess(res.user, res.token);
          onClose();
        } else {
          setErrorMsg(res.message || "Registration failed");
        }
      } else {
        const res = await api.login(username, password);
        if (res.success && res.token) {
          localStorage.setItem('echo_auth_token', res.token);
          onSuccess(res.user, res.token);
          onClose();
        } else {
          setErrorMsg(res.message || "Invalid username or password");
        }
      }
    } catch (e: any) {
      setErrorMsg("Network error contacting auth service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-3xl p-7 max-w-sm w-full shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D97745] to-[#B95F38] text-white flex items-center justify-center font-bold text-sm">
              E
            </div>
            <div>
              <h3 className="font-serif-display text-base font-bold text-[#29241F]">
                {isRegister ? "Create Echo Account" : "Sign In to Echo"}
              </h3>
              <p className="text-[10px] text-[#81766B]">Cloud Authentication & User Isolation</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-[#81766B] hover:text-[#29241F] cursor-pointer">
            <XCircle size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#29241F] mb-1">Username</label>
            <div className="relative">
              <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#81766B]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username (e.g. shivaraj)"
                className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl pl-9 pr-3 py-2 text-[#29241F] focus:outline-none focus:border-[#D97745]"
                required
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block font-semibold text-[#29241F] mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-3 py-2 text-[#29241F] focus:outline-none focus:border-[#D97745]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#29241F] mb-1">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#81766B]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl pl-9 pr-3 py-2 text-[#29241F] focus:outline-none focus:border-[#D97745]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold text-[#29241F] mb-1">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#81766B]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl pl-9 pr-3 py-2 text-[#29241F] focus:outline-none focus:border-[#D97745]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#D97745] hover:bg-[#B95F38] disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-xs cursor-pointer mt-2"
          >
            {loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#E8DCCD]">
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setErrorMsg(''); }}
            className="text-xs text-[#81766B] hover:text-[#D97745] font-medium cursor-pointer"
          >
            {isRegister ? "Already have an account? Sign In" : "Need an account? Register here"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

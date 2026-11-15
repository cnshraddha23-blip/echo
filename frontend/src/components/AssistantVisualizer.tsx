import React from 'react';
import { motion } from 'framer-motion';
import { AssistantVisualizerState } from '../types';

interface VisualizerProps {
  state: AssistantVisualizerState;
  size?: number;
  onMicClick?: () => void;
}

export const AssistantVisualizer: React.FC<VisualizerProps> = ({ state, size = 260, onMicClick }) => {
  // Color configuration according to palette
  // #D97745 (Primary accent), #B95F38 (Secondary accent), #F4E1D2 (Soft orange)
  
  const getGlowColor = () => {
    switch (state) {
      case 'listening': return 'rgba(217, 119, 69, 0.45)';
      case 'processing': return 'rgba(185, 95, 56, 0.5)';
      case 'speaking': return 'rgba(217, 119, 69, 0.6)';
      case 'error': return 'rgba(239, 68, 68, 0.5)';
      default: return 'rgba(217, 119, 69, 0.2)';
    }
  };

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      {/* Outer ambient glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          background: `radial-gradient(circle, ${getGlowColor()} 0%, transparent 70%)`,
        }}
        animate={{
          scale: state === 'listening' ? [1, 1.25, 1.05] : state === 'speaking' ? [1, 1.15, 1] : [1, 1.05, 1],
          opacity: state === 'idle' ? 0.35 : 0.8
        }}
        transition={{
          duration: state === 'processing' ? 1.5 : 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Outer Ring 1 - Dashed Orbital */}
      <motion.div
        className="absolute rounded-full border border-[#D97745]/30 border-dashed"
        style={{ width: size * 0.85, height: size * 0.85 }}
        animate={{
          rotate: 360,
          scale: state === 'listening' ? 1.08 : 1
        }}
        transition={{
          rotate: { duration: state === 'processing' ? 8 : 24, repeat: Infinity, ease: "linear" },
          scale: { duration: 0.4 }
        }}
      />

      {/* Middle Ring 2 - Solid Accent with micro-dots */}
      <motion.div
        className="absolute rounded-full border border-[#E8DCCD]"
        style={{ width: size * 0.68, height: size * 0.68 }}
        animate={{
          rotate: -360,
          scale: state === 'speaking' ? [1, 1.05, 0.98, 1.02] : 1
        }}
        transition={{
          rotate: { duration: 32, repeat: Infinity, ease: "linear" },
          scale: { duration: 1.2, repeat: Infinity }
        }}
      />

      {/* Active Waveform Rings for Speaking / Listening */}
      {state === 'speaking' && (
        <motion.div
          className="absolute rounded-full border-2 border-[#D97745]/60"
          style={{ width: size * 0.55, height: size * 0.55 }}
          animate={{
            scale: [1, 1.35, 1.5],
            opacity: [0.8, 0.4, 0]
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      )}

      {/* Core Sphere Button */}
      <motion.button
        onClick={onMicClick}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="relative z-10 rounded-full flex flex-col items-center justify-center cursor-pointer shadow-xl transition-all duration-300 focus:outline-none"
        style={{
          width: size * 0.45,
          height: size * 0.45,
          background: state === 'error'
            ? 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)'
            : state === 'listening'
            ? 'linear-gradient(135deg, #D97745 0%, #B95F38 100%)'
            : 'linear-gradient(135deg, #FFFDF9 0%, #F4E1D2 100%)',
          border: '2px solid #E8DCCD',
          boxShadow: '0 10px 25px -5px rgba(217, 119, 69, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Core State Display Icon / Wave */}
        {state === 'listening' ? (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
              <motion.div
                key={i}
                className="w-1 bg-white rounded-full"
                animate={{ height: [8, h * 6, 8] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08 }}
              />
            ))}
          </div>
        ) : state === 'speaking' ? (
          <div className="flex items-center gap-1">
            {[2, 4, 6, 8, 6, 4, 2].map((h, i) => (
              <motion.div
                key={i}
                className="w-1 bg-[#D97745] rounded-full"
                animate={{ height: [6, h * 4, 6] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.06 }}
              />
            ))}
          </div>
        ) : state === 'processing' ? (
          <motion.div
            className="w-8 h-8 rounded-full border-2 border-[#D97745] border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-serif-display text-xl font-bold text-[#B95F38] tracking-wider">
              ECHO
            </span>
            <span className="text-[10px] uppercase font-semibold text-[#81766B] tracking-widest mt-0.5">
              Ready
            </span>
          </div>
        )}
      </motion.button>
    </div>
  );
};

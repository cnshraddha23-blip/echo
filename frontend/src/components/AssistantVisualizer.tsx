import React from 'react';
import { motion } from 'framer-motion';
import { AssistantVisualizerState } from '../types';

interface VisualizerProps {
  state: AssistantVisualizerState;
  size?: number;
  onMicClick?: () => void;
}

export const AssistantVisualizer: React.FC<VisualizerProps> = ({ state, size = 260, onMicClick }) => {
  const getGlowColor = () => {
    switch (state) {
      case 'listening': return 'rgba(224, 122, 68, 0.65)';
      case 'processing': return 'rgba(200, 98, 47, 0.7)';
      case 'speaking': return 'rgba(224, 122, 68, 0.85)';
      case 'error': return 'rgba(239, 68, 68, 0.7)';
      default: return 'rgba(224, 122, 68, 0.3)';
    }
  };

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      {/* Outer ambient glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 1.1,
          height: size * 1.1,
          background: `radial-gradient(circle, ${getGlowColor()} 0%, transparent 68%)`,
        }}
        animate={{
          scale: state === 'listening' ? [1, 1.25, 1.08] : state === 'speaking' ? [1, 1.18, 1] : [1, 1.05, 1],
          opacity: state === 'idle' ? 0.45 : 0.95
        }}
        transition={{
          duration: state === 'processing' ? 1.4 : 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Outer Ring 1 - Dashed Orbital Ring */}
      <motion.div
        className="absolute rounded-full border border-[#E07A44]/40 border-dashed"
        style={{ width: size * 0.88, height: size * 0.88 }}
        animate={{
          rotate: 360,
          scale: state === 'listening' ? 1.06 : 1
        }}
        transition={{
          rotate: { duration: state === 'processing' ? 6 : 22, repeat: Infinity, ease: "linear" },
          scale: { duration: 0.3 }
        }}
      />

      {/* Middle Ring 2 - Amber Ring */}
      <motion.div
        className="absolute rounded-full border border-[#383029]"
        style={{ width: size * 0.72, height: size * 0.72 }}
        animate={{
          rotate: -360,
          scale: state === 'speaking' ? [1, 1.05, 0.98, 1.02] : 1
        }}
        transition={{
          rotate: { duration: 28, repeat: Infinity, ease: "linear" },
          scale: { duration: 1.2, repeat: Infinity }
        }}
      />

      {/* Active Waveform Rings for Speaking / Listening */}
      {state === 'speaking' && (
        <motion.div
          className="absolute rounded-full border-2 border-[#E07A44]/70"
          style={{ width: size * 0.58, height: size * 0.58 }}
          animate={{
            scale: [1, 1.35, 1.5],
            opacity: [0.9, 0.4, 0]
          }}
          transition={{
            duration: 1.3,
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
        className="relative z-10 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 focus:outline-none"
        style={{
          width: size * 0.46,
          height: size * 0.46,
          background: state === 'error'
            ? 'linear-gradient(135deg, #EF4444 0%, #991B1B 100%)'
            : state === 'listening'
            ? 'linear-gradient(135deg, #E07A44 0%, #C8622F 100%)'
            : 'linear-gradient(135deg, #2A241F 0%, #1A1613 100%)',
          border: '2px solid #383029',
          boxShadow: '0 10px 30px -5px rgba(224, 122, 68, 0.35), inset 0 1px 1px rgba(255,255,255,0.1)'
        }}
      >
        {/* State Display Icon / Wave */}
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
                className="w-1 bg-[#E07A44] rounded-full"
                animate={{ height: [6, h * 4, 6] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.06 }}
              />
            ))}
          </div>
        ) : state === 'processing' ? (
          <motion.div
            className="w-8 h-8 rounded-full border-2 border-[#E07A44] border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-serif-display text-xl font-bold text-[#E07A44] tracking-wider">
              ECHO
            </span>
            <span className="text-[10px] uppercase font-semibold text-[#A89C90] tracking-widest mt-0.5">
              Ready
            </span>
          </div>
        )}
      </motion.button>
    </div>
  );
};

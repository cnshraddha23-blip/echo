import React from 'react';
import { motion } from 'framer-motion';

interface KineticTextProps {
  text: string;
  className?: string;
  delay?: number;
  splitBy?: 'words' | 'characters';
}

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  className = '',
  delay = 0,
  splitBy = 'words'
}) => {
  if (splitBy === 'characters') {
    const chars = Array.from(text);
    return (
      <span className={`inline-block ${className}`} aria-label={text}>
        {chars.map((char, index) => (
          <motion.span
            key={`${char}-${index}`}
            initial={{ opacity: 0, y: 14, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 0.45,
              delay: delay + index * 0.025,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="inline-block"
            style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
            aria-hidden="true"
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </span>
    );
  }

  const words = text.split(' ');

  return (
    <span className={`inline-block ${className}`} aria-label={text}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden mr-[0.28em] align-top">
          <motion.span
            initial={{ opacity: 0, y: '100%', filter: 'blur(2px)' }}
            animate={{ opacity: 1, y: '0%', filter: 'blur(0px)' }}
            transition={{
              duration: 0.55,
              delay: delay + index * 0.06,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="inline-block"
            aria-hidden="true"
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
};

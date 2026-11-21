import React, { useState, useEffect, useRef } from 'react';

interface ScrambleTextProps {
  text: string;
  trigger?: any;
  className?: string;
  speed?: number;
  hoverScramble?: boolean;
}

const GLYPHS = 'アイウエオカキクケコサシスセソ0123456789ABCDEF!@#$%&*';

export const ScrambleText: React.FC<ScrambleTextProps> = ({
  text,
  trigger,
  className = '',
  speed = 35,
  hoverScramble = false
}) => {
  const [displayedText, setDisplayedText] = useState(text);
  const intervalRef = useRef<number | null>(null);
  const iterationRef = useRef<number>(0);

  const startScramble = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
    iterationRef.current = 0;

    intervalRef.current = window.setInterval(() => {
      setDisplayedText(() => {
        const result = text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iterationRef.current) {
              return text[index];
            }
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join('');

        iterationRef.current += 1 / 2;

        if (iterationRef.current >= text.length) {
          if (intervalRef.current !== null) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return text;
        }

        return result;
      });
    }, speed);
  };

  useEffect(() => {
    startScramble();
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [text, trigger]);

  const handleMouseEnter = () => {
    if (hoverScramble) {
      startScramble();
    }
  };

  return (
    <span
      className={`inline-block font-mono-decoding transition-colors ${className}`}
      onMouseEnter={handleMouseEnter}
      aria-label={text}
    >
      {displayedText}
    </span>
  );
};

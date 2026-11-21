import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export const CustomCursor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isTextHover, setIsTextHover] = useState(false);

  // Position motion values for real-time responsiveness
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Spring physics for trailing follower
  const springConfig = { damping: 26, stiffness: 290, mass: 0.45 };
  const followerX = useSpring(mouseX, springConfig);
  const followerY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Only enable custom cursor if fine pointer (desktop mouse) is detected
    const mediaQuery = window.matchMedia('(pointer: fine)');
    if (!mediaQuery.matches) return;

    document.documentElement.classList.add('has-custom-cursor');

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      // Check hovered element
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest(
          'button, a, [role="button"], input[type="submit"], input[type="button"], select, .cursor-pointer'
        );
        const textElement = target.closest('input[type="text"], textarea, [contenteditable="true"]');

        setIsHovered(!!interactive && !textElement);
        setIsTextHover(!!textElement);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isVisible, mouseX, mouseY]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none">
      {/* 1. Outer Smooth Follower Ring */}
      <motion.div
        style={{
          x: followerX,
          y: followerY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isClicking ? 0.75 : isHovered ? 1.65 : isTextHover ? 0.4 : 1,
          opacity: isVisible ? (isTextHover ? 0.35 : 0.85) : 0,
          backgroundColor: isHovered ? 'rgba(194, 112, 56, 0.15)' : 'rgba(194, 112, 56, 0.05)',
          borderColor: isHovered ? 'rgba(194, 112, 56, 0.9)' : 'rgba(194, 112, 56, 0.45)',
        }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-9 h-9 rounded-full border border-[#C27038] shadow-xs backdrop-blur-[0.5px]"
      />

      {/* 2. Inner Central Crisp Dot */}
      <motion.div
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isClicking ? 0.6 : isHovered ? 0.4 : 1,
          opacity: isVisible ? (isTextHover ? 0.2 : 1) : 0,
        }}
        transition={{ duration: 0.1, ease: 'easeOut' }}
        className="w-2 h-2 rounded-full bg-[#C27038] shadow-xs"
      />
    </div>
  );
};

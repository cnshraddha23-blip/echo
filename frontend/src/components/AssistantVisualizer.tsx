import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { AssistantVisualizerState } from '../types';
import { Mic, MicOff, Volume2, Sparkles, Activity } from 'lucide-react';

interface VisualizerProps {
  state: AssistantVisualizerState;
  size?: number;
  onMicClick?: () => void;
  className?: string;
}

export const AssistantVisualizer: React.FC<VisualizerProps> = ({ 
  state, 
  size = 280, 
  onMicClick,
  className = ""
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);

  // Colors matching warm luxury palette:
  // Primary Ochre: #D97745 (0xd97745)
  // Accent Rust: #B95F38 (0xb95f38)
  // Deep Warm Charcoal: #29241F (0x29241f)
  // Cream Warm White: #F8F1E7 (0xf8f1e7)
  const getPaletteColor = (st: AssistantVisualizerState) => {
    switch (st) {
      case 'listening': return { primary: 0xd97745, secondary: 0xe88a58, speed: 2.2 };
      case 'speaking': return { primary: 0xb95f38, secondary: 0xd97745, speed: 2.8 };
      case 'thinking':
      case 'processing': return { primary: 0xd97745, secondary: 0xa84a25, speed: 3.5 };
      case 'error': return { primary: 0xef4444, secondary: 0xb91c1c, speed: 1.5 };
      case 'offline': return { primary: 0x81766b, secondary: 0xa89f91, speed: 0.5 };
      default: return { primary: 0xd97745, secondary: 0xb95f38, speed: 1.0 };
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let particles: THREE.Points;
    let ringMesh1: THREE.LineLoop;
    let ringMesh2: THREE.LineLoop;
    let ringMesh3: THREE.LineLoop;
    let animationFrameId: number;

    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.z = 180;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(size, size);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // 1. 3D Particle Cloud Sphere
      const particleCount = 280;
      const positions = new Float32Array(particleCount * 3);
      const originalPositions = new Float32Array(particleCount * 3);
      const baseRadius = 46;

      for (let i = 0; i < particleCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = baseRadius * (0.88 + Math.random() * 0.24);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        originalPositions[i * 3] = x;
        originalPositions[i * 3 + 1] = y;
        originalPositions[i * 3 + 2] = z;
      }

      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // Particle texture/material
      const particleMat = new THREE.PointsMaterial({
        color: 0xd97745,
        size: 3.2,
        transparent: true,
        opacity: 0.85,
        blending: THREE.NormalBlending
      });
      particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      // 2. Orbital Rings
      const createOrbitRing = (radius: number, color: number, tiltX: number, tiltY: number) => {
        const segments = 64;
        const pts = [];
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.45,
          linewidth: 1
        });
        const line = new THREE.LineLoop(geo, mat);
        line.rotation.x = tiltX;
        line.rotation.y = tiltY;
        return line;
      };

      ringMesh1 = createOrbitRing(60, 0xd97745, Math.PI / 3, Math.PI / 6);
      ringMesh2 = createOrbitRing(68, 0xb95f38, -Math.PI / 4, Math.PI / 4);
      ringMesh3 = createOrbitRing(54, 0x81766b, Math.PI / 6, -Math.PI / 3);
      scene.add(ringMesh1);
      scene.add(ringMesh2);
      scene.add(ringMesh3);

      // Animation Loop
      let clock = new THREE.Clock();
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();
        const cfg = getPaletteColor(state);

        // Update colors based on active state
        particleMat.color.setHex(cfg.primary);
        (ringMesh1.material as THREE.LineBasicMaterial).color.setHex(cfg.primary);
        (ringMesh2.material as THREE.LineBasicMaterial).color.setHex(cfg.secondary);

        // Rotate particle cloud
        particles.rotation.y = elapsedTime * 0.4 * cfg.speed;
        particles.rotation.x = Math.sin(elapsedTime * 0.3) * 0.2;

        // Dynamic vertex audio-waveform displacement
        const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;

        const pulseScale = state === 'listening' ? 1.25 + Math.sin(elapsedTime * 6) * 0.15 :
                           state === 'speaking' ? 1.2 + Math.sin(elapsedTime * 8) * 0.2 :
                           state === 'processing' || state === 'thinking' ? 1.1 + Math.sin(elapsedTime * 10) * 0.08 :
                           1.0 + Math.sin(elapsedTime * 1.5) * 0.04;

        for (let i = 0; i < particleCount; i++) {
          const idx = i * 3;
          const ox = originalPositions[idx];
          const oy = originalPositions[idx + 1];
          const oz = originalPositions[idx + 2];

          // Wave displacement
          const wave = Math.sin(elapsedTime * 4 + ox * 0.05) * Math.cos(elapsedTime * 3 + oy * 0.05);
          const factor = pulseScale + (state === 'speaking' || state === 'listening' ? wave * 0.12 : wave * 0.03);

          posArray[idx] = ox * factor;
          posArray[idx + 1] = oy * factor;
          posArray[idx + 2] = oz * factor;
        }
        posAttr.needsUpdate = true;

        // Rotate rings with differential velocities
        ringMesh1.rotation.z += 0.012 * cfg.speed;
        ringMesh2.rotation.z -= 0.018 * cfg.speed;
        ringMesh3.rotation.z += 0.008 * cfg.speed;

        ringMesh1.rotation.x += 0.004 * cfg.speed;
        ringMesh2.rotation.y += 0.005 * cfg.speed;

        renderer.render(scene, camera);
      };

      animate();
    } catch (e) {
      console.warn("WebGL initialization failed, falling back to SVG/CSS visualizer:", e);
      setWebGlSupported(false);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, [size, state]);

  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`} 
      style={{ width: size, height: size }}
    >
      {/* Three.js Canvas Mount */}
      {webGlSupported ? (
        <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" />
      ) : (
        /* Fallback SVG orbit */
        <motion.div 
          className="absolute inset-0 rounded-full border-2 border-[#D97745]/30 border-dashed"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Central Glassmorphic Interaction Core */}
      <motion.button
        type="button"
        onClick={onMicClick}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className={`relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-lg border backdrop-blur-md ${
          state === 'listening'
            ? 'bg-[#D97745] text-white border-[#B95F38] shadow-[#D97745]/40 animate-pulse'
            : state === 'speaking'
            ? 'bg-[#B95F38] text-white border-[#D97745] shadow-[#B95F38]/40 ring-4 ring-[#D97745]/30'
            : state === 'thinking' || state === 'processing'
            ? 'bg-[#F8F1E7] text-[#D97745] border-[#D97745]'
            : 'bg-[#FFFDF9]/90 text-[#29241F] border-[#E8DCCD] hover:border-[#D97745] hover:shadow-md'
        }`}
        title={state === 'listening' ? "Listening... Click to stop" : "Click to speak with Echo"}
      >
        {state === 'listening' ? (
          <Mic size={26} className="text-white animate-bounce" />
        ) : state === 'speaking' ? (
          <Volume2 size={26} className="text-white animate-pulse" />
        ) : state === 'thinking' || state === 'processing' ? (
          <Sparkles size={24} className="text-[#D97745] animate-spin" />
        ) : (
          <Mic size={24} className="text-[#D97745]" />
        )}
        <span className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-80">
          {state === 'listening' ? "Rec" : state === 'speaking' ? "Voice" : state === 'processing' ? "Proc" : "Echo"}
        </span>
      </motion.button>
    </div>
  );
};

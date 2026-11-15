import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AssistantVisualizerState } from '../types';

interface Echo3DVisualizerProps {
  state: AssistantVisualizerState;
  onOrbClick: () => void;
}

export const Echo3DVisualizer: React.FC<Echo3DVisualizerProps> = ({ state, onOrbClick }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<AssistantVisualizerState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = 340;
    const height = 340;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lighting - Editorial Warm Aesthetic
    const ambientLight = new THREE.AmbientLight(0xfffdf9, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xd97745, 2.5); // Burnt orange
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xb95f38, 1.8); // Terracotta
    dirLight2.position.set(-5, -3, 2);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xf4e1d2, 2.0, 10);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // 3. Central Core: High-gloss iridescent pearlescent orb
    const coreGeometry = new THREE.SphereGeometry(1.05, 64, 64);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfffdf9,
      emissive: 0xd97745,
      emissiveIntensity: 0.15,
      roughness: 0.12,
      metalness: 0.1,
      transmission: 0.45,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 4. Outer Torus Ring 1 (Burnt orange orbital ring)
    const torus1Geo = new THREE.TorusGeometry(1.65, 0.022, 16, 100);
    const torus1Mat = new THREE.MeshStandardMaterial({
      color: 0xd97745,
      metalness: 0.7,
      roughness: 0.2,
      emissive: 0xb95f38,
      emissiveIntensity: 0.2
    });
    const torus1 = new THREE.Mesh(torus1Geo, torus1Mat);
    torus1.rotation.x = Math.PI / 3;
    scene.add(torus1);

    // 5. Outer Torus Ring 2 (Beige/Gold inclined ring)
    const torus2Geo = new THREE.TorusGeometry(1.85, 0.015, 16, 100);
    const torus2Mat = new THREE.MeshStandardMaterial({
      color: 0xe8dccd,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xd97745,
      emissiveIntensity: 0.1
    });
    const torus2 = new THREE.Mesh(torus2Geo, torus2Mat);
    torus2.rotation.y = Math.PI / 4;
    scene.add(torus2);

    // 6. Particle Halo (Warm amber floating stars)
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 1.9 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      positions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      positions[i * 3 + 1] = radius * Math.sin(phi);
      positions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xd97745,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 7. Interactive Raycasting for 3D Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([coreMesh, torus1, torus2]);
      if (intersects.length > 0) {
        onOrbClick();
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    // 8. Animation Loop
    let clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const currentState = stateRef.current;

      // Dynamics based on assistant state
      let speedMultiplier = 1.0;
      let scaleTarget = 1.0;
      let emissiveIntensity = 0.2;

      if (currentState === 'listening') {
        speedMultiplier = 2.2;
        scaleTarget = 1.08 + Math.sin(elapsedTime * 6) * 0.06;
        emissiveIntensity = 0.6;
        coreMaterial.emissive.setHex(0xd97745);
      } else if (currentState === 'speaking') {
        speedMultiplier = 2.5;
        scaleTarget = 1.05 + Math.sin(elapsedTime * 10) * 0.08;
        emissiveIntensity = 0.7;
        coreMaterial.emissive.setHex(0xb95f38);
      } else if (currentState === 'processing') {
        speedMultiplier = 3.5;
        scaleTarget = 0.96 + Math.sin(elapsedTime * 4) * 0.04;
        emissiveIntensity = 0.45;
        coreMaterial.emissive.setHex(0xd97745);
      } else if (currentState === 'error') {
        speedMultiplier = 0.5;
        scaleTarget = 1.0;
        emissiveIntensity = 0.8;
        coreMaterial.emissive.setHex(0xef4444);
      } else {
        // Idle gentle breathing
        speedMultiplier = 0.8;
        scaleTarget = 1.0 + Math.sin(elapsedTime * 1.5) * 0.025;
        emissiveIntensity = 0.18;
        coreMaterial.emissive.setHex(0xd97745);
      }

      // Smooth interpolation
      coreMesh.scale.lerp(new THREE.Vector3(scaleTarget, scaleTarget, scaleTarget), 0.1);
      coreMaterial.emissiveIntensity = THREE.MathUtils.lerp(coreMaterial.emissiveIntensity, emissiveIntensity, 0.08);

      // Core rotation
      coreMesh.rotation.y = elapsedTime * 0.25 * speedMultiplier;
      coreMesh.rotation.x = Math.sin(elapsedTime * 0.2) * 0.15;

      // Orbiting Rings
      torus1.rotation.z += 0.012 * speedMultiplier;
      torus1.rotation.y += 0.008 * speedMultiplier;

      torus2.rotation.x += 0.01 * speedMultiplier;
      torus2.rotation.z -= 0.007 * speedMultiplier;

      // Particle halo slow drift
      particles.rotation.y = elapsedTime * 0.04 * speedMultiplier;
      particles.rotation.x = Math.sin(elapsedTime * 0.05) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onOrbClick]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none cursor-pointer group" onClick={onOrbClick}>
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-[340px] h-[340px] flex items-center justify-center pointer-events-auto" />

      {/* Floating 3D Badge Overlay */}
      <div className="absolute bottom-4 px-4 py-1.5 rounded-full bg-[#FFFDF9]/85 backdrop-blur-md border border-[#E8DCCD] shadow-xs flex items-center gap-2 group-hover:border-[#D97745] transition-all">
        <span className="font-serif-display text-xs font-bold text-[#29241F] tracking-widest uppercase">
          ECHO 3D CORE
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#D97745] animate-ping" />
      </div>
    </div>
  );
};

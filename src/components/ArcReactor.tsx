import React, { useEffect, useRef, useState } from 'react';
import { AssistantState, DesktopActionDetail } from '../types';

interface ArcReactorProps {
  state: AssistantState;
  audioLevel: number; // 0 to 1
  onClick?: () => void;
  intensity?: number; // 1 to 100
  animationSpeed?: number; // 0.5 to 2
  activeActionLabel?: string;
  desktopAction?: DesktopActionDetail | null;
  reducedMotion?: boolean;
}

export const ArcReactor: React.FC<ArcReactorProps> = ({
  state,
  audioLevel,
  onClick,
  intensity = 85,
  animationSpeed = 1,
  activeActionLabel,
  desktopAction,
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // 3D Parallax offset for desktop mouse interaction
  const [parallax, setParallax] = useState({ x: 0, y: 0, rx: 0, ry: 0 });

  // Rotating angle states for multiple mechanical and energy rings
  const [rotRing1, setRotRing1] = useState(0); // Outer HUD ring
  const [rotRing2, setRotRing2] = useState(0); // Counter-rotating energy track
  const [rotRing3, setRotRing3] = useState(0); // Inner aperture ring
  const [rotRing4, setRotRing4] = useState(0); // Sub-mechanical gear ring

  // Canvas particles, arcs, and shockwave state
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    radius: number;
    angle: number;
    distance: number;
    speed: number;
    color: string;
    opacity: number;
  }>>([]);

  const shockwavesRef = useRef<Array<{
    radius: number;
    maxRadius: number;
    opacity: number;
    speed: number;
    color: string;
  }>>([]);

  // State flags
  const isIdle = state === 'idle';
  const isListening = state === 'listening';
  const isUnderstanding = state === 'understanding';
  const isThinking = state === 'thinking';
  const isGenerating = state === 'generating';
  const isSpeaking = state === 'speaking';
  const isInterrupted = state === 'interrupted';
  const isExecuting = state === 'executing';
  const isSuccess = state === 'success';
  const isError = state === 'error';
  const isSearching = isThinking || isExecuting;

  // Primary holographic energy color palette
  const primaryColor = isError
    ? '#f87171'
    : isSuccess
    ? '#10b981'
    : isInterrupted
    ? '#f59e0b'
    : isListening
    ? '#00f0ff'
    : isThinking || isGenerating || isExecuting
    ? '#38bdf8'
    : '#00f0ff';

  const secondaryColor = isError
    ? '#fb923c'
    : isSuccess
    ? '#059669'
    : isListening
    ? '#38bdf8'
    : isThinking
    ? '#0284c7'
    : '#0891b2';

  const coreGlow = isError
    ? 'rgba(248, 113, 113, 0.95)'
    : isSuccess
    ? 'rgba(16, 185, 129, 0.95)'
    : isListening
    ? 'rgba(0, 240, 255, 1)'
    : isSpeaking
    ? 'rgba(0, 240, 255, 1)'
    : isThinking || isGenerating
    ? 'rgba(56, 189, 248, 0.95)'
    : 'rgba(0, 240, 255, 0.8)';

  // Calculate speed multipliers based on state
  let speedMultiplier = 1;
  if (isThinking || isExecuting || isGenerating) speedMultiplier = 3.5;
  else if (isSpeaking) speedMultiplier = 1.8;
  else if (isListening) speedMultiplier = 1.4;
  else if (isHovered) speedMultiplier = 1.25;

  if (reducedMotion) speedMultiplier = 0.2;

  // Desktop subtle mouse parallax tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({
      x: nx * 18,
      y: ny * 18,
      rx: -ny * 12,
      ry: nx * 12,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setParallax({ x: 0, y: 0, rx: 0, ry: 0 });
  };

  // Continuous animation frame loop for multi-layered mechanical & energy rings
  useEffect(() => {
    let animId: number;
    let lastTime: number | null = null;

    const updateRings = (time: number) => {
      if (lastTime === null) lastTime = time;
      const delta = Math.max(0, Math.min((time - lastTime) / 1000, 0.1));
      lastTime = time;

      const rate = animationSpeed * speedMultiplier;
      setRotRing1((prev) => (prev + 10 * rate * delta) % 360);
      setRotRing2((prev) => (prev - 16 * rate * delta + 360) % 360);
      setRotRing3((prev) => (prev + 26 * rate * delta) % 360);
      setRotRing4((prev) => (prev - 8 * rate * delta + 360) % 360);

      // Trigger shockwaves during speaking or high mic level
      if ((isSpeaking || isListening) && audioLevel > 0.3 && Math.random() < 0.25) {
        shockwavesRef.current.push({
          radius: 40,
          maxRadius: 210,
          opacity: 0.9,
          speed: 180 + audioLevel * 140,
          color: primaryColor,
        });
      }

      animId = requestAnimationFrame(updateRings);
    };

    animId = requestAnimationFrame(updateRings);
    return () => cancelAnimationFrame(animId);
  }, [animationSpeed, speedMultiplier, isSpeaking, isListening, audioLevel, primaryColor, reducedMotion]);

  // Canvas particle, lightning, and circular audio visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize particles: when thinking, particles pull inward to center
    const particleCount = isThinking || isExecuting ? 60 : 32;
    if (particlesRef.current.length === 0 || particlesRef.current.length !== particleCount) {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: 0,
        y: 0,
        radius: Math.random() * 2.2 + 1,
        angle: Math.random() * Math.PI * 2,
        distance: 50 + Math.random() * 125,
        speed: (Math.random() * 0.9 + 0.4) * (Math.random() > 0.5 ? 1 : -1),
        color: Math.random() > 0.3 ? primaryColor : '#ffffff',
        opacity: Math.random() * 0.7 + 0.3,
      }));
    }

    let canvasAnimId: number;
    let lastRenderTime: number | null = null;

    const render = (time: number) => {
      if (lastRenderTime === null) lastRenderTime = time;
      const delta = Math.max(0, Math.min((time - lastRenderTime) / 1000, 0.1));
      lastRenderTime = time;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // 1. Shockwaves expanding outwards from energy core
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.radius += Math.max(0, sw.speed * delta);
        sw.opacity = Math.max(0, 0.85 * (1 - sw.radius / sw.maxRadius));

        if (sw.radius <= 0 || sw.radius >= sw.maxRadius || sw.opacity <= 0.01) {
          shockwavesRef.current.splice(i, 1);
          continue;
        }

        const safeRadius = Math.max(0.1, sw.radius);
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, safeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2.5 * sw.opacity;
        ctx.globalAlpha = sw.opacity;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
      }

      // 2. High-Fidelity Circular Audio Visualizer around the reactor (Hundreds of radial bars)
      const numBars = 72;
      const baseRadius = 168;
      const waveAmp = (audioLevel * 36 + (isSpeaking ? 14 : isListening ? 10 : 3)) * (intensity / 100);

      ctx.save();
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 8;

      for (let i = 0; i < numBars; i++) {
        const theta = (i / numBars) * Math.PI * 2 + (rotRing1 * Math.PI) / 180;
        // Pseudo-harmonic audio spectrum calculation
        const harmonic = Math.sin(i * 4 + time * 0.007) * Math.cos(i * 2 - time * 0.005);
        const barHeight = Math.max(3, Math.abs(harmonic) * waveAmp + (isListening ? audioLevel * 24 : isSpeaking ? audioLevel * 30 : 2));

        const x1 = centerX + Math.cos(theta) * baseRadius;
        const y1 = centerY + Math.sin(theta) * baseRadius;
        const x2 = centerX + Math.cos(theta) * (baseRadius + barHeight);
        const y2 = centerY + Math.sin(theta) * (baseRadius + barHeight);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = i % 2 === 0 ? primaryColor : secondaryColor;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = 0.65 + (audioLevel > 0.05 ? audioLevel * 0.35 : 0);
        ctx.stroke();

        // Tip node for major indices
        if (i % 6 === 0) {
          ctx.beginPath();
          ctx.arc(x2, y2, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }
      ctx.restore();

      // 3. Orbiting Energy Particles (When processing: animate toward center)
      if (!reducedMotion) {
        particlesRef.current.forEach((p) => {
          if (isThinking || isExecuting) {
            // Animate particles spiraling toward center
            p.distance -= 24 * delta;
            if (p.distance < 35) p.distance = 150 + Math.random() * 20;
          } else {
            // Natural circular orbit
            p.distance += Math.sin(time * 0.002 + p.angle) * 0.2;
          }

          p.angle += p.speed * delta * (isThinking || isExecuting ? 3.2 : 1);
          const px = centerX + Math.cos(p.angle) * p.distance;
          const py = centerY + Math.sin(p.angle) * p.distance;

          const pRadius = Math.max(0.1, p.radius * (isThinking ? 1.3 : 1));
          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, pRadius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity * (intensity / 100);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.restore();
        });
      }

      // 4. Plasma Lightning Arcs during Neural Processing
      if ((isThinking || isExecuting || isGenerating) && Math.random() < 0.4) {
        ctx.save();
        ctx.strokeStyle = '#e6ffff';
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.9;

        const startAngle = Math.random() * Math.PI * 2;
        const r1 = 40;
        const r2 = 135;
        let curX = centerX + Math.cos(startAngle) * r1;
        let curY = centerY + Math.sin(startAngle) * r1;

        ctx.beginPath();
        ctx.moveTo(curX, curY);

        const segments = 5;
        for (let s = 1; s <= segments; s++) {
          const t = s / segments;
          const targetR = r1 + (r2 - r1) * t;
          const jitterAngle = startAngle + (Math.random() - 0.5) * 0.5;
          curX = centerX + Math.cos(jitterAngle) * targetR;
          curY = centerY + Math.sin(jitterAngle) * targetR;
          ctx.lineTo(curX, curY);
        }
        ctx.stroke();
        ctx.restore();
      }

      canvasAnimId = requestAnimationFrame(render);
    };

    canvasAnimId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(canvasAnimId);
  }, [
    state,
    audioLevel,
    intensity,
    isListening,
    isSpeaking,
    isThinking,
    isExecuting,
    isGenerating,
    primaryColor,
    secondaryColor,
    rotRing1,
    reducedMotion,
  ]);

  // State Title & Subtitle labels according to Section 5
  let stateTitle = 'JARVIS SYSTEM READY';
  let stateSub = 'MARK LXXXV // CLEAN POWER STABLE';

  if (isListening) {
    stateTitle = 'VOICE INPUT DETECTED';
    stateSub = 'AUDIO STREAM CAPTURE ACTIVE';
  } else if (isThinking || isUnderstanding) {
    stateTitle = 'NEURAL PROCESSING';
    stateSub = 'ANALYZING REQUEST // ACCESSING AI CORE';
  } else if (isExecuting) {
    stateTitle = activeActionLabel ? activeActionLabel.toUpperCase() : 'EXTERNAL DATA ACCESS';
    stateSub = 'PROTOCOL DISPATCHED // REAL-TIME EXECUTION';
  } else if (isSpeaking) {
    stateTitle = 'VOICE OUTPUT ACTIVE';
    stateSub = 'JARVIS // SPEAKING';
  } else if (isInterrupted) {
    stateTitle = 'DIRECTIVE INTERRUPTED';
    stateSub = 'VOCAL STREAM CLEARED // LISTENING ARMED';
  } else if (isSuccess) {
    stateTitle = 'COMMAND COMPLETE';
    stateSub = 'EXECUTION PARAMETERS VERIFIED';
  } else if (isError) {
    stateTitle = 'SYSTEM ANOMALY';
    stateSub = 'DIAGNOSTIC EXCEPTION LOGGED';
  }

  // 10 Segments of Copper Inductor Coils (Classic Mark I & II Iron Man Reactor design)
  const coilSegments = Array.from({ length: 10 }, (_, i) => {
    const angle = (i * 36) - 90;
    return { id: i, angle };
  });

  // Numbers for HUD Ring (Section 2, Layer 2: 01 04 08 12 16 24 32...)
  const hudNumbers = ['01', '04', '08', '12', '16', '24', '32', '48'];

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${parallax.rx}deg) rotateY(${parallax.ry}deg)`,
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
      }}
    >
      {/* Surrounding HUD Technical Markers (Header Bracket) */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] font-mono-tech tracking-widest text-cyan-400/80 whitespace-nowrap pointer-events-none z-20">
        <span className="text-cyan-500/80">[ RAD-AZIMUTH 342.19° ]</span>
        <span className="text-cyan-400 font-bold">//</span>
        <span className="text-cyan-300 font-semibold">[ ARC-PWR 98.7% ]</span>
        <span className="text-cyan-400 font-bold">//</span>
        <span className="text-cyan-500/80">[ SEC: 07 ]</span>
      </div>

      {/* Flank HUD Status Badges (Left & Right) */}
      <div className="hidden xl:flex absolute -left-24 top-1/2 -translate-y-1/2 flex-col gap-2 text-[10px] font-mono-tech text-cyan-400/70 pointer-events-none z-20">
        <div className="hud-panel px-2.5 py-1.5 border-cyan-500/30 text-cyan-300">
          <div className="text-[8px] text-cyan-500">SYS_STATUS</div>
          <div className="font-bold">{state.toUpperCase()}</div>
        </div>
        <div className="hud-panel px-2.5 py-1.5 border-cyan-500/30 text-cyan-400/90">
          <div className="text-[8px] text-cyan-500">QUANTUM LINK</div>
          <div>SYNCHRONIZED</div>
        </div>
      </div>

      <div className="hidden xl:flex absolute -right-24 top-1/2 -translate-y-1/2 flex-col gap-2 text-[10px] font-mono-tech text-cyan-400/70 pointer-events-none z-20">
        <div className="hud-panel px-2.5 py-1.5 border-cyan-500/30 text-cyan-300">
          <div className="text-[8px] text-cyan-500">VOICE MATRIX</div>
          <div className="font-bold">{isListening ? 'STREAM CAPTURE' : isSpeaking ? 'VOCAL TX' : 'ARMED'}</div>
        </div>
        <div className="hud-panel px-2.5 py-1.5 border-cyan-500/30 text-cyan-400/90">
          <div className="text-[8px] text-cyan-500">POWER DRAW</div>
          <div>3.42 GW PEAK</div>
        </div>
      </div>

      {/* Main Reactor Interactive Hardware Body */}
      <div
        onClick={onClick}
        className={`relative w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[460px] md:h-[460px] lg:w-[500px] lg:h-[500px] flex items-center justify-center cursor-pointer rounded-full transition-all duration-300 ${
          isHovered ? 'scale-[1.02]' : 'scale-100'
        }`}
        title="Click Arc Reactor to activate voice interaction"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        aria-label={`Arc Reactor Assistant: ${stateTitle}`}
      >
        {/* Dynamic Multi-Stage Ambient Bloom & Glow Layer */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${coreGlow} 0%, rgba(8, 145, 178, 0.3) 38%, rgba(2, 4, 10, 0) 72%)`,
            filter: `blur(${isListening || isSpeaking || isThinking ? '28px' : '18px'})`,
            opacity: (intensity / 100) * (isHovered ? 1 : 0.85),
            transform: `scale(${1 + audioLevel * 0.18})`,
          }}
        />

        {/* HTML5 Canvas overlay for lightning, particles & shockwaves */}
        <canvas
          ref={canvasRef}
          width={540}
          height={540}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        />

        {/* High-Precision SVG Multi-Layer Hardware Arc Reactor */}
        <svg
          viewBox="0 0 540 540"
          className="w-full h-full relative z-10 filter drop-shadow-[0_0_22px_rgba(0,240,255,0.4)]"
        >
          <defs>
            {/* Energy Core Radial Gradient */}
            <radialGradient id="reactorCoreGlowUltra" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="20%" stopColor="#e0f7fa" stopOpacity="0.95" />
              <stop offset="45%" stopColor={primaryColor} stopOpacity="0.85" />
              <stop offset="75%" stopColor={secondaryColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* Dark Metallic Titanium Bezel Gradient (Layer 1) */}
            <radialGradient id="darkTitaniumBezel" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="#080f1a" />
              <stop offset="92%" stopColor="#172233" />
              <stop offset="97%" stopColor="#0a121e" />
              <stop offset="100%" stopColor="#03070d" />
            </radialGradient>

            {/* Segmented Metal Plates Gradient */}
            <linearGradient id="metalPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e2c3d" />
              <stop offset="50%" stopColor="#101a26" />
              <stop offset="100%" stopColor="#060c14" />
            </linearGradient>

            {/* Copper Inductor Coils (Layer 4) */}
            <linearGradient id="copperCoilWindings" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="35%" stopColor="#c2410c" />
              <stop offset="70%" stopColor="#9a3412" />
              <stop offset="100%" stopColor="#431407" />
            </linearGradient>

            {/* Soft Glow Filter */}
            <filter id="arcGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* =========================================================================
              LAYER 1: MECHANICAL HOUSING
              Segmented metal plates, screws, mechanical gaps, markings, tiny LEDs
          ========================================================================== */}
          {/* Outer Housing Ring */}
          <circle
            cx="270"
            cy="270"
            r="256"
            fill="none"
            stroke="rgba(0, 240, 255, 0.15)"
            strokeWidth="1.5"
            strokeDasharray="4 8"
          />

          <circle
            cx="270"
            cy="270"
            r="248"
            fill="url(#darkTitaniumBezel)"
            stroke="#1b2838"
            strokeWidth="8"
          />

          {/* 10 Glowing Mechanical Outer LED Blocks with Mechanical Brackets & Screws */}
          {Array.from({ length: 10 }, (_, i) => {
            const rot = i * 36;
            return (
              <g key={`housing-block-${i}`} transform={`rotate(${rot}, 270, 270)`}>
                {/* Mechanical Mounting Bracket */}
                <path
                  d="M 246 16 A 254 254 0 0 1 294 16 L 291 38 A 232 232 0 0 0 249 38 Z"
                  fill="#0c1726"
                  stroke="#1e324a"
                  strokeWidth="1.5"
                />
                {/* Glowing Outer Cyan LED Core Block (10 signature perimeter blocks) */}
                <rect
                  x="256"
                  y="18"
                  width="28"
                  height="16"
                  rx="2.5"
                  fill="url(#reactorCoreGlowUltra)"
                  filter="url(#arcGlowFilter)"
                  opacity={isListening || isSpeaking ? '0.95' : '0.85'}
                />
                <rect
                  x="258"
                  y="20"
                  width="24"
                  height="12"
                  rx="1.5"
                  fill="#ffffff"
                  opacity="0.8"
                />
                {/* Mechanical Horizontal Gripper Bars on LED Block */}
                <line x1="256" y1="23" x2="284" y2="23" stroke="#0f2136" strokeWidth="1.2" />
                <line x1="256" y1="29" x2="284" y2="29" stroke="#0f2136" strokeWidth="1.2" />
                {/* Precision Mounting Hex Bolts on Bracket sides */}
                <circle cx="251" cy="26" r="1.8" fill="#64748b" stroke="#1e293b" strokeWidth="0.8" />
                <circle cx="289" cy="26" r="1.8" fill="#64748b" stroke="#1e293b" strokeWidth="0.8" />
              </g>
            );
          })}

          {/* Outer Mechanical Screw Bolts Around Perimeter (24 Screws) */}
          {Array.from({ length: 24 }, (_, i) => {
            const angle = (i * 15) * (Math.PI / 180);
            const r = 244;
            return (
              <g key={`screw-${i}`}>
                <circle
                  cx={270 + Math.cos(angle) * r}
                  cy={270 + Math.sin(angle) * r}
                  r="1.6"
                  fill="#475569"
                  stroke="#1e293b"
                  strokeWidth="0.8"
                />
              </g>
            );
          })}

          {/* =========================================================================
              LAYER 2: OUTER HUD RING
              Thin circular HUD, rotating segments, tick marks, degree indicators, numbers
          ========================================================================== */}
          {/* Degree Tick Marks Around Housing */}
          {Array.from({ length: 72 }, (_, i) => {
            const angle = (i * 5) * (Math.PI / 180);
            const isMajor = i % 6 === 0;
            const r1 = 240;
            const r2 = isMajor ? 228 : 234;
            return (
              <line
                key={`tick-mark-${i}`}
                x1={270 + Math.cos(angle) * r1}
                y1={270 + Math.sin(angle) * r1}
                x2={270 + Math.cos(angle) * r2}
                y2={270 + Math.sin(angle) * r2}
                stroke={isMajor ? primaryColor : 'rgba(0, 240, 255, 0.35)'}
                strokeWidth={isMajor ? '2' : '1'}
              />
            );
          })}

          {/* Rotating Outer HUD Segment Ring */}
          <g transform={`rotate(${rotRing1}, 270, 270)`}>
            <circle
              cx="270"
              cy="270"
              r="222"
              fill="none"
              stroke="#131e2d"
              strokeWidth="10"
            />
            <circle
              cx="270"
              cy="270"
              r="222"
              fill="none"
              stroke={primaryColor}
              strokeWidth="3.5"
              strokeDasharray="28 14 8 14"
              filter="url(#arcGlowFilter)"
              opacity="0.85"
            />

            {/* Tiny Numbers around HUD (01, 04, 08, 12, 16, 24, 32...) */}
            {hudNumbers.map((num, idx) => {
              const rot = (idx * 45);
              return (
                <g key={`num-${num}`} transform={`rotate(${rot}, 270, 270)`}>
                  <text
                    x="270"
                    y="58"
                    fill={primaryColor}
                    fontSize="7"
                    fontFamily="var(--font-mono)"
                    fontWeight="bold"
                    textAnchor="middle"
                    opacity="0.85"
                  >
                    {num}
                  </text>
                  <circle cx="270" cy="64" r="1.5" fill="#ffffff" />
                </g>
              );
            })}
          </g>

          {/* =========================================================================
              LAYER 3: ENERGY RING
              Several luminous rings rotating at different speeds & directions
          ========================================================================== */}
          {/* Counter-rotating Energy Track Ring 1 */}
          <g transform={`rotate(${rotRing2}, 270, 270)`}>
            <circle
              cx="270"
              cy="270"
              r="198"
              fill="none"
              stroke="rgba(0, 240, 255, 0.35)"
              strokeWidth="2"
            />
            <circle
              cx="270"
              cy="270"
              r="190"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="3"
              strokeDasharray="16 32 48 16"
              opacity="0.8"
            />

            {/* 4 Orbiting Photon Energy Nodes */}
            <circle cx="270" cy="80" r="4.5" fill="#ffffff" filter="url(#arcGlowFilter)" />
            <circle cx="270" cy="460" r="4.5" fill="#ffffff" filter="url(#arcGlowFilter)" />
            <circle cx="80" cy="270" r="3.5" fill={primaryColor} />
            <circle cx="460" cy="270" r="3.5" fill={primaryColor} />
          </g>

          {/* Rotating High-Frequency Energy Ring 2 */}
          <g transform={`rotate(${rotRing4}, 270, 270)`}>
            <circle
              cx="270"
              cy="270"
              r="176"
              fill="none"
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeDasharray="6 18 12 18"
              opacity="0.7"
            />
            {/* Scanning Radar Sector Wedge */}
            <path
              d="M 270 270 L 270 94 A 176 176 0 0 1 316 99 Z"
              fill={primaryColor}
              opacity={isThinking || isListening ? '0.25' : '0.12'}
            />
          </g>

          {/* =========================================================================
              LAYER 4: INNER REACTOR (MECHANICAL STRUCTURE)
              Radial arms, geometric elements, energy channels, 10 copper inductor coils
          ========================================================================== */}
          {/* Coil Track Housing Bezel Ring */}
          <circle
            cx="270"
            cy="270"
            r="154"
            fill="#091320"
            stroke="#1a273a"
            strokeWidth="30"
          />
          <circle
            cx="270"
            cy="270"
            r="169"
            fill="none"
            stroke="rgba(0, 240, 255, 0.4)"
            strokeWidth="1.5"
          />
          <circle
            cx="270"
            cy="270"
            r="139"
            fill="none"
            stroke="rgba(0, 240, 255, 0.4)"
            strokeWidth="1.5"
          />

          {/* Render 10 Signature Copper Inductor Coil Blocks */}
          {coilSegments.map((coil) => (
            <g
              key={`coil-inductor-${coil.id}`}
              transform={`rotate(${coil.angle}, 270, 270)`}
            >
              {/* Copper coil core block */}
              <rect
                x="257"
                y="104"
                width="26"
                height="28"
                rx="3.5"
                fill="url(#copperCoilWindings)"
                stroke="#431407"
                strokeWidth="1"
              />
              {/* Metal coil clamp fixtures */}
              <rect x="260" y="100" width="20" height="4.5" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="0.5" />
              <rect x="260" y="131" width="20" height="4.5" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="0.5" />

              {/* Lit core filament slot inside each coil */}
              <line
                x1="270"
                y1="108"
                x2="270"
                y2="128"
                stroke={primaryColor}
                strokeWidth="2.8"
                filter="url(#arcGlowFilter)"
                opacity={isHovered || isSpeaking || isListening ? '1' : '0.85'}
              />

              {/* Coil power indicator micro LED */}
              <circle
                cx="270"
                cy="96"
                r="2"
                fill={isError ? '#ff3344' : isSuccess ? '#10b981' : primaryColor}
              />
            </g>
          ))}

          {/* Radial Mechanical Arms (Connecting Coils to Inner Core) */}
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (i * 60) * (Math.PI / 180);
            return (
              <line
                key={`radial-arm-${i}`}
                x1={270 + Math.cos(angle) * 75}
                y1={270 + Math.sin(angle) * 75}
                x2={270 + Math.cos(angle) * 138}
                y2={270 + Math.sin(angle) * 138}
                stroke="#1e293b"
                strokeWidth="3.5"
              />
            );
          })}

          {/* Inner Rotating High-Frequency Aperture Ring */}
          <g transform={`rotate(${rotRing3}, 270, 270)`}>
            <circle
              cx="270"
              cy="270"
              r="118"
              fill="none"
              stroke="#0e1b2c"
              strokeWidth="8"
            />
            <circle
              cx="270"
              cy="270"
              r="118"
              fill="none"
              stroke={primaryColor}
              strokeWidth="2.5"
              strokeDasharray="10 14"
              opacity="0.85"
            />

            {/* 6 Hexagonal Mechanical Brackets */}
            {Array.from({ length: 6 }, (_, i) => (
              <g key={`hex-bracket-${i}`} transform={`rotate(${i * 60}, 270, 270)`}>
                <polygon
                  points="270,148 277,156 263,156"
                  fill={primaryColor}
                  opacity="0.9"
                />
              </g>
            ))}
          </g>

          {/* Inner Translucent Energy Chamber Ring */}
          <circle
            cx="270"
            cy="270"
            r="98"
            fill="#030c17"
            stroke="rgba(0, 240, 255, 0.65)"
            strokeWidth="3.5"
          />

          <circle
            cx="270"
            cy="270"
            r="86"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
            strokeDasharray="6 8"
            opacity="0.75"
          />

          {/* =========================================================================
              LAYER 5: SIGNATURE INVERTED TRIANGULAR PALLADIUM ENERGY CORE
              Layered luminous cyan inverted triangle with concentric rings and white-hot node
          ========================================================================== */}
          <g className={isListening || isSpeaking || isThinking ? 'animate-core-active' : 'animate-core-pulse'}>
            {/* Outer Core Glow Disc */}
            <circle
              cx="270"
              cy="270"
              r="76"
              fill="url(#reactorCoreGlowUltra)"
              filter="url(#arcGlowFilter)"
              opacity={0.92 + audioLevel * 0.35}
            />

            {/* Dark Metallic Outer Triangular Housing Bezel */}
            <polygon
              points="204,220 336,220 270,334"
              fill="#060f1b"
              stroke="#1b3046"
              strokeWidth="6"
            />
            {/* Luminous Cyan Outer Triangular Border */}
            <polygon
              points="208,222 332,222 270,330"
              fill="none"
              stroke={primaryColor}
              strokeWidth="3.5"
              filter="url(#arcGlowFilter)"
            />

            {/* Inner Concentric Circular Energy Track behind triangle */}
            <circle cx="270" cy="270" r="48" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="1.5" strokeDasharray="6 4" />
            <circle cx="270" cy="270" r="34" fill="none" stroke="rgba(0, 240, 255, 0.6)" strokeWidth="1.5" />

            {/* Intermediate Glowing Cyan Triangular Lattice */}
            <polygon
              points="220,230 320,230 270,318"
              fill="url(#reactorCoreGlowUltra)"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="2"
              opacity="0.85"
            />

            {/* High-Intensity Inner White Triangular Core */}
            <polygon
              points="236,242 304,242 270,302"
              fill="#ffffff"
              filter="url(#arcGlowFilter)"
              opacity="0.9"
            />

            {/* Inner Triangular Geometric Struts */}
            <line x1="270" y1="242" x2="270" y2="302" stroke="#00f0ff" strokeWidth="1.5" opacity="0.8" />
            <line x1="236" y1="242" x2="287" y2="272" stroke="#00f0ff" strokeWidth="1.5" opacity="0.8" />
            <line x1="304" y1="242" x2="253" y2="272" stroke="#00f0ff" strokeWidth="1.5" opacity="0.8" />

            {/* 3 Corner Mechanical Clamps at the vertices of the triangle */}
            {/* Top Left Clamp */}
            <circle cx="208" cy="222" r="4.5" fill="#1e293b" stroke={primaryColor} strokeWidth="1.5" />
            <circle cx="208" cy="222" r="1.8" fill="#ffffff" />
            {/* Top Right Clamp */}
            <circle cx="332" cy="222" r="4.5" fill="#1e293b" stroke={primaryColor} strokeWidth="1.5" />
            <circle cx="332" cy="222" r="1.8" fill="#ffffff" />
            {/* Bottom Vertex Clamp */}
            <circle cx="270" cy="330" r="4.5" fill="#1e293b" stroke={primaryColor} strokeWidth="1.5" />
            <circle cx="270" cy="330" r="1.8" fill="#ffffff" />

            {/* Pure Singular Superheated Center Core Node */}
            <circle cx="270" cy="265" r="12" fill="#ffffff" filter="url(#arcGlowFilter)" />
          </g>

          {/* Central Telemetry Frequency Text Inside Core */}
          <text
            x="270"
            y="324"
            textAnchor="middle"
            fill="rgba(0, 240, 255, 0.85)"
            fontSize="8.5"
            fontFamily="var(--font-mono)"
            letterSpacing="2"
          >
            {isListening ? 'VOICE RX 16kHz' : isSpeaking ? 'VOX TX 24kHz' : 'CORE: 3.42 GW'}
          </text>
        </svg>
      </div>

      {/* Holographic Arc Reactor State Display Banner */}
      <div className="mt-3 flex flex-col items-center text-center z-20">
        <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-[#030914]/90 border border-cyan-500/35 backdrop-blur-md shadow-lg">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isError
                ? 'bg-red-500 animate-ping'
                : isSuccess
                ? 'bg-emerald-400'
                : isListening
                ? 'bg-cyan-300 animate-pulse'
                : isThinking || isGenerating || isExecuting
                ? 'bg-sky-400 animate-spin'
                : isSpeaking
                ? 'bg-cyan-300 animate-ping'
                : 'bg-cyan-400'
            }`}
          />
          <span className="font-orbitron text-xs sm:text-sm font-bold tracking-wider text-cyan-200">
            {stateTitle}
          </span>
        </div>

        <span className="mt-1.5 text-[10px] sm:text-xs font-mono-tech tracking-widest text-cyan-400/70 uppercase">
          {stateSub}
        </span>

        {/* Section 8: Action Status Pipeline HUD */}
        {desktopAction && (
          <div className="mt-2.5 w-full max-w-sm px-3.5 py-2.5 rounded-sm border border-cyan-500/40 bg-[#030a17]/95 backdrop-blur-md shadow-[0_0_20px_rgba(0,240,255,0.2)] font-mono-tech text-left text-xs transition-all duration-300">
            <div className="flex items-center justify-between text-[10px] text-cyan-400/80 border-b border-cyan-500/25 pb-1.5 mb-1.5 tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  desktopAction.stage === 'success' ? 'bg-emerald-400' :
                  desktopAction.stage === 'failed' ? 'bg-rose-500' : 'bg-cyan-400 animate-ping'
                }`} />
                DESKTOP PROTOCOL // STARK OS
              </span>
              <span className={`uppercase text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded ${
                desktopAction.stage === 'success' ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-500/30' :
                desktopAction.stage === 'failed' ? 'text-rose-300 bg-rose-950/60 border border-rose-500/30' :
                'text-cyan-200 bg-cyan-950/60 border border-cyan-500/30 animate-pulse'
              }`}>
                {desktopAction.stage === 'command_received' && 'STAGE 1: RECEIVED'}
                {desktopAction.stage === 'resolving' && 'STAGE 2: RESOLVING'}
                {desktopAction.stage === 'executing' && 'STAGE 3: EXECUTING'}
                {desktopAction.stage === 'success' && 'STAGE 4: SUCCESS'}
                {desktopAction.stage === 'failed' && 'STAGE 4: FAILED'}
              </span>
            </div>
            <div className="space-y-1 text-[11px] leading-relaxed">
              <div className="text-cyan-300 font-semibold tracking-wide">
                <span className="text-cyan-500 mr-1.5">&gt;</span>COMMAND: <span className="text-white">{desktopAction.command}</span>
              </div>
              <div className="text-cyan-200">
                <span className="text-cyan-500 mr-1.5">&gt;</span>TARGET: <span className="text-cyan-100 font-bold">{desktopAction.target}</span>
              </div>
              <div className={`font-bold flex items-center gap-1.5 mt-1 pt-1 border-t border-cyan-500/20 tracking-wider ${
                desktopAction.stage === 'success'
                  ? 'text-emerald-400'
                  : desktopAction.stage === 'failed'
                  ? 'text-rose-400'
                  : 'text-amber-300 animate-pulse'
              }`}>
                <span className="text-cyan-500">&gt;</span>STATUS: {desktopAction.statusText}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

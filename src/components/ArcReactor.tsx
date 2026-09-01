import React, { useEffect, useRef, useState } from 'react';
import { AssistantState } from '../types';

interface ArcReactorProps {
  state: AssistantState;
  audioLevel: number; // 0 to 1
  onClick?: () => void;
  intensity?: number; // 1 to 100
  animationSpeed?: number; // 0.5 to 2
  activeActionLabel?: string;
  reducedMotion?: boolean;
}

export const ArcReactor: React.FC<ArcReactorProps> = ({
  state,
  audioLevel,
  onClick,
  intensity = 85,
  animationSpeed = 1,
  activeActionLabel,
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [rotationAngle1, setRotationAngle1] = useState(0);
  const [rotationAngle2, setRotationAngle2] = useState(0);
  const [rotationAngle3, setRotationAngle3] = useState(0);

  // Particles & lightning state for canvas
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

  // Color palette depending on state
  const isError = state === 'error';
  const isSuccess = state === 'success';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';
  const isExecuting = state === 'executing';

  const primaryColor = isError
    ? '#f87171'
    : isSuccess
    ? '#4ade80'
    : isListening
    ? '#38bdf8'
    : isThinking || isExecuting
    ? '#38bdf8'
    : '#22d3ee';

  const secondaryColor = isError
    ? '#fb923c'
    : isSuccess
    ? '#2dd4bf'
    : isThinking
    ? '#0284c7'
    : '#0891b2';

  const coreGlowColor = isError
    ? 'rgba(248, 113, 113, 0.9)'
    : isSuccess
    ? 'rgba(74, 222, 128, 0.9)'
    : isListening
    ? 'rgba(34, 211, 238, 1)'
    : isThinking
    ? 'rgba(56, 189, 248, 0.95)'
    : isSpeaking
    ? 'rgba(34, 211, 238, 1)'
    : 'rgba(34, 211, 238, 0.75)';

  // Calculate rotation speed multipliers based on state
  let speedMultiplier = 1;
  if (isThinking || isExecuting) speedMultiplier = 3.2;
  else if (isSpeaking) speedMultiplier = 1.6;
  else if (isListening) speedMultiplier = 1.2;
  else if (isHovered) speedMultiplier = 1.3;

  if (reducedMotion) speedMultiplier = 0.2;

  // Continuous animation frame for mechanical rings & particles
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const updateRings = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const rate = animationSpeed * speedMultiplier;
      setRotationAngle1((prev) => (prev + 12 * rate * delta) % 360);
      setRotationAngle2((prev) => (prev - 18 * rate * delta + 360) % 360);
      setRotationAngle3((prev) => (prev + 30 * rate * delta) % 360);

      // Trigger shockwaves during speaking or high audio level
      if ((isSpeaking || isListening) && audioLevel > 0.35 && Math.random() < 0.2) {
        shockwavesRef.current.push({
          radius: 40,
          maxRadius: 180,
          opacity: 0.8,
          speed: 160 + audioLevel * 120,
          color: primaryColor,
        });
      }

      animId = requestAnimationFrame(updateRings);
    };

    animId = requestAnimationFrame(updateRings);
    return () => cancelAnimationFrame(animId);
  }, [animationSpeed, speedMultiplier, isSpeaking, isListening, audioLevel, primaryColor, reducedMotion]);

  // Canvas particle and wave rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize particles
    const particleCount = isThinking || isExecuting ? 50 : 25;
    if (particlesRef.current.length === 0 || particlesRef.current.length !== particleCount) {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: 0,
        y: 0,
        radius: Math.random() * 2 + 1,
        angle: Math.random() * Math.PI * 2,
        distance: 50 + Math.random() * 110,
        speed: (Math.random() * 0.8 + 0.4) * (Math.random() > 0.5 ? 1 : -1),
        color: Math.random() > 0.3 ? primaryColor : '#ffffff',
        opacity: Math.random() * 0.7 + 0.3,
      }));
    }

    let canvasAnimId: number;
    let lastRenderTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min((time - lastRenderTime) / 1000, 0.1);
      lastRenderTime = time;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Shockwaves expanding outwards from reactor core
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.radius += sw.speed * delta;
        sw.opacity = Math.max(0, 0.8 * (1 - sw.radius / sw.maxRadius));

        if (sw.radius >= sw.maxRadius || sw.opacity <= 0.01) {
          shockwavesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2.5 * sw.opacity;
        ctx.globalAlpha = sw.opacity;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }

      // 2. Draw Radial Audio Waveform Spectrum around the reactor
      if (isListening || isSpeaking || audioLevel > 0.05) {
        const numBars = 48;
        const baseRadius = 145;
        const waveAmp = (audioLevel * 32 + (isSpeaking ? 12 : 6)) * (intensity / 100);

        ctx.save();
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 8;

        for (let i = 0; i < numBars; i++) {
          const theta = (i / numBars) * Math.PI * 2 + (rotationAngle1 * Math.PI) / 180;
          // pseudo waveform variation
          const noise = Math.sin(i * 3 + time * 0.008) * Math.cos(i * 2 - time * 0.005);
          const barLength = Math.max(4, Math.abs(noise) * waveAmp + (isListening ? audioLevel * 20 : 5));

          const x1 = centerX + Math.cos(theta) * baseRadius;
          const y1 = centerY + Math.sin(theta) * baseRadius;
          const x2 = centerX + Math.cos(theta) * (baseRadius + barLength);
          const y2 = centerY + Math.sin(theta) * (baseRadius + barLength);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = i % 2 === 0 ? primaryColor : secondaryColor;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.65 + audioLevel * 0.35;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. Draw Orbiting Plasma Energy Particles
      if (!reducedMotion) {
        particlesRef.current.forEach((p) => {
          p.angle += p.speed * delta * (isThinking || isExecuting ? 3 : 1);
          const px = centerX + Math.cos(p.angle) * p.distance;
          const py = centerY + Math.sin(p.angle) * p.distance;

          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, p.radius * (isThinking ? 1.4 : 1), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity * (intensity / 100);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.restore();
        });
      }

      // 4. Plasma Lightning Arcs during Thinking / Executing
      if ((isThinking || isExecuting) && Math.random() < 0.35) {
        ctx.save();
        ctx.strokeStyle = '#e6ffff';
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 15;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.85;

        const startAngle = Math.random() * Math.PI * 2;
        const r1 = 45;
        const r2 = 120;
        let curX = centerX + Math.cos(startAngle) * r1;
        let curY = centerY + Math.sin(startAngle) * r1;

        ctx.beginPath();
        ctx.moveTo(curX, curY);

        const segments = 4;
        for (let s = 1; s <= segments; s++) {
          const t = s / segments;
          const targetR = r1 + (r2 - r1) * t;
          const jitterAngle = startAngle + (Math.random() - 0.5) * 0.4;
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
    primaryColor,
    secondaryColor,
    rotationAngle1,
    reducedMotion,
  ]);

  // Status text & Sub-label
  let stateTitle = 'JARVIS ONLINE';
  let stateSub = 'MARK LXXXV // CLEAN POWER STABLE';

  if (isListening) {
    stateTitle = 'LISTENING...';
    stateSub = 'AUDIO STREAM CAPTURE ACTIVE';
  } else if (isThinking) {
    stateTitle = 'PROCESSING...';
    stateSub = 'QUANTUM NEURAL REASONING';
  } else if (isExecuting) {
    stateTitle = activeActionLabel ? activeActionLabel.toUpperCase() : 'EXECUTING TASK...';
    stateSub = 'PROTOCOL DISPATCHED';
  } else if (isSpeaking) {
    stateTitle = 'JARVIS SPEAKING';
    stateSub = 'VOCAL SYNTHESIS FREQUENCY LOCK';
  } else if (isSuccess) {
    stateTitle = 'COMMAND COMPLETED';
    stateSub = 'SYSTEM PARAMETERS VERIFIED';
  } else if (isError) {
    stateTitle = 'SYSTEM ERROR';
    stateSub = 'DIAGNOSTIC EXCEPTION LOGGED';
  }

  // 10 Segments of Copper Inductor Coils (Classic Mark I & II Iron Man Reactor)
  const coilSegments = Array.from({ length: 10 }, (_, i) => {
    const angle = (i * 36) - 90; // 360 / 10 = 36 deg each
    return { id: i, angle };
  });

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Surrounding HUD Technical Markers (Elegant Dark design) */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[10px] font-mono-tech tracking-widest text-cyan-400/70 whitespace-nowrap pointer-events-none">
        <span className="text-cyan-500/80">[ AZIMUTH 342.19 ]</span>
        <span className="hidden sm:inline text-cyan-400 font-bold tracking-wider">//</span>
        <span className="text-cyan-300 font-semibold">[ RANGE LIMIT 0.04 ]</span>
      </div>

      {/* Flank HUD Status Badges */}
      <div className="hidden lg:flex absolute -left-16 top-1/2 -translate-y-1/2 flex-col gap-2 text-[9px] font-mono-tech text-cyan-400/60 pointer-events-none">
        <div className="hud-panel px-2 py-1 border-cyan-500/20 text-cyan-300">
          [ STATUS: {state.toUpperCase()} ]
        </div>
        <div className="hud-panel px-2 py-1 border-cyan-500/20 text-cyan-400/80">
          [ UPLINK: STABLE ]
        </div>
      </div>

      <div className="hidden lg:flex absolute -right-16 top-1/2 -translate-y-1/2 flex-col gap-2 text-[9px] font-mono-tech text-cyan-400/60 pointer-events-none">
        <div className="hud-panel px-2 py-1 border-cyan-500/20 text-cyan-300">
          [ VOCAL: {isListening ? 'ACTIVE' : 'READY'} ]
        </div>
        <div className="hud-panel px-2 py-1 border-cyan-500/20 text-cyan-400/80">
          [ EFF: 99.4% ]
        </div>
      </div>

      {/* Reactor Container with Responsive Sizing & Elegant Glow */}
      <div
        onClick={onClick}
        className={`relative w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] md:w-[440px] md:h-[440px] lg:w-[480px] lg:h-[480px] flex items-center justify-center cursor-pointer rounded-full reactor-glow transition-transform duration-300 ${
          isHovered ? 'scale-[1.02]' : 'scale-100'
        }`}
        title="Click Arc Reactor to toggle voice input"
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
        {/* Dynamic Background Glow Layer */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${coreGlowColor} 0%, rgba(8, 145, 178, 0.25) 40%, rgba(2, 4, 10, 0) 75%)`,
            filter: `blur(${isListening || isSpeaking || isThinking ? '24px' : '16px'})`,
            opacity: (intensity / 100) * (isHovered ? 1 : 0.85),
            transform: `scale(${1 + (audioLevel * 0.15)})`,
          }}
        />

        {/* HTML5 Canvas overlay for lightning, particles & shockwaves */}
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        />

        {/* High-Tech Vector Arc Reactor Construction */}
        <svg
          viewBox="0 0 500 500"
          className="w-full h-full relative z-10 filter drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]"
        >
          <defs>
            {/* Core Radial Gradient */}
            <radialGradient id="reactorCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="25%" stopColor={primaryColor} stopOpacity="0.95" />
              <stop offset="60%" stopColor={secondaryColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* Coil Metallic Gradient */}
            <linearGradient id="coilCopper" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e09e3e" />
              <stop offset="50%" stopColor="#875113" />
              <stop offset="100%" stopColor="#2b1a06" />
            </linearGradient>

            {/* Titanium Housing Gradient */}
            <linearGradient id="metallicHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2d3748" />
              <stop offset="50%" stopColor="#1a202c" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* LAYER 1: OUTER CASING & METALLIC BEZEL (Static Base) */}
          <circle
            cx="250"
            cy="250"
            r="236"
            fill="none"
            stroke="rgba(0, 243, 255, 0.15)"
            strokeWidth="1.5"
            strokeDasharray="4 8"
          />

          <circle
            cx="250"
            cy="250"
            r="228"
            fill="none"
            stroke="#15202e"
            strokeWidth="8"
          />

          {/* Outer Technical Compass & Degree Markings */}
          {Array.from({ length: 72 }, (_, i) => {
            const angle = (i * 5) * (Math.PI / 180);
            const isMajor = i % 6 === 0;
            const r1 = 224;
            const r2 = isMajor ? 212 : 218;
            return (
              <line
                key={`tick-${i}`}
                x1={250 + Math.cos(angle) * r1}
                y1={250 + Math.sin(angle) * r1}
                x2={250 + Math.cos(angle) * r2}
                y2={250 + Math.sin(angle) * r2}
                stroke={isMajor ? primaryColor : 'rgba(0, 243, 255, 0.3)'}
                strokeWidth={isMajor ? '2' : '1'}
              />
            );
          })}

          {/* LAYER 2: ROTATING OUTER SEGMENTED MECHANICAL RING */}
          <g transform={`rotate(${rotationAngle1}, 250, 250)`}>
            <circle
              cx="250"
              cy="250"
              r="204"
              fill="none"
              stroke="#1e293b"
              strokeWidth="12"
            />
            {/* Segmented notches */}
            <circle
              cx="250"
              cy="250"
              r="204"
              fill="none"
              stroke={primaryColor}
              strokeWidth="4"
              strokeDasharray="24 16 8 16"
              filter="url(#arcGlow)"
              opacity="0.8"
            />

            {/* High-tech data brackets */}
            {Array.from({ length: 4 }, (_, i) => (
              <g key={`bracket-${i}`} transform={`rotate(${i * 90}, 250, 250)`}>
                <path
                  d="M 250 44 L 270 44 L 274 54 L 226 54 L 230 44 Z"
                  fill={secondaryColor}
                  opacity="0.9"
                />
                <circle cx="250" cy="50" r="2.5" fill="#ffffff" />
              </g>
            ))}
          </g>

          {/* LAYER 3: COUNTER-ROTATING ENERGY TRACK RING */}
          <g transform={`rotate(${rotationAngle2}, 250, 250)`}>
            <circle
              cx="250"
              cy="250"
              r="184"
              fill="none"
              stroke="rgba(0, 243, 255, 0.3)"
              strokeWidth="2"
            />
            <circle
              cx="250"
              cy="250"
              r="176"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="3.5"
              strokeDasharray="12 24 36 12"
              opacity="0.75"
            />
            {/* Orbiting Photon Nodes */}
            <circle cx="250" cy="74" r="4" fill="#ffffff" filter="url(#arcGlow)" />
            <circle cx="250" cy="426" r="4" fill="#ffffff" filter="url(#arcGlow)" />
            <circle cx="74" cy="250" r="3" fill={primaryColor} />
            <circle cx="426" cy="250" r="3" fill={primaryColor} />
          </g>

          {/* LAYER 4: 10 COPPER COIL INDUCTION BLOCKS (THE SIGNATURE IRON MAN DESIGN) */}
          <g>
            {/* Coil Track Housing Ring */}
            <circle
              cx="250"
              cy="250"
              r="142"
              fill="#0a121c"
              stroke="#1e293b"
              strokeWidth="28"
            />
            <circle
              cx="250"
              cy="250"
              r="156"
              fill="none"
              stroke="rgba(0, 243, 255, 0.4)"
              strokeWidth="1.5"
            />
            <circle
              cx="250"
              cy="250"
              r="128"
              fill="none"
              stroke="rgba(0, 243, 255, 0.4)"
              strokeWidth="1.5"
            />

            {/* Render each of the 10 coils with copper windings and lit central core */}
            {coilSegments.map((coil) => (
              <g
                key={`coil-${coil.id}`}
                transform={`rotate(${coil.angle}, 250, 250)`}
              >
                {/* Copper coil block */}
                <rect
                  x="238"
                  y="96"
                  width="24"
                  height="26"
                  rx="3"
                  fill="url(#coilCopper)"
                  stroke="#3e240a"
                  strokeWidth="1"
                />
                {/* Metallic coil mounting clamp */}
                <rect
                  x="241"
                  y="93"
                  width="18"
                  height="4"
                  rx="1"
                  fill="#475569"
                />
                <rect
                  x="241"
                  y="121"
                  width="18"
                  height="4"
                  rx="1"
                  fill="#475569"
                />
                {/* Inner glowing filament slot inside each coil */}
                <line
                  x1="250"
                  y1="100"
                  x2="250"
                  y2="118"
                  stroke={primaryColor}
                  strokeWidth="2.5"
                  filter="url(#arcGlow)"
                  opacity={isHovered || isSpeaking || isListening ? '1' : '0.85'}
                />
                {/* Segment power indicator LED */}
                <circle
                  cx="250"
                  cy="90"
                  r="2"
                  fill={isError ? '#ff3344' : isSuccess ? '#00ff88' : primaryColor}
                />
              </g>
            ))}
          </g>

          {/* LAYER 5: INNER ROTATING HIGH-FREQUENCY APERTURE RING */}
          <g transform={`rotate(${rotationAngle3}, 250, 250)`}>
            <circle
              cx="250"
              cy="250"
              r="110"
              fill="none"
              stroke="#0f1c2e"
              strokeWidth="8"
            />
            <circle
              cx="250"
              cy="250"
              r="110"
              fill="none"
              stroke={primaryColor}
              strokeWidth="2.5"
              strokeDasharray="8 12"
              opacity="0.85"
            />
            {/* Hexagonal mechanical brackets */}
            {Array.from({ length: 6 }, (_, i) => (
              <g key={`hex-bracket-${i}`} transform={`rotate(${i * 60}, 250, 250)`}>
                <polygon
                  points="250,138 256,145 244,145"
                  fill={primaryColor}
                  opacity="0.9"
                />
              </g>
            ))}
          </g>

          {/* LAYER 6: INNER ENERGY CHAMBER & TRANSLUCENT OPTICAL RING */}
          <circle
            cx="250"
            cy="250"
            r="92"
            fill="#030b14"
            stroke="rgba(0, 243, 255, 0.6)"
            strokeWidth="3"
          />

          {/* Concentric Energy Rings */}
          <circle
            cx="250"
            cy="250"
            r="82"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity="0.7"
          />
          <circle
            cx="250"
            cy="250"
            r="70"
            fill="none"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1"
          />

          {/* LAYER 7: BRILLIANT ARC REACTOR CORE (Pulsating Center) */}
          <g className={isListening || isSpeaking || isThinking ? 'animate-core-active' : 'animate-core-pulse'}>
            {/* Outer Core Glow Disc */}
            <circle
              cx="250"
              cy="250"
              r="58"
              fill="url(#reactorCoreGlow)"
              filter="url(#arcGlow)"
              opacity={0.9 + audioLevel * 0.3}
            />

            {/* Inner High-Density Vibranium/Palladium Core Disc */}
            <circle
              cx="250"
              cy="250"
              r="38"
              fill="#ffffff"
              filter="url(#arcGlow)"
            />

            {/* Stark Triangular/Hex Core Internal Iris */}
            <polygon
              points="250,222 274,264 226,264"
              fill="none"
              stroke="#0f172a"
              strokeWidth="2.5"
              opacity="0.8"
            />
            <polygon
              points="250,278 226,236 274,236"
              fill="none"
              stroke="rgba(0, 243, 255, 0.8)"
              strokeWidth="1.5"
            />

            {/* Pure Light Center Node */}
            <circle cx="250" cy="250" r="14" fill="#ffffff" />
          </g>

          {/* Technical HUD Overlay Coordinates within Reactor */}
          <text
            x="250"
            y="298"
            textAnchor="middle"
            fill="rgba(0, 243, 255, 0.75)"
            fontSize="8"
            fontFamily="var(--font-mono)"
            letterSpacing="2"
          >
            {isListening ? 'VOICE RX 16kHz' : isSpeaking ? 'VOX TX 24kHz' : 'CORE: 3.42 GW'}
          </text>
        </svg>
      </div>

      {/* Holographic Arc Reactor State Display */}
      <div className="mt-2 flex flex-col items-center text-center">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md">
          <span
            className={`w-2 h-2 rounded-full ${
              isError
                ? 'bg-red-500 animate-ping'
                : isSuccess
                ? 'bg-emerald-400'
                : isListening
                ? 'bg-cyan-400 animate-pulse'
                : isThinking || isExecuting
                ? 'bg-sky-400 animate-spin'
                : 'bg-cyan-400'
            }`}
          />
          <span className="font-orbitron text-xs sm:text-sm font-semibold tracking-wider text-cyan-300">
            {stateTitle}
          </span>
        </div>

        <span className="mt-1 text-[10px] sm:text-xs font-mono-tech tracking-widest text-cyan-400/60 uppercase">
          {stateSub}
        </span>
      </div>
    </div>
  );
};

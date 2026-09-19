import React, { useEffect, useRef } from 'react';

interface VoiceOrbProps {
  state: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';
  audioLevel?: number; // 0 to 1
  size?: number;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state, audioLevel = 0.5, size = 260 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = size * 0.28;

      phase += 0.04;

      // Color Palette based on State
      let primaryColor = 'rgba(99, 102, 241, '; // Indigo
      let secondaryColor = 'rgba(56, 189, 248, '; // Sky
      let glowColor = 'rgba(99, 102, 241, 0.4)';

      if (state === 'LISTENING') {
        primaryColor = 'rgba(16, 185, 129, '; // Emerald
        secondaryColor = 'rgba(52, 211, 153, ';
        glowColor = 'rgba(16, 185, 129, 0.5)';
      } else if (state === 'THINKING') {
        primaryColor = 'rgba(245, 158, 11, '; // Amber
        secondaryColor = 'rgba(251, 191, 36, ';
        glowColor = 'rgba(245, 158, 11, 0.5)';
      } else if (state === 'SPEAKING') {
        primaryColor = 'rgba(168, 85, 247, '; // Purple
        secondaryColor = 'rgba(236, 72, 153, ';
        glowColor = 'rgba(168, 85, 247, 0.5)';
      }

      // Outer Pulsing Glow Rings
      const ringCount = 3;
      for (let i = ringCount; i >= 1; i--) {
        const expansion = Math.sin(phase + i * 0.8) * 12 * (state === 'SPEAKING' || state === 'LISTENING' ? 1.5 : 0.6);
        const ringRadius = baseRadius + i * 22 + expansion + (audioLevel * 15);
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor + (0.07 / i) + ')';
        ctx.fill();
      }

      // Main Core Gradient Orb
      const dynamicRadius = baseRadius + Math.sin(phase * 1.5) * 6 + (audioLevel * 10);
      const gradient = ctx.createRadialGradient(
        centerX - dynamicRadius * 0.3,
        centerY - dynamicRadius * 0.3,
        dynamicRadius * 0.1,
        centerX,
        centerY,
        dynamicRadius
      );

      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, secondaryColor + '0.9)');
      gradient.addColorStop(0.8, primaryColor + '0.95)');
      gradient.addColorStop(1, primaryColor + '0.3)');

      ctx.save();
      ctx.shadowBlur = 35;
      ctx.shadowColor = glowColor;

      ctx.beginPath();
      // Wave perimeter
      const points = 32;
      for (let j = 0; j <= points; j++) {
        const angle = (j / points) * Math.PI * 2;
        const wave = Math.sin(angle * 6 + phase * 2) * (state === 'LISTENING' || state === 'SPEAKING' ? 4 : 1.5);
        const r = dynamicRadius + wave;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel, size]);

  return (
    <div className="flex flex-col items-center justify-center relative">
      <canvas 
        ref={canvasRef} 
        width={size} 
        height={size} 
        className="transition-all duration-300"
      />
      <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs font-mono">
        <span className={`w-2 h-2 rounded-full animate-ping ${
          state === 'LISTENING' ? 'bg-emerald-400' :
          state === 'THINKING' ? 'bg-amber-400' :
          state === 'SPEAKING' ? 'bg-purple-400' : 'bg-slate-400'
        }`} />
        <span className="text-slate-300">
          {state === 'LISTENING' && 'Listening to you...'}
          {state === 'THINKING' && 'AI is formulating response...'}
          {state === 'SPEAKING' && 'AI Interviewer speaking...'}
          {state === 'IDLE' && 'Ready'}
        </span>
      </div>
    </div>
  );
};

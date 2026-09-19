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

      phase += 0.035;

      // Color Palette based on Bamboo & Organic Forest Theme
      let primaryColor = 'rgba(45, 106, 79, '; // Deep Bamboo Jade (#2D6A4F)
      let secondaryColor = 'rgba(82, 183, 136, '; // Fresh Leaf Green (#52B788)
      let glowColor = 'rgba(45, 106, 79, 0.25)';

      if (state === 'LISTENING') {
        primaryColor = 'rgba(40, 140, 80, '; // Active Bamboo
        secondaryColor = 'rgba(116, 198, 157, ';
        glowColor = 'rgba(40, 140, 80, 0.35)';
      } else if (state === 'THINKING') {
        primaryColor = 'rgba(217, 119, 6, '; // Warm Amber (#D97706)
        secondaryColor = 'rgba(245, 158, 11, ';
        glowColor = 'rgba(217, 119, 6, 0.35)';
      } else if (state === 'SPEAKING') {
        primaryColor = 'rgba(25, 28, 26, '; // Deep Charcoal Ink (#191C1A)
        secondaryColor = 'rgba(45, 106, 79, '; // Bamboo Accent
        glowColor = 'rgba(25, 28, 26, 0.3)';
      }

      // Outer Gentle Pulsing Wave Rings
      const ringCount = 3;
      for (let i = ringCount; i >= 1; i--) {
        const expansion = Math.sin(phase + i * 0.8) * 10 * (state === 'SPEAKING' || state === 'LISTENING' ? 1.4 : 0.5);
        const ringRadius = baseRadius + i * 20 + expansion + (audioLevel * 12);
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor + (0.08 / i) + ')';
        ctx.fill();
      }

      // Core Organic Sphere Gradient
      const dynamicRadius = baseRadius + Math.sin(phase * 1.4) * 5 + (audioLevel * 8);
      const gradient = ctx.createRadialGradient(
        centerX - dynamicRadius * 0.3,
        centerY - dynamicRadius * 0.3,
        dynamicRadius * 0.1,
        centerX,
        centerY,
        dynamicRadius
      );

      if (state === 'SPEAKING') {
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.2, '#E8F5E9');
        gradient.addColorStop(0.65, '#2D6A4F');
        gradient.addColorStop(1, '#191C1A');
      } else {
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.3, secondaryColor + '0.85)');
        gradient.addColorStop(0.85, primaryColor + '0.95)');
        gradient.addColorStop(1, primaryColor + '0.4)');
      }

      ctx.save();
      ctx.shadowBlur = 30;
      ctx.shadowColor = glowColor;

      ctx.beginPath();
      // Smooth organic perimeter
      const points = 36;
      for (let j = 0; j <= points; j++) {
        const angle = (j / points) * Math.PI * 2;
        const wave = Math.sin(angle * 5 + phase * 2) * (state === 'LISTENING' || state === 'SPEAKING' ? 3.5 : 1.2);
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
    <div className="flex flex-col items-center justify-center relative select-none">
      <canvas 
        ref={canvasRef} 
        width={size} 
        height={size} 
        className="transition-all duration-300 drop-shadow-lg"
      />
      <div className="mt-4 flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-stone-200 shadow-sm text-xs font-semibold text-stone-700">
        <span className={`w-2 h-2 rounded-full ${
          state === 'LISTENING' ? 'bg-emerald-500 animate-ping' :
          state === 'THINKING' ? 'bg-amber-500 animate-pulse' :
          state === 'SPEAKING' ? 'bg-stone-900 animate-pulse' : 'bg-stone-300'
        }`} />
        <span>
          {state === 'LISTENING' && 'Listening to your voice...'}
          {state === 'THINKING' && 'AI Companion is thinking...'}
          {state === 'SPEAKING' && 'AI Interviewer speaking...'}
          {state === 'IDLE' && 'Ready when you are'}
        </span>
      </div>
    </div>
  );
};

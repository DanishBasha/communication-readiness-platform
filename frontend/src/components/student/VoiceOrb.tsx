import React, { useEffect, useRef } from 'react';

interface VoiceOrbProps {
  state: 'idle' | 'listening' | 'speaking' | 'thinking';
  volume?: number;
  size?: number;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state, volume = 0.3, size = 180 }) => {
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
      phase += 0.04;

      const pulseMultiplier = state === 'listening' ? 1 + volume * 0.45 :
                              state === 'speaking' ? 1 + Math.sin(phase * 2) * 0.15 + volume * 0.35 :
                              state === 'thinking' ? 1 + Math.sin(phase * 4) * 0.08 :
                              1 + Math.sin(phase) * 0.03;

      const baseRadius = (size * 0.35) * pulseMultiplier;

      if (state === 'speaking' || state === 'listening') {
        ctx.beginPath();
        const rippleRadius = baseRadius * (1.3 + Math.sin(phase * 2) * 0.15);
        ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = state === 'listening' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(24, 24, 27, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        const outerRadius = rippleRadius * 1.25;
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = state === 'listening' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(24, 24, 27, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const gradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.2,
        centerY - baseRadius * 0.2,
        baseRadius * 0.1,
        centerX,
        centerY,
        baseRadius
      );

      if (state === 'speaking') {
        gradient.addColorStop(0, '#27272A');
        gradient.addColorStop(0.6, '#18181B');
        gradient.addColorStop(1, '#09090B');
      } else if (state === 'listening') {
        gradient.addColorStop(0, '#059669');
        gradient.addColorStop(0.5, '#047857');
        gradient.addColorStop(1, '#064E3B');
      } else if (state === 'thinking') {
        gradient.addColorStop(0, '#D97706');
        gradient.addColorStop(0.5, '#B45309');
        gradient.addColorStop(1, '#78350F');
      } else {
        gradient.addColorStop(0, '#52525B');
        gradient.addColorStop(0.6, '#27272A');
        gradient.addColorStop(1, '#09090B');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (state === 'speaking' || state === 'listening') {
        const barCount = 5;
        const barWidth = 3;
        const spacing = 7;
        const totalW = (barCount * barWidth) + ((barCount - 1) * spacing);
        const startX = centerX - totalW / 2;

        for (let i = 0; i < barCount; i++) {
          const barHeight = Math.max(4, (size * 0.18) * Math.abs(Math.sin(phase * 3 + i * 0.8)) * (volume * 1.5 + 0.3));
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.beginPath();
          ctx.roundRect(startX + i * (barWidth + spacing), centerY - barHeight / 2, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else if (state === 'thinking') {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(phase * 3);
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 0.5, 0, Math.PI * 1.2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, volume, size]);

  return (
    <div className="flex flex-col items-center justify-center">
      <canvas ref={canvasRef} width={size} height={size} className="transition-all duration-300" />
    </div>
  );
};

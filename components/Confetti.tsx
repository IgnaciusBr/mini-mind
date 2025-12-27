import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { COLORS } from '../types';

export interface ConfettiHandle {
  explode: (x: number, y: number) => void;
}

const Confetti = forwardRef<ConfettiHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const frameIdRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    explode: (x: number, y: number) => {
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push(createParticle(x, y));
      }
    }
  }));

  const createParticle = (x: number, y: number) => ({
    x,
    y,
    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 0.5) * 12 - 6,
    life: 1.0,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 8 + 4,
    gravity: 0.4
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= 0.015;
        p.size *= 0.97;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;
      frameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameIdRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
});

export default Confetti;
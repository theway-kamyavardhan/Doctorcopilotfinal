import React, { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ParticleTransition = () => {
  const canvasRef = useRef(null);
  const location = useLocation();
  const particles = useRef([]);
  const animationFrame = useRef(null);

  useEffect(() => {
    // Trigger on EVERY route change
    initParticles();
    animate();
    
    return () => {
      cancelAnimationFrame(animationFrame.current);
    };
  }, [location.pathname]);

  const initParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particles.current = [];
    // 80 particles — enough for visual impact without fill-rate pressure
    for (let i = 0; i < 80; i++) {
      particles.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        size: Math.random() * 2 + 1,
        life: 1.0,
        color: i % 2 === 0 ? 'rgba(212, 175, 55,' : 'rgba(6, 182, 212,'
      });
    }
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset shadow — never set it inside the loop
    ctx.shadowBlur = 0;

    let allDead = true;
    particles.current.forEach(p => {
      if (p.life > 0) {
        allDead = false;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= 0.018; // slightly faster fade

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${p.life})`;
        ctx.fill();

        // Cheap soft glow — larger circle at low alpha (no shadowBlur needed)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${p.life * 0.15})`;
        ctx.fill();
      }
    });

    if (!allDead) {
      animationFrame.current = requestAnimationFrame(animate);
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

export default ParticleTransition;

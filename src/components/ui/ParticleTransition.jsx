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
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particles.current = [];
    // Create 150 stardust particles
    for (let i = 0; i < 150; i++) {
      particles.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 8, // Fast initial burst
        vy: (Math.random() - 0.5) * 8,
        size: Math.random() * 2 + 1,
        alpha: 1,
        life: 1.0,
        color: i % 2 === 0 ? 'rgba(212, 175, 55,' : 'rgba(6, 182, 212,' // Gold or Cyan
      });
    }
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let allDead = true;
    particles.current.forEach(p => {
      if (p.life > 0) {
        allDead = false;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96; // Damping
        p.vy *= 0.96;
        p.life -= 0.015; // Fade over 1-2 seconds
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${p.life})`;
        ctx.fill();
        
        // Add subtle glow
        ctx.shadowBlur = 10 * p.life;
        ctx.shadowColor = p.color === 'rgba(212, 175, 55,' ? '#d4af37' : '#06b6d4';
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

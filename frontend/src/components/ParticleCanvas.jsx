import React, { useEffect, useRef } from 'react';

/*
 * GPU-friendly particle system — uses only transform + opacity (no layout).
 * Sigma mode: falling neon sparks + ⚡ bolts
 * Cute mode:  rising hearts ♥ + petals + strawberries
 * Max 40 particles, recycled pool — zero memory leak.
 * Auto-pauses via Page Visibility API.
 */
export default function ParticleCanvas({ mode }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef({ particles: [], raf: null, paused: false, mode });

  useEffect(() => {
    stateRef.current.mode = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle factory
    const spawn = () => {
      const m = stateRef.current.mode;
      const isCute = m === 'cute';
      const x = Math.random() * canvas.width;
      const y = isCute ? canvas.height + 20 : -20;
      const emojis = isCute
        ? ['♥', '🌸', '✨', '🍓', '💕', '⭐']
        : ['⚡', '◆', '▸', '◈'];
      return {
        x, y,
        vx: (Math.random() - 0.5) * (isCute ? 0.8 : 1.2),
        vy: isCute ? -(0.6 + Math.random() * 1.0) : (0.8 + Math.random() * 1.4),
        life: 1,
        decay: 0.003 + Math.random() * 0.005,
        size: isCute ? 10 + Math.random() * 8 : 6 + Math.random() * 8,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        isCute,
        // sigma only: dot trail
        dot: !isCute && Math.random() > 0.5,
        color: isCute
          ? ['#ff69b4','#c084fc','#fb7185','#f9a8d4'][Math.floor(Math.random()*4)]
          : ['#00f5ff','#3b82f6','#7c3aed','#06b6d4'][Math.floor(Math.random()*4)],
      };
    };

    const state = stateRef.current;
    // Pre-fill pool
    for (let i = 0; i < 25; i++) {
      const p = spawn();
      // spread across canvas initially
      p.y = Math.random() * canvas.height;
      p.life = Math.random();
      state.particles.push(p);
    }

    let spawnTimer = 0;
    const loop = () => {
      if (state.paused) { state.raf = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      spawnTimer++;
      if (spawnTimer % 18 === 0 && state.particles.length < 40) {
        state.particles.push(spawn());
      }

      state.particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life <= 0) {
          // recycle
          Object.assign(state.particles[i], spawn());
          return;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life) * 0.75;

        if (p.dot && !p.isCute) {
          // Sigma: glowing dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 3, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fill();
        } else {
          // Emoji particle
          ctx.font = `${p.size}px serif`;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.isCute ? 6 : 10;
          ctx.fillText(p.emoji, p.x, p.y);
        }
        ctx.restore();
      });

      state.raf = requestAnimationFrame(loop);
    };

    loop();

    const onVisibility = () => { state.paused = document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (state.raf) cancelAnimationFrame(state.raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []); // only mount once — mode changes via stateRef

  return (
    <canvas
      ref={canvasRef}
      id="particle-canvas"
      style={{
        position: 'fixed', inset: 0, zIndex: 1,
        pointerEvents: 'none',
        opacity: 0.45,
      }}
    />
  );
}

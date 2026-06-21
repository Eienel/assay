'use client';

import { useEffect, useRef } from 'react';

// A calm ink-on-water backdrop. Soft blooms drift on a slow flow field; moving
// the cursor stirs the water and lays faint ink that diffuses and mixes;
// scrolling nudges the whole field. Lightweight (a few dozen soft blobs with
// additive blending and a low-alpha fade for the diffusion trail), not a fluid
// sim. Frozen to a single static frame under reduced motion.

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number; // -1 = ambient (never dies)
  tone: 0 | 1; // 0 ink (teal-white), 1 accent (mint)
  a: number;
}

const INK: [number, number, number] = [78, 104, 97]; // muted teal-gray smoke
const MINT: [number, number, number] = [55, 150, 118]; // soft accent, used rarely

export function InkField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const blobs: Blob[] = [];
    // Ambient drifting ink. Low, calm, mostly muted smoke with rare accent.
    for (let i = 0; i < 5; i++) {
      blobs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0,
        vy: 0,
        r: 200 + Math.random() * 200,
        life: -1,
        tone: i % 4 === 0 ? 1 : 0,
        a: 0.022 + Math.random() * 0.018,
      });
    }

    // Slow curl-ish flow field.
    const flow = (x: number, y: number, t: number) => {
      const s = 0.0016;
      return {
        fx: Math.cos(y * s + t * 0.0002) * 0.12,
        fy: Math.sin(x * s - t * 0.00018) * 0.12,
      };
    };

    const paint = (b: Blob) => {
      const [r, g, bl] = b.tone ? MINT : INK;
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grad.addColorStop(0, `rgba(${r},${g},${bl},${b.a})`);
      grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    };

    if (reduce) {
      // One still frame: just the ambient blooms, no motion.
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      blobs.forEach(paint);
      const onResize = () => {
        resize();
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        blobs.forEach(paint);
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    let last = { x: -1, y: -1 };
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      if (last.x >= 0) {
        const dx = x - last.x;
        const dy = y - last.y;
        const speed = Math.min(Math.hypot(dx, dy), 60);
        // Stir nearby ambient ink.
        for (const b of blobs) {
          if (b.life !== -1) continue;
          const d = Math.hypot(b.x - x, b.y - y);
          if (d < 220) {
            b.vx += (dx / 60) * 0.22 * (1 - d / 220);
            b.vy += (dy / 60) * 0.22 * (1 - d / 220);
          }
        }
        // Lay a faint wisp of ink along the stroke.
        if (speed > 3 && blobs.length < 60) {
          blobs.push({
            x,
            y,
            vx: dx * 0.04,
            vy: dy * 0.04,
            r: 16 + speed * 0.9,
            life: 1,
            tone: Math.random() < 0.12 ? 1 : 0,
            a: 0.014 + Math.min(speed, 40) * 0.0006,
          });
        }
      }
      last = { x, y };
    };

    let scrollV = 0;
    let lastScroll = window.scrollY;
    const onScroll = () => {
      const dy = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      scrollV += dy * 0.02; // nudge the whole field
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);

    const tick = (t: number) => {
      // Low-alpha fade leaves a soft diffusion trail.
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(15,21,20,0.11)';
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      scrollV *= 0.9;
      for (let i = blobs.length - 1; i >= 0; i--) {
        const b = blobs[i];
        const f = flow(b.x, b.y, t);
        b.vx = b.vx * 0.94 + f.fx;
        b.vy = b.vy * 0.94 + f.fy + scrollV * (b.life === -1 ? 1 : 0.4);
        b.x += b.vx;
        b.y += b.vy;
        if (b.life === -1) {
          // wrap ambient blooms
          if (b.x < -b.r) b.x = w + b.r;
          if (b.x > w + b.r) b.x = -b.r;
          if (b.y < -b.r) b.y = h + b.r;
          if (b.y > h + b.r) b.y = -b.r;
        } else {
          b.life -= 0.012;
          b.r += 0.6; // diffuse outward
          b.a *= 0.985;
          if (b.life <= 0 || b.a < 0.002) {
            blobs.splice(i, 1);
            continue;
          }
        }
        paint(b);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ width: '100vw', height: '100vh', opacity: 0.7 }}
    />
  );
}

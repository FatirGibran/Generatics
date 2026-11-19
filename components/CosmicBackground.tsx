"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  base: number;
  phase: number;
  period: number;
  spiky: boolean;
  color: string;
  layer: number;
}

const COLORS = ["#FFFFFF", "#FAF6EB", "#FACC15", "#FDE047", "#A5B4FC", "#F472B6"];
const LAYER_DEPTH = [6, 14, 26];

function drawSpark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let raf = 0;
    let running = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollY = 0;
    let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nextShoot = performance.now() + 5000;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(240, Math.floor((width * height) / 8500));
      stars = Array.from({ length: count }, (_, i) => {
        const layer = i % 3;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          size: 0.6 + Math.random() * (layer + 0.9),
          base: 0.4 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
          period: 1800 + Math.random() * 2200,
          spiky: layer === 2 && Math.random() > 0.4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          layer,
        };
      });
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      // 1. Draw subtle constellation connections between nearby layer-2 bright stars
      if (!reduced && width > 480) {
        ctx.lineWidth = 0.6;
        const brightStars = stars.filter((s) => s.layer === 2);
        for (let i = 0; i < brightStars.length; i++) {
          const s1 = brightStars[i];
          const px1 = s1.x - pointer.x * LAYER_DEPTH[s1.layer];
          const py1 = ((s1.y - pointer.y * LAYER_DEPTH[s1.layer] - scrollY * 0.02) % height + height) % height;

          for (let j = i + 1; j < Math.min(brightStars.length, i + 6); j++) {
            const s2 = brightStars[j];
            const px2 = s2.x - pointer.x * LAYER_DEPTH[s2.layer];
            const py2 = ((s2.y - pointer.y * LAYER_DEPTH[s2.layer] - scrollY * 0.02) % height + height) % height;

            const dx = px1 - px2;
            const dy = py1 - py2;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 110) {
              const alpha = (1 - dist / 110) * 0.12;
              ctx.strokeStyle = `rgba(250, 204, 21, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(px1, py1);
              ctx.lineTo(px2, py2);
              ctx.stroke();
            }
          }
        }
      }

      // 2. Draw twinkling stars
      for (const s of stars) {
        const d = LAYER_DEPTH[s.layer];
        const px = s.x - pointer.x * d;
        let py = s.y - pointer.y * d - scrollY * (0.01 + s.layer * 0.012);
        py = ((py % height) + height) % height;
        const tw = reduced ? 1 : 0.55 + 0.45 * Math.sin((t / s.period) * Math.PI * 2 + s.phase);
        ctx.globalAlpha = Math.max(0.1, s.base * tw);
        ctx.fillStyle = s.color;
        if (s.spiky) {
          drawSpark(ctx, px, py, s.size * 3.4 * (0.8 + 0.2 * tw));
        } else {
          ctx.beginPath();
          ctx.arc(px, py, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // 3. Shooting stars
      if (!reduced) {
        if (!shooting && t > nextShoot) {
          shooting = {
            x: Math.random() * width * 0.7,
            y: Math.random() * height * 0.35,
            vx: 10 + Math.random() * 5,
            vy: 6 + Math.random() * 3.5,
            life: 1,
          };
          nextShoot = t + 9000 + Math.random() * 4000;
        }
        if (shooting) {
          const { x, y, vx, vy, life } = shooting;
          const g = ctx.createLinearGradient(x, y, x - vx * 10, y - vy * 10);
          g.addColorStop(0, `rgba(250,204,21,${life})`);
          g.addColorStop(0.35, `rgba(250,246,235,${life * 0.7})`);
          g.addColorStop(1, "rgba(250,246,235,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 2.2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - vx * 10, y - vy * 10);
          ctx.stroke();
          shooting.x += vx;
          shooting.y += vy;
          shooting.life -= 0.016;
          if (shooting.life <= 0 || shooting.x > width + 100 || shooting.y > height + 100) shooting = null;
        }
      }
    };

    const loop = (t: number) => {
      if (!running) return;
      frame(t);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / width - 0.5) * 2;
      pointer.ty = (e.clientY / height - 0.5) * 2;
    };
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    const onResize = () => {
      build();
      if (reduced) frame(0);
    };
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };

    build();
    if (reduced) {
      frame(0);
    } else {
      raf = requestAnimationFrame(loop);
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
    }
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
      {/* layered atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(65rem 45rem at 15% -10%, rgba(129,140,248,0.25), transparent 60%)",
            "radial-gradient(55rem 40rem at 95% 85%, rgba(250,204,21,0.15), transparent 62%)",
            "radial-gradient(45rem 32rem at 50% 110%, rgba(129,140,248,0.12), transparent 70%)",
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(5,8,20,0.7) 100%)",
            "#0E152E",
          ].join(","),
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* floating whimsy ornaments */}
      <svg className="absolute top-16 left-[4%] w-14 h-14 md:w-20 md:h-20 animate-float opacity-80" viewBox="0 0 64 64">
        <path d="M44 8a26 26 0 1 0 12 46A22 22 0 0 1 44 8Z" fill="#FAF6EB" />
        <path d="M44 8a26 26 0 1 0 12 46A22 22 0 0 1 44 8Z" fill="none" stroke="#FACC15" strokeWidth="1.5" />
      </svg>
      <svg
        className="absolute bottom-20 right-[5%] w-20 h-12 md:w-28 md:h-16 animate-float opacity-40"
        style={{ animationDelay: "1.5s" }}
        viewBox="0 0 100 56"
      >
        <path d="M24 46a16 16 0 0 1 2-32 22 22 0 0 1 42-4 18 18 0 0 1 8 36Z" fill="#818CF8" />
      </svg>
      <svg
        className="absolute top-[34%] right-[3%] w-8 h-8 animate-float opacity-75 hidden md:block"
        style={{ animationDelay: "0.8s" }}
        viewBox="0 0 32 32"
      >
        <rect x="6" y="6" width="20" height="20" rx="3" transform="rotate(45 16 16)" fill="none" stroke="#FACC15" strokeWidth="2" />
      </svg>
      <svg className="absolute top-[28%] left-[2.5%] w-3.5 h-3.5 animate-twinkle" viewBox="0 0 10 10">
        <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4Z" fill="#F472B6" />
      </svg>
      <svg className="absolute bottom-[22%] left-[8%] w-3 h-3 animate-twinkle" style={{ animationDelay: "1s" }} viewBox="0 0 10 10">
        <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4Z" fill="#FACC15" />
      </svg>

      {/* film grain */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: "var(--noise)", backgroundSize: "160px 160px" }}
      />
    </div>
  );
}

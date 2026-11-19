"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";
import confetti from "canvas-confetti";
import { Info, Lock, Sparkles } from "lucide-react";
import GeneraticsMedallion from "@/components/GeneraticsMedallion";
import { soundManager } from "@/lib/audio";
import { SpinResult, Stance } from "@/lib/types";

interface SpinWheelProps {
  themes: { id: string; name: string }[];
  isSpinOpen: boolean;
  onSpinComplete: (result: SpinResult) => void;
  /** Called when the server says the session is no longer valid (HTTP 401). */
  onUnauthorized?: () => void;
}

interface SpinApiData {
  error?: string;
  alreadySpun?: boolean;
  themeName?: string;
  motionText?: string;
  stance?: Stance;
  spunAt?: string;
  participant?: SpinResult["participant"];
}

interface SpinOutcome {
  ok: boolean;
  status: number;
  data: SpinApiData;
}

type LampState = "idle" | "flash" | "settled";

const FALLBACK_THEMES = [
  { id: "1", name: "Teknologi & AI" },
  { id: "2", name: "Pendidikan Tinggi" },
  { id: "3", name: "Karier & Kerja" },
  { id: "4", name: "Sosial & Publik" },
];

const SEGMENT_TONES = [
  { fill: "#172152", text: "#FAF6EB", star: "#FACC15" },
  { fill: "#FAF6EB", text: "#0E152E", star: "#CA8A04" },
  { fill: "#818CF8", text: "#0E152E", star: "#FAF6EB" },
  { fill: "#FACC15", text: "#0E152E", star: "#0E152E" },
];

const BULB_COUNT = 24;
const LABEL_RADIUS = 52;
const WHEEL_RADIUS = 86;
const FINAL_DECEL_DEGREES = 215;
const EASE_DECEL: [number, number, number, number] = [0.15, 0.85, 0.25, 1];

const mod = (n: number, m: number) => ((n % m) + m) % m;

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [Number((100 + r * Math.sin(a)).toFixed(3)), Number((100 - r * Math.cos(a)).toFixed(3))];
}

function splitLabel(name: string): string[] {
  const clean = name.trim().toUpperCase();
  const words = clean.split(/\s+/);
  if (clean.length <= 11 || words.length === 1) return [clean];
  let bestIndex = 1;
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ").length;
    const right = words.slice(i).join(" ").length;
    const score = Math.max(left, right);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return [words.slice(0, bestIndex).join(" "), words.slice(bestIndex).join(" ")];
}

function friendlyError(outcome: SpinOutcome): string {
  if (outcome.status === 0) {
    return "Koneksi terputus sebelum undian selesai. Periksa internetmu lalu coba lagi.";
  }
  if (outcome.status === 401) return "Sesi masuk kamu berakhir. Silakan masuk kembali.";
  if (outcome.status >= 500) return "Server sedang sibuk. Tunggu sebentar lalu coba lagi.";
  return outcome.data.error || "Undian belum bisa diproses. Coba lagi sebentar lagi ya.";
}

function toResult(data: SpinApiData): SpinResult {
  return {
    themeName: data.themeName ?? "",
    motionText: data.motionText ?? "",
    stance: data.stance ?? "PRO",
    spunAt: data.spunAt ?? new Date().toISOString(),
    participant: data.participant ?? { username: "", fullName: "", sessionBatch: "" },
  };
}

export default function SpinWheel({
  themes,
  isSpinOpen,
  onSpinComplete,
  onUnauthorized,
}: SpinWheelProps) {
  const reduce = useReducedMotion();
  const displayThemes = themes.length > 0 ? themes : FALLBACK_THEMES;
  const count = displayThemes.length;
  const segmentAngle = 360 / count;

  const [isSpinning, setIsSpinning] = useState(false);
  const [trail, setTrail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lampState, setLampState] = useState<LampState>("idle");
  const [flashLamp, setFlashLamp] = useState<Stance>("PRO");
  const [settledStance, setSettledStance] = useState<Stance | null>(null);
  const [bulbPhase, setBulbPhase] = useState(0);

  const rotation = useMotionValue(0);
  const scale = useMotionValue(1);
  const needleRot = useMotionValue(0);

  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const tickEnabledRef = useRef(false);
  const lastIdxRef = useRef(0);
  const lastTickAtRef = useRef(0);
  const lastSampleRef = useRef({ v: 0, t: 0 });
  const idleRef = useRef<AnimationPlaybackControls | null>(null);
  const controlsRef = useRef<Set<AnimationPlaybackControls>>(new Set());
  const timeoutsRef = useRef<number[]>([]);
  const flashTimeoutRef = useRef<number | null>(null);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timeoutsRef.current.push(id);
  }, []);

  const stopFlash = useCallback(() => {
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
  }, []);

  const track = useCallback((controls: AnimationPlaybackControls) => {
    controlsRef.current.add(controls);
    return controls;
  }, []);

  // Cleanup everything on unmount.
  useEffect(() => {
    mountedRef.current = true;
    const controls = controlsRef.current;
    return () => {
      mountedRef.current = false;
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
      if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
      controls.forEach((c) => c.stop());
      controls.clear();
      idleRef.current?.stop();
      if (busyRef.current) soundManager.resumeBGMAfterSpin();
    };
  }, []);

  // Slow idle drift so the wheel feels alive before / without a spin.
  useEffect(() => {
    if (reduce || isSpinning) return;
    const ctl = animate(rotation, rotation.get() + 360, {
      duration: isSpinOpen ? 90 : 140,
      ease: "linear",
      repeat: Infinity,
    });
    idleRef.current = ctl;
    return () => ctl.stop();
  }, [reduce, isSpinning, isSpinOpen, rotation]);

  // Marquee bulbs.
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(
      () => setBulbPhase((p) => (p + 1) % BULB_COUNT),
      isSpinning ? 110 : 650
    );
    return () => window.clearInterval(id);
  }, [reduce, isSpinning]);

  const flick = useCallback(() => {
    if (reduce) return;
    needleRot.set(-26);
    animate(needleRot, 0, { type: "spring", stiffness: 600, damping: 14 });
  }, [reduce, needleRot]);

  const handleUpdate = useCallback(
    (v: number) => {
      const now = performance.now();
      const local = mod(-v, 360);
      const idx = Math.floor(local / segmentAngle) % count;
      if (idx !== lastIdxRef.current) {
        lastIdxRef.current = idx;
        if (tickEnabledRef.current && !reduce) {
          flick();
          if (now - lastTickAtRef.current >= 35) {
            lastTickAtRef.current = now;
            const dt = Math.max(now - lastSampleRef.current.t, 1);
            const velocity = (Math.abs(v - lastSampleRef.current.v) / dt) * 1000;
            soundManager.playTick(Math.min(1.9, Math.max(0.75, 0.75 + velocity / 1400)));
          }
        }
      }
      lastSampleRef.current = { v, t: now };
    },
    [segmentAngle, count, reduce, flick]
  );

  const landingAngle = (themeName?: string) => {
    const wanted = (themeName ?? "").trim().toLowerCase();
    const found = displayThemes.findIndex((t) => t.name.trim().toLowerCase() === wanted);
    const index = found >= 0 ? found : 0;
    // Never land within 12% of a segment boundary.
    return index * segmentAngle + segmentAngle * (0.12 + Math.random() * 0.76);
  };

  const fireConfetti = (stance: Stance) => {
    const stanceColor = stance === "PRO" ? "#10B981" : "#F97316";
    const colors = [
      "#FACC15", "#FACC15", "#FDE047", "#818CF8", "#818CF8",
      stanceColor, stanceColor, "#FAF6EB", "#F472B6",
    ];
    const shapes: confetti.Shape[] = ["star", "circle"];
    const base = { colors, shapes, disableForReducedMotion: true };
    try {
      confetti({ ...base, particleCount: 90, spread: 100, origin: { x: 0.5, y: 0.55 }, scalar: 1.2 });
      later(() => {
        confetti({ ...base, particleCount: 55, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
        confetti({ ...base, particleCount: 55, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
      }, 250);
    } catch {
      // Confetti is best-effort.
    }
  };

  const startFlash = () => {
    stopFlash();
    setLampState("flash");
    let delay = 80;
    let side: Stance = "PRO";
    const step = () => {
      if (!mountedRef.current) return;
      side = side === "PRO" ? "KONTRA" : "PRO";
      setFlashLamp(side);
      delay = Math.min(delay * 1.1, 300);
      flashTimeoutRef.current = window.setTimeout(step, delay);
    };
    flashTimeoutRef.current = window.setTimeout(step, delay);
  };

  const abort = (message: string) => {
    stopFlash();
    tickEnabledRef.current = false;
    soundManager.resumeBGMAfterSpin();
    setTrail(false);
    setLampState("idle");
    setError(message);
    animate(scale, 1, { type: "spring", stiffness: 300, damping: 18 });
    busyRef.current = false;
    setIsSpinning(false);
  };

  const requestSpin = async (): Promise<SpinOutcome> => {
    try {
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json().catch(() => ({}))) as SpinApiData;
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: {} };
    }
  };

  const reveal = (data: SpinApiData, withConfetti: boolean) => {
    stopFlash();
    tickEnabledRef.current = false;
    setTrail(false);
    soundManager.playFanfare();
    window.setTimeout(() => {
      soundManager.resumeBGMAfterSpin();
    }, 2800);
    animate(scale, 1, { type: "spring", stiffness: 400, damping: 17 });
    if (withConfetti) fireConfetti(data.stance ?? "PRO");
    later(() => {
      busyRef.current = false;
      setIsSpinning(false);
      onSpinComplete(toResult(data));
    }, withConfetti ? 500 : 0);
  };

  const handleSpin = async () => {
    if (busyRef.current || !isSpinOpen) return;
    busyRef.current = true;
    setError(null);
    setIsSpinning(true);
    setSettledStance(null);
    idleRef.current?.stop();

    lastIdxRef.current = Math.floor(mod(-rotation.get(), 360) / segmentAngle) % count;
    soundManager.pauseBGMForSpin();
    soundManager.playSpinLaunch();

    // The request runs in parallel with the anticipation phase.
    let settled = false;
    const request = requestSpin().then((outcome) => {
      settled = true;
      return outcome;
    });

    if (reduce) {
      const outcome = await request;
      if (!mountedRef.current) return;
      if (!outcome.ok) {
        if (outcome.status === 401) onUnauthorized?.();
        if (outcome.data?.alreadySpun) {
          reveal(outcome.data, false);
          return;
        }
        abort(friendlyError(outcome));
        return;
      }
      if (outcome.data.alreadySpun) {
        reveal(outcome.data, false);
        return;
      }
      const from = rotation.get();
      const to = from + mod(-landingAngle(outcome.data.themeName) - from, 360);
      await track(animate(rotation, to, { duration: 0.5, ease: "easeOut" }));
      if (!mountedRef.current) return;
      setSettledStance(outcome.data.stance ?? null);
      setLampState("settled");
      reveal(outcome.data, true);
      return;
    }

    // Phase 1: anticipation (0 - 0.4s)
    const start = rotation.get();
    await Promise.all([
      track(animate(rotation, start - 10, { duration: 0.4, ease: "easeOut" })),
      track(animate(scale, [1, 0.955, 0.972, 0.95], { duration: 0.4, ease: "easeInOut" })),
    ]);
    if (!mountedRef.current) return;

    // Phase 2: high-speed shuffle
    tickEnabledRef.current = true;
    setTrail(true);
    startFlash();

    // If the server is slower than the anticipation, keep the wheel moving.
    while (!settled && mountedRef.current) {
      await track(
        animate(rotation, rotation.get() + 360, { duration: 0.7, ease: "linear", onUpdate: handleUpdate })
      );
    }
    const outcome = await request;
    if (!mountedRef.current) return;

    if (!outcome.ok) {
      if (outcome.status === 401) onUnauthorized?.();
      if (outcome.data?.alreadySpun) {
        reveal(outcome.data, false);
        return;
      }
      abort(friendlyError(outcome));
      return;
    }
    if (outcome.data.alreadySpun) {
      reveal(outcome.data, false);
      return;
    }

    const from = rotation.get();
    const rough = from + 1800 + FINAL_DECEL_DEGREES;
    const finalRotation = rough + mod(-landingAngle(outcome.data.themeName) - rough, 360);
    const phase2End = finalRotation - FINAL_DECEL_DEGREES;

    await track(animate(rotation, phase2End, { duration: 2.1, ease: "linear", onUpdate: handleUpdate }));
    if (!mountedRef.current) return;

    // Phase 3: dramatic deceleration
    setTrail(false);
    await track(
      animate(rotation, finalRotation, { duration: 1.4, ease: EASE_DECEL, onUpdate: handleUpdate })
    );
    if (!mountedRef.current) return;

    // Phase 4: grand reveal
    stopFlash();
    setSettledStance(outcome.data.stance ?? null);
    setLampState("settled");
    reveal(outcome.data, true);
  };

  const segments = useMemo(
    () =>
      displayThemes.map((theme, i) => {
        let tone = i % SEGMENT_TONES.length;
        if (i === count - 1 && tone === 0 && count > 1) tone = 2;
        const colors = SEGMENT_TONES[tone];
        const a0 = i * segmentAngle;
        const a1 = (i + 1) * segmentAngle;
        const mid = a0 + segmentAngle / 2;
        const [x0, y0] = polar(WHEEL_RADIUS, a0);
        const [x1, y1] = polar(WHEEL_RADIUS, a1);
        const path =
          count === 1
            ? null
            : `M 100 100 L ${x0} ${y0} A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${segmentAngle > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;

        const lines = splitLabel(theme.name);
        const longest = Math.max(...lines.map((l) => l.length));
        const arcWidth = 2 * LABEL_RADIUS * Math.sin((Math.min(segmentAngle, 180) * Math.PI) / 360);
        const byWidth = 46 / (longest * 0.7);
        const byArc = (arcWidth * 0.78) / (lines.length * 1.2);
        const fontSize = Math.max(3.2, Math.min(7.5, byWidth, byArc));
        const [sx, sy] = polar(80.5, mid);

        return { id: theme.id || String(i), colors, path, mid, lines, fontSize, sx, sy, a0 };
      }),
    [displayThemes, count, segmentAngle]
  );

  const bulbs = useMemo(
    () =>
      Array.from({ length: BULB_COUNT }, (_, i) => {
        const [x, y] = polar(92.5, (i * 360) / BULB_COUNT);
        return { i, x, y };
      }),
    []
  );

  const canSpin = isSpinOpen && !isSpinning;

  const lampLit = (side: Stance) => {
    if (lampState === "flash") return flashLamp === side;
    if (lampState === "settled") return settledStance === side;
    return false;
  };

  const lamp = (side: Stance) => {
    const lit = lampLit(side);
    const face = side === "PRO" ? "#10B981" : "#F97316";
    return (
      <motion.span
        key={`${side}-${lampState === "settled" ? "s" : "f"}`}
        initial={lampState === "settled" && lit ? { scale: 1.35 } : false}
        animate={{ scale: lit ? 1.06 : 0.96 }}
        transition={{ type: "spring", stiffness: 500, damping: 14 }}
        className="rounded-full px-4 py-1.5 font-sans text-xs font-black uppercase tracking-wider transition-[background-color,color,box-shadow] duration-100"
        style={{
          backgroundColor: lit ? face : "#182245",
          color: lit ? "#0E152E" : "rgba(250,246,235,0.45)",
          boxShadow: lit ? `0 0 18px ${face}` : "inset 0 0 0 1px rgba(250,246,235,0.12)",
        }}
      >
        Tim {side === "PRO" ? "Pro" : "Kontra"}
      </motion.span>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center">
      {!isSpinOpen && (
        <div
          className="relative mb-5 w-full max-w-sm px-8 py-3 text-center"
          style={{
            background: "#FAF6EB",
            clipPath: "polygon(0 0, 100% 0, 96% 50%, 100% 100%, 0 100%, 4% 50%)",
          }}
          role="status"
        >
          <p className="flex items-center justify-center gap-2 font-display text-base font-semibold text-[#0E152E]">
            <Lock className="h-4 w-4 text-[#CA8A04]" aria-hidden />
            Panitia belum membuka sesi
          </p>
          <p className="mt-0.5 font-sans text-[11px] text-[#0E152E]/70">
            Roda akan terbuka begitu moderator memberi aba-aba.
          </p>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            key="spin-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="alert"
            className="mb-4 flex w-full max-w-sm items-start gap-2.5 rounded-2xl border border-[#F472B6]/50 bg-[#FCE7F3] px-4 py-3 font-sans text-sm text-[#831843]"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wheel stage */}
      <div className="relative mt-4 w-[min(84vw,24rem)] aspect-square" role="img" aria-label="Roda undian tema Generatics">
        {/* Glow */}
        <div
          aria-hidden
          className={`pointer-events-none absolute -inset-[14%] rounded-full transition-opacity duration-500 ${
            isSpinning ? "opacity-90" : isSpinOpen ? "opacity-40" : "opacity-20"
          }`}
          style={{
            background:
              "radial-gradient(circle, rgba(250,204,21,0.55) 0%, rgba(129,140,248,0.22) 48%, transparent 70%)",
          }}
        />

        {/* Star-trail halo */}
        <div
          aria-hidden
          className={`pointer-events-none absolute -inset-[3%] rounded-full transition-opacity duration-500 ${
            trail ? "animate-spin opacity-90" : "opacity-0"
          }`}
          style={{
            animationDuration: "0.6s",
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(129,140,248,0.0) 210deg, rgba(129,140,248,0.55) 290deg, rgba(250,204,21,0.9) 355deg, transparent 360deg)",
            WebkitMaskImage: "radial-gradient(circle, transparent 66%, #000 68%, #000 74%, transparent 76%)",
            maskImage: "radial-gradient(circle, transparent 66%, #000 68%, #000 74%, transparent 76%)",
          }}
        />

        <motion.div className="absolute inset-0 will-change-transform" style={{ scale }}>
          <div className="absolute inset-0 rounded-full shadow-[0_18px_40px_rgba(0,0,0,0.55)]" />

          <motion.div className="absolute inset-0 will-change-transform" style={{ rotate: rotation }}>
            <svg viewBox="0 0 200 200" className="h-full w-full font-sans" aria-hidden>
              <circle cx="100" cy="100" r={WHEEL_RADIUS} fill="#172152" />
              {segments.map((s) => (
                <g key={s.id}>
                  {s.path ? (
                    <path d={s.path} fill={s.colors.fill} stroke="#FACC15" strokeWidth="0.7" strokeLinejoin="round" />
                  ) : (
                    <circle cx="100" cy="100" r={WHEEL_RADIUS} fill={s.colors.fill} />
                  )}
                  <g transform={`rotate(${s.mid} 100 100)`}>
                    <text
                      transform={`translate(100 ${100 - LABEL_RADIUS}) rotate(-90)`}
                      textAnchor="middle"
                      fill={s.colors.text}
                      fontWeight={800}
                      fontSize={s.fontSize}
                      letterSpacing="0.04em"
                      className="select-none"
                    >
                      {s.lines.map((line, li) => (
                        <tspan
                          key={li}
                          x="0"
                          dy={li === 0 ? `${-((s.lines.length - 1) * 0.6)}em` : "1.2em"}
                          dominantBaseline="central"
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                  <path
                    transform={`translate(${s.sx} ${s.sy}) rotate(${s.mid}) scale(0.9)`}
                    d="M0 -3.2 L0.9 -0.9 L3.2 0 L0.9 0.9 L0 3.2 L-0.9 0.9 L-3.2 0 L-0.9 -0.9 Z"
                    fill={s.colors.star}
                  />
                </g>
              ))}
            </svg>
          </motion.div>

          {/* Static rim with marquee bulbs */}
          <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <circle cx="100" cy="100" r="92.5" fill="none" stroke="#0B1226" strokeWidth="15" />
            <circle cx="100" cy="100" r="99.2" fill="none" stroke="#FACC15" strokeWidth="1.6" />
            <circle cx="100" cy="100" r="85.7" fill="none" stroke="#FACC15" strokeWidth="1.2" />
            {bulbs.map((b) => {
              const lit = reduce
                ? b.i % 2 === 0
                : isSpinning
                ? (b.i + bulbPhase) % 3 === 0
                : (b.i + bulbPhase) % 2 === 0;
              return (
                <g key={b.i}>
                  {lit && <circle cx={b.x} cy={b.y} r="4.4" fill="rgba(250,204,21,0.35)" />}
                  <circle cx={b.x} cy={b.y} r="2.4" fill={lit ? "#FEF08A" : "#7A6420"} />
                </g>
              );
            })}
          </svg>

          {/* Hub */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 flex aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <GeneraticsMedallion variant="hub" size="sm" className="h-full w-full" />
          </div>
        </motion.div>

        {/* Star needle */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 z-30 w-9 -translate-x-1/2 -translate-y-[42%] drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)]"
          style={{ rotate: needleRot, transformOrigin: "50% 30%" }}
        >
          <svg viewBox="0 0 40 56" className="h-auto w-full">
            <path d="M11 26 L20 54 L29 26 Z" fill="#FACC15" stroke="#0E152E" strokeWidth="2" strokeLinejoin="round" />
            <path
              d="M20 2 L24.5 14.5 L38 20 L24.5 25.5 L20 38 L15.5 25.5 L2 20 L15.5 14.5 Z"
              fill="#FACC15"
              stroke="#0E152E"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="20" cy="20" r="3.2" fill="#0E152E" />
          </svg>
        </motion.div>
      </div>

      {/* Arcade lamps */}
      <div className="mt-6 flex items-center justify-center gap-3" aria-live="off">
        {lamp("PRO")}
        <span aria-hidden className="star-clip h-3 w-3 bg-[#FACC15]" />
        {lamp("KONTRA")}
      </div>

      {/* CTA */}
      <div className="mt-7 flex flex-col items-center">
        <motion.div
          initial="rest"
          whileHover={canSpin ? "hover" : undefined}
          whileTap={canSpin ? "tap" : undefined}
          className="relative"
        >
          <motion.button
            type="button"
            onClick={handleSpin}
            disabled={!canSpin}
            onMouseEnter={() => canSpin && soundManager.playHover()}
            variants={{
              rest: { scale: 1 },
              hover: { scale: 1.05, boxShadow: "0 0 0 3px rgba(250,204,21,0.25), 0 0 42px rgba(250,204,21,0.7)" },
              tap: { scale: 0.95 },
            }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="btn-gold relative inline-flex items-center justify-center gap-2.5 px-6 py-4 text-sm font-black uppercase tracking-wider sm:px-9 sm:text-base"
          >
            <Sparkles className="h-5 w-5 fill-current" aria-hidden />
            <span>{isSpinning ? "Memutar…" : "Spin Tema, Mosi & Posisi"}</span>
            <Sparkles className="h-5 w-5 fill-current" aria-hidden />
          </motion.button>

          {[
            { cls: "-left-3 -top-3", c: "#FACC15", s: 14 },
            { cls: "-right-2 -top-4", c: "#FDE047", s: 10 },
            { cls: "-bottom-3 -left-1", c: "#818CF8", s: 10 },
            { cls: "-bottom-4 -right-3", c: "#F472B6", s: 8 },
          ].map((p, i) => (
            <motion.span
              key={i}
              aria-hidden
              variants={{
                rest: { opacity: 0, scale: 0, rotate: -40 },
                hover: { opacity: 1, scale: 1, rotate: 0 },
                tap: { opacity: 0, scale: 0 },
              }}
              transition={{ type: "spring", stiffness: 400, damping: 17, delay: i * 0.04 }}
              className={`star-clip pointer-events-none absolute ${p.cls}`}
              style={{ width: p.s, height: p.s, backgroundColor: p.c }}
            />
          ))}
        </motion.div>

        <p className="mt-3 text-center font-display text-sm italic text-[#FAF6EB]/70">
          hanya 1 kali spin &mdash; hasilnya terkunci selamanya
        </p>
      </div>
    </div>
  );
}

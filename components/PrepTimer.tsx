"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Play, Pause, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { soundManager } from "@/lib/audio";

interface PrepTimerProps {
  initialSeconds?: number;
  username?: string;
  spunAt?: string | null;
  className?: string;
}

type Status = "idle" | "running" | "paused" | "done";

interface StoredTimer {
  status: Status;
  remainingMs: number;
  endTimestamp?: number;
  initialSeconds: number;
}

const STAR_COUNT = 8;
const URGENT_MS = 30_000;

function restoreTimer(raw: string | null, now: number): StoredTimer | null {
  if (!raw) return null;
  const saved: StoredTimer | null = JSON.parse(raw);
  if (!saved || !["idle", "running", "paused", "done"].includes(saved.status) ||
      !Number.isFinite(saved.remainingMs) || saved.remainingMs < 0 ||
      !Number.isFinite(saved.initialSeconds) || saved.initialSeconds <= 0) return null;
  if (saved.status === "running") {
    if (!Number.isFinite(saved.endTimestamp)) return null;
    const remainingMs = Math.max(0, saved.endTimestamp! - now);
    return { ...saved, remainingMs, status: remainingMs > 0 ? "running" : "done" };
  }
  if (saved.status === "done") return { ...saved, remainingMs: 0 };
  if (saved.status === "paused" && saved.remainingMs === 0) return { ...saved, status: "done" };
  return saved;
}

function storeTimer(key: string, value: StoredTimer | null) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    // A blocked/full store must not stop the in-memory countdown.
  }
}

export default function PrepTimer({
  initialSeconds = 300,
  username,
  spunAt,
  className = "",
}: PrepTimerProps) {
  const reduce = useReducedMotion();
  const totalMs = (Number.isFinite(initialSeconds) ? Math.max(1, Math.round(initialSeconds)) : 300) * 1000;
  
  const spunId = spunAt ? new Date(spunAt).getTime() : "init";
  const storageKey = `generatics_timer_${username || "anonymous"}_${spunId}`;

  const [status, setStatus] = useState<Status>("idle");
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const endRef = useRef(0);
  const alertedRef = useRef(false);

  useEffect(() => {
    endRef.current = 0;
    alertedRef.current = false;
    setStatus("idle");
    setRemainingMs(totalMs);
    setAnnouncement("");
    try {
      const saved = restoreTimer(localStorage.getItem(storageKey), Date.now());
      if (!saved) return;
      endRef.current = saved.endTimestamp || 0;
      setStatus(saved.status);
      setRemainingMs(saved.remainingMs);
    } catch {
      // Storage is optional; fall back to an idle timer for this spin.
    }
  }, [storageKey, totalMs]);

  const remaining = remainingMs ?? totalMs;

  // Drift-free ticking: derived from absolute end timestamp
  useEffect(() => {
    if (status !== "running") return;

    const id = window.setInterval(() => {
      const left = Math.max(0, endRef.current - Date.now());
      setRemainingMs(left);

      if (left > 0 && left <= URGENT_MS && !alertedRef.current && totalMs > URGENT_MS) {
        alertedRef.current = true;
        soundManager.playTimerAlert();
        setAnnouncement("Tersisa 30 detik.");
      }

      if (left <= 0) {
        window.clearInterval(id);
        soundManager.playTimerEnd();
        setAnnouncement("Waktu persiapan selesai.");
        setStatus("done");
        storeTimer(storageKey, { status: "done", remainingMs: 0, initialSeconds });
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [status, totalMs, storageKey, initialSeconds]);

  const handleStart = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundManager.playTimerAlert();
    alertedRef.current = false;
    const end = Date.now() + totalMs;
    endRef.current = end;
    setRemainingMs(totalMs);
    setAnnouncement("Waktu persiapan telah dimulai. Timer berjalan hingga selesai atau dijeda.");
    setStatus("running");

    storeTimer(storageKey, {
      status: "running",
      remainingMs: totalMs,
      endTimestamp: end,
      initialSeconds,
    });
  };

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    const currentLeft = Math.max(0, endRef.current - Date.now());
    setRemainingMs(currentLeft);
    setStatus("paused");
    setAnnouncement("Timer persiapan dijeda.");

    storeTimer(storageKey, {
      status: "paused",
      remainingMs: currentLeft,
      initialSeconds,
    });
  };

  const handleResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    const currentLeft = remainingMs ?? totalMs;
    const end = Date.now() + currentLeft;
    endRef.current = end;
    setStatus("running");
    setAnnouncement("Timer persiapan dilanjutkan.");

    storeTimer(storageKey, {
      status: "running",
      remainingMs: currentLeft,
      endTimestamp: end,
      initialSeconds,
    });
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    alertedRef.current = false;
    setStatus("idle");
    setRemainingMs(totalMs);
    setAnnouncement("Timer persiapan telah direset ke awal.");

    storeTimer(storageKey, null);
  };

  const secondsLeft = Math.ceil(remaining / 1000);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = Math.min(1, Math.max(0, remaining / totalMs));
  const isDone = status === "done";
  const isUrgent = status !== "idle" && !isDone && secondsLeft <= 30;
  const isBeating = isUrgent && status === "running" && !reduce;

  const surface = isUrgent
    ? "bg-[#3B1707] border-[#F97316]/70 shadow-[0_0_28px_rgba(249,115,22,0.35)]"
    : "bg-[#0E152E] border-[#233261] shadow-[0_10px_30px_rgba(0,0,0,0.35)]";
  const digitColor = isUrgent ? "text-[#FDBA74]" : isDone ? "text-[#FAF6EB]/70" : "text-[#FAF6EB]";
  const accent = isUrgent ? "#F97316" : "#FACC15";

  const chip = isDone
    ? "Selesai"
    : status === "paused"
    ? "Dijeda"
    : isUrgent
    ? "30 Detik Terakhir"
    : status === "running"
    ? "Berjalan Non-Stop"
    : "Siap Dimulai";

  return (
    <motion.div
      animate={isBeating ? { scale: [1, 1.018, 1, 1.01, 1] } : { scale: 1 }}
      transition={
        isBeating
          ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.3 }
      }
      className={`relative w-full overflow-hidden rounded-2xl border px-4 pb-6 pt-5 transition-colors duration-500 sm:px-6 ${surface} ${className}`}
    >
      {/* Ticket perforation */}
      <div
        aria-hidden
        className="absolute inset-x-3 top-0 border-t-2 border-dashed transition-colors duration-500"
        style={{ borderColor: `${accent}99` }}
      />

      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="font-sans text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#FAF6EB]/60">
          Waktu Persiapan Argumen (Case Building)
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-[#0E152E] transition-colors duration-500"
          style={{ backgroundColor: accent }}
        >
          {chip}
        </span>
      </div>

      {/* Timer Digits */}
      <div
        aria-live="off"
        className={`mt-3 text-center font-mono text-5xl font-medium tabular-nums tracking-wider transition-colors duration-500 sm:text-6xl ${digitColor}`}
      >
        {String(minutes).padStart(2, "0")}
        <span className={status === "running" && !reduce ? "animate-twinkle" : ""}>:</span>
        {String(seconds).padStart(2, "0")}
      </div>

      {/* Star-path progress */}
      <div className="relative mx-2 mt-4 h-5" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-[#FAF6EB]/10">
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-linear"
            style={{
              width: `${progress * 100}%`,
              background: isUrgent
                ? "linear-gradient(90deg, #F97316, #FDBA74)"
                : "linear-gradient(90deg, #FACC15, #FDE047)",
            }}
          />
        </div>
        {Array.from({ length: STAR_COUNT }, (_, i) => {
          const pos = (i + 1) / (STAR_COUNT + 1);
          const lit = progress >= pos;
          return (
            <span
              key={i}
              className="star-clip absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
              style={{
                left: `${pos * 100}%`,
                backgroundColor: lit ? accent : "rgba(250,246,235,0.18)",
                transform: `translate(-50%, -50%) scale(${lit ? 1 : 0.7})`,
              }}
            />
          );
        })}
      </div>

      {/* Alert Warning Box when timer is running */}
      {status === "running" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left font-sans text-xs text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <div className="space-y-0.5">
            <strong className="block font-bold text-amber-300">
              Waktu Persiapan Sedang Berjalan
            </strong>
            <p className="text-[11px] leading-relaxed text-amber-200/80">
              Gunakan waktu ini untuk menyusun argumen debat Anda secara optimal.
            </p>
          </div>
        </motion.div>
      )}

      {status === "paused" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 font-sans text-xs font-semibold text-sky-200"
        >
          <span>Timer sedang dijeda. Klik Lanjutkan saat sudah siap.</span>
        </motion.div>
      )}

      {isDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 font-sans text-xs font-bold text-emerald-300"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Waktu persiapan selesai! Bersiaplah menyampaikan argumen kepada dewan juri.</span>
        </motion.div>
      )}

      {/* Controls: Pure timer controls only (no duplicate closing/announcement buttons) */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {status === "idle" && (
          <button
            type="button"
            onClick={handleStart}
            onMouseEnter={() => soundManager.playHover()}
            aria-label="Mulai timer persiapan"
            className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 font-sans text-sm font-black uppercase tracking-wider"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden />
            Mulai Persiapan
          </button>
        )}

        {status === "running" && (
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FACC15]/40 bg-[#FAF6EB]/5 px-4 py-2 font-sans text-xs font-extrabold uppercase tracking-widest text-[#FACC15] shadow-inner">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FACC15] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FACC15]" />
              </span>
              <span>Berjalan</span>
            </div>

            <button
              type="button"
              onClick={handlePause}
              onMouseEnter={() => soundManager.playHover()}
              aria-label="Jeda timer persiapan"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#FAF6EB]/20 bg-[#FAF6EB]/10 px-4 py-2 font-sans text-xs font-bold uppercase tracking-wider text-[#FAF6EB] transition-colors hover:bg-[#FAF6EB]/20 active:scale-95"
            >
              <Pause className="h-3.5 w-3.5 fill-current" />
              <span>Jeda</span>
            </button>
          </div>
        )}

        {status === "paused" && (
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleResume}
              onMouseEnter={() => soundManager.playHover()}
              aria-label="Lanjutkan timer persiapan"
              className="btn-gold inline-flex items-center justify-center gap-2 px-5 py-2.5 font-sans text-xs font-black uppercase tracking-wider"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Lanjutkan</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              onMouseEnter={() => soundManager.playHover()}
              aria-label="Reset timer persiapan"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#FAF6EB]/20 bg-[#FAF6EB]/10 px-4 py-2 font-sans text-xs font-bold uppercase tracking-wider text-[#FAF6EB]/80 transition-colors hover:bg-[#FAF6EB]/20 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        )}

        {isDone && (
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              onMouseEnter={() => soundManager.playHover()}
              aria-label="Reset timer persiapan"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#FAF6EB]/20 bg-[#FAF6EB]/10 px-4 py-2 font-sans text-xs font-bold uppercase tracking-wider text-[#FAF6EB]/70 transition-colors hover:bg-[#FAF6EB]/20 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Ulangi Timer</span>
            </button>
          </div>
        )}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </motion.div>
  );
}

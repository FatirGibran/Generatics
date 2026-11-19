"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Play, AlertTriangle, CheckCircle2 } from "lucide-react";
import { soundManager } from "@/lib/audio";

interface PrepTimerProps {
  initialSeconds?: number;
  className?: string;
  onCompleteSession?: () => void;
}

type Status = "idle" | "running" | "done";

const STAR_COUNT = 8;
const URGENT_MS = 30_000;

export default function PrepTimer({
  initialSeconds = 300,
  className = "",
  onCompleteSession,
}: PrepTimerProps) {
  const reduce = useReducedMotion();
  const totalMs = Math.max(1, Math.round(initialSeconds)) * 1000;

  const [status, setStatus] = useState<Status>("idle");
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const endRef = useRef(0);
  const alertedRef = useRef(false);

  const remaining = remainingMs ?? totalMs;

  // Drift-free ticking: always derive the remaining time from an absolute end timestamp.
  useEffect(() => {
    if (status !== "running") return;

    const id = setInterval(() => {
      const left = Math.max(0, endRef.current - Date.now());
      setRemainingMs(left);

      if (left > 0 && left <= URGENT_MS && !alertedRef.current && totalMs > URGENT_MS) {
        alertedRef.current = true;
        soundManager.playTimerAlert();
        setAnnouncement("Tersisa 30 detik.");
      }

      if (left <= 0) {
        clearInterval(id);
        soundManager.playTimerEnd();
        setAnnouncement("Waktu persiapan selesai.");
        setStatus("done");
      }
    }, 250);

    return () => clearInterval(id);
  }, [status, totalMs]);

  const handleStart = () => {
    soundManager.playTimerAlert();
    alertedRef.current = false;
    endRef.current = Date.now() + totalMs;
    setRemainingMs(totalMs);
    setAnnouncement("Waktu persiapan telah dimulai. Timer berjalan terus tanpa jeda.");
    setStatus("running");
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
              Peringatan: Waktu Persiapan Sedang Berjalan!
            </strong>
            <p className="text-[11px] leading-relaxed text-amber-200/80">
              Timer berjalan terus tanpa jeda dan tidak dapat diulang demi menjaga objektivitas serta keadilan seleksi debat. Manfaatkan waktu ini untuk menyusun argumen Anda.
            </p>
          </div>
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

      {/* Controls: Only "Mulai Persiapan" when idle. Selesai button when done. */}
      <div className="mt-5 flex flex-col items-center justify-center gap-3">
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
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#FACC15]/40 bg-[#FAF6EB]/5 px-5 py-2 font-sans text-xs font-extrabold uppercase tracking-widest text-[#FACC15] shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FACC15] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FACC15]" />
            </span>
            <span>Timer Berjalan Non-Stop</span>
          </div>
        )}

        {status === "done" && onCompleteSession && (
          <motion.button
            type="button"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              soundManager.playFanfare();
              onCompleteSession();
            }}
            className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 font-sans text-sm font-black uppercase tracking-wider shadow-[0_4px_20px_rgba(250,204,21,0.45)]"
          >
            <span>Selesai &amp; Lanjut Pengumuman</span>
            <span aria-hidden>&rarr;</span>
          </motion.button>
        )}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </motion.div>
  );
}

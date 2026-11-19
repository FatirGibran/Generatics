"use client";

import type { PointerEvent, ReactNode } from "react";
import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Check, Lock, X } from "lucide-react";
import GeneraticsMedallion from "@/components/GeneraticsMedallion";
import { Stance } from "@/lib/types";

interface ResultCardProps {
  themeName: string;
  motionText: string;
  stance: Stance;
  spunAt?: string | null;
  participant?: {
    username: string;
    fullName?: string;
    sessionBatch?: string;
  } | null;
  className?: string;
  children?: ReactNode;
}

function Tape({ className, tone }: { className: string; tone: "gold" | "peri" | "cream" }) {
  const stripes = {
    gold: "repeating-linear-gradient(45deg, rgba(250,204,21,0.92) 0 6px, rgba(253,224,71,0.8) 6px 12px)",
    peri: "repeating-linear-gradient(45deg, rgba(129,140,248,0.9) 0 6px, rgba(165,180,252,0.8) 6px 12px)",
    cream: "repeating-linear-gradient(45deg, rgba(239,230,206,0.95) 0 6px, rgba(250,246,235,0.85) 6px 12px)",
  };
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-20 h-6 w-20 shadow-[0_2px_6px_rgba(0,0,0,0.25)] ${className}`}
      style={{
        background: stripes[tone],
        clipPath:
          "polygon(0 0, 4% 15%, 0 30%, 4% 45%, 0 60%, 4% 75%, 0 100%, 100% 100%, 96% 85%, 100% 70%, 96% 55%, 100% 40%, 96% 25%, 100% 0)",
      }}
    />
  );
}

export default function ResultCard({
  themeName,
  motionText,
  stance,
  spunAt,
  participant,
  className = "",
  children,
}: ResultCardProps) {
  const reduce = useReducedMotion();
  const isPro = stance === "PRO";

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 150, damping: 18 });
  const sy = useSpring(my, { stiffness: 150, damping: 18 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-5, 5]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [5, -5]);

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handlePointerLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const formattedDate = spunAt
    ? new Date(spunAt).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    : "Terkunci Resmi";

  const faceColor = isPro ? "#10B981" : "#F97316";
  const displayName = participant?.fullName || participant?.username || "-";

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 32, rotate: -3 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, rotate: -0.5 }}
      transition={{ type: "spring", stiffness: 240, damping: 18, mass: 0.9 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        rotateX: reduce ? 0 : rotateX,
        rotateY: reduce ? 0 : rotateY,
        transformPerspective: 1100,
      }}
      className={`relative mx-auto w-full max-w-2xl ${className}`}
    >
      <Tape tone="gold" className="-left-3 -top-2 -rotate-[32deg]" />
      <Tape tone="peri" className="-right-3 -top-2 rotate-[30deg]" />
      <Tape tone="cream" className="-bottom-2 -left-3 h-5 w-16 rotate-[28deg]" />
      <Tape tone="gold" className="-bottom-2 -right-3 h-5 w-16 -rotate-[30deg]" />

      <div className="patchwork-frame">
        <div className="paper relative overflow-hidden rounded-[20px] px-4 pb-5 pt-5 sm:px-8 sm:pb-7 sm:pt-7">
          {/* Watermark */}
          <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 opacity-[0.06]">
            <Image src="/logos/generatics.webp" alt="" width={224} height={224} className="h-full w-full object-contain" />
          </div>

          {/* Tiny star ornaments */}
          <span aria-hidden className="star-clip absolute right-5 top-[38%] h-2.5 w-2.5 bg-[#F472B6]" />
          <span aria-hidden className="star-clip absolute left-3 top-[52%] h-2 w-2 bg-[#F472B6]/80" />
          <span aria-hidden className="star-clip absolute bottom-24 right-8 h-3 w-3 bg-[#FACC15]" />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-3 border-b border-dashed border-[#0E152E]/25 pb-4">
            <GeneraticsMedallion variant="stamp" size="sm" className="shrink-0" />
            <div className="min-w-0">
              <p className="font-sans text-[10px] font-extrabold uppercase leading-snug tracking-[0.18em] text-[#0E152E] sm:text-xs">
                Official Motion Card &bull; Generatics 2026
              </p>
              <p className="mt-0.5 font-sans text-xs font-semibold text-[#4F46E5]">
                {participant?.sessionBatch ? `Babak I · ${participant.sessionBatch}` : "Babak I · Seleksi Individu"}
              </p>
            </div>
          </div>

          {/* Theme */}
          <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-sans text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#0E152E]/60">
              Kategori Tema
            </span>
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#CA8A04]/60 bg-[#FACC15]/20 px-3 py-1 font-sans text-xs font-bold text-[#0E152E]">
              <span aria-hidden className="star-clip h-3 w-3 shrink-0 bg-[#FACC15] drop-shadow-[0_0_1px_rgba(14,21,46,0.8)]" />
              <span className="min-w-0 break-words">{themeName}</span>
            </span>
          </div>

          {/* Motion (Clean typography without overlapping quote marks) */}
          <div className="relative z-10 mt-5 pt-1">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="font-sans text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#0E152E]/60">
                Mosi Resmi Debat
              </span>
              <span className="h-[1px] flex-1 bg-[#0E152E]/10" />
            </div>
            <div className="relative pl-4 sm:pl-5 border-l-[3.5px] border-[#FACC15]">
              <blockquote className="text-balance font-display text-[20px] sm:text-[24px] md:text-[28px] font-semibold leading-relaxed text-[#0E152E]">
                &ldquo;{motionText}&rdquo;
              </blockquote>
            </div>
          </div>

          {/* Stance ticket (Clean ticket without white artifact notch) */}
          <div className="relative z-10 mt-6 flex justify-center">
            <div className="relative w-full max-w-sm -rotate-2">
              <div
                className="relative flex items-stretch overflow-hidden rounded-xl shadow-[0_6px_14px_rgba(14,21,46,0.25)] ring-2 ring-inset ring-[#0E152E]/25"
                style={{ backgroundColor: faceColor }}
              >
                <div className="flex w-16 shrink-0 items-center justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0E152E] text-[#FAF6EB]">
                    {isPro ? <Check className="h-6 w-6" strokeWidth={3.5} aria-hidden /> : <X className="h-6 w-6" strokeWidth={3.5} aria-hidden />}
                  </span>
                </div>
                <div className="flex-1 border-l-2 border-dashed border-[#0E152E]/35 px-4 py-3">
                  <p className="font-sans text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0E152E]/85">
                    {isPro ? "Mendukung Mosi" : "Menolak Mosi"}
                  </p>
                  <p className="font-sans text-3xl font-black leading-none tracking-tight text-[#0E152E]">
                    {isPro ? "TIM PRO" : "TIM KONTRA"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Participant Info */}
          <div className="relative z-10 mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t border-dashed border-[#0E152E]/25 pt-4">
            <div className="min-w-0">
              <p className="font-sans text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#0E152E]/60">
                Peserta Terdaftar
              </p>
              <p className="break-words font-display text-lg font-bold leading-tight text-[#0E152E]">
                {displayName}
              </p>
              {participant?.username && (
                <p className="font-sans text-xs font-semibold tracking-wide text-[#0E152E]/70 mt-0.5">
                  NIM: {participant.username}
                </p>
              )}
            </div>
            <p className="font-sans text-xs font-semibold text-[#0E152E]/75">{formattedDate}</p>
          </div>

          {/* Locked ribbon */}
          <div className="relative z-10 mt-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#0E152E]/[0.07] px-3.5 py-1.5 font-sans text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0E152E]/70">
              <Lock className="h-3 w-3" aria-hidden />
              Hasil Terkunci Permanen
            </span>
          </div>

          {children && <div className="relative z-10 mt-5">{children}</div>}
        </div>
      </div>
    </motion.div>
  );
}

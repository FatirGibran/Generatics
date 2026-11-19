"use client";

import { useEffect, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Lock, LockOpen } from "lucide-react";
import type { Stance } from "@/lib/types";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E152E]";

export const labelCls = "block text-xs font-bold uppercase tracking-wider text-[#FAF6EB]/75 mb-1.5";
export const inputCls = "field-night w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm";

/** Layered night surface with a soft corner glow. */
export function Surface({
  children,
  className = "",
  glow = "#818CF8",
}: {
  children: ReactNode;
  className?: string;
  glow?: string;
}) {
  return (
    <div
      className={`grain relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#182245] to-[#121B3B] ring-1 ring-inset ring-white/[0.07] shadow-[0_18px_48px_-18px_rgba(0,0,0,0.75)] ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full opacity-20 blur-3xl"
        style={{ background: glow }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function StarIcon({ className = "", filled = true }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 2.5l2.95 6.2 6.8.85-5 4.7 1.3 6.75L12 17.6l-6.05 3.4 1.3-6.75-5-4.7 6.8-.85L12 2.5z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Gold spinning star used as the loader. */
export function StarLoader({ label = "Memuat...", className = "" }: { label?: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <motion.div
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
        className="text-[#FACC15] drop-shadow-[0_0_16px_rgba(250,204,21,0.55)]"
      >
        <StarIcon className="h-14 w-14" />
      </motion.div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FAF6EB]/70">{label}</p>
    </div>
  );
}

/** Number that springs to its new value. */
export function AnimatedNumber({ value, className = "" }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const spring = useSpring(value, { stiffness: 140, damping: 22 });
  const display = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  if (reduce) return <span className={`tabular-nums ${className}`}>{value}</span>;
  return <motion.span className={`tabular-nums ${className}`}>{display}</motion.span>;
}

export function StanceBadge({ stance, size = "md" }: { stance: Stance | null; size?: "sm" | "md" }) {
  if (!stance) return <span className="text-[#FAF6EB]/30">-</span>;
  const pro = stance === "PRO";
  return (
    <span
      className={`inline-flex items-center rounded-lg font-black tracking-wider ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      } ${pro ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FFEDD5] text-[#9A3412]"}`}
    >
      {stance}
    </span>
  );
}

export function SessionChip({ batch }: { batch: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#818CF8]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#C7CDFB] ring-1 ring-inset ring-[#818CF8]/30">
      {batch}
    </span>
  );
}

/** Big tactile switch for the global spin access. */
export function SpinSwitch({
  isOpen,
  onToggle,
  compact = false,
}: {
  isOpen: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOpen}
      aria-label="Akses spin peserta"
      onClick={onToggle}
      className={`group flex w-full items-center justify-between gap-3 rounded-2xl text-left transition-colors ${focusRing} ${
        compact ? "min-h-[48px] px-3 py-2" : "min-h-[64px] px-4 py-3"
      } ${
        isOpen
          ? "bg-[#10B981]/12 ring-1 ring-inset ring-[#10B981]/50 shadow-[0_0_24px_-6px_rgba(16,185,129,0.5)]"
          : "bg-red-500/10 ring-1 ring-inset ring-red-400/40"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#FAF6EB]/55">Akses Spin</span>
        <span
          className={`block font-black tracking-wide ${compact ? "text-sm" : "text-base"} ${
            isOpen ? "text-[#34D399]" : "text-red-300"
          }`}
        >
          {isOpen ? "TERBUKA" : "TERTUTUP"}
        </span>
        {!compact && (
          <span className="block text-[11px] text-[#FAF6EB]/55">
            {isOpen ? "Peserta bisa memutar roda" : "Tombol spin peserta terkunci"}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={`relative h-9 w-[68px] shrink-0 rounded-full p-1 shadow-inner transition-colors ${
          isOpen ? "bg-[#10B981]" : "bg-red-500/70"
        }`}
      >
        <motion.span
          animate={{ x: isOpen ? 32 : 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30 }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FAF6EB] shadow-[0_2px_6px_rgba(0,0,0,0.4)] group-active:scale-95"
        >
          {isOpen ? <LockOpen className="h-4 w-4 text-[#047857]" /> : <Lock className="h-4 w-4 text-red-600" />}
        </motion.span>
      </span>
    </button>
  );
}

/** Small inline illustration (moon + stars) for empty states. */
export function EmptyOrbit({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      <circle cx="80" cy="64" r="34" fill="#182245" stroke="#818CF8" strokeOpacity="0.35" strokeDasharray="3 5" />
      <path
        d="M96 44a26 26 0 1 0 0 40 21 21 0 0 1 0-40z"
        transform="translate(-6 0)"
        fill="#FAF6EB"
        opacity="0.92"
      />
      <path
        d="M128 22l3.2 6.6 7.3.9-5.4 5 1.4 7.2-6.5-3.7-6.5 3.7 1.4-7.2-5.4-5 7.3-.9z"
        fill="#FACC15"
        className="animate-twinkle origin-center"
      />
      <path d="M30 34l2 4.2 4.6.6-3.4 3.2.9 4.6-4.1-2.3-4.1 2.3.9-4.6-3.4-3.2 4.6-.6z" fill="#818CF8" />
      <path d="M38 98l1.4 2.8 3.1.4-2.3 2.1.6 3.1-2.8-1.6-2.8 1.6.6-3.1-2.3-2.1 3.1-.4z" fill="#F472B6" />
      <circle cx="132" cy="88" r="2" fill="#FACC15" />
      <circle cx="52" cy="18" r="1.5" fill="#FAF6EB" />
      <circle cx="108" cy="104" r="1.5" fill="#FAF6EB" opacity="0.7" />
    </svg>
  );
}

export function formatTime(value: number | string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function toMillis(value: number | string | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

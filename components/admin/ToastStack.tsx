"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { ToastItem } from "./types";
import { focusRing } from "./ui";

export default function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const ok = t.type === "success";
          return (
            <motion.div
              key={t.id}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.95 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.95 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-[#0E152E]/95 py-2.5 pl-2.5 pr-2 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.8)] ring-1 ring-inset backdrop-blur-md ${
                ok ? "ring-emerald-400/50" : "ring-rose-400/60"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  ok ? "bg-emerald-500 text-[#04251B]" : "bg-rose-500 text-white"
                }`}
              >
                {ok ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
              </span>
              <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[#FAF6EB]">{t.text}</p>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                aria-label="Tutup notifikasi"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#FAF6EB]/50 hover:bg-white/10 hover:text-[#FAF6EB] ${focusRing}`}
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

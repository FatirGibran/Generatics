"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { focusRing } from "./ui";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  role?: "dialog" | "alertdialog";
  /** Hide the top-right close button (used by the confirm dialog). */
  hideClose?: boolean;
}

/**
 * Accessible modal shell: Escape + backdrop close, focus moves in on open
 * (element with data-autofocus first), Tab is trapped, focus is restored on close.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-md",
  role = "dialog",
  hideClose = false,
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <ModalPanel
          onClose={onClose}
          title={title}
          description={description}
          maxWidth={maxWidth}
          role={role}
          hideClose={hideClose}
        >
          {children}
        </ModalPanel>
      )}
    </AnimatePresence>
  );
}

function ModalPanel({
  onClose,
  title,
  description,
  children,
  maxWidth,
  role,
  hideClose,
}: Omit<ModalProps, "open" | "maxWidth" | "role" | "hideClose"> & {
  maxWidth: string;
  role: "dialog" | "alertdialog";
  hideClose: boolean;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (panel) {
      const target =
        panel.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.querySelector<HTMLElement>("input, textarea, select") ??
        panel.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#05091A]/75 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.18 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
        className={`grain relative max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-3xl bg-gradient-to-br from-[#1B2650] to-[#121B3B] p-5 shadow-[0_30px_80px_-10px_rgba(0,0,0,0.85)] ring-1 ring-inset ring-[#FACC15]/25 sm:p-6`}
      >
        <div className="relative">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-xl font-semibold leading-tight text-[#FAF6EB]">
                {title}
              </h2>
              {description && (
                <div id={descId} className="mt-1.5 text-sm leading-relaxed text-[#FAF6EB]/70">
                  {description}
                </div>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className={`-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#FAF6EB]/70 hover:bg-white/10 hover:text-[#FAF6EB] ${focusRing}`}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">{children}</div>;
}

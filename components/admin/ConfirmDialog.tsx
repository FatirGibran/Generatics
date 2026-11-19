"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import Modal, { ModalActions } from "./Modal";
import { focusRing } from "./ui";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Destructive confirmation. The SAFE button (cancel) receives initial focus. */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} role="alertdialog" hideClose maxWidth="max-w-md">
      <div className="flex gap-3 rounded-2xl bg-red-500/10 p-3.5 ring-1 ring-inset ring-red-400/30">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden />
        <div className="text-sm leading-relaxed text-[#FAF6EB]/90">{description}</div>
      </div>
      <ModalActions>
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          className={`btn-ghost-night inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold ${focusRing}`}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-500 px-5 py-2.5 text-sm font-black text-white shadow-[0_4px_0_#991B1B] transition-transform hover:bg-red-400 active:translate-y-[3px] active:shadow-[0_1px_0_#991B1B] disabled:opacity-60 ${focusRing}`}
        >
          {confirmLabel}
        </button>
      </ModalActions>
    </Modal>
  );
}

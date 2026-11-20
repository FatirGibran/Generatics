"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Participant } from "@/lib/types";
import Modal, { ModalActions } from "./Modal";
import { focusRing, inputCls, labelCls } from "./ui";

interface ParticipantEditorProps {
  participant: Participant | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  notify: (text: string, type?: "success" | "error") => void;
}

export default function ParticipantEditor({ participant, onClose, onSaved, notify }: ParticipantEditorProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  useEffect(() => setError(""), [participant]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!participant || submitting.current) return;
    const form = new FormData(event.currentTarget);
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/participants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: participant.username,
          fullName: form.get("fullName"),
          sessionBatch: form.get("sessionBatch"),
          accessToken: form.get("accessToken"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengubah peserta.");
      notify("Perubahan peserta berhasil disimpan.");
      await onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengubah peserta.";
      setError(message);
      notify(message, "error");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal open={participant !== null} onClose={() => { if (!submitting.current) onClose(); }}
      title="Ubah Peserta" description="Username/NIM adalah identitas login tetap. Hasil undian tidak berubah.">
      {participant && (
        <form key={participant.username} onSubmit={save} className="space-y-4" aria-busy={saving}>
          <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
            <div>
              <label htmlFor="edit-participant-username" className={labelCls}>Username / NIM (tidak dapat diubah)</label>
              <input id="edit-participant-username" value={participant.username} readOnly className={inputCls} />
            </div>
            <div>
              <label htmlFor="edit-participant-name" className={labelCls}>Nama Lengkap</label>
              <input id="edit-participant-name" name="fullName" required pattern=".*\S.*" data-autofocus
                defaultValue={participant.fullName} className={inputCls} />
            </div>
            <div>
              <label htmlFor="edit-participant-batch" className={labelCls}>Sesi</label>
              <select id="edit-participant-batch" name="sessionBatch" required
                defaultValue={participant.sessionBatch} className={inputCls}>
                <option value="Day 1">Day 1</option>
                <option value="Day 2">Day 2</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-participant-token" className={labelCls}>Token Akses</label>
              <input id="edit-participant-token" name="accessToken" required pattern=".*\S.*" autoComplete="off"
                defaultValue={participant.accessToken} className={inputCls} />
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <ModalActions>
            <button type="button" disabled={saving} onClick={onClose}
              className={`btn-ghost-night min-h-[44px] rounded-xl px-5 text-sm font-bold ${focusRing}`}>Batal</button>
            <button type="submit" disabled={saving}
              className={`btn-gold min-h-[44px] rounded-xl px-5 text-sm font-black disabled:opacity-50 ${focusRing}`}>
              {saving ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </ModalActions>
        </form>
      )}
    </Modal>
  );
}

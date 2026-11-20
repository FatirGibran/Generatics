"use client";

import type { Motion, Theme } from "@/lib/types";
import Modal, { ModalActions } from "./Modal";
import { focusRing, inputCls, labelCls } from "./ui";

interface MotionEditorProps {
  themes: Theme[];
  motion: Motion | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}

export default function MotionEditor({ themes, motion, saving, error, onClose, onSave }: MotionEditorProps) {
  const locked = !!motion && motion.usedCount > 0;
  return (
    <Modal
      open
      onClose={onClose}
      title={motion ? "Ubah Mosi" : "Tambah Mosi Massal"}
      description={locked
        ? "Teks dan tema sudah dikunci untuk menjaga hasil peserta. Kuota dan status masih dapat diubah."
        : motion ? "Ubah teks, tema, kuota, atau status mosi." : "Satu mosi per baris. Baris kosong diabaikan; seluruh mosi disimpan sekaligus atau tidak sama sekali."}
    >
      <form onSubmit={(event) => {
        event.preventDefault();
        if (saving) return;
        const form = new FormData(event.currentTarget);
        const shared = {
          maxUsage: form.get("maxUsage") === "" ? null : Number(form.get("maxUsage")),
          isActive: form.get("isActive") === "on",
        };
        if (motion) {
          const body: Record<string, unknown> = { id: motion.id, ...shared };
          const themeId = form.get("themeId");
          const text = String(form.get("motionText") ?? "").trim();
          if (!locked && themeId !== motion.themeId) body.themeId = themeId;
          if (!locked && text !== motion.motionText) body.motionText = text;
          void onSave(body);
        } else {
          const motions = String(form.get("motionText") ?? "").split(/\r?\n/)
            .map((line) => line.trim()).filter(Boolean)
            .map((motionText) => ({ themeId: form.get("themeId"), motionText, ...shared }));
          void onSave({ motions });
        }
      }} className="space-y-4">
        <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
          <div>
            <label htmlFor="edit-motion-theme" className={labelCls}>Tema</label>
            <select id="edit-motion-theme" name="themeId" required disabled={locked}
              defaultValue={motion?.themeId ?? ""} className={inputCls}>
              <option value="">-- Pilih Tema --</option>
              {themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}{theme.isActive ? "" : " (Nonaktif)"}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="edit-motion-text" className={labelCls}>{motion ? "Teks Mosi" : "Daftar Mosi (satu per baris)"}</label>
            <textarea id="edit-motion-text" name="motionText" required disabled={locked}
              defaultValue={motion?.motionText ?? ""} rows={6} className={inputCls} />
          </div>
          <div>
            <label htmlFor="edit-motion-quota" className={labelCls}>Kuota{motion ? "" : " per mosi"}</label>
            <input id="edit-motion-quota" name="maxUsage" type="number" min={1} max={2147483647} step={1}
              defaultValue={motion?.maxUsage ?? ""} placeholder="Kosong = tanpa batas" className={inputCls} />
            {motion && <p className="mt-1 text-xs text-[#FAF6EB]/60">{motion.usedCount} terpakai. Kuota di bawah pemakaian menghentikan undian berikutnya.</p>}
          </div>
          <label className={`flex min-h-[44px] items-center gap-3 text-sm text-[#FAF6EB] ${focusRing}`}>
            <input name="isActive" type="checkbox" defaultChecked={motion?.isActive ?? true} className="h-5 w-5 accent-[#FACC15]" />
            Aktif (dapat diundi jika tema aktif dan kuota tersedia)
          </label>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <ModalActions>
          <button type="button" disabled={saving} onClick={onClose} className={`btn-ghost-night min-h-[44px] rounded-xl px-5 text-sm font-bold ${focusRing}`}>Batal</button>
          <button type="submit" disabled={saving} className={`btn-gold min-h-[44px] rounded-xl px-5 text-sm font-black disabled:opacity-50 ${focusRing}`}>
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}

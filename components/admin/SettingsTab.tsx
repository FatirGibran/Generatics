"use client";

import { useEffect, useState } from "react";
import { Check, Dices, Save, Scale } from "lucide-react";
import type { RandomMode, SystemSetting } from "@/lib/types";
import { Surface, SpinSwitch, focusRing, inputCls, labelCls } from "./ui";

interface SettingsTabProps {
  settings: SystemSetting;
  onToggleSpin: () => void;
  onUpdate: (updates: Partial<SystemSetting>) => void;
}

const PRESETS = [3, 5, 7, 10];

const MODES: { id: RandomMode; title: string; badge?: string; desc: string; icon: typeof Scale }[] = [
  {
    id: "BALANCED",
    title: "Balanced",
    badge: "Disarankan",
    desc: "Rasio PRO : KONTRA dijaga mendekati 50:50 di tiap sesi Day 1 / Day 2.",
    icon: Scale,
  },
  {
    id: "PURE_RANDOM",
    title: "Pure Random",
    desc: "Pengacakan murni 50% tanpa melihat distribusi peserta yang sudah mengundi.",
    icon: Dices,
  },
];

export default function SettingsTab({ settings, onToggleSpin, onUpdate }: SettingsTabProps) {
  const savedMinutes = settings.prepDurationSeconds / 60;
  const [draft, setDraft] = useState(String(savedMinutes));

  useEffect(() => {
    setDraft(String(settings.prepDurationSeconds / 60));
  }, [settings.prepDurationSeconds]);

  const minutes = Number(draft);
  const valid = draft.trim() !== "" && Number.isFinite(minutes) && minutes >= 1;
  const dirty = valid && Math.round(minutes * 60) !== settings.prepDurationSeconds;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="md:pr-14">
        <h1 className="font-display text-3xl font-semibold leading-tight text-[#FAF6EB]">Pengaturan</h1>
        <p className="mt-1 text-sm text-[#FAF6EB]/60">Tiga kontrol utama untuk menjalankan undian di hari-H.</p>
      </div>

      <Surface className="p-5" glow="#10B981">
        <h2 className="font-display text-lg font-semibold text-[#FAF6EB]">Akses Spin</h2>
        <p className="mb-4 mt-1 text-sm text-[#FAF6EB]/60">
          Buka saat kloter debat dimulai, tutup ketika giliran berakhir.
        </p>
        <SpinSwitch isOpen={settings.isSpinOpen} onToggle={onToggleSpin} />
      </Surface>

      <Surface className="p-5" glow="#FACC15">
        <h2 className="font-display text-lg font-semibold text-[#FAF6EB]">Algoritma Posisi</h2>
        <p className="mb-4 mt-1 text-sm text-[#FAF6EB]/60">Cara sistem menentukan PRO atau KONTRA.</p>
        <div role="radiogroup" aria-label="Algoritma posisi" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODES.map((m) => {
            const active = settings.randomMode === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  if (!active) onUpdate({ randomMode: m.id });
                }}
                className={`relative flex min-h-[132px] flex-col rounded-2xl p-4 text-left transition-all ${focusRing} ${
                  active
                    ? "bg-[#FACC15]/10 text-[#FAF6EB] shadow-[0_4px_0_#B8920B] ring-2 ring-inset ring-[#FACC15]"
                    : "bg-black/25 text-[#FAF6EB]/70 ring-1 ring-inset ring-white/10 hover:bg-white/[0.06] hover:text-[#FAF6EB]"
                }`}
              >
                <span className="mb-2 flex items-center justify-between">
                  <Icon className={`h-6 w-6 ${active ? "text-[#FACC15]" : "text-[#818CF8]"}`} />
                  {active && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FACC15] text-[#0E152E]">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-semibold">{m.title}</span>
                  {m.badge && (
                    <span className="rounded-full bg-[#10B981]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#34D399]">
                      {m.badge}
                    </span>
                  )}
                </span>
                <span className="mt-1 text-xs leading-relaxed">{m.desc}</span>
              </button>
            );
          })}
        </div>
      </Surface>

      <Surface className="p-5" glow="#818CF8">
        <h2 className="font-display text-lg font-semibold text-[#FAF6EB]">Durasi Persiapan</h2>
        <p className="mb-4 mt-1 text-sm text-[#FAF6EB]/60">
          Waktu case building yang tampil di kartu hasil peserta.
        </p>
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Preset durasi">
          {PRESETS.map((p) => {
            const active = valid && minutes === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={active}
                onClick={() => setDraft(String(p))}
                className={`min-h-[44px] rounded-full px-4 font-mono text-sm font-bold transition-colors ${focusRing} ${
                  active
                    ? "bg-[#FACC15] text-[#0E152E]"
                    : "bg-white/[0.07] text-[#FAF6EB]/80 ring-1 ring-inset ring-white/10 hover:bg-white/[0.12]"
                }`}
              >
                {p} menit
              </button>
            );
          })}
        </div>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onUpdate({ prepDurationSeconds: Math.round(minutes * 60) });
          }}
        >
          <div>
            <label htmlFor="prep-minutes" className={labelCls}>
              Menit
            </label>
            <input
              id="prep-minutes"
              type="number"
              inputMode="decimal"
              min={1}
              step={0.5}
              value={draft}
              aria-invalid={!valid}
              onChange={(e) => setDraft(e.target.value)}
              className={`${inputCls} w-32 text-center font-mono font-bold tabular-nums`}
            />
          </div>
          <button
            type="submit"
            disabled={!valid || !dirty}
            className={`btn-gold inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
          >
            <Save className="h-4 w-4" />
            Simpan
          </button>
          <p className="pb-2.5 text-xs text-[#FAF6EB]/55" aria-live="polite">
            {!valid
              ? "Minimal 1 menit."
              : dirty
                ? "Belum disimpan."
                : `Tersimpan: ${settings.prepDurationSeconds} detik.`}
          </p>
        </form>
      </Surface>
    </div>
  );
}

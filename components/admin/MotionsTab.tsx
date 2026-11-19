"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, Trash2, X } from "lucide-react";
import type { Motion, Theme } from "@/lib/types";
import { EmptyOrbit, StarIcon, Surface, focusRing } from "./ui";

interface MotionsTabProps {
  themes: Theme[];
  motions: Motion[];
  onAddTheme: () => void;
  onAddMotion: () => void;
  onRequestDeleteTheme: (t: Theme) => void;
  onRequestDeleteMotion: (m: Motion) => void;
}

function QuotaMeter({ used, max }: { used: number; max: number | null }) {
  if (!max) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C7CDFB]">
        <span className="font-mono tabular-nums">{used}</span> terpakai · tanpa batas ∞
      </span>
    );
  }
  const full = used >= max;
  const color = full ? "text-[#FB923C]" : "text-[#FACC15]";
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {max <= 10 ? (
        <span className="flex items-center gap-0.5" aria-hidden>
          {Array.from({ length: max }).map((_, i) => (
            <StarIcon
              key={i}
              filled={i < used}
              className={`h-3.5 w-3.5 ${i < used ? color : "text-[#FAF6EB]/25"}`}
            />
          ))}
        </span>
      ) : (
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <span
            className={`block h-full rounded-full ${full ? "bg-[#F97316]" : "bg-[#FACC15]"}`}
            style={{ width: `${Math.min(100, (used / max) * 100)}%` }}
          />
        </span>
      )}
      <span className={`font-mono text-[11px] font-bold tabular-nums ${color}`}>
        {used}/{max}
      </span>
      {full && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F97316]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FB923C] ring-1 ring-inset ring-[#F97316]/40">
          <AlertTriangle className="h-3 w-3" /> Kuota penuh
        </span>
      )}
    </span>
  );
}

export default function MotionsTab({
  themes,
  motions,
  onAddTheme,
  onAddMotion,
  onRequestDeleteTheme,
  onRequestDeleteMotion,
}: MotionsTabProps) {
  const [search, setSearch] = useState("");
  const [themeFilter, setThemeFilter] = useState("ALL");

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return themes
      .map((theme, index) => {
        const all = motions.filter((m) => m.themeId === theme.id);
        const themeHit = !!q && theme.name.toLowerCase().includes(q);
        const shown = !q || themeHit ? all : all.filter((m) => m.motionText.toLowerCase().includes(q));
        return { theme, index, all, shown, visible: !q || themeHit || shown.length > 0 };
      })
      .filter((g) => (themeFilter === "ALL" || g.theme.id === themeFilter) && g.visible);
  }, [themes, motions, search, themeFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 md:pr-14">
        <div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-[#FAF6EB]">Tema &amp; Mosi</h1>
          <p className="mt-1 text-sm text-[#FAF6EB]/60">Bank mosi yang akan diundi pada Babak I.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAddTheme}
            className={`btn-ghost-night inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-bold ${focusRing}`}
          >
            <Plus className="h-4 w-4 text-[#FACC15]" />
            Tema Baru
          </button>
          <button
            type="button"
            onClick={onAddMotion}
            className={`btn-gold inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-black ${focusRing}`}
          >
            <Plus className="h-4 w-4" />
            Tambah Mosi
          </button>
        </div>
      </div>

      <Surface className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="motion-search" className="sr-only">
              Cari mosi atau nama tema
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FAF6EB]/45" />
            <input
              id="motion-search"
              type="search"
              autoComplete="off"
              placeholder="Cari teks mosi atau nama tema…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field-night min-h-[44px] w-full rounded-xl py-2.5 pl-10 pr-10 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Hapus pencarian"
                className={`absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#FAF6EB]/60 hover:bg-white/10 ${focusRing}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="sm:w-60">
            <label htmlFor="motion-theme-filter" className="sr-only">
              Filter tema
            </label>
            <select
              id="motion-theme-filter"
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value)}
              className="field-night min-h-[44px] w-full rounded-xl px-3.5 py-2.5 text-sm"
            >
              <option value="ALL">Semua tema</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Surface>

      {groups.length === 0 ? (
        <Surface>
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <EmptyOrbit className="h-28 w-36" />
            <p className="mt-2 font-display text-lg text-[#FAF6EB]">
              {themes.length === 0 ? "Belum ada tema" : "Tidak ada yang cocok"}
            </p>
            <p className="mt-1 text-sm text-[#FAF6EB]/60">
              {themes.length === 0
                ? "Mulai dengan membuat tema, lalu tambahkan butir mosi."
                : "Coba kata kunci lain atau ganti filter tema."}
            </p>
          </div>
        </Surface>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map(({ theme, index, all, shown }) => {
            const full = all.filter((m) => m.maxUsage && m.usedCount >= m.maxUsage).length;
            return (
              <Surface key={theme.id} className="p-5" glow={index % 2 ? "#818CF8" : "#FACC15"}>
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="font-display text-5xl font-semibold leading-none text-[#FACC15]/25"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl font-semibold leading-tight text-[#FAF6EB]">{theme.name}</h2>
                    {theme.description && (
                      <p className="mt-1 text-sm leading-relaxed text-[#FAF6EB]/60">{theme.description}</p>
                    )}
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                      <span className="rounded-full bg-[#818CF8]/15 px-2.5 py-0.5 text-[#C7CDFB] ring-1 ring-inset ring-[#818CF8]/30">
                        {all.length} mosi
                      </span>
                      {full > 0 && (
                        <span className="rounded-full bg-[#F97316]/15 px-2.5 py-0.5 text-[#FB923C] ring-1 ring-inset ring-[#F97316]/40">
                          {full} kuota penuh
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRequestDeleteTheme(theme)}
                    aria-label={`Hapus tema ${theme.name}`}
                    title="Hapus tema"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-300 hover:bg-red-500/15 ${focusRing}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <ul className="mt-4 space-y-2 border-t border-white/[0.07] pt-4">
                  {shown.length === 0 && (
                    <li className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-xs text-[#FAF6EB]/45">
                      Belum ada mosi di tema ini.
                    </li>
                  )}
                  {shown.map((m) => {
                    const max = m.maxUsage || null;
                    const isFull = !!max && m.usedCount >= max;
                    return (
                      <li
                        key={m.id}
                        className={`flex items-start justify-between gap-2 rounded-2xl bg-black/25 p-3.5 ring-1 ring-inset ${
                          isFull ? "ring-[#F97316]/40" : "ring-white/[0.05]"
                        }`}
                      >
                        <div className="min-w-0 space-y-2">
                          <p className="text-sm italic leading-relaxed text-[#FAF6EB]/90">
                            &ldquo;{m.motionText}&rdquo;
                          </p>
                          <QuotaMeter used={m.usedCount} max={max} />
                        </div>
                        <button
                          type="button"
                          onClick={() => onRequestDeleteMotion(m)}
                          aria-label="Hapus mosi"
                          title="Hapus mosi"
                          className={`-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-300 hover:bg-red-500/15 ${focusRing}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}

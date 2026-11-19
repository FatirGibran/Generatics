"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Plus, RotateCcw, Search, Trash2, Upload, UserRound, X } from "lucide-react";
import type { Participant } from "@/lib/types";
import { soundManager } from "@/lib/audio";
import { copyTextToClipboard } from "@/lib/clipboard";
import { EmptyOrbit, SessionChip, StanceBadge, Surface, focusRing } from "./ui";

type StatusFilter = "ALL" | "UNSPUN" | "SPUN";
type BatchFilter = "ALL" | "Day 1" | "Day 2";

interface ParticipantsTabProps {
  participants: Participant[];
  onAdd: () => void;
  onBulk: () => void;
  onRequestReset: (p: Participant) => void;
  onRequestDelete: (p: Participant) => void;
  notify: (text: string, type?: "success" | "error") => void;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-black/25 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-h-[40px] rounded-lg px-3 text-xs font-bold transition-colors ${focusRing} ${
              active ? "bg-[#FACC15] text-[#0E152E] shadow-sm" : "text-[#FAF6EB]/70 hover:text-[#FAF6EB]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ParticipantsTab({
  participants,
  onAdd,
  onBulk,
  onRequestReset,
  onRequestDelete,
  notify,
}: ParticipantsTabProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [batch, setBatch] = useState<BatchFilter>("ALL");
  const [copied, setCopied] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "/" focuses the search field (unless typing somewhere else)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    []
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return participants.filter((p) => {
      if (batch !== "ALL" && p.sessionBatch !== batch) return false;
      if (status === "SPUN" && !p.hasSpun) return false;
      if (status === "UNSPUN" && p.hasSpun) return false;
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.accessToken.toLowerCase().includes(q)
      );
    });
  }, [participants, search, status, batch]);

  const copy = useCallback(
    async (key: string, text: string, message: string) => {
      soundManager.playClick();
      const success = await copyTextToClipboard(text);
      if (success) {
        setCopied(key);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(null), 2000);
        notify(message);
      } else {
        try {
          window.prompt("Salin manual (tekan Cmd+C atau Ctrl+C, lalu Enter):", text);
          notify("Silakan salin teks dari jendela pop-up.");
        } catch {
          notify("Gagal menyalin. Izinkan akses clipboard di browser.", "error");
        }
      }
    },
    [notify]
  );

  const renderToken = (p: Participant) => {
    const tokenKey = `${p.username}:token`;
    const credKey = `${p.username}:cred`;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-lg bg-black/30 px-2.5 py-1.5 font-mono text-sm font-bold tracking-wide text-[#FACC15] ring-1 ring-inset ring-[#FACC15]/20">
          {p.accessToken}
        </span>
        <button
          type="button"
          onClick={() => copy(tokenKey, p.accessToken, `Token ${p.accessToken} disalin`)}
          aria-label={`Salin token ${p.accessToken}`}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${focusRing} ${
            copied === tokenKey
              ? "bg-emerald-500 text-[#04251B]"
              : "bg-[#FACC15]/15 text-[#FACC15] ring-1 ring-inset ring-[#FACC15]/35 hover:bg-[#FACC15]/25"
          }`}
        >
          {copied === tokenKey ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Copy className="h-3.5 w-3.5" />}
          {copied === tokenKey ? "Tersalin" : "Copy Token"}
        </button>
        <button
          type="button"
          onClick={() =>
            copy(credKey, `NIM: ${p.username} | Token: ${p.accessToken}`, `Kredensial ${p.fullName} disalin`)
          }
          aria-label={`Salin NIM dan token ${p.fullName}`}
          title="Salin NIM | Token untuk LO"
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-colors ${focusRing} ${
            copied === credKey ? "bg-emerald-500/20 text-emerald-300" : "text-[#FAF6EB]/60 hover:bg-white/10 hover:text-[#FAF6EB]"
          }`}
        >
          {copied === credKey ? <Check className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
          NIM | Token
        </button>
      </div>
    );
  };

  const renderStatus = (p: Participant) =>
    p.hasSpun ? (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#34D399]">
        <Check className="h-3.5 w-3.5" strokeWidth={3} /> Sudah Spin
      </span>
    ) : (
      <span className="text-xs font-semibold text-[#FACC15]/90">Belum Spin</span>
    );

  const renderActions = (p: Participant) => (
    <div className="flex items-center justify-end gap-1.5">
      {p.hasSpun && (
        <button
          type="button"
          onClick={() => onRequestReset(p)}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 text-xs font-bold text-amber-200 ring-1 ring-inset ring-amber-400/30 hover:bg-amber-500/20 ${focusRing}`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Spin
        </button>
      )}
      <button
        type="button"
        onClick={() => onRequestDelete(p)}
        aria-label={`Hapus peserta ${p.fullName}`}
        title="Hapus akun peserta"
        className={`flex h-10 w-10 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/15 ${focusRing}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  const renderResult = (p: Participant) =>
    p.hasSpun ? (
      <div className="flex items-start gap-2">
        <StanceBadge stance={p.assignedStance} size="sm" />
        <span className="line-clamp-2 text-xs text-[#FAF6EB]/80" title={p.assignedMotionText ?? undefined}>
          {p.assignedMotionText}
        </span>
      </div>
    ) : (
      <span className="text-[#FAF6EB]/30">-</span>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 md:pr-14">
        <div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-[#FAF6EB]">Peserta &amp; Token</h1>
          <p className="mt-1 text-sm text-[#FAF6EB]/60">Bagikan token ke peserta dan kontrol status undian mereka.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBulk}
            className={`btn-ghost-night inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-bold ${focusRing}`}
          >
            <Upload className="h-4 w-4 text-[#818CF8]" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={onAdd}
            className={`btn-gold inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-black ${focusRing}`}
          >
            <Plus className="h-4 w-4" />
            Tambah Peserta
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <Surface className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <label htmlFor="participant-search" className="sr-only">
              Cari peserta berdasarkan nama, NIM, atau token
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FAF6EB]/45" />
            <input
              ref={searchRef}
              id="participant-search"
              type="search"
              autoComplete="off"
              placeholder="Cari nama, NIM, atau token…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field-night min-h-[44px] w-full rounded-xl py-2.5 pl-10 pr-16 text-sm"
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  searchRef.current?.focus();
                }}
                aria-label="Hapus pencarian"
                className={`absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#FAF6EB]/60 hover:bg-white/10 ${focusRing}`}
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-[#FAF6EB]/60 sm:block">
                /
              </kbd>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<StatusFilter>
              label="Filter status spin"
              value={status}
              onChange={setStatus}
              options={[
                { value: "ALL", label: "Semua" },
                { value: "UNSPUN", label: "Belum Spin" },
                { value: "SPUN", label: "Sudah Spin" },
              ]}
            />
            <Segmented<BatchFilter>
              label="Filter sesi"
              value={batch}
              onChange={setBatch}
              options={[
                { value: "ALL", label: "Semua" },
                { value: "Day 1", label: "Day 1" },
                { value: "Day 2", label: "Day 2" },
              ]}
            />
          </div>
        </div>
        <p className="mt-2.5 text-xs text-[#FAF6EB]/55" aria-live="polite">
          Menampilkan <strong className="font-mono tabular-nums text-[#FAF6EB]">{filtered.length}</strong> dari{" "}
          <span className="font-mono tabular-nums">{participants.length}</span> peserta
        </p>
      </Surface>

      {filtered.length === 0 ? (
        <Surface>
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <EmptyOrbit className="h-28 w-36" />
            <p className="mt-2 font-display text-lg text-[#FAF6EB]">Tidak ada peserta yang cocok</p>
            <p className="mt-1 text-sm text-[#FAF6EB]/60">Coba kata kunci lain atau longgarkan filter.</p>
          </div>
        </Surface>
      ) : (
        <>
          {/* Table (xl+) */}
          <Surface className="hidden xl:block">
            <div className="max-h-[68vh] overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#FAF6EB]/55">
                    {["Peserta", "Token Akses", "Status", "Hasil", "Aksi"].map((h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className={`sticky top-0 z-10 bg-[#141D40] px-4 py-3 font-bold ${i === 4 ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-[#FAF6EB]">
                  {filtered.map((p) => (
                    <tr key={p.username} className="transition-colors hover:bg-[#FACC15]/[0.05]">
                      <td className="px-4 py-3">
                        <span className="block font-bold">{p.fullName}</span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className="font-mono text-xs text-[#818CF8]">{p.username}</span>
                          <SessionChip batch={p.sessionBatch} />
                        </span>
                      </td>
                      <td className="px-4 py-3">{renderToken(p)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{renderStatus(p)}</td>
                      <td className="max-w-[220px] px-4 py-3">{renderResult(p)}</td>
                      <td className="px-4 py-3">{renderActions(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>

          {/* Cards (<xl) */}
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
            {filtered.map((p) => (
              <li key={p.username}>
                <Surface className="h-full p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#FAF6EB]">{p.fullName}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-[#818CF8]">{p.username}</span>
                        <SessionChip batch={p.sessionBatch} />
                      </p>
                    </div>
                    {renderStatus(p)}
                  </div>
                  <div className="mt-3">{renderToken(p)}</div>
                  {p.hasSpun && <div className="mt-3">{renderResult(p)}</div>}
                  <div className="mt-3 border-t border-white/[0.06] pt-2">{renderActions(p)}</div>
                </Surface>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileSpreadsheet, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import type { Participant } from "@/lib/types";
import {
  AnimatedNumber,
  EmptyOrbit,
  SessionChip,
  StanceBadge,
  Surface,
  focusRing,
  formatTime,
  toMillis,
} from "./ui";

interface OverviewTabProps {
  participants: Participant[];
  refreshing: boolean;
  onRefresh: () => void;
  onRequestReset: (p: Participant) => void;
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function useSpringTransition() {
  const reduce = useReducedMotion();
  return reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 120, damping: 20 };
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FAF6EB]/55">{children}</p>;
}

function ProgressRing({ spun, total }: { spun: number; total: number }) {
  const transition = useSpringTransition();
  const percent = pct(spun, total);
  const R = 46;
  const C = 2 * Math.PI * R;
  return (
    <Surface className="h-full p-5" glow="#FACC15">
      <CardLabel>Progress Spin</CardLabel>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="55" cy="55" r={R} fill="none" stroke="rgba(250,246,235,0.08)" strokeWidth="9" />
            <motion.circle
              cx="55"
              cy="55"
              r={R}
              fill="none"
              stroke="#FACC15"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={false}
              animate={{ strokeDashoffset: C * (1 - percent / 100) }}
              transition={transition}
              style={{ filter: "drop-shadow(0 0 6px rgba(250,204,21,0.6))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-semibold leading-none text-[#FAF6EB]">
              <AnimatedNumber value={percent} />
              <span className="text-lg text-[#FACC15]">%</span>
            </span>
          </div>
        </div>
        <p className="text-sm leading-snug text-[#FAF6EB]/80">
          <strong className="font-mono text-lg text-[#FACC15] tabular-nums">{spun}</strong> dari{" "}
          <strong className="font-mono tabular-nums">{total}</strong> peserta sudah spin
        </p>
      </div>
    </Surface>
  );
}

function SpunUnspun({ spun, unspun, total }: { spun: number; unspun: number; total: number }) {
  const transition = useSpringTransition();
  const rows = [
    { label: "Sudah Spin", value: spun, color: "#10B981", text: "text-[#34D399]" },
    { label: "Belum Spin", value: unspun, color: "#FACC15", text: "text-[#FACC15]" },
  ];
  return (
    <Surface className="h-full p-5" glow="#10B981">
      <CardLabel>Status Undian</CardLabel>
      <div className="mt-3 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-[#FAF6EB]/80">{r.label}</span>
              <span className={`font-display text-3xl font-semibold leading-none ${r.text}`}>
                <AnimatedNumber value={r.value} />
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: r.color }}
                initial={false}
                animate={{ width: `${pct(r.value, total)}%` }}
                transition={transition}
              />
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function SplitBar({ pro, kontra, tall = false }: { pro: number; kontra: number; tall?: boolean }) {
  const transition = useSpringTransition();
  const sum = pro + kontra;
  const proPct = sum > 0 ? (pro / sum) * 100 : 50;
  return (
    <div className="relative">
      <div className={`flex overflow-hidden rounded-full bg-white/10 ${tall ? "h-6" : "h-2.5"}`}>
        <motion.div
          className="h-full bg-[#10B981]"
          initial={false}
          animate={{ width: sum > 0 ? `${proPct}%` : "50%" }}
          transition={transition}
        />
        <motion.div
          className="h-full flex-1 bg-[#F97316]"
          initial={false}
          animate={{ opacity: sum > 0 ? 1 : 0.25 }}
        />
      </div>
      <span
        aria-hidden
        className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-[#FAF6EB] shadow-[0_0_6px_rgba(250,246,235,0.8)] ${
          tall ? "-top-1.5 -bottom-1.5 w-[3px]" : "-top-1 -bottom-1 w-0.5"
        }`}
      />
    </div>
  );
}

function StanceSplit({
  pro,
  kontra,
  bySession,
}: {
  pro: number;
  kontra: number;
  bySession: { batch: string; pro: number; kontra: number }[];
}) {
  const sum = pro + kontra;
  return (
    <Surface className="h-full p-5" glow="#F97316">
      <div className="flex items-center justify-between">
        <CardLabel>Distribusi PRO vs KONTRA</CardLabel>
        <span className="text-[11px] text-[#FAF6EB]/45">| = target 50:50</span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <span className="block text-[11px] font-black tracking-widest text-[#34D399]">PRO</span>
          <span className="font-display text-4xl font-semibold leading-none text-[#34D399]">
            <AnimatedNumber value={pro} />
          </span>
          <span className="ml-1.5 font-mono text-sm text-[#FAF6EB]/60 tabular-nums">{pct(pro, sum)}%</span>
        </div>
        <div className="text-right">
          <span className="block text-[11px] font-black tracking-widest text-[#FB923C]">KONTRA</span>
          <span className="mr-1.5 font-mono text-sm text-[#FAF6EB]/60 tabular-nums">{pct(kontra, sum)}%</span>
          <span className="font-display text-4xl font-semibold leading-none text-[#FB923C]">
            <AnimatedNumber value={kontra} />
          </span>
        </div>
      </div>
      <div className="mt-3">
        <SplitBar pro={pro} kontra={kontra} tall />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {bySession.map((s) => (
          <div key={s.batch} className="rounded-xl bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold text-[#FAF6EB]/80">{s.batch}</span>
              <span className="font-mono tabular-nums text-[#FAF6EB]/60">
                <span className="text-[#34D399]">{s.pro}</span> : <span className="text-[#FB923C]">{s.kontra}</span>
              </span>
            </div>
            <SplitBar pro={s.pro} kontra={s.kontra} />
          </div>
        ))}
      </div>
    </Surface>
  );
}

function TotalCard({ total, day1, day2 }: { total: number; day1: number; day2: number }) {
  return (
    <Surface className="h-full p-5" glow="#F472B6">
      <CardLabel>Total Peserta</CardLabel>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="font-display text-6xl font-semibold leading-none text-[#FAF6EB]">
          <AnimatedNumber value={total} />
        </span>
        <div className="space-y-1 pb-1 text-right text-xs text-[#FAF6EB]/65">
          <p>
            Day 1 <strong className="ml-1 font-mono text-[#C7CDFB] tabular-nums">{day1}</strong>
          </p>
          <p>
            Day 2 <strong className="ml-1 font-mono text-[#C7CDFB] tabular-nums">{day2}</strong>
          </p>
        </div>
      </div>
    </Surface>
  );
}

export default function OverviewTab({ participants, refreshing, onRefresh, onRequestReset }: OverviewTabProps) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    setLastUpdate(new Date());
  }, [participants]);

  const stats = useMemo(() => {
    const total = participants.length;
    const spun = participants.filter((p) => Boolean(p.hasSpun)).length;
    const split = (batch: string) => {
      const list = participants.filter((p) => p.sessionBatch === batch);
      return {
        batch,
        pro: list.filter((p) => p.assignedStance === "PRO").length,
        kontra: list.filter((p) => p.assignedStance === "KONTRA").length,
        count: list.length,
      };
    };
    return {
      total,
      spun,
      unspun: total - spun,
      pro: participants.filter((p) => p.assignedStance === "PRO").length,
      kontra: participants.filter((p) => p.assignedStance === "KONTRA").length,
      sessions: [split("Day 1"), split("Day 2")],
    };
  }, [participants]);

  const feed = useMemo(
    () =>
      participants
        .filter((p) => Boolean(p.hasSpun))
        .sort((a, b) => toMillis(b.spunAt) - toMillis(a.spunAt)),
    [participants]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 md:pr-14">
        <div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-[#FAF6EB]">Live Overview</h1>
          <p className="mt-1 text-sm text-[#FAF6EB]/60">Pantau undian mosi saat peserta memutar roda.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#10B981]/12 px-3 py-1.5 text-xs font-semibold text-[#34D399] ring-1 ring-inset ring-[#10B981]/35">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
          </span>
          Diperbarui langsung
          <span className="min-w-[4.5rem] font-mono tabular-nums text-[#FAF6EB]/60">
            {lastUpdate ? formatTime(lastUpdate.toISOString()) : "--:--:--"}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <ProgressRing spun={stats.spun} total={stats.total} />
        </div>
        <div className="lg:col-span-4">
          <StanceSplit
            pro={stats.pro}
            kontra={stats.kontra}
            bySession={stats.sessions.map(({ batch, pro, kontra }) => ({ batch, pro, kontra }))}
          />
        </div>
        <div className="lg:col-span-3">
          <SpunUnspun spun={stats.spun} unspun={stats.unspun} total={stats.total} />
        </div>
        <div className="lg:col-span-3">
          <TotalCard total={stats.total} day1={stats.sessions[0].count} day2={stats.sessions[1].count} />
        </div>
      </div>

      {/* Live feed */}
      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-[#FAF6EB]">
              <Sparkles className="h-4 w-4 text-[#FACC15]" aria-hidden />
              Hasil Undian Terbaru
            </h2>
            <p className="text-xs text-[#FAF6EB]/60">
              <span className="font-mono tabular-nums">{feed.length}</span> peserta sudah spin, terbaru di atas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/admin/export?format=xlsx"
              className={`btn-ghost-night inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-bold ${focusRing}`}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              Export Excel
            </a>
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Muat ulang data"
              title="Muat ulang data"
              className={`btn-ghost-night flex h-11 w-11 items-center justify-center rounded-xl ${focusRing}`}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {feed.length === 0 ? (
          <div className="flex flex-col items-center px-6 pb-10 pt-4 text-center">
            <EmptyOrbit className="h-32 w-40" />
            <p className="mt-2 font-display text-lg text-[#FAF6EB]">Langit masih sepi bintang</p>
            <p className="mt-1 max-w-sm text-sm text-[#FAF6EB]/60">
              Belum ada peserta yang spin. Buka akses spin lalu hasil akan muncul di sini secara otomatis.
            </p>
          </div>
        ) : (
          <>
            {/* Table (md+) */}
            <div className="hidden max-h-[560px] overflow-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#FAF6EB]/55">
                    {["Peserta", "Posisi", "Tema & Mosi", "Waktu", "Aksi"].map((h, i) => (
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
                  {feed.map((p) => (
                    <tr key={p.username} className="transition-colors hover:bg-[#FACC15]/[0.05]">
                      <td className="px-4 py-3">
                        <span className="block font-bold">{p.fullName}</span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className="font-mono text-xs text-[#818CF8]">{p.username}</span>
                          <SessionChip batch={p.sessionBatch} />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StanceBadge stance={p.assignedStance} />
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <span className="block text-xs font-bold text-[#FACC15]">{p.assignedThemeName}</span>
                        <p className="line-clamp-2 text-xs text-[#FAF6EB]/80" title={p.assignedMotionText ?? undefined}>
                          {p.assignedMotionText}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-[#FAF6EB]/65">
                        {formatTime(p.spunAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onRequestReset(p)}
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-red-500/10 px-3 text-xs font-bold text-red-300 ring-1 ring-inset ring-red-400/30 hover:bg-red-500/20 ${focusRing}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards (<md) */}
            <ul className="max-h-[640px] space-y-2.5 overflow-y-auto px-3 pb-4 md:hidden">
              {feed.map((p) => (
                <li key={p.username} className="rounded-2xl bg-black/20 p-3.5 ring-1 ring-inset ring-white/[0.05]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#FAF6EB]">{p.fullName}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-[#818CF8]">{p.username}</span>
                        <SessionChip batch={p.sessionBatch} />
                      </p>
                    </div>
                    <StanceBadge stance={p.assignedStance} />
                  </div>
                  <p className="mt-2 text-xs font-bold text-[#FACC15]">{p.assignedThemeName}</p>
                  <p className="line-clamp-2 text-xs text-[#FAF6EB]/80" title={p.assignedMotionText ?? undefined}>
                    {p.assignedMotionText}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="font-mono text-xs tabular-nums text-[#FAF6EB]/55">{formatTime(p.spunAt)}</span>
                    <button
                      type="button"
                      onClick={() => onRequestReset(p)}
                      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-red-500/10 px-3 text-xs font-bold text-red-300 ring-1 ring-inset ring-red-400/30 ${focusRing}`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Surface>
    </div>
  );
}

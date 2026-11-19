"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, LogOut, RotateCw, Sliders, Users, type LucideIcon } from "lucide-react";
import InstitutionalPill from "@/components/InstitutionalPill";
import AudioToggle from "@/components/AudioToggle";
import { soundManager } from "@/lib/audio";
import type { TabId } from "./types";
import { SpinSwitch, StarIcon, focusRing } from "./ui";

interface NavDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const NAV: NavDef[] = [
  { id: "overview", label: "Live Overview", icon: RotateCw },
  { id: "motions", label: "Tema & Mosi", icon: BookOpen },
  { id: "participants", label: "Peserta & Token", icon: Users },
  { id: "settings", label: "Pengaturan", icon: Sliders },
];

interface AdminShellProps {
  tab: TabId;
  onTab: (tab: TabId) => void;
  counts: Partial<Record<TabId, number>>;
  isSpinOpen: boolean;
  onToggleSpin: () => void;
  adminUser: string | null;
  onLogout: () => void;
  children: ReactNode;
}

function LivePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#34D399] ring-1 ring-inset ring-[#10B981]/40">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-70 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
      </span>
      LIVE
    </span>
  );
}

function Logo({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl bg-[#FAF6EB] shadow-[0_2px_14px_rgba(250,204,21,0.35)] ring-2 ring-[#FACC15]/70 ${
        small ? "h-10 w-10 p-1" : "h-12 w-12 p-1.5"
      }`}
    >
      <Image
        src="/logos/generatics.webp"
        alt="Logo Generatics 2026"
        width={40}
        height={40}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export default function AdminShell({
  tab,
  onTab,
  counts,
  isSpinOpen,
  onToggleSpin,
  adminUser,
  onLogout,
  children,
}: AdminShellProps) {
  const reduce = useReducedMotion();
  const go = (id: TabId) => {
    if (id === tab) return;
    soundManager.playClick();
    onTab(id);
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* ===== Desktop sidebar ===== */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0A1026]/70 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-3 px-4 pb-4 pt-5">
          <Logo />
          <div className="min-w-0">
            <p className="font-display text-[17px] font-semibold leading-none text-[#FAF6EB]">GENERATICS 2026</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#FAF6EB]/60">Admin Panel</span>
              <LivePill />
            </div>
          </div>
        </div>

        <nav aria-label="Navigasi admin" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            const count = counts[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm font-bold transition-colors ${focusRing} ${
                  active ? "bg-[#FACC15]/10 text-[#FACC15]" : "text-[#FAF6EB]/65 hover:bg-white/[0.05] hover:text-[#FAF6EB]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={reduce ? undefined : "admin-nav-indicator"}
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-[#FACC15] shadow-[0_0_10px_#FACC15]"
                  />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {typeof count === "number" && (
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${
                      active ? "bg-[#FACC15] text-[#0E152E]" : "bg-white/10 text-[#FAF6EB]/70"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="space-y-4 px-3 pb-4 pt-3">
          <SpinSwitch isOpen={isSpinOpen} onToggle={onToggleSpin} />
          <div className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#FAF6EB]/45">Masuk sebagai</p>
              <p className="truncate text-sm font-bold text-[#FAF6EB]">{adminUser ?? "Admin"}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <AudioToggle showTrackLabel={false} />
              <button
                type="button"
                onClick={onLogout}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-red-300 hover:bg-red-500/15 ${focusRing}`}
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <InstitutionalPill size="sm" />
          </div>
        </div>
      </aside>

      {/* ===== Main column ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0A1026]/90 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-3 py-2.5 pl-3 pr-16">
            <Logo small />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-semibold leading-none text-[#FAF6EB]">
                GENERATICS 2026
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#FAF6EB]/60">Admin Panel</span>
                <LivePill />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <AudioToggle showTrackLabel={false} />
              <button
                type="button"
                onClick={onLogout}
                aria-label="Keluar"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-300 hover:bg-red-500/15 ${focusRing}`}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="px-3 pb-2">
            <SpinSwitch isOpen={isSpinOpen} onToggle={onToggleSpin} compact />
          </div>
          <nav aria-label="Navigasi admin" className="flex gap-2 overflow-x-auto px-3 pb-3 [scrollbar-width:none]">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              const count = counts[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors ${focusRing} ${
                    active
                      ? "bg-[#FACC15] text-[#0E152E] shadow-[0_3px_0_#B8920B]"
                      : "bg-white/[0.07] text-[#FAF6EB]/75 hover:bg-white/[0.12]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {typeof count === "number" && (
                    <span
                      className={`rounded-full px-1.5 font-mono text-[11px] tabular-nums ${
                        active ? "bg-[#0E152E]/15" : "bg-white/10"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-24 pt-5 sm:px-5 md:px-8 md:pt-7">{children}</main>

        <footer className="flex items-center justify-center gap-2 pb-6 text-[11px] text-[#FAF6EB]/35 md:hidden">
          <StarIcon className="h-3 w-3 text-[#F472B6]" />
          Beyond the Stars
        </footer>
      </div>
    </div>
  );
}

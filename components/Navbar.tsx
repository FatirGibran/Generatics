"use client";

import { motion } from "framer-motion";
import { LogOut, ShieldCheck } from "lucide-react";
import InstitutionalPill from "./InstitutionalPill";
import AudioToggle from "./AudioToggle";
import { soundManager } from "@/lib/audio";

interface NavbarProps {
  user?: {
    username: string;
    fullName?: string;
    sessionBatch?: string;
    role?: "admin" | "participant";
  } | null;
  onLogout?: () => void;
}

const spring = { type: "spring", stiffness: 400, damping: 17 } as const;

export default function Navbar({ user, onLogout }: NavbarProps) {
  return (
    <header className="relative z-40 w-full px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between gap-3 border-b border-[#FAF6EB]/10 bg-[#0E152E]/70 backdrop-blur-md">
      {/* Institutional Crest Pill */}
      <div className="flex items-center min-w-0">
        <InstitutionalPill />
      </div>

      {/* Right Actions: User info + Logout + Audio Toggle */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {user && (
          <>
            <div className="hidden sm:flex flex-col text-right min-w-0 leading-tight">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#FAF6EB]/55">
                {user.role === "admin" ? "Panitia Pelaksana" : `Peserta · ${user.sessionBatch || "Sesi"}`}
              </span>
              <span className="font-display text-sm sm:text-base text-[#FAF6EB] truncate max-w-[180px] md:max-w-[240px]">
                {user.fullName || user.username}
              </span>
            </div>

            {user.role === "admin" && (
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#818CF8]/15 border border-[#818CF8]/50 text-xs font-semibold text-[#A5B4FC]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </span>
            )}

            {onLogout && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                transition={spring}
                onClick={() => {
                  soundManager.playClick();
                  onLogout();
                }}
                className="btn-ghost-night !px-3 !py-1.5 text-xs flex items-center gap-1.5"
                title="Keluar dari akun"
                aria-label="Keluar dari akun"
              >
                <LogOut className="w-4 h-4 text-[#F472B6]" />
                <span className="hidden md:inline">Keluar</span>
              </motion.button>
            )}
          </>
        )}

        {/* Audio Mute/Unmute */}
        <AudioToggle showTrackLabel />
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Calendar,
  ArrowLeft,
  LogOut,
  Brain,
  MessageSquare,
  Lightbulb,
  Scale,
  Handshake,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import GeneraticsMedallion from "@/components/GeneraticsMedallion";
import InstitutionalPill from "@/components/InstitutionalPill";
import { soundManager } from "@/lib/audio";
import { Stance } from "@/lib/types";

interface PostDebateScreenProps {
  user?: {
    username: string;
    fullName?: string;
    sessionBatch?: string;
  } | null;
  themeName: string;
  motionText: string;
  stance: Stance;
  onBackToCard: () => void;
  onLogout: () => void;
}

// Target Day 2 Final Debat Generatics 2026: 26 November 2026, 19:00 WIB
const TARGET_FINAL_DATE = new Date("2026-11-26T19:00:00+07:00");

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function calculateTimeLeft(): TimeLeft {
  const now = new Date();
  const diff = TARGET_FINAL_DATE.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isPast: false,
  };
}

const CORE_VALUES = [
  {
    icon: Brain,
    title: "Critical Thinking",
    desc: "Menganalisis permasalahan secara mendalam, objektif, dan mempertimbangkan ragam perspektif.",
    tag: "#1",
  },
  {
    icon: Scale,
    title: "Logical Reasoning",
    desc: "Menyusun dan mengembangkan kerangka argumen berbasis penalaran yang logis dan saling bertaut.",
    tag: "#2",
  },
  {
    icon: MessageSquare,
    title: "Communication",
    desc: "Menyampaikan pemikiran secara lugas, terstruktur, percaya diri, dan bertanggung jawab.",
    tag: "#3",
  },
  {
    icon: Lightbulb,
    title: "Problem Solving",
    desc: "Menemukan inti isu krusial dan merumuskan rekomendasi solusi yang relevan serta konstruktif.",
    tag: "#4",
  },
  {
    icon: Handshake,
    title: "Negotiation",
    desc: "Menanggapi sanggahan lawan secara santun serta menghargai perbedaan perspektif.",
    tag: "#5",
  },
];

export default function PostDebateScreen({
  user,
  themeName,
  motionText,
  stance,
  onBackToCard,
  onLogout,
}: PostDebateScreenProps) {
  const reduce = useReducedMotion();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft);
  const isPro = stance === "PRO";

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fireCosmicConfetti = useCallback(() => {
    soundManager.playFanfare();
    const shapes: confetti.Shape[] = ["star", "circle"];
    const base = {
      shapes,
      colors: ["#FACC15", "#818CF8", "#10B981", "#F472B6", "#FAF6EB"],
      disableForReducedMotion: true,
      zIndex: 9999,
    };
    confetti({ ...base, particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.6 }, scalar: 1.2 });
    setTimeout(() => {
      confetti({ ...base, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } });
      confetti({ ...base, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } });
    }, 200);
  }, []);

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-2 py-4 sm:px-4"
    >
      {/* Institutional Crest Pill Header */}
      <div className="mb-6 flex justify-center">
        <InstitutionalPill size="md" />
      </div>

      {/* Medallion & Event Title */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-3">
          <GeneraticsMedallion size="md" variant="hero" />
        </div>
        <p className="font-sans text-[11px] sm:text-xs font-black uppercase tracking-[0.25em] text-[#FACC15] drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
          GENERATICS 2026 &bull; TWINKLE, TWINKLE
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#FAF6EB] tracking-tight">
          DEBATE GENERATICS 2026
        </h1>
        <p className="mt-1 font-display text-sm sm:text-base italic text-[#FAF6EB]/75">
          &ldquo;BEYOND THE STARS: A Universe of Perspectives&rdquo;
        </p>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-1.5 font-sans text-xs font-extrabold uppercase tracking-wider text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Babak I Seleksi Telah Selesai</span>
        </div>
      </div>

      {/* Main Parchment Debrief Card */}
      <div className="patchwork-frame relative mt-8 w-full max-w-3xl">
        <div className="paper relative overflow-hidden rounded-[24px] px-5 py-6 sm:px-8 sm:py-9">
          {/* Background Watermark */}
          <div aria-hidden className="pointer-events-none absolute -bottom-12 -right-12 h-64 w-64 opacity-[0.05]">
            <Image src="/logos/generatics.webp" alt="" width={256} height={256} className="h-full w-full object-contain" />
          </div>

          {/* Section: Debater Summary */}
          <div className="relative z-10 border-b border-dashed border-[#0E152E]/20 pb-5">
            <span className="font-sans text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#0E152E]/60">
              Rekapitulasi Penampilan Debater
            </span>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0E152E]">
                  {user?.fullName || user?.username}
                </h2>
                <p className="font-sans text-xs font-semibold text-[#0E152E]/75">
                  NIM: <span className="font-mono">{user?.username}</span> &bull; {user?.sessionBatch || "Day 1"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#FAF6EB] border border-[#0E152E]/15 px-3 py-1 font-sans text-xs font-bold text-[#0E152E]">
                  {themeName}
                </span>
                <span
                  className={`rounded-lg px-3 py-1 font-sans text-xs font-black tracking-wide text-[#FAF6EB] shadow-sm ${
                    isPro ? "bg-emerald-600" : "bg-orange-600"
                  }`}
                >
                  {isPro ? "TIM PRO" : "TIM KONTRA"}
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-black/[0.04] p-3 text-xs leading-relaxed text-[#0E152E]/80 border-l-2 border-[#FACC15]">
              <span className="font-bold text-[#0E152E]">Mosi Debat: </span>
              <span className="italic">&ldquo;{motionText}&rdquo;</span>
            </div>
          </div>

          {/* Section: Philosophical Concept Quote */}
          <div className="relative z-10 mt-6 rounded-2xl bg-gradient-to-br from-[#182245]/5 to-[#FACC15]/10 p-5 sm:p-6 border border-[#FACC15]/30">
            <p className="font-sans text-[10px] font-black uppercase tracking-[0.22em] text-[#CA8A04]">
              Filosofi & Semangat Acara
            </p>
            <blockquote className="mt-2.5 font-display text-base sm:text-lg leading-relaxed text-[#0E152E] italic">
              &ldquo;Layaknya bintang-bintang yang menghiasi satu semesta dengan cahaya masing-masing, setiap individu
              memiliki gagasan dan potensi yang berbeda untuk ditunjukkan. Perbedaan perspektif bukan menjadi alasan
              untuk saling menjatuhkan, melainkan kesempatan untuk saling memahami dan memperoleh wawasan baru.&rdquo;
            </blockquote>
            <p className="mt-3 font-sans text-xs font-semibold text-[#0E152E]/70 text-right">
              &mdash; Dokumen Konsep Debat Generatics 2026
            </p>
          </div>

          {/* Section: 5 Core Values */}
          <div className="relative z-10 mt-7">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-sans text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#0E152E]/60">
                5 Nilai Utama Yang Telah Kamu Asah Hari Ini
              </span>
              <span className="h-[1px] flex-1 bg-[#0E152E]/10" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {CORE_VALUES.map((val) => {
                const Icon = val.icon;
                return (
                  <div
                    key={val.title}
                    className="flex flex-col rounded-xl border border-[#0E152E]/10 bg-white/60 p-3 shadow-xs hover:border-[#FACC15]/60 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-4 w-4 text-[#4F46E5]" />
                        <span className="font-sans text-xs font-bold text-[#0E152E]">{val.title}</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-[#CA8A04]">{val.tag}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#0E152E]/75">{val.desc}</p>
                  </div>
                );
              })}
              <div className="flex flex-col justify-center items-center rounded-xl border border-dashed border-[#FACC15]/60 bg-[#FACC15]/10 p-3 text-center sm:col-span-2 lg:col-span-1">
                <Sparkles className="h-5 w-5 text-[#CA8A04] mb-1" />
                <span className="font-sans text-xs font-black text-[#0E152E]">Twinkle, Twinkle!</span>
                <span className="text-[10px] text-[#0E152E]/70">Setiap bintang punya kilau unik</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown Section & Announcement for Final Day 2 */}
      <div className="relative mt-8 w-full max-w-3xl overflow-hidden rounded-3xl border border-[#FACC15]/40 bg-gradient-to-b from-[#182245] to-[#0E152E] p-6 sm:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        {/* Glow Effects */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-[#FACC15] opacity-20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-[#818CF8] opacity-20 blur-3xl"
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FACC15]/40 bg-[#FACC15]/15 px-4 py-1.5 font-sans text-xs font-extrabold uppercase tracking-widest text-[#FACC15]">
            <Trophy className="h-4 w-4 text-[#FACC15]" />
            <span>Babak II &bull; Final Team Debate Offline</span>
          </div>

          <h3 className="mt-3 font-display text-2xl sm:text-3xl font-black tracking-tight text-[#FAF6EB]">
            Semoga Beruntung! Sampai Jumpa di Final 🌟
          </h3>

          <p className="mt-2 max-w-xl text-balance font-sans text-xs sm:text-sm leading-relaxed text-[#FAF6EB]/80">
            Penilaian juri sedang direkapitulasi secara objektif. Sebanyak{" "}
            <strong className="text-[#FACC15]">8 peserta dengan skor terbaik</strong> dari babak seleksi individu akan
            lolos untuk bertanding di <strong className="text-[#FAF6EB]">Babak II (Team Debate)</strong> secara offline
            pada:
          </p>

          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-black/40 px-4 py-2 border border-[#FAF6EB]/15 text-xs font-bold text-[#FAF6EB]">
            <Calendar className="h-4 w-4 text-[#FACC15]" />
            <span>Hari Kamis, 26 November 2026 &bull; Pukul 19.00 WIB</span>
          </div>

          {/* 4 Glowing Starlight Countdown Cards */}
          <div className="mt-6 w-full max-w-lg">
            <p className="mb-3 font-sans text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#FAF6EB]/60">
              Waktu Mundur Menuju Pengumuman & Final Day 2
            </p>

            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {[
                { label: "Hari", value: timeLeft.days },
                { label: "Jam", value: timeLeft.hours },
                { label: "Menit", value: timeLeft.minutes },
                { label: "Detik", value: timeLeft.seconds },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="relative flex flex-col items-center justify-center rounded-2xl border border-[#FACC15]/30 bg-black/50 px-2 py-3.5 sm:py-4 shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-sm"
                >
                  <span className="font-mono text-2xl sm:text-4xl font-black tabular-nums tracking-tight text-[#FACC15] drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]">
                    {String(unit.value).padStart(2, "0")}
                  </span>
                  <span className="mt-1 font-sans text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[#FAF6EB]/70">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Motivational note */}
          <p className="mt-6 max-w-md text-xs italic text-[#FAF6EB]/65 leading-relaxed">
            &ldquo;Perjalanan debat ini adalah langkah awal mengenali potensi dirimu. Siapkan strategimu, sampai jumpa di
            panggung final Generatics 2026!&rdquo;
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 w-full max-w-md">
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onBackToCard();
          }}
          className="btn-ghost-night flex-1 min-h-[46px] rounded-xl px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Lihat Kembali Kartu Mosi
        </button>

        <button
          type="button"
          onClick={fireCosmicConfetti}
          className="btn-gold min-h-[46px] rounded-xl px-5 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(250,204,21,0.35)]"
        >
          <Sparkles className="h-4 w-4" />
          Rayakan Semangat!
        </button>

        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onLogout();
          }}
          className="btn-ghost-night min-h-[46px] rounded-xl px-4 text-xs font-bold text-[#F472B6] hover:text-[#F472B6] flex items-center justify-center gap-1.5"
          title="Keluar dari sesi"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </motion.div>
  );
}

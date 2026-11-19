"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, RefreshCw, ArrowRight, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import SpinWheel from "@/components/SpinWheel";
import ResultCard from "@/components/ResultCard";
import PrepTimer from "@/components/PrepTimer";
import PostDebateScreen from "@/components/PostDebateScreen";
import StarLoader from "@/components/spin/StarLoader";
import SpinFooter from "@/components/spin/SpinFooter";
import { soundManager } from "@/lib/audio";
import { SpinResult, Stance } from "@/lib/types";

interface UserProfile {
  username: string;
  fullName?: string;
  sessionBatch?: string;
  hasSpun: boolean;
  assignedMotionText?: string | null;
  assignedThemeName?: string | null;
  assignedStance?: Stance | null;
  spunAt?: string | null;
}

interface ThemeItem {
  id: string;
  name: string;
}

export default function SpinPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [isSpinOpen, setIsSpinOpen] = useState(true);
  const [prepDuration, setPrepDuration] = useState(300);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showClosing, setShowClosing] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const isSpinningRef = useRef(false);
  const aliveRef = useRef(true);

  const syncSpinState = useCallback(async (): Promise<"ok" | "unauthorized" | "error"> => {
    // Never interrupt or overwrite state while the user is actively watching the wheel spin
    if (isSpinningRef.current) return "ok";

    try {
      const res = await fetch("/api/spin", { cache: "no-store" });
      if (res.status === 401) return "unauthorized";
      if (!res.ok) return "error";
      const data = await res.json();
      if (!aliveRef.current || isSpinningRef.current) return "ok";

      setThemes(Array.isArray(data.themes) ? data.themes : []);
      setIsSpinOpen(data.settings?.isSpinOpen ?? true);
      setPrepDuration(data.settings?.prepDurationSeconds || 300);

      const p: UserProfile | null = data.participant;
      if (p) {
        setUser(p);

        if (p.hasSpun) {
          const spinResult: SpinResult = {
            themeName: p.assignedThemeName || "Tema Terpilih",
            motionText: p.assignedMotionText || "Mosi Terpilih",
            stance: p.assignedStance || "PRO",
            spunAt: p.spunAt || new Date().toISOString(),
            participant: {
              username: p.username,
              fullName: p.fullName || "",
              sessionBatch: p.sessionBatch || "",
            },
          };

          // Cache in localStorage as safety net
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`generatics_result_${p.username}`, JSON.stringify(spinResult));
            } catch {
              // Ignore storage errors
            }
          }

          setResult((prev) => {
            if (
              prev &&
              prev.motionText === p.assignedMotionText &&
              prev.stance === p.assignedStance
            ) {
              return prev;
            }
            soundManager.setBGMMood("calm");
            return spinResult;
          });
        } else {
          // NOT SPUN: Clean up any stale closing flags and unlock wheel immediately
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(`generatics_closing_${p.username}`);
            localStorage.removeItem(`generatics_result_${p.username}`);
          }
          setShowClosing(false);
          setResult((prev) => {
            if (prev) {
              soundManager.setBGMMood("curious");
            }
            return null;
          });
        }
      }

      return "ok";
    } catch {
      return "error";
    }
  }, []);

  // Ensure BGM plays when entering or refreshing /spin
  useEffect(() => {
    if (!soundManager.getMuted()) {
      soundManager.startBGM();
    }
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    setReady(false);
    try {
      const meRes = await fetch("/api/auth/me?role=participant", { cache: "no-store" });
      if (meRes.status === 401) {
        router.replace("/");
        return;
      }
      if (meRes.status >= 500) throw new Error("server");
      const me = await meRes.json();

      if (!(me.authenticated && me.role === "participant")) {
        router.replace("/");
        return;
      }
      if (!aliveRef.current) return;

      const p: UserProfile = me.participant;
      setUser(p);

      if (p.hasSpun) {
        soundManager.setBGMMood("calm");
        const lockedResult: SpinResult = {
          themeName: p.assignedThemeName || "Tema Terpilih",
          motionText: p.assignedMotionText || "Mosi Terpilih",
          stance: p.assignedStance || "PRO",
          spunAt: p.spunAt || new Date().toISOString(),
          participant: {
            username: p.username,
            fullName: p.fullName || "",
            sessionBatch: p.sessionBatch || "",
          },
        };

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`generatics_result_${p.username}`, JSON.stringify(lockedResult));
          } catch {
            // Ignore storage errors
          }
        }

        setResult(lockedResult);
      } else {
        soundManager.setBGMMood("curious");
        setResult(null);
        setShowClosing(false);
      }

      const status = await syncSpinState();
      if (status === "unauthorized") {
        router.replace("/");
        return;
      }
      if (status === "error" && !p.hasSpun) {
        throw new Error("spin");
      }
      if (aliveRef.current) setReady(true);
    } catch {
      if (aliveRef.current) {
        setLoadError("Arena belum bisa dimuat. Periksa koneksi internetmu lalu coba lagi.");
        setReady(true);
      }
    }
  }, [router, syncSpinState]);

  // Strict one-time mount check: prevents unnecessary re-triggers and redirect bouncing
  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => {
      aliveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time synchronization loop: strictly runs ONLY if the participant has NOT spun and is NOT spinning
  // Once the participant has spun, polling is strictly terminated to prevent state overwriting
  useEffect(() => {
    if (!ready || loadError || isSpinning || user?.hasSpun || result) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (!isSpinningRef.current && !user?.hasSpun && !result) {
        syncSpinState().catch(() => undefined);
      }
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [ready, loadError, isSpinning, user?.hasSpun, result, syncSpinState]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout?role=participant", { method: "POST" });
    } catch {
      // Navigate away regardless.
    }
    router.replace("/");
  };

  const handleSpinStart = () => {
    setIsSpinning(true);
    isSpinningRef.current = true;
  };

  const handleSpinComplete = (spin: SpinResult) => {
    setIsSpinning(false);
    isSpinningRef.current = false;
    soundManager.setBGMMood("calm");

    const finalResult: SpinResult = {
      ...spin,
      participant: {
        username: user?.username || spin.participant.username,
        fullName: user?.fullName || spin.participant.fullName,
        sessionBatch: user?.sessionBatch || spin.participant.sessionBatch,
      },
    };

    if (typeof window !== "undefined" && finalResult.participant.username) {
      try {
        localStorage.setItem(
          `generatics_result_${finalResult.participant.username}`,
          JSON.stringify(finalResult)
        );
      } catch {
        // Ignore storage errors
      }
    }

    setUser((prev) =>
      prev
        ? {
            ...prev,
            hasSpun: true,
            assignedMotionText: spin.motionText,
            assignedThemeName: spin.themeName,
            assignedStance: spin.stance,
            spunAt: spin.spunAt,
          }
        : prev
    );

    setResult(finalResult);
  };

  // Restore saved closing screen state ONLY IF participant has legitimately spun
  useEffect(() => {
    if (typeof window !== "undefined" && user?.username && user?.hasSpun) {
      const saved = sessionStorage.getItem(`generatics_closing_${user.username}`);
      if (saved === "true") {
        setShowClosing(true);
      }
    }
  }, [user?.username, user?.hasSpun]);

  const handleOpenClosing = () => {
    soundManager.playFanfare();
    setShowClosing(true);
    if (typeof window !== "undefined" && user?.username) {
      sessionStorage.setItem(`generatics_closing_${user.username}`, "true");
    }
  };

  const handleBackToCard = () => {
    soundManager.playClick();
    setShowClosing(false);
    if (typeof window !== "undefined" && user?.username) {
      sessionStorage.removeItem(`generatics_closing_${user.username}`);
    }
  };

  const navUser = user
    ? {
        username: user.username,
        fullName: user.fullName,
        sessionBatch: user.sessionBatch,
        role: "participant" as const,
      }
    : null;

  // Active result resolution with safety fallback to localStorage
  const activeResult: SpinResult | null = isSpinning
    ? null
    : result ||
      (user?.hasSpun
        ? {
            themeName: user.assignedThemeName || "Tema Terpilih",
            motionText: user.assignedMotionText || "Mosi Terpilih",
            stance: user.assignedStance || "PRO",
            spunAt: user.spunAt || new Date().toISOString(),
            participant: {
              username: user.username,
              fullName: user.fullName || "",
              sessionBatch: user.sessionBatch || "",
            },
          }
        : null);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Navbar user={navUser} onLogout={handleLogout} />

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 py-8 md:py-12">
        {!ready ? (
          <StarLoader
            label={
              user?.hasSpun
                ? "Membuka kartu mosi & posisi debatmu…"
                : "Menyiapkan arena spin…"
            }
          />
        ) : loadError ? (
          <div className="paper mx-auto mt-10 max-w-sm rounded-2xl p-6 text-center">
            <h1 className="font-display text-xl font-semibold">Ups, arena tertutup awan</h1>
            <p className="mt-2 font-sans text-sm text-[#0E152E]/75">{loadError}</p>
            <button
              type="button"
              onClick={load}
              className="btn-gold mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Coba lagi
            </button>
          </div>
        ) : activeResult ? (
          showClosing ? (
            <PostDebateScreen
              user={user}
              themeName={activeResult.themeName}
              motionText={activeResult.motionText}
              stance={activeResult.stance}
              onBackToCard={handleBackToCard}
              onLogout={handleLogout}
            />
          ) : (
            <div className="flex w-full flex-col items-center">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 text-center font-display text-lg italic text-[#FAF6EB]/85"
              >
                Halo, {user?.fullName || user?.username}. Posisimu sudah terkunci.
              </motion.p>

              <ResultCard
                themeName={activeResult.themeName}
                motionText={activeResult.motionText}
                stance={activeResult.stance}
                spunAt={activeResult.spunAt}
                participant={activeResult.participant}
              >
                <PrepTimer
                  initialSeconds={prepDuration}
                  username={user?.username}
                  onCompleteSession={handleOpenClosing}
                />
              </ResultCard>

              {/* Action Button: Selesai Sesi Debat & Lanjut ke Pengumuman */}
              <div className="mt-8 flex flex-col items-center gap-3 w-full max-w-md">
                <button
                  type="button"
                  onClick={handleOpenClosing}
                  className="btn-gold w-full min-h-[50px] rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_4px_24px_rgba(250,204,21,0.35)]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Selesai Sesi &amp; Lanjut Pengumuman</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="flex items-start gap-2 text-balance text-center font-sans text-xs leading-relaxed text-[#FAF6EB]/65">
                  <Camera className="mt-0.5 h-4 w-4 shrink-0 text-[#FACC15]" aria-hidden />
                  <span>
                    Ambil tangkapan layar kartu ini sebagai bukti cadangan sebelum lanjut ke pengumuman final.
                  </span>
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex w-full flex-col items-center">
            <div className="paper relative mb-8 w-full max-w-md rounded-2xl px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <span aria-hidden className="star-clip absolute -right-1.5 -top-2 h-4 w-4 bg-[#FACC15]" />
              <span aria-hidden className="star-clip absolute -left-1.5 bottom-3 h-2.5 w-2.5 bg-[#F472B6]" />
              <h1 className="font-display text-2xl font-semibold leading-tight">
                Halo, {user?.fullName || user?.username}
              </h1>
              <p className="mt-1 font-sans text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#4F46E5]">
                Babak I &middot; Individual Debate
              </p>
              <p className="mt-2 font-sans text-sm leading-relaxed text-[#0E152E]/80">
                Sistem mengundi 1 tema, 1 mosi, dan posisi (PRO / KONTRA) secara acak dan adil. Kesempatan spin hanya satu
                kali dan tidak dapat diulang.
              </p>
            </div>

            <SpinWheel
              themes={themes}
              isSpinOpen={isSpinOpen}
              hasSpun={Boolean(user?.hasSpun)}
              onSpinStart={handleSpinStart}
              onSpinComplete={handleSpinComplete}
              onUnauthorized={() => router.replace("/")}
            />
          </div>
        )}
      </main>

      <SpinFooter />
    </div>
  );
}

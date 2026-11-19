"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import GeneraticsMedallion from "@/components/GeneraticsMedallion";
import InstitutionalPill from "@/components/InstitutionalPill";
import AudioToggle from "@/components/AudioToggle";
import { soundManager } from "@/lib/audio";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E152E]";

export default function AdminLoginPage() {
  const reduce = useReducedMotion();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error) throw new Error(data.error);
        if (res.status === 401 || res.status === 403) {
          throw new Error("Username atau password salah. Periksa lagi lalu coba kembali.");
        }
        throw new Error("Gagal masuk ke dashboard panitia.");
      }

      soundManager.playFanfare();
      // Hard navigation to ensure cookies are fresh and Next.js client router cache is cleanly bypassed
      window.location.href = "/admin";
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        setError("Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.");
      } else {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center px-4 pb-8 pt-4">
      {/* Top bar */}
      <div className="flex w-full max-w-4xl items-center justify-between gap-3">
        <Link
          href="/"
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm text-[#FAF6EB]/75 transition-colors hover:text-[#FAF6EB] ${focusRing}`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Portal Utama</span>
        </Link>
        <AudioToggle showTrackLabel={false} />
      </div>

      <div className="my-auto flex w-full max-w-md flex-col items-center py-6">
        <GeneraticsMedallion size="lg" variant="hero" className="mb-5" />

        <div className="mb-6 text-center">
          <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FACC15]">
            <span className="text-[#F472B6]" aria-hidden>
              ✦
            </span>
            Akses Terbatas
            <span className="text-[#F472B6]" aria-hidden>
              ✦
            </span>
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight text-[#FAF6EB]">Panitia Generatics</h1>
          <p className="mt-2 text-xs sm:text-sm text-[#FAF6EB]/65">
            Masuk untuk memantau undian live, bank mosi, dan peserta debat.
          </p>
        </div>

        <div className="patchwork-frame w-full">
          <div className="grain relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#182245] to-[#121B3B] p-6 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)] md:p-8">
            <div aria-live="polite" role="status">
              {error && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-inset ring-red-400/40">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
              <div>
                <label
                  htmlFor="admin-username"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#FAF6EB]/75"
                >
                  Username Panitia
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#818CF8]" />
                  <input
                    id="admin-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    aria-invalid={!!error}
                    className="field-night min-h-[48px] w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#FAF6EB]/75"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FACC15]" />
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    aria-invalid={!!error}
                    className="field-night min-h-[48px] w-full rounded-xl py-2.5 pl-10 pr-12 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    aria-pressed={showPassword}
                    className={`absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#FAF6EB]/60 hover:bg-white/10 hover:text-[#FAF6EB] ${focusRing}`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={submitting}
                onMouseEnter={() => soundManager.playHover()}
                whileHover={reduce || submitting ? undefined : { scale: 1.02 }}
                whileTap={reduce || submitting ? undefined : { scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className={`btn-gold mt-2 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-sm font-black uppercase tracking-wider disabled:opacity-60 shadow-md ${focusRing}`}
              >
                {submitting ? (
                  "Memverifikasi…"
                ) : (
                  <>
                    <span>Masuk Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center">
        <InstitutionalPill />
      </div>
    </div>
  );
}

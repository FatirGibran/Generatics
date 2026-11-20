"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound, Sparkles, TriangleAlert, User, Compass } from "lucide-react";
import Navbar from "@/components/Navbar";
import GeneraticsMedallion from "@/components/GeneraticsMedallion";
import StarLoader from "@/components/spin/StarLoader";
import SpinFooter from "@/components/spin/SpinFooter";
import { soundManager } from "@/lib/audio";

interface FieldErrors {
  username: boolean;
  token: boolean;
}

type Stage = "intro" | "login" | "warping_to_arena";

export default function HomePage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const shake = useAnimationControls();

  const [checking, setChecking] = useState(true);
  const [stage, setStage] = useState<Stage>("intro");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAlreadySpun, setIsAlreadySpun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<FieldErrors>({ username: false, token: false });

  // Check if already authenticated as participant
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/me?role=participant&_t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
        const data = await res.json();
        if (!cancelled && res.ok && data.authenticated && data.role === "participant") {
          router.replace("/spin");
          return;
        }
      } catch {
        // Not signed in or offline
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const fail = (message: string, fields: FieldErrors) => {
    setError(message);
    setInvalid(fields);
    setSubmitting(false);
    if (!reduce) {
      shake.start({ x: [0, -9, 9, -6, 6, -3, 0], transition: { duration: 0.45 } });
    }
  };

  const handleStartGame = () => {
    soundManager.playClick();
    soundManager.startBGM();
    setStage("login");
  };

  const handleBackToIntro = () => {
    if (submitting) return;
    soundManager.playClick();
    setError(null);
    setStage("intro");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    soundManager.playClick();

    const cleanUser = username.trim();
    const cleanToken = token.trim();
    setError(null);
    setInvalid({ username: false, token: false });

    if (!cleanUser || !cleanToken) {
      fail("Isi Username dan Token Akses dulu ya, dua-duanya dibutuhkan.", {
        username: !cleanUser,
        token: !cleanToken,
      });
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      fail("Kamu sedang offline. Sambungkan internet lalu coba lagi.", { username: false, token: false });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/participant", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUser, accessToken: cleanToken }),
      });
      const data: {
        error?: string;
        participant?: {
          username: string;
          fullName: string;
          sessionBatch: string;
          hasSpun: boolean;
        };
      } = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 404) {
          fail("Username tidak ditemukan. Pastikan NIM kamu sudah terdaftar oleh panitia.", {
            username: true,
            token: false,
          });
        } else if (res.status === 401) {
          fail("Token Akses belum cocok. Periksa kembali token yang dibagikan LO.", {
            username: false,
            token: true,
          });
        } else if (res.status === 400) {
          fail(data.error || "Isi Username dan Token Akses dulu ya.", {
            username: !cleanUser,
            token: !cleanToken,
          });
        } else {
          fail("Server sedang memproses. Coba lagi sebentar lagi.", { username: false, token: false });
        }
        return;
      }

      if (!data.participant?.username) {
        fail("Respons login tidak valid. Silakan coba lagi.", { username: false, token: false });
        return;
      }
      const alreadySpun = Boolean(data.participant.hasSpun);
      setIsAlreadySpun(alreadySpun);

      // Success: Play cosmic portal warp animation into the debate arena!
      soundManager.playFanfare();
      setStage("warping_to_arena");
      setTimeout(() => {
        router.replace("/spin");
      }, alreadySpun ? 900 : 1400);
    } catch (err: unknown) {
      const offline = err instanceof TypeError;
      fail(
        offline
          ? "Koneksi terputus. Periksa internetmu lalu coba lagi."
          : "Terjadi kendala tak terduga. Coba lagi sebentar lagi.",
        { username: false, token: false }
      );
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <Navbar user={null} />
        <main className="flex flex-1 items-center justify-center px-4">
          <StarLoader />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-between">
      <Navbar user={null} />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {stage === "warping_to_arena" ? (
            /* ============================================================== */
            /* TAHAP 3 — COSMIC WARP INTO DEBATE ARENA                        */
            /* ============================================================== */
            <motion.div
              key="warp-stage"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative flex flex-col items-center justify-center text-center px-4"
            >
              {/* Expanding Hyperspace Starlight Rings */}
              <motion.div
                animate={{ scale: [1, 2.2, 3.5], opacity: [0.8, 0.4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                className="absolute h-56 w-56 rounded-full border-2 border-[#FACC15]/60 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [1, 1.8, 2.8], opacity: [0.9, 0.5, 0] }}
                transition={{ duration: 1.4, delay: 0.25, repeat: Infinity, ease: "easeOut" }}
                className="absolute h-40 w-40 rounded-full border-2 border-[#818CF8]/70 pointer-events-none"
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-tr from-[#FACC15] via-[#FDE047] to-[#818CF8] p-1 shadow-[0_0_50px_rgba(250,204,21,0.6)]"
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0E152E]">
                  <Compass className="h-12 w-12 text-[#FACC15] animate-pulse" />
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#FAF6EB]"
              >
                Memasuki Semesta Debat…
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-2 font-display text-base sm:text-lg italic text-[#FACC15]"
              >
                &ldquo;Beyond the Stars: A Universe of Perspectives&rdquo;
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.6 }}
                className="mt-3 font-sans text-xs tracking-widest uppercase text-[#FAF6EB]/60"
              >
                {isAlreadySpun
                  ? "Membuka Kartu Mosi & Posisi Terkuncimu…"
                  : "Menyiapkan Arena Undian Mosi & Posisi…"}
              </motion.p>
            </motion.div>
          ) : stage === "intro" ? (
            /* ============================================================== */
            /* TAHAP 1 — STORY INTRO (CENTERED STAGE WITH CELESTIAL ORBIT)   */
            /* ============================================================== */
            <motion.div
              key="intro-stage"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full max-w-2xl flex-col items-center text-center"
            >
              {/* Centerpiece Medallion with Celestial Orbiting Stars */}
              <motion.div
                layoutId="generatics-medallion-container"
                className="relative mb-6 sm:mb-8 flex items-center justify-center"
                transition={{ type: "spring", stiffness: 260, damping: 25 }}
              >
                {/* Outer pulsing celestial nebula glow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-10 rounded-full bg-gradient-to-tr from-[#FACC15]/25 via-[#818CF8]/20 to-[#F472B6]/20 blur-2xl animate-pulse-slow"
                />

                {/* Orbiting celestial star 1 */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className="pointer-events-none absolute -inset-6 sm:-inset-8"
                  aria-hidden
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                    <span className="star-clip h-4 w-4 bg-[#FACC15] drop-shadow-[0_0_8px_#FACC15]" />
                  </div>
                </motion.div>

                {/* Orbiting celestial star 2 (counter-clockwise) */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                  className="pointer-events-none absolute -inset-10 sm:-inset-12"
                  aria-hidden
                >
                  <div className="absolute bottom-0 right-1/4 flex items-center justify-center">
                    <span className="star-clip h-3 w-3 bg-[#F472B6] drop-shadow-[0_0_8px_#F472B6]" />
                  </div>
                </motion.div>

                <GeneraticsMedallion size="xl" variant="hero" />
              </motion.div>

              {/* Staggered Narrative */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.18,
                      delayChildren: 0.15,
                    },
                  },
                }}
                className="flex flex-col items-center"
              >
                {/* 1. Subtle poetic opener */}
                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                  }}
                  className="font-display text-base sm:text-lg italic tracking-wide text-[#C7CCFB]/90"
                >
                  &ldquo;Every star in this universe carries its own light...&rdquo;
                </motion.p>

                {/* 2. Main Title */}
                <motion.h1
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
                  }}
                  className="mt-3 font-display text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#FAF6EB] drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
                >
                  DEBATE GENERATICS 2026
                </motion.h1>

                {/* 3. Subtitle */}
                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                  }}
                  className="mt-2 font-display text-lg sm:text-2xl italic font-semibold text-[#FACC15] drop-shadow-[0_2px_12px_rgba(250,204,21,0.3)]"
                >
                  Beyond the Stars: A Universe of Perspectives
                </motion.p>

                {/* 4. Event Chapter Badge */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#FACC15]/40 bg-[#FAF6EB]/5 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#FACC15] backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                >
                  <Sparkles className="h-3 w-3 text-[#FACC15]" />
                  <span>CHAPTER 03 — SPARK &bull; TWINKLE, TWINKLE</span>
                </motion.div>

                {/* 5. Main START GAME Button */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, scale: 0.85, y: 20 },
                    visible: {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: { type: "spring", stiffness: 300, damping: 20, delay: 0.3 },
                    },
                  }}
                  className="mt-8 sm:mt-10"
                >
                  <motion.button
                    type="button"
                    onClick={handleStartGame}
                    onMouseEnter={() => soundManager.playHover()}
                    whileHover={{ scale: 1.05, boxShadow: "0 0 35px rgba(250,204,21,0.55)" }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="relative group overflow-hidden rounded-2xl bg-[#FACC15] px-8 sm:px-10 py-4 sm:py-4.5 font-sans text-base sm:text-lg font-black uppercase tracking-[0.2em] text-[#0E152E] shadow-[0_4px_30px_rgba(250,204,21,0.4),0_0_0_2px_#FAF6EB] transition-all"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <span aria-hidden className="star-clip h-4 w-4 bg-[#0E152E]" />
                      <span>✦ MASUK KE DUNIA DEBAT ✦</span>
                      <span aria-hidden className="star-clip h-4 w-4 bg-[#0E152E]" />
                    </span>
                    {/* Shiny sheen highlight */}
                    <div
                      aria-hidden
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                  </motion.button>
                </motion.div>

                {/* Tagline */}
                <motion.p
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 0.6, transition: { duration: 0.8, delay: 0.5 } },
                  }}
                  className="mt-6 font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-[#FAF6EB]/60"
                >
                  Dare to try, reach the sky!
                </motion.p>
              </motion.div>
            </motion.div>
          ) : (
            /* ============================================================== */
            /* TAHAP 2 — KARTU UNDANGAN PESERTA (LOGIN ARENA)                 */
            /* ============================================================== */
            <motion.div
              key="login-stage"
              initial={{ opacity: 0, y: 30, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md"
            >
              {/* Return to intro button */}
              <div className="mb-3 flex justify-start">
                <button
                  type="button"
                  onClick={handleBackToIntro}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-[#FAF6EB]/60 transition-colors hover:text-[#FACC15]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Kembali ke Beranda</span>
                </button>
              </div>

              <div className="patchwork-frame">
                <motion.div animate={shake} className="paper relative rounded-[20px] px-6 pb-7 pt-7 sm:px-8 sm:pb-8">
                  {/* Decorative stars */}
                  <span aria-hidden className="star-clip absolute right-5 top-5 h-4 w-4 bg-[#FACC15]" />
                  <span aria-hidden className="star-clip absolute right-11 top-9 h-2 w-2 bg-[#F472B6]" />

                  {/* Shrunken Logo Medallion at top of card */}
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      layoutId="generatics-medallion-container"
                      className="mb-3 flex items-center justify-center"
                      transition={{ type: "spring", stiffness: 260, damping: 25 }}
                    >
                      <GeneraticsMedallion size="md" variant="hero" />
                    </motion.div>

                    <p className="font-sans text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#4F46E5]">
                      Undangan Peserta
                    </p>
                    <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold leading-tight text-[#0E152E]">
                      Masuk ke Arena Debat
                    </h2>
                    <p className="mt-1 font-sans text-xs sm:text-sm text-[#0E152E]/70">
                      Silakan isi kredensial yang telah diberikan oleh LO.
                    </p>
                  </div>

                  {/* Error Alert */}
                  <AnimatePresence initial={false}>
                    {error && (
                      <motion.div
                        key={error}
                        role="alert"
                        aria-live="assertive"
                        initial={{ opacity: 0, height: 0, y: -6 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#F472B6]/50 bg-[#FCE7F3] px-3.5 py-3 font-sans text-xs sm:text-sm text-[#831843]">
                          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#BE185D]" aria-hidden />
                          <span>{error}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Clean Production Form */}
                  <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4 sm:space-y-5">
                    {/* Username Input */}
                    <div className="group">
                      <label
                        htmlFor="username"
                        className="mb-1.5 block font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0E152E]/65 transition-all group-focus-within:-translate-y-0.5 group-focus-within:text-[#8A6A00]"
                      >
                        Username / NIM
                      </label>
                      <div className="relative">
                        <User
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E152E]/40 transition-colors group-focus-within:text-[#CA8A04]"
                          aria-hidden
                        />
                        <input
                          id="username"
                          type="text"
                          autoComplete="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          aria-invalid={invalid.username}
                          placeholder="Masukkan Username Peserta"
                          className="field-paper w-full pl-10"
                        />
                      </div>
                      <span
                        aria-hidden
                        className="mt-1 block h-0.5 origin-left scale-x-0 rounded-full bg-[#FACC15] transition-transform duration-300 group-focus-within:scale-x-100"
                      />
                    </div>

                    {/* Token Akses Input */}
                    <div className="group">
                      <label
                        htmlFor="token"
                        className="mb-1.5 block font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0E152E]/65 transition-all group-focus-within:-translate-y-0.5 group-focus-within:text-[#8A6A00]"
                      >
                        Token Akses
                      </label>
                      <div className="relative">
                        <KeyRound
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E152E]/40 transition-colors group-focus-within:text-[#CA8A04]"
                          aria-hidden
                        />
                        <input
                          id="token"
                          type={showToken ? "text" : "password"}
                          autoComplete="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          aria-invalid={invalid.token}
                          placeholder="STR-XXXX"
                          className="field-paper w-full pl-10 pr-11 font-mono uppercase tracking-[0.18em]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken((s) => !s)}
                          aria-label={showToken ? "Sembunyikan token" : "Tampilkan token"}
                          aria-pressed={showToken}
                          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#0E152E]/50 transition-colors hover:bg-[#0E152E]/5 hover:text-[#0E152E]"
                        >
                          {showToken ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                        </button>
                      </div>
                      <span
                        aria-hidden
                        className="mt-1 block h-0.5 origin-left scale-x-0 rounded-full bg-[#FACC15] transition-transform duration-300 group-focus-within:scale-x-100"
                      />
                    </div>

                    {/* Submit Button */}
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      onMouseEnter={() => soundManager.playHover()}
                      whileHover={submitting ? undefined : { scale: 1.02 }}
                      whileTap={submitting ? undefined : { scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className="btn-gold flex w-full items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-black uppercase tracking-wider shadow-md"
                    >
                      {submitting ? (
                        <>
                          <span aria-hidden className="star-clip animate-spin h-4 w-4 bg-[#0E152E]" />
                          Memverifikasi…
                        </>
                      ) : (
                        <>
                          <span aria-hidden className="star-clip h-4 w-4 bg-[#0E152E]" />
                          MASUK KE ARENA DEBAT
                        </>
                      )}
                    </motion.button>
                  </form>

                  {/* Clean Footer Note */}
                  <p className="mt-5 text-center font-sans text-xs text-[#0E152E]/60">
                    Gunakan username dan token akses yang dibagikan oleh LO.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <SpinFooter />
    </div>
  );
}

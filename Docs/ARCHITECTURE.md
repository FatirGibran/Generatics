# Arsitektur Sistem DEBATE GENERATICS 2026

## 1. Ikhtisar Sistem
DEBATE GENERATICS 2026 adalah platform undian mosi, penentuan posisi debat (PRO/KONTRA), serta pengatur waktu persiapan (case-building) resmi untuk kompetisi debat tahunan Generatics.

Aplikasi ini dibangun menggunakan tumpukan teknologi modern:
- **Framework:** Next.js 14 (App Router) dengan TypeScript.
- **Styling:** Tailwind CSS dengan cosmic design system (Twinkle, Twinkle celestial theme).
- **Animasi & Interaksi:** Framer Motion dan Canvas Confetti.
- **Audio Engine:** Sintesis Web Audio API kustom (bebas file audio eksternal).
- **ORM & Database:** Prisma ORM dengan SQLite (mode WAL aktif).
- **Process Manager:** PM2 cluster mode untuk produksi 24/7 di macOS.

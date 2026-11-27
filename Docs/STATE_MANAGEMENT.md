# Tata Kelola State Klien (State Management)

## 1. Pemisahan State Komponen
- State putaran roda (`isSpinning`, `themes`, `isSpinOpen`) diisolasi di dalam komponen `SpinWheel`.
- State hitung mundur timer diisolasi di dalam komponen `PrepTimer`.
- State kartu hasil resmi diisolasi di dalam komponen `ResultCard`.
- Pemisahan ini mencegah re-render komponen yang tidak perlu saat detik timer berjalan.

## 2. Strategi Anti-Bouncing & Caching
- State timer disimpan dengan key: `generatics_timer_${username}_${spunAt}`.
- Saat admin mereset peserta, key timer lama dibersihkan sehingga sesi baru dijamin memiliki waktu penuh 05:00.

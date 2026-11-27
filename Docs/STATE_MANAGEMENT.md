# Tata Kelola State Klien (State Management)

## 1. Pemisahan State Komponen
- State putaran roda (`isSpinning`, `themes`, `isSpinOpen`) diisolasi di dalam komponen `SpinWheel`.
- State hitung mundur timer diisolasi di dalam komponen `PrepTimer`.
- State kartu hasil resmi diisolasi di dalam komponen `ResultCard`.
- Pemisahan ini mencegah re-render komponen yang tidak perlu saat detik timer berjalan.

# Algoritma Pengundian Mosi & Keseimbangan Posisi

## 1. Pemilihan Tema & Mosi Adil
1. Mengambil seluruh tema yang berstatus `isActive === true`.
2. Dari tema aktif, memfilter mosi yang memenuhi kriteria:
   - `isActive === true`
   - `usedCount < maxUsage` (atau `maxUsage === null`).
3. Pengundian menggunakan fungsi random kriptografis `crypto.randomInt` untuk distribusi probabilitas seragam.

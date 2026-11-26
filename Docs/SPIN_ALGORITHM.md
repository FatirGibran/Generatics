# Algoritma Pengundian Mosi & Keseimbangan Posisi

## 1. Pemilihan Tema & Mosi Adil
1. Mengambil seluruh tema yang berstatus `isActive === true`.
2. Dari tema aktif, memfilter mosi yang memenuhi kriteria:
   - `isActive === true`
   - `usedCount < maxUsage` (atau `maxUsage === null`).
3. Pengundian menggunakan fungsi random kriptografis `crypto.randomInt` untuk distribusi probabilitas seragam.

## 2. Penyeimbangan Posisi Debat (PRO / KONTRA)
Untuk memastikan jumlah tim PRO dan KONTRA seimbang dalam satu sesi pertandingan:
- Sistem menghitung agregat posisi dalam batch sesi peserta terkait (`sessionBatch`).
- Jika selisih PRO dan KONTRA melebihi ambang batas, sistem secara otomatis mengarahkan hasil ke posisi minoritas.
- Jika seimbang, sistem memberikan probabilitas 50:50.

# Panduan Kontribusi & Rekayasa Kode

## Standar Kode Bersih (Anti-Slop & Ponytail)
1. **Solusi Paling Ramping:** Hindari abstraksi berlebih, wrapper yang tidak diminta, dan library yang tidak perlu.
2. **Komentar Efektif:** Hanya tulis komentar yang menjelaskan *alasan* (WHY) dan batasan arsitektur, bukan mengulang apa yang kode lakukan.
3. **Validasi Tanpa Kompromi:** Validasi input selalu ditegakkan di batas jaringan (API route payload & Prisma schema).
4. **Verifikasi Sebelum Land:** Pastikan `npx tsc --noEmit` dan skrip QA lulus 100% sebelum commit.

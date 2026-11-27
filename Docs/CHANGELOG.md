# Catatan Perubahan (Changelog) DEBATE GENERATICS 2026

## Versi 1.2.0 (2026-11-20)
- Penambahan fitur import massal peserta via file CSV dan Excel (.xlsx).
- Editor modal peserta dan mosi terintegrasi dengan validasi responsif.
- Sinkronisasi real-time tombol reset admin ke arena spin peserta.
- Penataan isolasi cache timer berbasis timestamp putaran (`spunAt`).
- Penghapusan tombol duplikat pada kartu hasil dan penambahan header identitas acara.

## Versi 1.1.0 (2026-11-19)
- Migrasi backend dari Firebase ke Prisma ORM + SQLite persisten.
- Implementasi Audio Engine prosedural Web Audio API kosmik.
- Penguatan mode SQLite WAL dan penanganan proteksi konkurensi putaran.

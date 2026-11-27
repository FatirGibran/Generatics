# Prosedur Quality Assurance & Pengujian Otomatis

## 1. Rangkaian Tes Komprehensif
Untuk memastikan integritas sistem sebelum kompetisi dimulai, jalankan test suite otomatis:

```bash
# 1. Type-checking TypeScript
npx tsc --noEmit

# 2. Build verifikasi
npm run build

# 3. Rangkaian QA E2E (17 Skenario)
npx tsx scripts/qa-test.ts

# 4. Uji Stres Konkurensi & Keseimbangan
npx tsx scripts/concurrency-test.ts
```

## 2. Cakupan 17 Skenario QA
1. Health probe & koneksi basis data.
2. Integritas aset logo institusi dan kegiatan.
3. Sanitasi tampilan homepage dari akun debug/demo.
4. Penolakan password salah pada login admin.
5. Autentikasi sukses admin dengan hash bcrypt.
6. Verifikasi sesi cookie `/api/auth/me`.
7. Operasi CRUD konfigurasi pengaturan sistem.
8. Operasi CRUD tema dan mosi debat.
9. Proteksi duplikasi NIM dan token peserta.
10. Validasi token salah vs token valid peserta.
11. Pencegahan spin saat gerbang akses ditutup.
12. Eksekusi undian mosi dan posisi.
13. Proteksi single-spin lock (putaran berulang ditolak).
14. Penguncian detail kartu pada sesi peserta.
15. Reset status undian oleh panitia.
16. Ekspor laporan dalam format CSV dan XLSX.
17. Pembersihan data uji coba dari basis data.

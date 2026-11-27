# Panduan Operasional Panitia (Admin Guide)

## 1. Akses Dashboard Admin
- Buka tautan `/admin/login`.
- Masukkan username `admin` dan kata sandi operasional panitia.
- Dashboard menyajikan 4 tab navigasi utama:
  1. **Live Overview:** Pantauan statistik real-time dan log putaran terbaru.
  2. **Tema & Mosi:** Bank soal mosi debat terstruktur per kategori.
  3. **Peserta & Token:** Daftar akun, token akses, dan kontrol reset.
  4. **Pengaturan:** Gerbang akses spin dan durasi waktu persiapan.

## 2. Manajemen Peserta
Panitia dapat menambahkan peserta melalui dua cara:
1. **Tambah Peserta Satuan:**
   - Masukkan NIM/Username dan Nama Lengkap.
   - Pilih sesi (`Day 1` atau `Day 2`).
   - Token dapat dikosongkan agar digenerate otomatis oleh sistem (`STR-XXXX`).
2. **Import Massal (CSV / XLSX):**
   - Format: `username,full_name,session_batch,access_token`.
   - File maksimal 5 MB (hingga 500 peserta dalam satu kali unggah).

## 3. Kontrol Reset Putaran Peserta
Jika peserta mengalami kendala teknis darurat di panggung:
1. Masuk ke tab **Peserta & Token**.
2. Cari peserta via kolom pencarian atau filter status.
3. Klik tombol **Reset Spin**.
4. Sistem akan mengembalikan status peserta ke `Belum Spin`, memulihkan kuota mosi, dan membersihkan cache timer peserta secara otomatis.

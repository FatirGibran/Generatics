# Alur Pengalaman Peserta (User Journey)

## 1. Gerbang Masuk & Login Peserta
- Peserta memasukkan NIM/Username dan Token Akses 4 karakter (misal `STR-492A`).
- Sistem memvalidasi token dan mengarahkan peserta ke arena `/spin`.
- Lagu latar bertema kosmik (*curious mood*) mulai diputar secara otomatis sesuai izin audio browser.

## 2. Arena Putaran Roda (Spin Wheel)
- Roda spin merender irisan tema-tema aktif.
- Saat tombol spin ditekan, roda berputar dengan akselerasi kinetik dan efek partikel bintang.
- Putaran berlangsung selama 5–7 detik dengan perlambatan kurva cubic-bezier hingga berhenti tepat pada tema terpilih.
- Confetti emas/hijau/oranye meletus saat kartu hasil terkunci resmi.

## 3. Kartu Hasil Mosi & Timer Persiapan
- Hasil undian menampilkan kategori tema, mosi resmi dalam tipografi serif elegan, dan tiket posisi (TIM PRO / TIM KONTRA).
- Kotak Waktu Persiapan Argumen (Case Building) menyediakan kontrol timer murni:
  - `Mulai Persiapan`
  - `Jeda`
  - `Lanjutkan`
  - `Ulangi Timer`
- State timer diikat dengan ID putaran (`spunAt`) sehingga bebas dari bug sisa waktu 00:00 saat terjadi reset.

## 4. Layar Penutup & Himbauan Screenshot
- Tombol aksi utama `Selesai Sesi & Lanjut Pengumuman` membuka layar penutup resmi `PostDebateScreen`.
- Peserta dihimbau melakukan tangkapan layar (screenshot) kartu mosi sebagai bukti fisik cadangan bagi dewan juri.

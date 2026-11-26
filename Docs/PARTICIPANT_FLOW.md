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

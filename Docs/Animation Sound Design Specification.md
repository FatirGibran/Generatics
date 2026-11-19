# Animation & Sound Design Specification
## Generatics 2026: "Playful Cosmic Whimsy"

---

### 1. Konsep & Nuansa (*Mood & Vibe*)
Untuk mendukung semangat **TWINKLE, TWINKLE** dan tagline ***DARE TO TRY, REACH THE SKY!***, interaksi visual dan audio di dalam website dirancang agar terasa **seru, hangat, dan menyenangkan (*playful*)**—seperti membuka kotak kejutan di dunia mimpi, bukan seperti ujian yang kaku dan menegangkan.

* **Kata Kunci Rasa:** *Bouncy* (membal), *Sparkly* (berkilau), *Whimsical* (imajinatif), dan *Celebratory* (merayakan keberanian peserta).
* **Ramah Konferensi Daring:** Karena Babak I dilaksanakan secara *online* melalui Zoom/Google Meet, seluruh musik latar dan efek suara dirancang menggunakan frekuensi yang jernih dengan sistem *auto-ducking* (volume otomatis mengecil saat tidak ada aksi) agar tidak bertabrakan dengan suara moderator maupun peserta.

---

### 2. Spesifikasi Animasi (*Motion Design*)

#### 2.1 Animasi Latar Belakang (*Ambient Dreamscape*)
Berjalan terus-menerus secara halus (*60fps GPU-accelerated*) untuk menghidupkan latar `Deep Cosmic Navy`:
* **Twinkling Stars:** Taburan bintang 4-sudut dan titik cahaya dengan skala dan opasitas yang berdenyut acak (*staggered pulse* berdurasi 2–4 detik).
* **Floating Whimsy Elements:** Ilustrasi bulan sabit, awan kecil, dan ornamen geometris di sudut layar yang melayang naik-turun perlahan (*gentle float* sejauh `8px` dengan kurva *sine wave*).
* **Occasional Shooting Star:** Setiap 12–15 detik, satu bintang jatuh melintas diagonal di latar belakang untuk memberi kejutan visual kecil.

#### 2.2 Interaksi Mikro (*Micro-Interactions*)
Menggunakan fisika pegas (*spring physics*: `stiffness: 400, damping: 17`) agar elemen terasa hidup saat disentuh kursor:
* **Tombol Utama (`SPIN SEKARANG`):**
  * *Idle:* Efek kilau cahaya (*shimmer sweep*) melintas di permukaan tombol emas setiap 3 detik.
  * *Hover:* Tombol membesar (`scale: 1.05`) dengan bayangan bercahaya (*golden glow*) dan bintang kecil bermunculan di tepinya.
  * *Active/Click:* Efek membal ke dalam (`scale: 0.95`) seperti tombol mesin *arcade*.
* **Kartu Mosi (*3D Tilt Effect*):** Saat kartu hasil undian muncul, kursor yang diarahkan ke atas kartu akan memberikan efek kemiringan 3D halus (*subtle perspective tilt*) layaknya kartu koleksi holografik.

#### 2.3 Sekuens Utama: Proses Spin (Total Durasi: ~4 Detik)
Agar momen pengundian terasa seru dan membangun antusiasme, animasi spin dibagi menjadi **4 fase**:

1. **Fase 1 — Anticipation (`0.0s – 0.4s`):**
   * Roda kosmik atau tumpukan kartu bintang sedikit mengerut dan bergetar (*wiggle*) seolah mengumpulkan energi sebelum melesat.
2. **Fase 2 — High-Speed Cosmic Shuffle (`0.4s – 2.5s`):**
   * Roda tema berputar kencang disertai jejak cahaya pelangi-emas (*star trail*).
   * Di sebelahnya, indikator posisi **`PRO`** (hijau) dan **`KONTRA`** (oranye) berkedip bergantian dengan cepat seperti *arcade slot*.
3. **Fase 3 — Dramatic Deceleration (`2.5s – 3.7s`):**
   * Kecepatan putaran melambat secara dramatis menggunakan kurva *custom ease-out* (`cubic-bezier(0.15, 0.85, 0.25, 1)`), memberi efek *tick... tick... tick...* yang mendebarkan sebelum berhenti tepat pada mosi terpilih.
4. **Fase 4 — Grand Reveal & Star Celebration (`3.7s+`):**
   * Kartu hasil berbingkai *patchwork* muncul dari tengah layar dengan animasi membal (*pop-in spring*).
   * **Starlight Confetti:** Ledakan konfeti khusus berbentuk **bintang 4-sudut dan lingkaran kecil** berwarna emas, periwinkle, dan warna posisi peserta (`#10B981` jika PRO, `#F97316` jika KONTRA).

#### 2.4 Animasi Widget Timer Persiapan
* Bilah kemajuan (*progress bar*) berbentuk lintasan bintang yang bergerak menyusut secara halus.
* Ketika waktu tersisa **30 detik**, bingkai timer berubah menjadi oranye hangat dengan detak skala lembut untuk memberi isyarat waktu hampir habis tanpa membuat panik.

---

### 3. Spesifikasi Musik & Tata Suara (*Audio Design*)

#### 3.1 Kontrol & Etika Audio Web
* **Floating Audio Controller:** Tombol ikon *Speaker / Music Note* selalu tersedia di pojok kanan atas layar agar peserta dapat mematikan (*Mute*) atau menyalakan suara kapan saja.
* **Smart Autoplay:** Musik latar mulai diputar lembut hanya setelah peserta menekan tombol pertama kali (misal saat klik `Login`), sesuai kebijakan *browser* modern.
* **Default Volume:** BGM disetel pada **20% volume**, sedangkan SFX (*Sound Effects*) pada **55% volume**.

#### 3.2 Konsep Musik Latar (*Background Music / BGM*)
* **Genre:** *Whimsical Lo-Fi / Cozy Space Chiptune-Orchestral* (terinspirasi dari nuansa *Nintendo / Super Mario Galaxy* versi santai).
* **Instrumen Utama:** *Marimba*, *Kalimba*, *Music Box*, *Soft Synth Pad*, dan ketukan perkusi ringan (*100 BPM*).
* **Perilaku Audio:**
  * Saat **Belum Spin**: Musik ceria dan penuh rasa penasaran (*curious vibe*).
  * Saat **Sedang Spin**: BGM otomatis di-*fade out* sementara agar fokus ke suara putaran roda.
  * Saat **Sudah Spin (Timer Persiapan)**: BGM kembali masuk dengan tempo lebih tenang (*ambient lo-fi*) agar membantu peserta berkonsentrasi menyusun argumen.

#### 3.3 Daftar Efek Suara (*SFX Cue Sheet*)

| Momen / Interaksi | Nama Aset Audio | Deskripsi Karakter Suara | Durasi |
| :--- | :--- | :--- | :--- |
| **Hover Tombol Utama** | `sfx_star_hover.mp3` | Denting kristal sangat halus dan ringan (*soft high-pitched pluck*). | `0.15s` |
| **Klik Tombol / Login** | `sfx_pop_click.mp3` | Suara gelembung membal yang renyah (*playful bubble pop*). | `0.20s` |
| **Mulai Spin** | `sfx_magic_launch.mp3` | Suara *whoosh* ajaib bertabur kilau bintang saat roda mulai berputar. | `0.80s` |
| **Putaran Roda (Loop)** | `sfx_wheel_tick.mp3` | Ketukan kayu *marimba* lembut tiap melewati segmen tema (kecepatan nada mengikuti laju putaran). | `0.08s` (loop) |
| **Hasil Muncul (Reveal)** | `sfx_tada_fanfare.mp3` | *Harp glissando* naik + *tadaa!* cerah dan membangkitkan semangat. | `1.80s` |
| **Mulai Timer Persiapan** | `sfx_timer_start.mp3` | Suara lonceng kecil ganda (*ding-ding!*). | `0.40s` |
| **Waktu Persiapan Habis** | `sfx_timer_end.mp3` | Nada *chime* lembut 3 ketukan (ramah di telinga, tidak mengejutkan). | `1.20s` |

---

### 4. Rekomendasi Implementasi Teknis (Frontend)

Untuk menjaga performa website tetap ringan dan responsif di berbagai perangkat mahasiswa:

1. **Library Animasi:**
   * `framer-motion` — Untuk transisi kartu, efek membal tombol, dan animasi keluar-masuk elemen.
   * `canvas-confetti` — Dikonfigurasi menggunakan `shapes: ['star', 'circle']` dan palet warna Generatics 2026 (`['#FACC15', '#818CF8', '#10B981', '#F472B6']`).
2. **Library Audio:**
   * `use-sound` (berbasis `Howler.js`) — Mendukung *playback rate modulation* (memungkinkan satu file `sfx_wheel_tick.mp3` diputar cepat lalu melambat secara dinamis mengikuti fisika roda tanpa membebani memori).
3. **Aksesibilitas (`prefers-reduced-motion`):**
   * Jika perangkat peserta mengaktifkan mode *Reduce Motion*, animasi putaran panjang otomatis dipersingkat menjadi transisi *fade* cepat berdurasi `0.5s` agar tetap nyaman digunakan.
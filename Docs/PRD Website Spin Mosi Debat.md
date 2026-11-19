# Product Requirements Document (PRD)
## Generatics 2026 Debate Spin Platform

---

### 1. Informasi Umum Produk
* **Nama Produk:** Generatics 2026 Debate Spin Platform
* **Nama Kegiatan:** DEBATE GENERATICS 2026 — *BEYOND THE STARS: A Universe of Perspectives*
* **Rangkaian Acara:** GENERATICS 2026 — *TWINKLE, TWINKLE: A Dream We Get to Live* (Chapter 03: *SPARK*)
* **Tagline Acara:** *DARE TO TRY, REACH THE SKY!*
* **Instansi / Penyelenggara:** Prodi Teknik Informatika (IF), HMIF, HCCB — Telkom University
* **Target Pengguna:**
  1. **Admin Generatics (Panitia):** Divisi Acara, Tim Teknis/IT, dan Dewan Juri.
  2. **Peserta Generatics 2026:** Mahasiswa/i Aktif Prodi Teknik Informatika Angkatan 2026.

---

### 2. Latar Belakang & Tujuan Produk
Dalam rangkaian *Chapter 03: SPARK*, kegiatan **Debate Generatics 2026** mengusung konsep *Individual to Team Debate*. Pada **Babak I (Seleksi Debat Individu)** yang dilaksanakan secara daring (*online*) selama 2 hari, setiap peserta wajib mendapatkan **1 Tema/Mosi Debat** serta **Posisi Debat (Pro atau Kontra)** secara acak dan adil sebelum menyusun argumen.

Platform web ini dibuat untuk:
1. Menjamin transparansi dan keadilan (*fairness*) dalam pengundian mosi dan posisi debat secara *real-time*.
2. Mencegah kecurangan (*re-rolling* atau pemilihan mosi secara manual) melalui mekanisme *Single-Spin Lock*.
3. Memudahkan panitia dalam mengelola bank mosi, mendistribusikan token akses peserta, serta merekap hasil undian untuk kebutuhan penilaian juri.
4. Menghadirkan pengalaman digital yang selaras dengan identitas visual *TWINKLE, TWINKLE (Whimsical Dream Universe)*.

---

### 3. Ruang Lingkup & Aturan Bisnis (*Business Rules*)

#### 3.1 Sistem Autentikasi Tertutup
* Peserta **tidak** dapat melakukan registrasi mandiri.
* Kredensial login peserta terdiri dari **`Username`** dan **`Token Akses`** yang di-generate oleh Admin Generatics.
* Admin masuk menggunakan halaman login khusus (`/admin/login`) dengan kredensial panitia.

#### 3.2 Aturan Pengundian (*Single-Spin Lock*)
* Setiap akun peserta hanya memiliki **1 kali kesempatan spin**.
* Begitu peserta menekan tombol spin dan transaksi server berhasil, status akun berubah menjadi `has_spun = true` dan hasil dikunci secara permanen.
* Jika peserta menutup browser, berpindah perangkat, atau me-*refresh* halaman, layar akan langsung menampilkan **Kartu Hasil Undian** yang sama.
* Hanya **Admin** yang memiliki wewenang melakukan *Reset Status Spin* apabila terjadi kendala teknis (seperti koneksi terputus sebelum hasil tampil).

#### 3.3 Logika Pengacakan Mosi & Posisi
* **Pengacakan Mosi:** Diambil secara acak dari daftar mosi berstatus `Aktif`. Admin dapat menetapkan kuota maksimal kemunculan (`max_usage`) per mosi atau membiarkannya tanpa batas (`unlimited`).
* **Pengacakan Posisi (PRO / KONTRA):**
  * **Mode Balanced Random (Direkomendasikan):** Sistem menjaga keseimbangan rasio jumlah peserta Pro dan Kontra agar tetap mendekati 50:50 sepanjang sesi seleksi Hari 1 dan Hari 2.
  * **Mode Pure Random:** Pengacakan murni 50:50 tanpa mempertimbangkan distribusi sebelumnya.

---

### 4. Kebutuhan Fungsional (*Functional Requirements*)

#### 4.1 Modul Peserta (*Participant UI*)
| ID | Fitur | Deskripsi Kebutuhan | Prioritas |
| :--- | :--- | :--- | :--- |
| **FR-P01** | **Login Peserta** | Form login input `Username` dan `Token Akses` dengan pesan validasi yang jelas (token tidak valid, sesi belum dibuka, dll). | P0 (Wajib) |
| **FR-P02** | **Identitas Visual & Header** | Menampilkan deretan logo resmi (Tel-U, IF, HMIF, HCCB, Generatics 2026), judul kegiatan **DEBATE GENERATICS 2026**, dan sub-tema **BEYOND THE STARS: A Universe of Perspectives**. | P0 (Wajib) |
| **FR-P03** | **Panel Informasi & Aturan** | Menampilkan identitas peserta yang login, jadwal sesi (Hari 1 / Hari 2), serta ringkasan mekanisme Babak I (*Individual Debate*). | P1 (Tinggi) |
| **FR-P04** | **Interactive Spin Arena** | Komponen undian interaktif (*Cosmic Wheel / Mystery Star Cards*) dengan animasi putaran mulus untuk mengundi **Tema & Mosi** sekaligus **Posisi (PRO/KONTRA)**. | P0 (Wajib) |
| **FR-P05** | **Kartu Hasil Undian** | Menampilkan **Kategori Tema**, **Teks Mosi Lengkap**, **Badge Posisi (PRO / KONTRA)**, dan *timestamp* undian secara jelas dan kontras. | P0 (Wajib) |
| **FR-P06** | **Timer Persiapan Argumen** | Fitur *countdown timer* di layar hasil undian (durasi diatur Admin, misal 5 menit) untuk membantu peserta mengatur waktu *case building*. | P1 (Tinggi) |

#### 4.2 Modul Admin (*Admin Generatics UI*)
| ID | Fitur | Deskripsi Kebutuhan | Prioritas |
| :--- | :--- | :--- | :--- |
| **FR-A01** | **Login Admin** | Autentikasi terpisah khusus akun panitia/admin. | P0 (Wajib) |
| **FR-A02** | **Dashboard Monitoring** | Statistik *real-time*: total peserta, jumlah sudah spin vs belum spin, rasio Pro vs Kontra, dan statistik penggunaan mosi. | P0 (Wajib) |
| **FR-A03** | **Manajemen Tema & Mosi** | CRUD (Tambah, Lihat, Ubah, Hapus) Kategori Tema dan Butir Mosi Debat, lengkap dengan *switch* status `Aktif/Nonaktif` dan pengaturan kuota maksimal. | P0 (Wajib) |
| **FR-A04** | **Manajemen Peserta & Token** | Tambah peserta satuan atau *import* massal via `.csv`, serta fitur **Auto-Generate Token** unik untuk setiap peserta. | P0 (Wajib) |
| **FR-A05** | **Kontrol & Reset Spin** | Pencarian data peserta, tombol *Copy Credentials* (Username + Token), dan tombol **Reset Spin** untuk pemulihan kendala teknis. | P0 (Wajib) |
| **FR-A06** | **Kontrol Sesi & Pengaturan** | Sakelar global untuk **Buka/Tutup Akses Spin**, pemilihan mode acak (`BALANCED` vs `PURE_RANDOM`), dan pengaturan durasi timer persiapan. | P0 (Wajib) |
| **FR-A07** | **Export Data Laporan** | Ekspor rekap hasil undian seluruh peserta (Nama, Username, Tema, Mosi, Posisi, Waktu Spin) ke format `.csv` / `.xlsx` untuk dewan juri. | P1 (Tinggi) |

---

### 5. Kebutuhan Non-Fungsional (*Non-Functional Requirements*)
1. **Keamanan Pengacakan (*Anti-Cheat*):** Proses pengacakan mosi dan posisi wajib dieksekusi di sisi server (*server-side*) menggunakan transaksi database atomik. Frontend hanya bertugas memutar animasi menuju hasil yang dikembalikan server.
2. **Konkurensi Tinggi:** Sistem harus mampu menangani puluhan hingga ratusan klik tombol spin secara bersamaan dalam satu waktu tanpa terjadi *race condition* atau duplikasi data.
3. **Responsivitas:** Antarmuka harus berjalan optimal pada layar *Desktop/Laptop* (perangkat utama peserta saat seleksi daring) maupun *Smartphone*.
4. **Ketersediaan (*Availability*):** Waktu muat halaman (*page load*) maksimal di bawah 2 detik pada koneksi standar.

---

### 6. Alur Pengguna (*User Flows*)

#### Alur Peserta:
`Buka Website` $\rightarrow$ `Input Username & Token` $\rightarrow$ `Cek Status Akun` $\rightarrow$
* Jika **Sudah Spin**: Langsung tampil **Kartu Hasil Mosi & Posisi** + Timer Persiapan.
* Jika **Belum Spin**: Tampil **Arena Spin** $\rightarrow$ Klik `SPIN SEKARANG` $\rightarrow$ Animasi Putaran (3–4 detik) $\rightarrow$ **Kartu Hasil Mosi & Posisi** terkunci & tampil.

#### Alur Admin:
`Login Admin` $\rightarrow$ `Input Tema & Mosi` $\rightarrow$ `Input Data Peserta & Generate Token` $\rightarrow$ `Buka Akses Spin (Saat Hari H)` $\rightarrow$ `Monitoring Live & Troubleshooting` $\rightarrow$ `Export Laporan Hasil ke Juri`.
# Standard Operating Procedure (SOP) & Panduan Panitia
## Website Spin Mosi Debat — DEBATE GENERATICS 2026

---

### 1. Tujuan Dokumen
Dokumen ini menjadi panduan teknis bagi **Divisi Acara**, **Tim IT/Teknis**, dan **Liaison Officer (LO)** dalam mengoperasikan **Website Spin Mosi Debat Generatics 2026** selama tahap seleksi **Babak I (Online Individual Debate)**.

---

### 2. Pembagian Tugas Panitia (*Role & Responsibilities*)
1. **Admin Utama (Tim Teknis / IT):**
   * Melakukan input bank tema & mosi debat.
   * Mengunggah data peserta & men-generate token akses.
   * Membuka/menutup sakelar akses spin sesuai jadwal kloter/sesi.
   * Melakukan *Reset Spin* apabila terdapat peserta yang mengalami kendala jaringan terverifikasi.
2. **Moderator / MC Ruang Zoom:**
   * Mengarahkan peserta untuk login ke website dan memandu aba-aba waktu melakukan spin.
   * Menginformasikan durasi waktu persiapan (*case building*) dan waktu penyampaian argumen.
3. **Liaison Officer (LO) / Pendamping Peserta:**
   * Mendistribusikan `Username` dan `Token Akses` kepada masing-masing peserta.
   * Memverifikasi laporan kendala teknis peserta sebelum meneruskannya ke Admin Utama.
4. **Dewan Juri:**
   * Memantau mosi dan posisi (`PRO` / `KONTRA`) tiap peserta melalui tampilan *Monitoring Admin* atau lembar rekap yang diekspor panitia.

---

### 3. Tahapan Operasional

#### Tahap A: Persiapan (H-2 hingga H-1 Pelaksanaan)
1. **Finalisasi Bank Mosi:**
   * Divisi Acara menyerahkan daftar Tema dan Mosi Debat final kepada Admin Utama.
   * Admin masuk ke `/admin`, membuka menu **Tema & Mosi Debat**, lalu menginput seluruh tema dan butir mosi.
   * Pastikan seluruh mosi yang akan digunakan memiliki status **`Aktif`**.
2. **Input Peserta & Generate Token:**
   * Admin menyiapkan file `.csv` berisi daftar peserta yang telah dibagi ke dalam **`Day 1`** dan **`Day 2`**.
   * Unggah file melalui menu **Peserta & Token**, lalu klik tombol **`Generate Token`**.
   * Pastikan setiap peserta mendapatkan token unik (contoh: `STR-492A`).
3. **Simulasi / Dry Run:**
   * Panitia membuat 2–3 akun dummy (`test_peserta1`, dll) untuk menguji alur login, spin mosi, kesesuaian tampilan hasil, hingga fungsi *Reset Spin* sebelum token asli dibagikan.
4. **Distribusi Kredensial:**
   * LO membagikan tautan website beserta `Username` dan `Token Akses` secara personal kepada masing-masing peserta maksimal H-1 sebelum sesi dimulai.

---

#### Tahap B: Pelaksanaan Hari-H (Babak I — Online Individual Debate)
1. **Persiapan Ruang Daring (T-15 Menit):**
   * Admin memastikan pengaturan sesi di dashboard sudah sesuai:
     * **Mode Acak Posisi:** `BALANCED` (agar jumlah pembicara Pro dan Kontra tetap seimbang).
     * **Durasi Timer Persiapan:** Sesuai ketetapan juri (misal `5 Menit` / `300 detik`).
   * Sakelar **Akses Spin** masih dalam posisi **`TUTUP`** hingga moderator mempersilakan peserta.
2. **Proses Login & Spin (Saat Giliran Kloter):**
   * Moderator meminta peserta pada kloter berjalan untuk login menggunakan `Username` dan `Token Akses`.
   * Admin mengubah sakelar **Akses Spin** menjadi **`BUKA`**.
   * Peserta menekan tombol **`SPIN TEMA, MOSI & POSISI`**.
   * Setelah hasil muncul, peserta diwajibkan melakukan *screenshot* layar hasil sebagai bukti cadangan dan menekan tombol **`Mulai Persiapan`** pada widget timer.
3. **Penyampaian Argumen:**
   * Peserta menyampaikan argumen sesuai posisi yang didapat (**PRO** mendukung mosi, **KONTRA** menolak mosi) berdasarkan data, fakta, dan penalaran logis.
   * Juri menilai berdasarkan 5 nilai utama: *Critical Thinking*, *Logical Reasoning*, *Communication*, *Problem Solving*, dan *Negotiation*.

---

### 4. Prosedur Penanganan Kendala (*Troubleshooting*)

| Kasus Kendala | Tindakan LO / Moderator | Tindakan Admin Teknis |
| :--- | :--- | :--- |
| **Peserta lupa / salah ketik Token** | Kirim ulang kredensial yang benar melalui pesan pribadi. | Pastikan tidak ada spasi berlebih pada data peserta di sistem. |
| **Koneksi peserta terputus saat tombol spin ditekan** | Minta peserta me-*refresh* halaman terlebih dahulu. | Cek di menu **Peserta & Token**:<br>• Jika status sudah `Sudah Spin`, minta peserta melanjutkan dengan hasil yang muncul di layar.<br>• Jika status `Error / Gantung` dan peserta belum melihat hasil (terverifikasi LO), klik tombol **`Reset Spin`** agar peserta dapat mengulang 1x. |
| **Peserta meminta ulang spin karena tidak suka mosi/posisi** | **DITOLAK.** Jelaskan bahwa setiap peserta hanya mendapat 1x kesempatan acak sesuai aturan kompetisi. | **Dilarang** melakukan reset spin untuk alasan ketidaksukaan terhadap mosi atau posisi. |

---

### 5. Tahap Pasca-Seleksi (Penentuan 8 Finalis)
1. Setelah seluruh kloter Hari 1 dan Hari 2 selesai, Admin mengubah sakelar **Akses Spin** kembali ke posisi **`TUTUP`**.
2. Admin membuka menu **Rekap Hasil & Export** dan mengunduh file laporan lengkap (`.xlsx` / `.csv`).
3. Data rekap diserahkan kepada Dewan Juri untuk digabungkan dengan nilai individu guna menentukan **8 peserta terbaik** yang akan melaju ke **Babak II (Offline Team Debate)**.
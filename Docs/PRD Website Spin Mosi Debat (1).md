# Referensi Tema & Bank Mosi Debat
## DEBATE GENERATICS 2026 — BEYOND THE STARS: A Universe of Perspectives

Dokumen ini berisi kerangka kategori tema dan contoh rumusan mosi awal yang selaras dengan konteks mahasiswa baru Teknik Informatika, kehidupan kampus, serta perkembangan teknologi. Panitia/Divisi Acara dapat langsung mengimpor atau menyesuaikan daftar ini ke dalam panel **Admin Generatics**.

---

### Kategori Tema 1: Teknologi & Kecerdasan Buatan (*AI & Digital Ethics*)
* **Mosi 1.1:** Dewan ini percaya bahwa penggunaan *Generative AI* dalam pengerjaan tugas pemrograman dasar mahasiswa tahun pertama lebih banyak menghambat kemampuan berpikir logis daripada membantu proses belajar.
* **Mosi 1.2:** Dewan ini mewajibkan seluruh platform media sosial menerapkan verifikasi identitas asli (*real-name policy*) untuk menekan penyebaran disinformasi dan perundungan siber.
* **Mosi 1.3:** Dewan ini percaya bahwa pengembangan sistem pengawasan berbasis pengenalan wajah (*facial recognition*) di ruang publik harus dihentikan demi melindungi privasi warga negara.

---

### Kategori Tema 2: Pendidikan Tinggi & Dunia Kampus (*Academic & Campus Life*)
* **Mosi 2.1:** Dewan ini percaya bahwa sistem penilaian berbasis proyek kolaboratif (*project-based assessment*) sepenuhnya harus menggantikan ujian tulis konvensional di program studi berbasis teknologi.
* **Mosi 2.2:** Dewan ini mewajibkan mahasiswa tahun pertama untuk aktif minimal di satu organisasi atau kepanitiaan kampus sebagai syarat kelulusan mata kuliah pengembangan karakter.
* **Mosi 2.3:** Dewan ini percaya bahwa kebijakan kuliah hibrida (*hybrid learning*) secara permanen meningkatkan kualitas dan aksesibilitas pendidikan tinggi di Indonesia.

---

### Kategori Tema 3: Karier Digital & Masa Depan Pekerjaan (*Future of Work*)
* **Mosi 3.1:** Dewan ini percaya bahwa portofolio proyek nyata dan sertifikasi keahlian industri akan membuat gelar sarjana menjadi tidak lagi relevan dalam perekrutan talenta teknologi di masa depan.
* **Mosi 3.2:** Dewan ini mendukung penerapan aturan *Right to Disconnect* (hak karyawan untuk tidak merespons komunikasi kerja di luar jam kantor) secara ketat di perusahaan rintisan (*startup*) teknologi.

---

### Kategori Tema 4: Sosial, Lingkungan & Kebijakan Publik (*Society & Sustainability*)
* **Mosi 4.1:** Dewan ini percaya bahwa pemerintah harus memberikan insentif pajak besar bagi perusahaan teknologi yang menggunakan pusat data (*data center*) berbasis energi terbarukan meskipun berdampak pada kenaikan biaya layanan digital.
* **Mosi 4.2:** Dewan ini percaya bahwa pembatasan waktu layar (*screen time*) secara regulatif oleh negara bagi remaja di bawah usia 16 tahun adalah langkah yang dibenarkan untuk menjaga kesehatan mental generasi muda.

---

### Format CSV Siap Import untuk Admin
Panitia dapat menggunakan format struktur `.csv` berikut saat mengunggah mosi maupun data peserta ke dalam sistem:

#### Contoh `template_mosi.csv`
```csv
theme_name,motion_text,max_usage,is_active
Teknologi & Kecerdasan Buatan,"Dewan ini percaya bahwa penggunaan Generative AI dalam tugas pemrograman dasar lebih banyak menghambat kemampuan berpikir logis.",5,true
Pendidikan Tinggi & Kampus,"Dewan ini percaya bahwa proyek kolaboratif sepenuhnya harus menggantikan ujian tulis konvensional di prodi teknologi.",5,true
```

#### Contoh `template_peserta.csv`
```csv
username,full_name,session_batch
103012600001,Alya Putri Ramadhani,Day 1
103012600002,Bima Sakti Nugraha,Day 1
103012600003,Citra Kirana Dewi,Day 2
```
*(Catatan: Kolom `access_token` akan diisi otomatis secara acak oleh sistem saat Admin menekan tombol **Generate Token**).*
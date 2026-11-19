# Branding, Logo & Layout Adjustment Specification
## Generatics 2026 Debate Spin Platform

---

### 1. Inventaris Aset Logo (`public/logos/`)
Seluruh aset identitas organisasi dan kepanitiaan dikelompokkan berdasarkan tingkat hierarki institusi hingga kegiatan utama:

| No | Nama Aset | File Target | Karakteristik Visual | Peran dalam UI |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Logo Tel-U** | `tel-u.png` | Merah & Abu-abu tua *(gunakan file transparan murni tanpa background kotak-kotak)*. | Identitas Universitas (Urutan 1 di Header). |
| **2** | **Logo Prodi IF** | `if.png` | Merah, Kuning & Sirkuit Abu-abu tua. | Identitas Program Studi (Urutan 2 di Header). |
| **3** | **Logo HMIF** | `hmif.png` | Emas, Merah, Hitam di atas dasar lingkaran putih. | Identitas Himpunan (Urutan 3 di Header). |
| **4** | **Logo Kabinet** | `kabinet.png` | Perisai Emas & Putih dengan ornamen bintang. | Identitas Kepengurusan (Urutan 4 di Header). |
| **5** | **Logo Generatics** | `generatics.png` | Monogram huruf **"G"** berlapis Hijau Tua (`#144522`) & Hijau Sedang (`#2E7D32`). | **Emblem Utama Acara** (Hero Header, Poros Roda Spin, & Watermark Kartu Mosi). |

---

### 2. Aturan Kontras & Wadah Logo (*Contrast Rules*)
Karena latar belakang utama aplikasi menggunakan **`Deep Cosmic Navy` (`#0E152E`)**, logo yang memiliki elemen warna gelap (abu-abu pada Tel-U/IF serta hijau tua pada Generatics) **wajib menggunakan wadah terang** agar tetap tajam dan terbaca jelas:

1. **Institutional Crest Pill (Untuk 4 Logo Institusi):**
   * **Gaya Wadah:** Kapsul horizontal berlatar `Warm Cream (#FAF6EB)` dengan sudut membulat penuh (`rounded-full`), bayangan lembut, dan garis tepi emas tipis (`border-[#FACC15]/40`).
   * **Urutan Kiri ke Kanan:** `Tel-U` $\rightarrow$ `Prodi IF` $\rightarrow$ `HMIF` $\rightarrow$ `Kabinet`.
   * **Ukuran & Spasi:** Tinggi seragam `28px–32px` (`h-7 md:h-8`) dengan garis pemisah vertikal tipis (`1px`) antar logo.

2. **Generatics Event Medallion (Untuk Logo Utama Generatics):**
   * **Gaya Wadah:** Bingkai belah ketupat/persegi membulat (`rounded-2xl`) berlatar `Warm Cream (#FAF6EB)` dengan cincin `Starlight Gold (#FACC15)` dan efek pendar cahaya (*golden glow*) agar menyatu dengan tema bintang *Twinkle, Twinkle*.

---

### 3. Penyesuaian Tata Letak per Halaman (*Updated Layout Wireframes*)

#### 3.1 Top Navigation Bar (Halaman Login & Arena Peserta)
```text
+-----------------------------------------------------------------------------------+
|  [ (Tel-U) | (IF) | (HMIF) | (Kabinet) ]                 [ Halo, Peserta | Out ]  |
+-----------------------------------------------------------------------------------+
```
* **Sisi Kiri:** *Institutional Crest Pill* berisi 4 logo institusi secara berurutan.
* **Sisi Kanan:** Badge `CHAPTER 03 — SPARK` (pada halaman login) atau identitas `Username/Nama Peserta` + tombol `Logout` (pada halaman utama).

#### 3.2 Hero Header & Arena Spin Peserta
```text
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                         [ Emblem Logo Generatics (G) ]                            |
|                        GENERATICS 2026 • TWINKLE, TWINKLE                         |
|                             DEBATE GENERATICS 2026                                |
|                    BEYOND THE STARS: A Universe of Perspectives                   |
|                                                                                   |
|                    +-----------------------------------------+                    |
|                    |           COSMIC SPIN WHEEL             |                    |
|                    |         (Poros Tengah: Logo G)          |                    |
|                    +-----------------------------------------+                    |
|                                                                                   |
|                         [ ✨ SPIN TEMA, MOSI & POSISI ✨ ]                        |
+-----------------------------------------------------------------------------------+
```
* **Puncak Hero:** *Generatics Event Medallion* diletakkan di bagian tengah atas tepat di atas judul kegiatan sebagai pusat perhatian.
* **Poros Roda Spin (*Center Hub*):** Monogram **G** ditempatkan di titik tengah roda undian sebagai poros jarum penunjuk.

#### 3.3 Kartu Hasil Mosi (*Locked Result Card*)
* Pada sudut kanan atas kartu hasil mosi (`Warm Cream Paper`), ditempatkan **Logo Generatics** berukuran kecil (`24px`) bersanding dengan label `OFFICIAL MOTION CARD • GENERATICS 2026` sebagai tanda keaslian saat peserta melakukan *screenshot* bukti hasil undian.

#### 3.4 Tata Letak Halaman Admin (`/admin/*`)
* **Header Sidebar Kiri:** Menampilkan **Logo Generatics** di dalam wadah terang kecil + teks `GENERATICS 2026` & `Admin Panel`.
* **Footer Sidebar / Halaman Login Admin:** Menampilkan *Institutional Crest Pill* (`Tel-U`, `IF`, `HMIF`, `Kabinet`) secara rapi di bagian bawah sebagai identitas penyelenggara resmi.

---

### 4. Penyesuaian Harmoni Palet Warna
Kehadiran warna **Hijau Generatics** (`#144522` & `#2E7D32`) serta aksen merah pada logo institusi diselaraskan dengan palet utama sebagai berikut:
* **Jembatan Warna Semantik:** Warna hijau pada monogram **G** berpadu harmonis dengan warna **`Aurora Emerald` (`#10B981`)** yang dipakai pada indikator posisi **PRO**.
* **Pengendalian Aksen Pink:** Karena logo Tel-U dan IF sudah memiliki elemen warna merah, penggunaan **`Whimsy Rose Pink` (`#F472B6`)** dibatasi hanya sebagai titik-titik bintang dekoratif minor (< 5% layar) agar tampilan keseluruhan tetap bersih, elegan, dan berfokus pada kombinasi **Navy (`#0E152E`)**, **Warm Cream (`#FAF6EB`)**, dan **Starlight Gold (`#FACC15`)**.
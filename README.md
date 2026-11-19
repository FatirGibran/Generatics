# DEBATE GENERATICS 2026 — BEYOND THE STARS: A Universe of Perspectives
### Platform Pengundian Mosi & Posisi Debat (Firebase Edition)

Aplikasi web pengundian mosi dan posisi debat Babak I (*Individual Debate*) untuk rangkaian **GENERATICS 2026: Twinkle, Twinkle — Chapter 03: SPARK** (Program Studi Teknik Informatika, HMIF, HCCB Telkom University).

---

## 1. Fitur Utama

- **Portal Peserta (`/`):**
  - Autentikasi tertutup berbasis `Username/NIM` + `Token Akses` (format `STR-XXXX`).
  - Sesi aman `httpOnly` JWT (`jose`).
  - **Cosmic Spin Wheel:** Animasi undian 4-fase (Antisipasi, Putaran Cepat, Deselerasi Dramatis, Grand Reveal) dengan efek audio sintetis Web Audio API tanpa dependensi file eksternal.
  - **Single-Spin Lock:** Pengundian dieksekusi di server via `adminDb.runTransaction()` (Cloud Firestore) untuk mencegah *race condition* dan pengundian ulang (*re-rolling*).
  - **Locked Result Card:** Kartu hasil bertema *Warm Cream Paper* dengan cap keaslian resmi Generatics 2026, teks mosi lengkap, dan badge posisi (`TIM PRO` / `TIM KONTRA`).
  - **Case Building Timer:** Hitung mundur persiapan argumen interaktif (default 5 menit / 300 detik) dengan peringatan audio pada 30 detik terakhir.
  - **Floating Audio Controller:** Sakelar mute/unmute untuk BGM dan efek suara kosmik.

- **Dashboard Admin (`/admin`):**
  - **Real-Time Monitoring:** Menggunakan listener `onSnapshot` Firestore untuk pembaruan instan statistik peserta, rasio PRO/KONTRA, dan aktivitas undian.
  - **Sakelar Global Buka/Tutup Spin:** Kontrol akses undian mosi secara instan saat sesi berlangsung.
  - **Manajemen Tema & Mosi:** Tambah, ubah, hapus, dan atur kuota pemakaian (`maxUsage`).
  - **Manajemen Peserta & Token:** Tambah peserta satuan, generate token otomatis, salin kredensial cepat, dan import massal format CSV.
  - **Reset Spin Atomik:** Pemulihan kendala jaringan per peserta yang secara otomatis mengembalikan status spin dan mengurangi counter pemakaian mosi.
  - **Ekspor Juri:** Unduh laporan lengkap rekap hasil undian dalam format Excel (`.xlsx`) atau `.csv`.

---

## 2. Cara Menghubungkan Firebase Console

1. Buat project baru di [Firebase Console](https://console.firebase.google.com/).
2. Aktifkan **Cloud Firestore Database** dalam mode produksi (*Production Mode*).
3. Salin isi file [firestore.rules](file:///Users/fatirgibran/Project/Generatics/firestore.rules) ke menu **Firestore Database -> Rules** di Firebase Console, lalu klik **Publish**.
4. Ambil **Firebase Web App Config** (Project Settings -> General -> Your apps -> Web):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
5. Ambil **Firebase Admin Service Account** (Project Settings -> Service Accounts -> Generate new private key):
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
6. Masukkan seluruh kredensial tersebut ke dalam file [.env.local](file:///Users/fatirgibran/Project/Generatics/.env.local).

---

## 3. Menjalankan Aplikasi & Seeding Data

### Menjalankan Server Development
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

### Melakukan Seeding Data Awal
Tersedia 2 cara mudah:
1. **Via Dashboard Web:** Buka halaman `/admin/login` lalu klik tombol **"Inisialisasi / Seed Data Awal"**.
2. **Via Endpoint API / CLI:**
```bash
curl -X POST http://localhost:3000/api/admin/seed
```
atau via terminal:
```bash
npm run seed
```

### Kredensial Default Hasil Seeding:
- **Akun Panitia / Admin:**
  - URL: `/admin/login`
  - Username: `admin`
  - Password: `admin_generatics_2026`
- **Contoh Akun Peserta Demo:**
  - `103012600001` (Alya Putri Ramadhani — Day 1) | Token: `STR-492A`
  - `103012600002` (Bima Sakti Nugraha — Day 1) | Token: `STR-718B`
  - `103012600003` (Citra Kirana Dewi — Day 2) | Token: `STR-230C`
  - `103012600004` (Dimas Arya Pratama — Day 2) | Token: `STR-894D`
  - `103012600005` (Eka Zahra Maulida — Day 1) | Token: `STR-561E`

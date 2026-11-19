# Technical Architecture & Tech Stack
## Generatics 2026 Debate Spin Platform

---

### 1. Rekomendasi Tech Stack
Arsitektur dirancang agar cepat dikembangkan, ringan saat diakses bersamaan oleh ratusan mahasiswa baru, dan mudah dikelola oleh tim teknis kepanitiaan.

| Layer | Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Framework Fullstack** | **Next.js 14+ (App Router)** | Mendukung frontend React dan backend API Routes dalam satu repositori (*monorepo*), memudahkan deployment dan manajemen tipe data. |
| **Bahasa Pemrograman** | **TypeScript** | Menjamin keamanan tipe data (*type safety*) antara skema database, API pengacakan, dan komponen UI. |
| **Styling & UI** | **Tailwind CSS** | Mempermudah penerapan palet warna khusus (*Deep Cosmic Navy*, *Starlight Gold*, dll) dan tata letak responsif. |
| **Animasi Interaktif** | **Framer Motion** | Menghasilkan animasi putaran *Spin Wheel / Mystery Cards*, transisi kartu hasil, dan efek bintang berkelip yang halus pada 60fps. |
| **Ikonografi** | **Lucide React** | Kumpulan ikon bersih dan konsisten untuk antarmuka Admin maupun Peserta. |
| **Database** | **PostgreSQL (via Supabase / Neon)** | Database relasional yang mendukung transaksi ACID (*Atomicity, Consistency, Isolation, Durability*) untuk mencegah *race condition* saat spin massal. |
| **ORM** | **Prisma ORM** | Mempermudah migrasi skema database dan penulisan *interactive transactions* yang aman. |
| **Autentikasi** | **Jose (JWT) + HTTP-Only Cookies** | Sesi login ringan dan aman tanpa ketergantungan pihak ketiga yang rumit untuk sistem `Username + Token`. |
| **Hosting / Deployment** | **Vercel** | Integrasi mulus dengan Next.js, mendukung *auto-scaling* saat lonjakan trafik seleksi debat. |

---

### 2. Skema Database (*Prisma Schema*)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Stance {
  PRO
  KONTRA
}

enum RandomMode {
  BALANCED
  PURE_RANDOM
}

model Admin {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}

model Theme {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  isActive    Boolean  @default(true)
  motions     Motion[]
  createdAt   DateTime @default(now())
}

model Motion {
  id           String        @id @default(uuid())
  themeId      String
  theme        Theme         @relation(fields: [themeId], references: [id], onDelete: Cascade)
  motionText   String
  maxUsage     Int?          // Null = tanpa batas pemakaian
  usedCount    Int           @default(0)
  isActive     Boolean       @default(true)
  participants Participant[]
  createdAt    DateTime      @default(now())
}

model Participant {
  id               String    @id @default(uuid())
  username         String    @unique // Misal: NIM atau Kode Peserta
  fullName         String
  accessToken      String    @unique // Misal: GEN26-849X
  sessionBatch     String    @default("Day 1") // "Day 1" atau "Day 2"
  hasSpun          Boolean   @default(false)
  assignedMotionId String?
  assignedMotion   Motion?   @relation(fields: [assignedMotionId], references: [id])
  assignedStance   Stance?
  spunAt           DateTime?
  createdAt        DateTime  @default(now())
}

model SystemSetting {
  id                  Int        @id @default(1)
  isSpinOpen          Boolean    @default(false)
  randomMode          RandomMode @default(BALANCED)
  prepDurationSeconds Int        @default(300) // Default 5 menit (300 detik)
  updatedAt           DateTime   @updatedAt
}
```

---

### 3. Spesifikasi Endpoint API

#### 3.1 Autentikasi (`/api/auth/*`)
* `POST /api/auth/participant/login`
  * **Body:** `{ "username": "...", "accessToken": "..." }`
  * **Response:** Set cookie sesi peserta & kembalikan profil peserta beserta status `hasSpun`.
* `POST /api/auth/admin/login`
  * **Body:** `{ "username": "...", "password": "..." }`
  * **Response:** Set cookie sesi admin.
* `POST /api/auth/logout`
  * Menghapus cookie sesi aktif.

#### 3.2 Arena Spin Peserta (`/api/spin`)
* `GET /api/spin/status`
  * Mengambil data peserta aktif, status `isSpinOpen`, daftar tema aktif (untuk label visual pada roda undian), dan hasil spin jika `hasSpun == true`.
* `POST /api/spin/execute`
  * Menjalankan proses pengundian acak di sisi server (lihat algoritma di Bagian 4).
  * **Response:** `{ "theme": "...", "motionText": "...", "stance": "PRO" | "KONTRA", "spunAt": "..." }`.

#### 3.3 Manajemen Admin (`/api/admin/*`)
* `GET / POST / PATCH / DELETE /api/admin/themes` — Kelola kategori tema.
* `GET / POST / PATCH / DELETE /api/admin/motions` — Kelola butir mosi debat.
* `GET / POST / PATCH / DELETE /api/admin/participants` — Kelola akun peserta & *bulk import*.
* `POST /api/admin/participants/[id]/reset` — Reset status spin peserta tertentu (`hasSpun = false`, mengurangi `usedCount` mosi terkait).
* `GET / PATCH /api/admin/settings` — Ubah pengaturan global (`isSpinOpen`, `randomMode`, `prepDurationSeconds`).
* `GET /api/admin/export` — Generate dan unduh file `.csv` rekap hasil undian.

---

### 4. Algoritma Pengacakan Server-Side (*Anti-Cheat & Concurrency Safe*)

Untuk menjamin keadilan dan mencegah manipulasi dari sisi browser, proses undian pada `POST /api/spin/execute` mengikuti langkah-langkah berikut di dalam `prisma.$transaction`:

1. **Validasi Sesi & Status:**
   * Periksa apakah `SystemSetting.isSpinOpen == true`. Jika `false`, tolak dengan status `403 Forbidden` (*"Sesi undian belum dibuka oleh panitia"*).
   * Kunci baris data peserta (*row-level check*): Jika `participant.hasSpun == true`, hentikan pengacakan baru dan langsung kembalikan data hasil yang sudah tersimpan sebelumnya (idempoten).
2. **Seleksi Mosi Tersedia:**
   * Query seluruh `Motion` di mana `isActive == true`, `theme.isActive == true`, dan `(maxUsage IS NULL OR usedCount < maxUsage)`.
   * Pilih 1 indeks secara acak menggunakan modul kriptografi bawaan Node.js (`crypto.randomInt(0, availableMotions.length)`).
3. **Penentuan Posisi (`PRO` atau `KONTRA`):**
   * Jika `randomMode == 'PURE_RANDOM'`:
     * `stance = crypto.randomInt(0, 2) === 0 ? 'PRO' : 'KONTRA'`.
   * Jika `randomMode == 'BALANCED'`:
     * Hitung jumlah `proCount` dan `kontraCount` pada `sessionBatch` yang sama dengan peserta.
     * Jika `proCount - kontraCount >= 2`, tetapkan `stance = 'KONTRA'`.
     * Jika `kontraCount - proCount >= 2`, tetapkan `stance = 'PRO'`.
     * Jika selisih $< 2$, acak 50:50 menggunakan `crypto.randomInt(0, 2)`.
4. **Simpan & Kunci Hasil:**
   * Update `Participant`: set `hasSpun = true`, `assignedMotionId`, `assignedStance`, dan `spunAt = new Date()`.
   * Update `Motion`: inkrementasi `usedCount` sebesar `+1`.
5. **Kirim ke Frontend:**
   * Frontend menerima hasil final, memutar animasi roda/kartu selama 3,5 detik, dan berhenti tepat pada mosi serta posisi yang dikembalikan server.
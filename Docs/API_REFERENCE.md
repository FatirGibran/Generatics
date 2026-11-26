# Spesifikasi REST API DEBATE GENERATICS 2026

## Standar Komunikasi
- **Format Data:** JSON (`Content-Type: application/json`)
- **Autentikasi:** HTTP-only Cookie (`generatics_session`, `generatics_admin_session`, `generatics_participant_session`)
- **Format Tanggal:** ISO 8601 UTC string (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Status Kode:** Standar HTTP (200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 409 Conflict, 500 Server Error)

## 1. Endpoint Autentikasi

### `POST /api/auth/participant`
Melakukan login peserta menggunakan kombinasi NIM/Username dan Token Akses.

**Request Body:**
```json
{
  "username": "103112430153",
  "accessToken": "STR-EXCY"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "participant": {
    "username": "103112430153",
    "fullName": "Fatir Gibran",
    "sessionBatch": "Day 1",
    "hasSpun": false
  }
}
```

### `POST /api/auth/admin`
Melakukan login akun panitia/admin menggunakan username dan password.

**Request Body:**
```json
{
  "username": "admin",
  "password": "generatics2026"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "admin": {
    "username": "admin"
  }
}
```

### `GET /api/auth/me`
Memverifikasi status sesi aktif dari cookie yang tersimpan di browser.

**Query Parameters:**
- `role`: (opsional) `"admin"` atau `"participant"`
- `_t`: Timestamp anti-cache

**Response (200 OK):**
```json
{
  "authenticated": true,
  "role": "participant",
  "participant": {
    "username": "103112430153",
    "fullName": "Fatir Gibran",
    "sessionBatch": "Day 1",
    "hasSpun": false,
    "assignedMotionText": null,
    "assignedThemeName": null,
    "assignedStance": null,
    "spunAt": null
  }
}
```

## 2. Endpoint Arena Spin

### `GET /api/spin`
Mengambil konfigurasi arena undian: tema aktif, status gerbang spin, durasi timer, dan profil undian peserta aktif.

**Response (200 OK):**
```json
{
  "settings": {
    "isSpinOpen": true,
    "prepDurationSeconds": 300
  },
  "themes": [
    { "id": "theme-1", "name": "Teknologi & Kecerdasan Buatan" }
  ],
  "participant": {
    "username": "103112430153",
    "hasSpun": false
  }
}
```

### `POST /api/spin`
Mengeksekusi undian mosi dan posisi debat untuk peserta yang sedang login. Memiliki proteksi idempotensi (single-spin lock).

**Response (200 OK):**
```json
{
  "success": true,
  "alreadySpun": false,
  "themeName": "Teknologi & Kecerdasan Buatan",
  "motionText": "Dewan ini percaya bahwa penggunaan AI...",
  "stance": "PRO",
  "spunAt": "2026-11-20T10:00:00.000Z",
  "participant": {
    "username": "103112430153",
    "fullName": "Fatir Gibran",
    "sessionBatch": "Day 1"
  }
}
```

## 3. Endpoint Manajemen Admin

### `GET /api/admin/settings`
Mengambil status pengaturan global sistem (pembukaan gerbang spin dan durasi persiapan).

### `PATCH /api/admin/settings`
Memperbarui pengaturan global sistem.

**Request Body:**
```json
{
  "isSpinOpen": true,
  "prepDurationSeconds": 300
}
```

### `GET /api/admin/participants`
Mengambil daftar seluruh peserta terdaftar beserta status undian dan mosi yang diperoleh.

**Query Parameters:**
- `batch`: (opsional) `"ALL"`, `"Day 1"`, atau `"Day 2"`

### `POST /api/admin/participants`
Mendaftarkan peserta baru (satuan atau massal).

### `PATCH /api/admin/participants`
Mengubah data identitas peserta (nama lengkap, sesi, atau token) tanpa merusak hasil undian yang sudah berjalan.

### `DELETE /api/admin/participants?username={username}`
Menghapus peserta dari basis data. Jika peserta sudah memutar roda, kuota `usedCount` pada mosi terkait akan dikurangi 1 secara otomatis.

### `POST /api/admin/participants/reset`
Mereset status undian peserta agar dapat memutar roda spin kembali.

**Request Body:**
```json
{
  "username": "103112430153"
}
```
Atau untuk reset per batch:
```json
{
  "batch": "Day 1"
}
```

### `GET /api/admin/overview`
Mengambil data agregasi statistik dan log hasil undian terbaru untuk tampilan dashboard panitia.

**Response (200 OK):**
```json
{
  "stats": {
    "total": 7,
    "spun": 3,
    "unspun": 4,
    "pro": 2,
    "kontra": 1
  },
  "recentSpins": []
}
```

### `GET /api/admin/export`
Mengekspor laporan hasil undian seluruh peserta dalam format spreadsheet.

**Query Parameters:**
- `format`: `"xlsx"` atau `"csv"`

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

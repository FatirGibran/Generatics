# Spesifikasi REST API DEBATE GENERATICS 2026

## Standar Komunikasi
- **Format Data:** JSON (`Content-Type: application/json`)
- **Autentikasi:** HTTP-only Cookie (`generatics_session`, `generatics_admin_session`, `generatics_participant_session`)
- **Format Tanggal:** ISO 8601 UTC string (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Status Kode:** Standar HTTP (200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 409 Conflict, 500 Server Error)

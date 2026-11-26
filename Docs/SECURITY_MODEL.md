# Model Keamanan & Autentikasi

## 1. Mekanisme Sesi Stateless JWT
- Kredensial disimpan dalam JSON Web Token (JWT) yang ditandatangani menggunakan algoritma `HS256` via pustaka `jose`.
- Payload sesi berisi `role` (`admin` atau `participant`), `username`, serta timestamp kedaluwarsa (7 hari).
- Cookie diamankan dengan atribut: `HttpOnly`, `SameSite=Lax`, dan `Path=/`.

## 2. Pemisahan Cookie Berdasarkan Peran (Role Isolation)
Untuk mencegah tabrakan sesi saat panitia membuka halaman peserta dan admin di browser yang sama:
- Sesi Admin disimpan pada cookie: `generatics_admin_session`.
- Sesi Peserta disimpan pada cookie: `generatics_participant_session`.
- Helper `getAdminSession()` dan `getParticipantSession()` membaca cookie masing-masing secara independen.

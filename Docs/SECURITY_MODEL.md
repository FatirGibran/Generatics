# Model Keamanan & Autentikasi

## 1. Mekanisme Sesi Stateless JWT
- Kredensial disimpan dalam JSON Web Token (JWT) yang ditandatangani menggunakan algoritma `HS256` via pustaka `jose`.
- Payload sesi berisi `role` (`admin` atau `participant`), `username`, serta timestamp kedaluwarsa (7 hari).
- Cookie diamankan dengan atribut: `HttpOnly`, `SameSite=Lax`, dan `Path=/`.

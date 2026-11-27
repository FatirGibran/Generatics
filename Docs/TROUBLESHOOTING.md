# Panduan Penanganan Masalah (Troubleshooting)

## 1. Kendala Audio Tidak Berbunyi di Browser
- **Penyebab:** Kebijakan autoplay modern browser memblokir audio sebelum adanya interaksi klik dari pengguna.
- **Solusi:** `soundManager` telah diprogram untuk otomatis mengaktifkan AudioContext pada klik pertama pengguna di halaman mana pun.

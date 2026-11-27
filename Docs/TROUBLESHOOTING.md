# Panduan Penanganan Masalah (Troubleshooting)

## 1. Kendala Audio Tidak Berbunyi di Browser
- **Penyebab:** Kebijakan autoplay modern browser memblokir audio sebelum adanya interaksi klik dari pengguna.
- **Solusi:** `soundManager` telah diprogram untuk otomatis mengaktifkan AudioContext pada klik pertama pengguna di halaman mana pun.

## 2. Peserta Tidak Sengaja Menutup Tab Saat Timer Berjalan
- **Penyebab:** Peserta me-refresh atau menutup tab peramban saat case building.
- **Solusi:** Timer menggunakan timestamp akhir absolut (`endTimestamp`) di `localStorage`. Saat halaman dibuka kembali, sisa detik dihitung ulang tanpa ada penambahan waktu curang.

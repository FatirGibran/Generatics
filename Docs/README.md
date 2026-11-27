# DEBATE GENERATICS 2026 — Dokumentasi Teknis

Selamat datang di pusat dokumentasi teknis sistem **DEBATE GENERATICS 2026** ("BEYOND THE STARS: A Universe of Perspectives").

Untuk meninjau dokumen lengkap, silakan kunjungi [Indeks Dokumentasi](./INDEX.md).

### Menjalankan Server Produksi
```bash
npx pm2 reload ecosystem.config.js --update-env
```

### Memeriksa Kesiapan Sistem
```bash
curl -s http://localhost:3000/api/health
```

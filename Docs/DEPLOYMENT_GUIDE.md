# Panduan Deployment & Produksi 24/7 di macOS

## 1. Menjalankan Server Lokal PM2
Untuk kestabilan maksimal sepanjang acara, server lokal macOS dijalankan dengan PM2:

```bash
# Menjalankan atau reload layanan
npx pm2 reload ecosystem.config.js --update-env

# Memeriksa status proses
npx pm2 status

# Melihat log langsung
npx pm2 logs debate-generatics-2026
```

## 2. Konfigurasi `ecosystem.config.js`
- Nama aplikasi: `debate-generatics-2026`
- Script: `node_modules/next/dist/bin/next start`
- Memory threshold: `max_memory_restart: "1G"`
- Autorestart: `true` (otomatis bangun kembali jika crash).

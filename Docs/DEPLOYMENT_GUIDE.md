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

## 3. Ekspos Jaringan Lokal & Cloudflare Tunnel
- **Akses LAN:** Komputer juri dan peserta dapat mengakses server via IP lokal Mac (contoh: `http://192.168.1.50:3000`).
- **Cloudflare Tunnel:** Menggunakan skrip `./scripts/expose-public.sh` untuk menghasilkan tautan HTTPS publik yang aman tanpa konfigurasi port forwarding router.

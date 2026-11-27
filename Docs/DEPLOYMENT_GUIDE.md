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

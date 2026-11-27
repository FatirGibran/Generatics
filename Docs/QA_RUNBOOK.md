# Prosedur Quality Assurance & Pengujian Otomatis

## 1. Rangkaian Tes Komprehensif
Untuk memastikan integritas sistem sebelum kompetisi dimulai, jalankan test suite otomatis:

```bash
# 1. Type-checking TypeScript
npx tsc --noEmit

# 2. Build verifikasi
npm run build

# 3. Rangkaian QA E2E (17 Skenario)
npx tsx scripts/qa-test.ts

# 4. Uji Stres Konkurensi & Keseimbangan
npx tsx scripts/concurrency-test.ts
```

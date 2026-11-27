# Arsitektur Audio Engine (Web Audio API)

## 1. Desain Bebas Dependensi Eksternal
Audio engine Generatics 2026 dibangun 100% menggunakan osilator bawaan `AudioContext` peramban web:
- Nol dependensi file MP3/WAV eksternal (menghemat bandwidth dan mencegah kegagalan loading).
- Bebas latensi decoding.
- Resisten terhadap pemblokiran CSP (Content Security Policy).

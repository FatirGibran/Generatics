# Arsitektur Audio Engine (Web Audio API)

## 1. Desain Bebas Dependensi Eksternal
Audio engine Generatics 2026 dibangun 100% menggunakan osilator bawaan `AudioContext` peramban web:
- Nol dependensi file MP3/WAV eksternal (menghemat bandwidth dan mencegah kegagalan loading).
- Bebas latensi decoding.
- Resisten terhadap pemblokiran CSP (Content Security Policy).

## 2. Mesin Musik Latar (Ambient Cosmic BGM)
- Menghasilkan alunan pad kosmik lembut melalui generator osilator `sine` dan `triangle` dengan filter biquad low-pass.
- Status mood BGM:
  - `curious`: Mood misterius saat peserta berada di arena spin wheel.
  - `calm`: Mood tenang dan terfokus saat peserta menyusun argumen dengan timer.

## 3. Efek Suara Prosedural (Procedural SFX)
- `playTick()`: Klik mekanis saat jarum roda melewati pembatas tema.
- `playFanfare()`: Arpeggio akord mayor kemenangan saat roda berhenti pada mosi.
- `playTimerAlert()`: Nada peringatan saat sisa waktu persiapan tersisa 30 detik.
- `playTimerEnd()`: Bel nada ganda tanda waktu case building resmi berakhir.

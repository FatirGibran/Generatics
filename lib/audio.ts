"use client";

const STORAGE_KEY = "generatics:muted";
const TRACK_STORAGE_KEY = "generatics:track_id";
const SFX_VOLUME = 0.55;
const BGM_VOLUME = 0.22;
const BGM_DUCKED = 0.03;

export type BGMMood = "summertime" | "curious" | "calm";

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  src: string;
}

export const PLAYLIST: AudioTrack[] = [
  {
    id: "every-summertime",
    title: "Every Summertime",
    artist: "NIKI",
    genre: "R&B / Soul",
    src: "/audio/every-summertime.m4a",
  },
  {
    id: "summer-love",
    title: "Summer Love",
    artist: "Rook1e",
    genre: "Chill Lofi / R&B",
    src: "/audio/rook1e-summer-love.m4a",
  },
  {
    id: "sunkissed",
    title: "Sunkissed",
    artist: "Khai Dreams",
    genre: "Ukulele / Upbeat Pop",
    src: "/audio/khai-dreams-sunkissed.m4a",
  },
  {
    id: "coffee-breath",
    title: "Coffee Breath",
    artist: "Sofia Mills",
    genre: "Bedroom Pop",
    src: "/audio/sofia-mills-coffee-breath.m4a",
  },
  {
    id: "daydreaming",
    title: "Daydreaming",
    artist: "Miel",
    genre: "90s Rhodes R&B",
    src: "/audio/miel-daydreaming.m4a",
  },
];

// NIKI - "Every Summertime" Synth Chord Progression & Melody Sequence (Fallback Engine)
const SUMMERTIME_BEAT_MS = 680;
const SUMMERTIME_CHORDS = [
  { root: 73.42, notes: [146.83, 185.0, 220.0, 277.18, 369.99] },
  { root: 61.74, notes: [123.47, 146.83, 185.0, 220.0, 293.66] },
  { root: 82.41, notes: [164.81, 196.0, 246.94, 293.66, 392.0] },
  { root: 55.0, notes: [110.0, 196.0, 277.18, 329.63, 440.0] },
];

const SUMMERTIME_HOOK = [
  { f: 369.99, beat: 0.0, dur: 0.4 },
  { f: 440.0, beat: 0.5, dur: 0.4 },
  { f: 369.99, beat: 1.0, dur: 0.35 },
  { f: 329.63, beat: 1.5, dur: 0.35 },
  { f: 293.66, beat: 2.0, dur: 0.4 },
  { f: 329.63, beat: 2.5, dur: 0.35 },
  { f: 369.99, beat: 3.0, dur: 0.7 },
  { f: 369.99, beat: 4.0, dur: 0.4 },
  { f: 440.0, beat: 4.5, dur: 0.4 },
  { f: 493.88, beat: 5.0, dur: 0.5 },
  { f: 440.0, beat: 5.6, dur: 0.35 },
  { f: 369.99, beat: 6.1, dur: 0.35 },
  { f: 329.63, beat: 6.6, dur: 0.35 },
  { f: 293.66, beat: 7.1, dur: 0.7 },
  { f: 293.66, beat: 8.0, dur: 0.35 },
  { f: 329.63, beat: 8.5, dur: 0.35 },
  { f: 369.99, beat: 9.0, dur: 0.4 },
  { f: 440.0, beat: 9.5, dur: 0.45 },
  { f: 369.99, beat: 10.1, dur: 0.35 },
  { f: 329.63, beat: 10.6, dur: 0.35 },
  { f: 293.66, beat: 11.1, dur: 0.6 },
  { f: 440.0, beat: 12.0, dur: 0.4 },
  { f: 493.88, beat: 12.5, dur: 0.4 },
  { f: 554.37, beat: 13.0, dur: 0.45 },
  { f: 587.33, beat: 13.6, dur: 0.5 },
  { f: 554.37, beat: 14.3, dur: 0.35 },
  { f: 493.88, beat: 14.8, dur: 0.35 },
  { f: 440.0, beat: 15.3, dur: 0.6 },
];

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private loaded = false;
  private bgmPlaying = false;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ducked = false;
  private mood: BGMMood = "summertime";

  // Playlist and track state
  private currentTrackIdx = 0;
  private trackListeners: Set<(track: AudioTrack) => void> = new Set();

  // Audio file element for real audio streaming
  private audioElement: HTMLAudioElement | null = null;
  private audioFileAvailable = false;
  private audioInitialized = false;

  private loadPersisted() {
    if (this.loaded || typeof window === "undefined") return;
    this.loaded = true;
    try {
      this.isMuted = window.localStorage.getItem(STORAGE_KEY) === "1";
      const savedTrackId = window.localStorage.getItem(TRACK_STORAGE_KEY);
      if (savedTrackId) {
        const found = PLAYLIST.findIndex((t) => t.id === savedTrackId);
        if (found >= 0) this.currentTrackIdx = found;
      }
    } catch {
      // storage unavailable
    }
  }

  private bgmTarget() {
    return this.isMuted ? 0 : this.ducked ? BGM_DUCKED : BGM_VOLUME;
  }

  private ramp(node: GainNode | null, value: number, tc = 0.08) {
    if (!node || !this.ctx) return;
    node.gain.cancelScheduledValues(this.ctx.currentTime);
    node.gain.setTargetAtTime(value, this.ctx.currentTime, tc);
  }

  private initContext() {
    if (typeof window === "undefined") return;
    this.loadPersisted();
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.isMuted ? 0 : SFX_VOLUME;
      this.sfxGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmTarget();
      this.bgmGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => undefined);
    }
  }

  private setupAudioElement() {
    if (this.audioInitialized || typeof window === "undefined") return;
    this.audioInitialized = true;
    this.loadPersisted();

    try {
      const audio = new Audio();
      audio.preload = "auto";
      audio.volume = this.bgmTarget();
      audio.loop = true;
      audio.src = this.getCurrentTrack().src;

      audio.addEventListener("canplaythrough", () => {
        this.audioFileAvailable = true;
        if (this.bgmPlaying && !this.isMuted && audio.paused) {
          this.stopSynthBGM();
          void audio.play().catch(() => undefined);
        }
      });

      audio.addEventListener("error", () => {
        // Fallback to synth if file fails
        this.audioFileAvailable = false;
        if (this.bgmPlaying && !this.isMuted) {
          this.startSynthBGM();
        }
      });

      this.audioElement = audio;
      audio.load();
    } catch {
      this.audioFileAvailable = false;
    }
  }

  public getPlaylist(): AudioTrack[] {
    return PLAYLIST;
  }

  public getCurrentTrack(): AudioTrack {
    this.loadPersisted();
    return PLAYLIST[this.currentTrackIdx] || PLAYLIST[0];
  }

  public getCurrentTrackIndex(): number {
    this.loadPersisted();
    return this.currentTrackIdx;
  }

  public subscribeTrack(cb: (track: AudioTrack) => void): () => void {
    this.trackListeners.add(cb);
    cb(this.getCurrentTrack());
    return () => {
      this.trackListeners.delete(cb);
    };
  }

  public setTrack(target: number | string) {
    this.loadPersisted();
    let nextIdx = 0;
    if (typeof target === "number") {
      nextIdx = (target + PLAYLIST.length) % PLAYLIST.length;
    } else {
      const found = PLAYLIST.findIndex((t) => t.id === target);
      if (found >= 0) nextIdx = found;
    }

    this.currentTrackIdx = nextIdx;
    const track = PLAYLIST[nextIdx];

    try {
      window.localStorage.setItem(TRACK_STORAGE_KEY, track.id);
    } catch {
      // ignore
    }

    this.trackListeners.forEach((cb) => {
      try {
        cb(track);
      } catch {
        // ignore
      }
    });

    if (this.audioElement) {
      this.audioElement.src = track.src;
      this.audioElement.volume = this.bgmTarget();
      this.audioElement.loop = true;
      this.audioElement.load();
      if (!this.isMuted) {
        this.bgmPlaying = true;
        this.stopSynthBGM();
        void this.audioElement.play().catch(() => {
          this.startSynthBGM();
        });
      }
    } else {
      this.setupAudioElement();
    }
  }

  public nextTrack() {
    this.setTrack(this.currentTrackIdx + 1);
  }

  public prevTrack() {
    this.setTrack(this.currentTrackIdx - 1);
  }

  public setMuted(muted: boolean) {
    this.loadPersisted();
    this.isMuted = muted;
    try {
      window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {
      // ignore
    }

    if (muted) {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.volume = 0;
      }
      this.ramp(this.sfxGain, 0, 0.03);
      this.ramp(this.bgmGain, 0, 0.03);
      this.stopSynthBGM();
      this.bgmPlaying = false;
    } else {
      this.initContext();
      this.ramp(this.sfxGain, SFX_VOLUME, 0.03);
      this.ramp(this.bgmGain, this.bgmTarget(), 0.1);
      this.startBGM(true);
    }
  }

  public getMuted(): boolean {
    this.loadPersisted();
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.getMuted());
    return this.isMuted;
  }

  private bgmPausedForSpin = false;

  public pauseBGMForSpin() {
    this.bgmPausedForSpin = true;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopSynthBGM();
    this.bgmPlaying = false;
  }

  public resumeBGMAfterSpin() {
    if (this.bgmPausedForSpin) {
      this.bgmPausedForSpin = false;
      if (!this.isMuted) {
        this.startBGM();
      }
    }
  }

  public duckBGM(ducked: boolean) {
    if (ducked) {
      this.pauseBGMForSpin();
    } else {
      this.resumeBGMAfterSpin();
    }
  }

  public setBGMMood(mood: BGMMood) {
    if (this.mood === mood) return;
    this.mood = mood;
  }

  private blip(
    type: OscillatorType,
    freq: number,
    start: number,
    dur: number,
    peak: number,
    dest: GainNode,
    endFreq?: number
  ) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  private playRhodesChord(notes: number[], start: number, dur: number) {
    if (!this.ctx || !this.bgmGain) return;
    notes.forEach((f) => {
      this.blip("sine", f, start, dur, 0.038, this.bgmGain!);
      this.blip("triangle", f * 2, start, dur * 0.6, 0.012, this.bgmGain!);
    });
  }

  private playBassNote(freq: number, start: number, dur: number) {
    if (!this.ctx || !this.bgmGain) return;
    this.blip("triangle", freq, start, dur, 0.07, this.bgmGain!);
    this.blip("sine", freq * 0.5, start, dur * 0.8, 0.05, this.bgmGain!);
  }

  private playSnap(start: number) {
    if (!this.ctx || !this.bgmGain) return;
    this.blip("triangle", 1200, start, 0.04, 0.025, this.bgmGain!, 400);
  }

  private sfx(fn: (ctx: AudioContext, dest: GainNode, now: number) => void) {
    if (this.getMuted()) return;
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;
      fn(this.ctx, this.sfxGain, this.ctx.currentTime);
    } catch {
      // Audio fails silently if blocked by browser policy
    }
  }

  public playHover() {
    this.sfx((_c, dest, now) => this.blip("sine", 880, now, 0.12, 0.08, dest, 1320));
  }

  public playClick() {
    this.sfx((_c, dest, now) => {
      this.blip("triangle", 440, now, 0.15, 0.2, dest, 880);
    });
  }

  public playSpinLaunch() {
    this.sfx((ctx, dest, now) => {
      // 1. Energetic launch whoosh with lowpass filter sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.65);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(250, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.65);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.28, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.74);

      // 2. Rising cosmic chime sparkle
      [880, 1174.66, 1479.98, 1760, 2349.32].forEach((f, i) => {
        this.blip("triangle", f, now + 0.08 + i * 0.08, 0.28, 0.12, dest);
      });
    });
  }

  public playTick(pitchMultiplier = 1.0) {
    this.sfx((ctx, dest, now) => {
      const f = 620 * Math.max(0.6, Math.min(2.0, pitchMultiplier));

      // 1. Crisp transient snap (mechanical ratchet peg)
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = "triangle";
      click.frequency.setValueAtTime(f * 2.8, now);
      click.frequency.exponentialRampToValueAtTime(f * 0.4, now + 0.035);
      clickGain.gain.setValueAtTime(0.32, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      click.connect(clickGain);
      clickGain.connect(dest);
      click.start(now);
      click.stop(now + 0.04);

      // 2. Resonant wood-knock ping
      const wood = ctx.createOscillator();
      const woodGain = ctx.createGain();
      wood.type = "sine";
      wood.frequency.setValueAtTime(f, now);
      woodGain.gain.setValueAtTime(0.22, now);
      woodGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
      wood.connect(woodGain);
      woodGain.connect(dest);
      wood.start(now);
      wood.stop(now + 0.07);
    });
  }

  public playFanfare() {
    this.sfx((_c, dest, now) => {
      const glide = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5, 1318.5];
      glide.forEach((f, i) => this.blip("triangle", f, now + i * 0.055, 0.7, 0.14, dest));
      const t = now + glide.length * 0.055 + 0.05;
      [523.25, 659.25, 783.99, 1046.5].forEach((f) => {
        this.blip("sine", f, t, 1.6, 0.17, dest);
        this.blip("triangle", f * 2, t, 0.9, 0.04, dest);
      });
    });
  }

  public playTimerAlert() {
    this.sfx((_c, dest, now) => {
      [659.25, 880].forEach((f, i) => this.blip("sine", f, now + i * 0.15, 0.3, 0.18, dest));
    });
  }

  public playTimerEnd() {
    this.sfx((_c, dest, now) => {
      [783.99, 659.25, 523.25].forEach((f, i) =>
        this.blip("triangle", f, now + i * 0.25, 0.6, 0.2, dest)
      );
    });
  }

  public startBGM(force = false) {
    if (typeof window === "undefined") return;
    this.bgmPausedForSpin = false;
    if (this.getMuted()) return;

    this.setupAudioElement();

    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => undefined);
    }

    if (this.audioElement) {
      this.audioElement.volume = this.bgmTarget();
      if (force || this.audioElement.paused || !this.bgmPlaying) {
        this.bgmPlaying = true;
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.startSynthBGM();
          });
        }
      }
      return;
    }

    this.startSynthBGM();
  }

  private startSynthBGM() {
    try {
      this.initContext();
      if (!this.ctx || !this.bgmGain) return;

      this.bgmPlaying = true;
      this.ramp(this.bgmGain, this.bgmTarget(), 0.15);

      const beatSec = SUMMERTIME_BEAT_MS / 1000;
      const totalBeats = 16;
      let currentBeat = 0;

      this.bgmTimer = setInterval(() => {
        if (!this.bgmPlaying || this.isMuted || !this.ctx || !this.bgmGain) return;
        if (this.ctx.state === "suspended") return;

        const now = this.ctx.currentTime;
        const beatInLoop = currentBeat % totalBeats;

        if (beatInLoop % 4 === 0) {
          const barIdx = Math.floor(beatInLoop / 4);
          const chord = SUMMERTIME_CHORDS[barIdx % SUMMERTIME_CHORDS.length];
          this.playRhodesChord(chord.notes, now, beatSec * 3.6);
          this.playBassNote(chord.root, now, beatSec * 1.8);
        }

        if (beatInLoop % 4 === 2) {
          const barIdx = Math.floor(beatInLoop / 4);
          const chord = SUMMERTIME_CHORDS[barIdx % SUMMERTIME_CHORDS.length];
          this.playBassNote(chord.root, now, beatSec * 1.4);
        }

        if (beatInLoop % 2 === 1) {
          this.playSnap(now);
        }

        const matchingNote = SUMMERTIME_HOOK.find(
          (h) => Math.abs(h.beat - beatInLoop) < 0.25
        );
        if (matchingNote) {
          this.blip("sine", matchingNote.f, now, matchingNote.dur, 0.055, this.bgmGain);
          this.blip("triangle", matchingNote.f, now, matchingNote.dur * 0.7, 0.02, this.bgmGain);
        }

        currentBeat++;
      }, SUMMERTIME_BEAT_MS);
    } catch {
      // Ignore
    }
  }

  private stopSynthBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public stopBGM() {
    this.bgmPlaying = false;
    this.stopSynthBGM();
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }
}

export const soundManager = new SoundManager();

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
    id: "stuck-lany",
    title: "Stuck",
    artist: "LANY",
    genre: "Pop / Alternative",
    src: "/audio/lany-stuck.m4a",
  },
  {
    id: "purple-olivia-rodrigo",
    title: "Purple",
    artist: "Olivia Rodrigo",
    genre: "Pop / Ballad",
    src: "/audio/olivia-rodrigo-purple.m4a",
  },
  {
    id: "bm-thats-what-i-like",
    title: "That's What I Like (Instrumental)",
    artist: "Bruno Mars",
    genre: "R&B / Funk Instrumental",
    src: "/audio/bruno-mars-thats-what-i-like.m4a",
  },
  {
    id: "bm-versace",
    title: "Versace on the Floor (Instrumental)",
    artist: "Bruno Mars",
    genre: "Slow R&B Instrumental",
    src: "/audio/bruno-mars-versace-on-the-floor.m4a",
  },
  {
    id: "bm-just-the-way-you-are",
    title: "Just the Way You Are (Instrumental)",
    artist: "Bruno Mars",
    genre: "Pop / Ballad Instrumental",
    src: "/audio/bruno-mars-just-the-way-you-are.m4a",
  },
  {
    id: "bm-talking-to-the-moon",
    title: "Talking to the Moon (Instrumental)",
    artist: "Bruno Mars",
    genre: "Piano / Ballad Instrumental",
    src: "/audio/bruno-mars-talking-to-the-moon.m4a",
  },
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

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private loaded = false;
  private bgmPlaying = false;
  private sfxGain: GainNode | null = null;
  private ducked = false;
  private mood: BGMMood = "summertime";

  // Playlist and track state
  private currentTrackIdx = 0;
  private trackListeners: Set<(track: AudioTrack) => void> = new Set();

  // Audio file element for real audio streaming
  private audioElement: HTMLAudioElement | null = null;
  private audioInitialized = false;
  private bgmPausedForSpin = false;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;

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
      // Storage unavailable
    }
  }

  private bgmTarget() {
    return this.isMuted ? 0 : this.ducked ? BGM_DUCKED : BGM_VOLUME;
  }

  private clearFade() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  private fadeAudioElement(targetVol: number, durationMs: number, onComplete?: () => void) {
    this.clearFade();
    if (!this.audioElement) {
      onComplete?.();
      return;
    }
    const audio = this.audioElement;
    const startVol = audio.volume;
    const diff = targetVol - startVol;
    if (Math.abs(diff) < 0.005 || durationMs <= 0) {
      audio.volume = Math.max(0, Math.min(1, targetVol));
      onComplete?.();
      return;
    }

    const steps = Math.max(6, Math.floor(durationMs / 25));
    const stepTime = durationMs / steps;
    let currentStep = 0;

    this.fadeInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const nextVol = startVol + diff * progress;
      audio.volume = Math.max(0, Math.min(1, nextVol));

      if (currentStep >= steps) {
        this.clearFade();
        audio.volume = Math.max(0, Math.min(1, targetVol));
        onComplete?.();
      }
    }, stepTime);
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
      audio.src = this.getCurrentTrack().src;

      audio.addEventListener("canplaythrough", () => {
        if (this.bgmPlaying && !this.isMuted && audio.paused && !this.bgmPausedForSpin) {
          void audio.play().catch(() => undefined);
        }
      });

      audio.addEventListener("ended", () => {
        this.nextTrack();
      });

      audio.addEventListener("error", () => {
        // Audio load error handled silently
      });

      this.audioElement = audio;
      audio.load();
    } catch {
      // Audio element not supported
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
      // Storage unavailable
    }

    this.trackListeners.forEach((cb) => {
      try {
        cb(track);
      } catch {
        // Ignore listener error
      }
    });

    if (this.audioElement) {
      this.clearFade();
      this.audioElement.src = track.src;
      this.audioElement.volume = this.bgmTarget();
      this.audioElement.load();
      if (!this.isMuted) {
        this.bgmPlaying = true;
        void this.audioElement.play().catch(() => {
          this.bgmPlaying = false;
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
      // Storage unavailable
    }

    if (muted) {
      this.clearFade();
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.volume = 0;
      }
      this.ramp(this.sfxGain, 0, 0.03);
      this.bgmPlaying = false;
    } else {
      this.initContext();
      this.ramp(this.sfxGain, SFX_VOLUME, 0.03);
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

  public pauseBGMForSpin() {
    this.bgmPausedForSpin = true;
    if (this.audioElement) {
      this.fadeAudioElement(0, 150, () => {
        if (this.bgmPausedForSpin && this.audioElement) {
          this.audioElement.pause();
        }
      });
    }
    this.bgmPlaying = false;
  }

  public resumeBGMAfterSpin() {
    if (!this.bgmPausedForSpin) return;
    this.bgmPausedForSpin = false;
    if (this.isMuted) return;

    if (this.audioElement) {
      this.audioElement.volume = 0;
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.bgmPlaying = true;
            this.fadeAudioElement(this.bgmTarget(), 800);
          })
          .catch(() => undefined);
      }
    }
  }

  public duckBGM(ducked: boolean) {
    this.ducked = ducked;
    if (this.audioElement && this.bgmPlaying && !this.isMuted && !this.bgmPausedForSpin) {
      this.fadeAudioElement(this.bgmTarget(), ducked ? 200 : 500);
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

      [880, 1174.66, 1479.98, 1760, 2349.32].forEach((f, i) => {
        this.blip("triangle", f, now + 0.08 + i * 0.08, 0.28, 0.12, dest);
      });
    });
  }

  public playTick(pitchMultiplier = 1.0) {
    this.sfx((ctx, dest, now) => {
      const f = 620 * Math.max(0.6, Math.min(2.0, pitchMultiplier));

      // Mechanical ratchet peg snap
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

      // Resonant wood-knock ping
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
      if (force || this.audioElement.paused || !this.bgmPlaying) {
        this.bgmPlaying = true;
        this.audioElement.volume = this.bgmTarget();
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay blocked by browser policy; wait silently for user gesture
            this.bgmPlaying = false;
          });
        }
      }
    }
  }

  public stopSynthBGM() {
    // Kept as no-op for backward compatibility
  }

  public stopBGM() {
    this.clearFade();
    this.bgmPlaying = false;
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }
}

export const soundManager = new SoundManager();

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  Music,
  SkipForward,
  SkipBack,
  Disc3,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import { soundManager, AudioTrack, PLAYLIST } from "@/lib/audio";

interface AudioToggleProps {
  className?: string;
  showTrackLabel?: boolean;
}

export default function AudioToggle({ className = "", showTrackLabel = true }: AudioToggleProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>(PLAYLIST[0]);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMuted(soundManager.getMuted());

    const unsubscribe = soundManager.subscribeTrack((track) => {
      setCurrentTrack(track);
    });

    const unlockAudio = () => {
      if (!soundManager.getMuted()) {
        soundManager.startBGM();
      }
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("click", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio, { passive: true });

    // Also attempt autoplay immediately if browser allows it
    if (!soundManager.getMuted()) {
      soundManager.startBGM();
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      unsubscribe();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleMute = () => {
    const next = soundManager.toggleMute();
    setIsMuted(next);
    if (!next) {
      soundManager.playClick();
      soundManager.startBGM(true);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    soundManager.nextTrack();
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    soundManager.prevTrack();
  };

  const handleSelectTrack = (trackId: string) => {
    soundManager.playClick();
    soundManager.setTrack(trackId);
    if (isMuted) {
      soundManager.setMuted(false);
      setIsMuted(false);
    } else {
      soundManager.startBGM(true);
    }
  };

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`} ref={popoverRef}>
      {/* Track Selector Pill */}
      {showTrackLabel && (
        <div className="flex items-center gap-1 bg-[#0E152E]/90 border border-[#FACC15]/40 hover:border-[#FACC15] rounded-full p-1 pl-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-left focus:outline-none group"
            title="Ganti Trek Instrumental"
          >
            <Disc3
              className={`w-3.5 h-3.5 text-[#FACC15] ${
                !isMuted ? "animate-spin" : "opacity-60"
              }`}
              style={{ animationDuration: "5s" }}
            />
            <div className="hidden md:flex flex-col text-left pr-1 leading-tight">
              <span className="text-[10px] font-bold text-[#FAF6EB] max-w-[130px] lg:max-w-[160px] truncate group-hover:text-[#FACC15] transition-colors">
                {currentTrack.title}
              </span>
              <span className="text-[9px] text-[#FAF6EB]/60 truncate max-w-[130px] lg:max-w-[160px]">
                {currentTrack.artist}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-[#FACC15]/70 group-hover:text-[#FACC15] transition-transform" />
          </button>

          {/* Quick Skip Next Track */}
          <button
            type="button"
            onClick={handleNext}
            className="p-1 rounded-full text-[#FAF6EB]/70 hover:text-[#FACC15] hover:bg-[#FAF6EB]/10 transition-colors focus:outline-none"
            title="Lagu Berikutnya"
            aria-label="Lagu Berikutnya"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mute/Unmute Toggle Button */}
      <button
        type="button"
        onClick={toggleMute}
        className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#0E152E]/90 border border-[#FACC15]/60 text-[#FAF6EB] shadow-[0_2px_14px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all hover:scale-105 hover:border-[#FACC15] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
        title={isMuted ? `Nyalakan Musik (${currentTrack.title})` : "Bisukan Musik (Mute)"}
        aria-label={isMuted ? "Nyalakan Musik" : "Bisukan Musik"}
        aria-pressed={!isMuted}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#F472B6]" />
        ) : (
          <>
            <Volume2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#FACC15]" />
            <span className="absolute -bottom-0.5 flex items-end gap-[1.5px] h-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-[1.5px] rounded-full bg-[#FACC15] animate-twinkle"
                  style={{
                    height: `${3 + ((i * 2) % 4)}px`,
                    animationDelay: `${i * 0.25}s`,
                    animationDuration: "1.1s",
                  }}
                />
              ))}
            </span>
          </>
        )}
      </button>

      {/* Dropdown / Popover Playlist Menu */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-72 sm:w-80 rounded-2xl bg-[#0E152E]/95 border border-[#FACC15]/40 shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl p-3.5 text-[#FAF6EB] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#FAF6EB]/10">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-[#FACC15]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#FACC15]">
                Daftar Lagu Suasana
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#FAF6EB]/50 hover:text-[#FAF6EB] p-1 rounded-md transition-colors"
              aria-label="Tutup daftar lagu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Track List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
            {PLAYLIST.map((track) => {
              const isActive = currentTrack.id === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handleSelectTrack(track.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                    isActive
                      ? "bg-[#FACC15]/15 border border-[#FACC15]/60 text-[#FAF6EB]"
                      : "hover:bg-[#FAF6EB]/5 border border-transparent text-[#FAF6EB]/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-[#FACC15] text-[#0E152E]"
                          : "bg-[#FAF6EB]/10 text-[#FAF6EB]/60"
                      }`}
                    >
                      {isActive && !isMuted ? (
                        <span className="flex items-end gap-[1.5px] h-3">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="w-1 bg-[#0E152E] rounded-full animate-pulse"
                              style={{
                                height: `${4 + (i % 2) * 6}px`,
                                animationDuration: "0.8s",
                              }}
                            />
                          ))}
                        </span>
                      ) : (
                        <Music className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isActive ? "text-[#FACC15]" : "text-[#FAF6EB]"
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-[10px] text-[#FAF6EB]/60 truncate">
                        {track.artist} · <span className="text-[#818CF8]">{track.genre}</span>
                      </p>
                    </div>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-[#FACC15] shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Quick Player Bar */}
          <div className="mt-3 pt-2.5 border-t border-[#FAF6EB]/10 flex items-center justify-between px-1">
            <span className="text-[10px] text-[#FAF6EB]/50">
              {isMuted ? "Musik dibisukan" : "Otomatis berlanjut ke trek berikutnya"}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-lg text-[#FAF6EB]/70 hover:text-[#FACC15] hover:bg-[#FAF6EB]/10 transition-colors"
                title="Lagu Sebelumnya"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-lg text-[#FAF6EB]/70 hover:text-[#FACC15] hover:bg-[#FAF6EB]/10 transition-colors"
                title="Lagu Berikutnya"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import Image from "next/image";

interface MedallionProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "hero" | "hub" | "stamp";
}

const sizeMap = {
  sm: "w-12 h-12",
  md: "w-20 h-20 md:w-24 md:h-24",
  lg: "w-28 h-28 md:w-36 md:h-36",
  xl: "w-40 h-40 sm:w-44 sm:h-44", // 160px - 176px (150px - 180px range)
};

const STAR_COUNT = 12;

export default function GeneraticsMedallion({
  size = "md",
  className = "",
  variant = "hero",
}: MedallionProps) {
  const logo = (
    <Image
      src="/logos/generatics.webp"
      alt="Generatics 2026"
      fill
      sizes="(max-width: 768px) 160px, 180px"
      className="object-contain"
      priority
    />
  );

  if (variant === "hub") {
    return (
      <div
        className={`relative rounded-full bg-[#FAF6EB] border-[3px] border-[#FACC15] shadow-[0_2px_14px_rgba(0,0,0,0.45),inset_0_0_0_3px_#FAF6EB,inset_0_0_0_4px_rgba(14,21,46,0.2)] p-[14%] ${className || "w-full h-full"}`}
      >
        <div className="relative w-full h-full">{logo}</div>
      </div>
    );
  }

  if (variant === "stamp") {
    return (
      <div
        className={`relative -rotate-[8deg] ${sizeMap[size]} ${className}`}
        role="img"
        aria-label="Segel verifikasi resmi Generatics 2026"
      >
        <div className="absolute inset-0 rounded-full bg-[#FAF6EB] border-[3px] border-[#FACC15] shadow-[0_3px_10px_rgba(14,21,46,0.35)]" />
        <div className="absolute inset-[5px] rounded-full border border-dashed border-[#0E152E]/40" />
        <div className="absolute inset-[16%]">{logo}</div>
      </div>
    );
  }

  return (
    <div className={`relative animate-float ${sizeMap[size]} ${className}`}>
      {/* soft golden glow */}
      <div className="absolute -inset-3 rounded-[2rem] bg-[#FACC15]/30 blur-xl" aria-hidden />

      {/* slowly rotating ring of stars */}
      <svg
        className="absolute -inset-4 w-[calc(100%+2rem)] h-[calc(100%+2rem)] animate-spin-slow"
        viewBox="-60 -60 120 120"
        aria-hidden
      >
        <circle r="54" fill="none" stroke="#FACC15" strokeOpacity="0.35" strokeDasharray="1.5 4" strokeLinecap="round" />
        {Array.from({ length: STAR_COUNT }).map((_, i) => {
          const a = (i / STAR_COUNT) * Math.PI * 2;
          const s = i % 3 === 0 ? 4.2 : 2.6;
          const cx = Math.cos(a) * 54;
          const cy = Math.sin(a) * 54;
          const d = `M${cx} ${cy - s} L${cx + s * 0.28} ${cy - s * 0.28} L${cx + s} ${cy} L${cx + s * 0.28} ${cy + s * 0.28} L${cx} ${cy + s} L${cx - s * 0.28} ${cy + s * 0.28} L${cx - s} ${cy} L${cx - s * 0.28} ${cy - s * 0.28}Z`;
          return <path key={i} d={d} fill={i === 6 ? "#F472B6" : i % 2 ? "#FACC15" : "#FDE047"} />;
        })}
      </svg>

      {/* cream plate with gold ring */}
      <div className="absolute inset-0 rounded-2xl bg-[#FAF6EB] border-[3px] border-[#FACC15] shadow-[0_6px_24px_rgba(250,204,21,0.4),inset_0_0_0_3px_#FAF6EB,inset_0_0_0_4px_rgba(14,21,46,0.15)]" />
      <div className="absolute inset-[12%]">{logo}</div>
    </div>
  );
}

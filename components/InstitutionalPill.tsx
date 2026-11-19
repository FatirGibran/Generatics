import Image from "next/image";

interface InstitutionalPillProps {
  className?: string;
  size?: "sm" | "md";
}

const logos = [
  { src: "/logos/tel-u.webp", alt: "Telkom University" },
  { src: "/logos/if.webp", alt: "Program Studi Teknik Informatika" },
  { src: "/logos/hmif.webp", alt: "HMIF Telkom University" },
  { src: "/logos/kabinet.webp", alt: "Kabinet HMIF" },
];

export default function InstitutionalPill({ className = "", size = "md" }: InstitutionalPillProps) {
  const slot = size === "sm" ? "h-6 w-6 sm:h-7 sm:w-7" : "h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8";

  return (
    <div
      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[#FAF6EB] border border-[#FACC15]/40 shadow-[0_2px_14px_rgba(0,0,0,0.35)] ${className}`}
      title="Penyelenggara: Telkom University • Prodi IF • HMIF • Kabinet"
    >
      {logos.map((logo, index) => (
        <div key={logo.src} className="flex items-center gap-1 sm:gap-1.5">
          <div className={`relative shrink-0 ${slot}`}>
            <Image
              src={logo.src}
              alt={logo.alt}
              fill
              sizes="32px"
              className="object-contain"
              priority
            />
          </div>
          {index < logos.length - 1 && (
            <span aria-hidden className="h-4 w-px bg-[#0E152E]/15" />
          )}
        </div>
      ))}
    </div>
  );
}

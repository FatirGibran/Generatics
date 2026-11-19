export default function SpinFooter() {
  return (
    <footer className="relative z-10 mt-auto w-full px-4 pb-8 pt-10 text-center">
      <div className="mx-auto mb-4 flex max-w-xs items-center justify-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#FACC15]/40" />
        <span className="star-clip h-3 w-3 bg-[#FACC15]" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#FACC15]/40" />
      </div>
      <p className="font-display text-sm italic text-[#FAF6EB]/70">
        Dare to try, reach the sky!
      </p>
      <p className="mx-auto mt-2 max-w-md text-balance font-sans text-[11px] leading-relaxed text-[#FAF6EB]/45">
        &copy; 2026 Generatics &middot; Program Studi Informatika &middot; HMIF Telkom University
      </p>
    </footer>
  );
}

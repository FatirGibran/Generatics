"use client";

import { motion, useReducedMotion } from "framer-motion";

interface StarLoaderProps {
  label?: string;
  className?: string;
}

export default function StarLoader({
  label = "Membuka gerbang semesta…",
  className = "",
}: StarLoaderProps) {
  const reduce = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-5 py-16 ${className}`}
    >
      <div className="relative h-20 w-20">
        <motion.span
          aria-hidden
          className="star-clip absolute inset-0 bg-[#FACC15]"
          animate={reduce ? undefined : { rotate: 360, scale: [1, 0.82, 1] }}
          transition={{
            rotate: { duration: 3.2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        <motion.span
          aria-hidden
          className="star-clip absolute left-[62%] top-[-6%] h-4 w-4 bg-[#818CF8]"
          animate={reduce ? undefined : { opacity: [0.3, 1, 0.3], scale: [0.7, 1.1, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          aria-hidden
          className="star-clip absolute bottom-[2%] left-[-8%] h-3 w-3 bg-[#F472B6]"
          animate={reduce ? undefined : { opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="font-display text-lg italic text-[#FAF6EB]/80">{label}</p>
    </div>
  );
}

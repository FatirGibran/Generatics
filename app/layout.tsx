import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import CosmicBackground from "@/components/CosmicBackground";

const display = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DEBATE GENERATICS 2026 — BEYOND THE STARS",
  description:
    "Platform Pengundian Mosi & Posisi Debat Generatics 2026: Twinkle, Twinkle (Whimsical Dream Universe) — Program Studi Teknik Informatika, Telkom University.",
  icons: {
    icon: "/logos/generatics.webp",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E152E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans bg-[#0E152E] text-[#FAF6EB] min-h-screen relative antialiased selection:bg-[#FACC15] selection:text-[#0E152E]">
        <CosmicBackground />
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}

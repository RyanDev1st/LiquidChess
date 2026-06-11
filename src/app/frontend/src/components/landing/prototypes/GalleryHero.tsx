"use client";

import { PieceCanvas } from "./PieceCanvas";

const INK = "#16140f";
const ACCENT = "#7a2230"; // oxblood

export function GalleryHero() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#f1ede3", color: INK }}>
      {/* top index bar */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-10 py-6 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: INK }}>
        <span className="font-semibold">Liquid Chess</span>
        <div className="hidden md:flex gap-8 opacity-60">
          <span>Index</span><span>Voices</span><span>Demo</span><span>Pricing</span>
        </div>
        <span className="opacity-60">Est. 2026</span>
      </div>

      {/* thin frame rules */}
      <div className="pointer-events-none absolute inset-6 border" style={{ borderColor: "rgba(22,20,15,0.14)" }} />

      <div className="relative z-20 h-full grid grid-cols-12 items-center px-12 md:px-20">
        {/* left: editorial type */}
        <div className="col-span-12 md:col-span-7">
          <div className="font-mono text-[11px] uppercase tracking-[0.4em] mb-6" style={{ color: ACCENT }}>
            01 — Real-time AI commentary
          </div>
          <h1 className="font-display leading-[0.86] tracking-[-0.02em]" style={{ fontWeight: 360 }}>
            <span className="block text-[clamp(3rem,7vw,7.5rem)]">The game</span>
            <span className="block italic text-[clamp(3.4rem,8.5vw,9rem)]" style={{ color: ACCENT, fontVariationSettings: "'opsz' 144, 'WONK' 1" }}>
              speaks.
            </span>
          </h1>
          <div className="mt-10 flex items-end gap-10 max-w-xl">
            <p className="text-[15px] leading-relaxed opacity-70 max-w-[34ch] font-sans">
              Every opening, blunder and brilliancy — narrated the instant it lands, in a voice you choose.
            </p>
            <a
              href="#"
              className="shrink-0 font-mono text-[11px] uppercase tracking-[0.25em] pb-1 border-b-2 transition-colors hover:opacity-60"
              style={{ borderColor: ACCENT, color: INK }}
            >
              Hear it live →
            </a>
          </div>
        </div>

        {/* right: piece as lit sculpture on a plinth */}
        <div className="col-span-12 md:col-span-5 relative h-full flex items-center justify-center">
          <div className="relative w-full h-[78%]">
            {/* plinth label */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 text-center font-mono text-[10px] uppercase tracking-[0.3em] opacity-55">
              <div>The Commentator</div>
              <div className="mt-1 opacity-60">Porcelain · 2026</div>
            </div>
            <PieceCanvas
              piece="King"
              color="#efe9dd"
              metalness={0.12}
              roughness={0.62}
              envPreset="studio"
              spin={0.12}
              className="absolute inset-0"
            />
          </div>
        </div>
      </div>

      {/* bottom rule caption */}
      <div className="absolute bottom-10 left-12 md:left-20 z-30 font-mono text-[10px] uppercase tracking-[0.3em] opacity-45">
        Fig. 01 / The voice of the board
      </div>
    </div>
  );
}

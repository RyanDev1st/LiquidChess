"use client";

import { PieceCanvas } from "./PieceCanvas";

// Flat, brave color field — no gradient, no dark, no gold.
const FIELD = "#6b1f2a"; // oxblood
const PAPER = "#f3e9d8"; // warm bone type

export function PopHero() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: FIELD, color: PAPER }}>
      {/* nav */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-10 py-7 font-mono text-[11px] uppercase tracking-[0.3em]">
        <span className="font-bold">Liquid Chess</span>
        <div className="hidden md:flex gap-8 opacity-70"><span>Voices</span><span>Demo</span><span>Pricing</span></div>
        <a href="#" className="px-4 py-2 rounded-full font-bold" style={{ background: PAPER, color: FIELD }}>Get started</a>
      </div>

      {/* giant type, cropped off both edges */}
      <div className="absolute inset-0 flex flex-col justify-center pointer-events-none select-none">
        <div className="font-display font-bold leading-[0.78] tracking-[-0.03em]" style={{ fontSize: "clamp(5rem,19vw,20rem)" }}>
          <div className="whitespace-nowrap -ml-[2vw]">THE GAME</div>
          <div className="whitespace-nowrap italic -ml-[1vw]" style={{ color: "#e8c14a", WebkitTextStroke: `2px ${PAPER}`, fontVariationSettings: "'WONK' 1" }}>
            SPEAKS
          </div>
        </div>
      </div>

      {/* the piece as a single striking object, right of center */}
      <PieceCanvas
        piece="Queen"
        color="#1a1210"
        metalness={0.5}
        roughness={0.32}
        envPreset="studio"
        spin={0.22}
        className="absolute inset-y-0 right-0 w-[52%] z-20"
      />

      {/* lower-left index + CTA */}
      <div className="absolute bottom-10 left-10 z-30 flex items-end gap-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em]">
          <div className="opacity-60 mb-1">① Real-time AI commentary</div>
          <div className="opacity-60">Every move, narrated · in a voice you choose</div>
        </div>
        <a href="#" className="font-mono text-[11px] uppercase tracking-[0.25em] border-b-2 pb-1" style={{ borderColor: PAPER }}>
          Hear it live →
        </a>
      </div>

      {/* big rotated edge label for energy */}
      <div className="absolute top-1/2 right-3 -translate-y-1/2 z-30 font-mono text-[10px] uppercase tracking-[0.5em] opacity-50" style={{ writingMode: "vertical-rl" }}>
        Liquid Chess · The voice of the board
      </div>
    </div>
  );
}

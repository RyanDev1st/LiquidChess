"use client";

import { Suspense, useState } from "react";
import { LiquidGoldHero } from "./LiquidGoldHero";
import { ParticleGenesisHero } from "./ParticleGenesisHero";
import { DissolveHero } from "./DissolveHero";

type Variant = "liquid" | "particles" | "dissolve";

function initialVariant(): Variant {
  const v = new URLSearchParams(window.location.search).get("proto");
  if (v === "particles") return "particles";
  if (v === "dissolve") return "dissolve";
  return "liquid";
}

function HeroCopy() {
  return (
    <div className="relative z-40 h-full max-w-[1400px] mx-auto w-full px-8 md:px-14 lg:px-20 grid items-center pointer-events-none">
      <div className="max-w-[46ch]">
        <div className="flex items-center gap-3 mb-7">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--gold] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[--gold]" />
          </span>
          <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-white/55">Live · AI commentary</p>
        </div>
        <h1 className="font-display text-white tracking-[-0.02em]" style={{ lineHeight: 0.82 }}>
          <span className="block font-[340] text-[clamp(2.8rem,6.4vw,6rem)]">The game</span>
          <span
            className="block italic text-[clamp(3.4rem,8.4vw,8rem)] text-[--gold]"
            style={{ fontWeight: 460, fontVariationSettings: "'opsz' 144, 'WONK' 1" }}
          >
            speaks.
          </span>
        </h1>
        <div className="mt-8 flex items-start gap-4">
          <span className="mt-2.5 h-px w-8 shrink-0 bg-[--gold]/50" />
          <p className="text-white/55 text-[15px] md:text-base font-light leading-relaxed">
            Real-time narration for every opening, blunder and brilliancy — called the instant it lands.
          </p>
        </div>
        <div className="mt-10 pointer-events-auto">
          <a
            href="#"
            className="group inline-flex items-center gap-2.5 rounded-full bg-[--gold] px-7 py-3.5 text-sm font-medium text-[#15110d] transition-transform duration-200 active:scale-[0.97] hover:-translate-y-[1px]"
          >
            Hear it live
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function HeroPrototypes() {
  const [variant, setVariant] = useState<Variant>(initialVariant);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#08070a" }}>
      <Suspense fallback={null}>
        {variant === "liquid" && <LiquidGoldHero />}
        {variant === "particles" && <ParticleGenesisHero />}
        {variant === "dissolve" && <DissolveHero />}
      </Suspense>

      <HeroCopy />

      {/* prototype switcher */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex gap-1 rounded-full border border-white/10 bg-black/50 p-1 backdrop-blur">
        {([
          ["dissolve", "Model Dissolve"],
          ["liquid", "Liquid Gold"],
          ["particles", "Particle Genesis"],
        ] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setVariant(v)}
            className={`rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
              variant === v ? "bg-[--gold] text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

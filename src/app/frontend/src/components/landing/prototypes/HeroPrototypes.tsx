"use client";

import { Suspense, useState } from "react";
import { WorldHero } from "./WorldHero";
import { EmergenceHero } from "./EmergenceHero";
import { AwarenessHero } from "./AwarenessHero";
import { HandHero } from "./HandHero";
import { GalleryHero } from "./GalleryHero";
import { BroadcastHero } from "./BroadcastHero";
import { PopHero } from "./PopHero";
import { SoundHero } from "./SoundHero";

type Variant = "gallery" | "broadcast" | "pop" | "sound" | "world" | "emergence" | "awareness" | "hand";

const VARIANTS: Array<[Variant, string]> = [
  ["gallery", "Gallery"],
  ["broadcast", "Broadcast"],
  ["pop", "Pop"],
  ["sound", "Sound"],
  ["world", "World"],
  ["emergence", "Emergence"],
  ["awareness", "Awareness"],
  ["hand", "Hand"],
];

function initialVariant(): Variant {
  const v = new URLSearchParams(window.location.search).get("proto");
  return (VARIANTS.find(([id]) => id === v)?.[0] ?? "gallery") as Variant;
}

export function HeroPrototypes() {
  const [variant, setVariant] = useState<Variant>(initialVariant);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <Suspense fallback={null}>
        {variant === "gallery" && <GalleryHero />}
        {variant === "broadcast" && <BroadcastHero />}
        {variant === "pop" && <PopHero />}
        {variant === "sound" && <SoundHero />}
        {variant === "world" && <WorldHero />}
        {variant === "emergence" && <EmergenceHero />}
        {variant === "awareness" && <AwarenessHero />}
        {variant === "hand" && <HandHero />}
      </Suspense>

      {/* switcher */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-wrap justify-center gap-1 rounded-full border border-white/15 bg-black/70 p-1 backdrop-blur">
        {VARIANTS.map(([v, label]) => (
          <button
            key={v}
            onClick={() => setVariant(v)}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-wider transition-colors ${
              variant === v ? "bg-white text-black" : "text-white/55 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

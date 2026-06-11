"use client";

import { Suspense, useState } from "react";
import { SplitFlapHero } from "./SplitFlapHero";
import { BroadsheetHero } from "./BroadsheetHero";
import { ScrubHero } from "./ScrubHero";
import { SchematicHero } from "./SchematicHero";
import { DuelHero } from "./DuelHero";
import { VersusHero } from "./VersusHero";
import { EclipseHero } from "./EclipseHero";

type Variant = "duel" | "versus" | "eclipse" | "splitflap" | "broadsheet" | "scrub" | "schematic";

const VARIANTS: Array<[Variant, string]> = [
  ["duel", "Duel"],
  ["versus", "Versus"],
  ["eclipse", "Eclipse"],
  ["splitflap", "Split-Flap"],
  ["broadsheet", "Broadsheet"],
  ["scrub", "Scrub"],
  ["schematic", "Schematic"],
];

function initialVariant(): Variant {
  const v = new URLSearchParams(window.location.search).get("proto");
  return (VARIANTS.find(([id]) => id === v)?.[0] ?? "duel") as Variant;
}

export function HeroPrototypes() {
  const [variant, setVariant] = useState<Variant>(initialVariant);
  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <Suspense fallback={null}>
        {variant === "duel" && <DuelHero />}
        {variant === "versus" && <VersusHero />}
        {variant === "eclipse" && <EclipseHero />}
        {variant === "splitflap" && <SplitFlapHero />}
        {variant === "broadsheet" && <BroadsheetHero />}
        {variant === "scrub" && <ScrubHero />}
        {variant === "schematic" && <SchematicHero />}
      </Suspense>

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

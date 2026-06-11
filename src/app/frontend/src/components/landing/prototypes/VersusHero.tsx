"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { DualScene } from "./dualPieces";

export function VersusHero() {
  // eval meter tips between White and Black
  const [adv, setAdv] = useState(0.6); // 0..1 toward white
  useEffect(() => {
    const id = setInterval(() => setAdv(0.35 + Math.random() * 0.4), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#0c0c0e", color: "#fff" }}>
      {/* split fields: left a hair cool-dark, right a hair lighter so black Queen reads */}
      <div className="absolute inset-0 grid grid-cols-2">
        <div style={{ background: "radial-gradient(80% 80% at 40% 45%, #14151a, #0a0a0c)" }} />
        <div style={{ background: "radial-gradient(80% 80% at 60% 45%, #20212a, #0e0e12)" }} />
      </div>

      {/* center divider with glow */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px z-20" style={{ background: "linear-gradient(transparent, rgba(201,168,76,0.7), transparent)" }} />

      {/* pieces flanking */}
      <div className="absolute inset-0 z-10">
        <Canvas camera={{ position: [0, 0.5, 5.4], fov: 42 }} dpr={[1, 2]} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} style={{ background: "transparent" }} onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}>
          <Suspense fallback={null}>
            <DualScene king={{ pos: [-1.7, 0.1, 0], scale: 1.5, ry: 0.5 }} queen={{ pos: [1.7, 0.1, 0], scale: 1.5, ry: -0.5 }} />
          </Suspense>
        </Canvas>
      </div>

      {/* top title */}
      <div className="absolute top-7 inset-x-0 z-30 text-center font-mono text-[10px] uppercase tracking-[0.5em] text-white/45">Liquid Chess — Live card</div>

      {/* fighter names */}
      <div className="absolute top-[16%] left-[8%] z-30">
        <div className="font-display font-bold leading-none tracking-[-0.02em]" style={{ fontSize: "clamp(2.4rem,6vw,5rem)" }}>WHITE</div>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-white/55">Play-by-play · The King</div>
      </div>
      <div className="absolute top-[16%] right-[8%] z-30 text-right">
        <div className="font-display font-bold leading-none tracking-[-0.02em]" style={{ fontSize: "clamp(2.4rem,6vw,5rem)" }}>BLACK</div>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-white/55">Analysis · The Queen</div>
      </div>

      {/* center VS + tipping eval meter */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-4">
        <div className="font-display italic font-bold" style={{ fontSize: "clamp(2rem,5vw,4rem)", color: "var(--gold)", fontVariationSettings: "'WONK' 1" }}>vs</div>
      </div>

      {/* eval meter bottom */}
      <div className="absolute bottom-[16%] left-1/2 -translate-x-1/2 z-30 w-[min(560px,70vw)]">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-white/45 mb-2">
          <span>White {(adv * 2).toFixed(2)}</span><span>Evaluation</span><span>Black {((1 - adv) * 2).toFixed(2)}</span>
        </div>
        <div className="relative h-2 rounded-full overflow-hidden bg-white/10">
          <div className="absolute inset-y-0 left-0 bg-white transition-[width] duration-1000 ease-out" style={{ width: `${adv * 100}%` }} />
          <div className="absolute inset-y-0 right-0 transition-[width] duration-1000 ease-out" style={{ width: `${(1 - adv) * 100}%`, background: "#3a3a42" }} />
        </div>
      </div>

      {/* headline + cta */}
      <div className="absolute bottom-9 inset-x-0 z-30 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-white/55 mb-3">The game speaks — both sides, every move</div>
        <a href="#" className="inline-block font-mono text-[11px] uppercase tracking-[0.25em] px-6 py-3 rounded-full" style={{ background: "var(--gold)", color: "#0c0c0e" }}>Hear it live →</a>
      </div>
    </div>
  );
}

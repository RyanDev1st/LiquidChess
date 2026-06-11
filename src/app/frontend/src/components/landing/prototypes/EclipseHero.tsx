"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { DualScene } from "./dualPieces";

export function EclipseHero() {
  return (
    <div className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center" style={{ background: "#15110d" }}>
      {/* faint vignette */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 60% at 50% 42%, transparent, rgba(0,0,0,0.55))" }} />

      <div className="absolute top-7 left-9 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">Liquid Chess</div>
      <div className="absolute top-7 right-9 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">The voice of the board</div>

      {/* the medallion */}
      <div className="relative" style={{ width: "min(60vh,560px)", height: "min(60vh,560px)" }}>
        {/* split disc: dark left, light right */}
        <div className="absolute inset-0 rounded-full overflow-hidden" style={{ boxShadow: "0 30px 90px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(201,168,76,0.35)" }}>
          <div className="absolute inset-0" style={{ background: "#0a0a0c", clipPath: "inset(0 50% 0 0)" }} />
          <div className="absolute inset-0" style={{ background: "#ece2cd", clipPath: "inset(0 0 0 50%)" }} />
        </div>

        {/* rotating tick ring */}
        <svg className="absolute inset-[-18px]" viewBox="0 0 100 100" style={{ animation: "eclSpin 60s linear infinite" }}>
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const r1 = 49, r2 = i % 5 === 0 ? 45.5 : 47.5;
            return <line key={i} x1={50 + Math.cos(a) * r1} y1={50 + Math.sin(a) * r1} x2={50 + Math.cos(a) * r2} y2={50 + Math.sin(a) * r2} stroke="#c9a84c" strokeWidth="0.3" strokeOpacity="0.5" />;
          })}
        </svg>

        {/* both pieces interlocked, rotating slowly as a pair */}
        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 0.2, 5] }} dpr={[1, 2]} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} style={{ background: "transparent" }} onCreated={({ camera }) => camera.lookAt(0, 0.1, 0)}>
            <Suspense fallback={null}>
              <DualScene king={{ pos: [-0.55, -0.1, 0.3], scale: 1.15, ry: 0.4 }} queen={{ pos: [0.55, -0.1, -0.3], scale: 1.15, ry: Math.PI + 0.4 }} spin={false} orbit={0.06} />
            </Suspense>
          </Canvas>
        </div>
      </div>

      {/* headline */}
      <h1 className="relative z-10 mt-10 font-display text-center text-white leading-[0.86] tracking-[-0.02em]">
        <span className="block font-[330] text-[clamp(2rem,4.6vw,4rem)]">The game</span>
        <span className="block italic text-[clamp(2.4rem,6vw,5.4rem)]" style={{ color: "var(--gold)", fontVariationSettings: "'opsz' 144,'WONK' 1" }}>speaks.</span>
      </h1>

      <div className="relative z-10 mt-6 flex items-center gap-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white" />White</span>
        <a href="#" className="font-mono text-[11px] uppercase tracking-[0.25em] px-6 py-3 rounded-full" style={{ background: "var(--gold)", color: "#15110d" }}>Hear it live →</a>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-black ring-1 ring-white/40" />Black</span>
      </div>

      <style>{`@keyframes eclSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

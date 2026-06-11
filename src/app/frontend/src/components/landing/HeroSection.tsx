"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChessHeroRig, type ChessRigRefs } from "@/components/three/ChessHeroRig";

gsap.registerPlugin(useGSAP);

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.34} color="#efe6d2" />
      <directionalLight position={[4, 7, 5]} intensity={1.4} color="#fff3e2" />
      {/* cool rim so the black Queen separates from the warm dark page */}
      <directionalLight position={[5, 4, -5]} intensity={1.8} color="#cfe0ff" />
      {/* gold under-glow from the reference */}
      <spotLight position={[1, 2, -3]} angle={0.8} penumbra={1} intensity={1.9} color="#c9a84c" />
    </>
  );
}

function makeRigRefs(): ChessRigRefs {
  return {
    root: { current: null },
    kingOuter: { current: null },
    queenOuter: { current: null },
    micOuter: { current: null },
    kingInner: { current: null },
    queenInner: { current: null },
    micInner: { current: null },
  };
}

export function HeroSection({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const refs = useRef<ChessRigRefs>(makeRigRefs());
  const materialsRef = useRef<THREE.Material[]>([]);
  const [ready, setReady] = useState(false);
  const [stageActive, setStageActive] = useState(true);
  const stageActiveRef = useRef(true);

  const handleReady = useCallback((materials: THREE.Material[]) => {
    materialsRef.current = materials;
    setReady(true);
  }, []);

  // Cheap scroll gate: keep the render loop + canvas alive only while the pieces
  // are in play, and never run GSAP ScrollTrigger on the custom snap scroller.
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const onScroll = () => {
      const p = c.scrollTop / (c.clientHeight * 1.85);
      if (stageRef.current) stageRef.current.style.opacity = p < 1 ? "1" : String(Math.max(0, 1 - (p - 1) * 4));
      const active = p < 1.05;
      if (active !== stageActiveRef.current) {
        stageActiveRef.current = active;
        setStageActive(active);
      }
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => c.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  // Entrance only (idle / parallax / hover / scroll choreography live in the rig).
  useGSAP(
    () => {
      if (!ready || !refs.current.root.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const root = refs.current.root.current;
      gsap.from(root.position, { y: -0.8, duration: 1.3, ease: "power3.out" });
      gsap.from(root.scale, { x: 0.88, y: 0.88, z: 0.88, duration: 1.3, ease: "power3.out" });
    },
    { dependencies: [ready] },
  );

  const stage =
    typeof document !== "undefined"
      ? createPortal(
          <div ref={stageRef} className="fixed inset-0 z-30 pointer-events-none" style={{ transition: "opacity 0.4s ease" }}>
            <Canvas
              camera={{ position: [0, 0.85, 4.6], fov: 40, near: 0.1, far: 100 }}
              gl={{
                antialias: true,
                alpha: true,
                powerPreference: "high-performance",
                stencil: false,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.22,
              }}
              style={{ background: "transparent" }}
              dpr={[1, 1.4]}
              frameloop={stageActive ? "always" : "never"}
              onCreated={({ camera }) => camera.lookAt(0, 0.6, 0)}
            >
              <Suspense fallback={null}>
                <Lighting />
                <Environment preset="city" background={false} />
                <ChessHeroRig refs={refs.current} containerRef={containerRef} onReady={handleReady} />
              </Suspense>
            </Canvas>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {stage}
      <section
        id="hero"
        ref={heroRef}
        className="snap-section relative overflow-hidden"
        style={{ background: "radial-gradient(115% 100% at 80% 28%, #1c1712 0%, #15110d 38%, #0c0a08 78%)" }}
      >
        {/* warm depth + brand motifs (behind the portalled pieces) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* receding chessboard floor — echoes the reference */}
          <div className="absolute inset-x-0 bottom-0 h-[58%] opacity-[0.16]" style={{ perspective: "640px", perspectiveOrigin: "50% 0%" }}>
            <div
              className="absolute inset-0 origin-top"
              style={{
                transform: "rotateX(71deg)",
                backgroundImage:
                  "linear-gradient(45deg, rgba(201,168,76,0.5) 25%, transparent 25% 75%, rgba(201,168,76,0.5) 75%)," +
                  "linear-gradient(45deg, rgba(201,168,76,0.5) 25%, transparent 25% 75%, rgba(201,168,76,0.5) 75%)",
                backgroundSize: "64px 64px",
                backgroundPosition: "0 0, 32px 32px",
                maskImage: "linear-gradient(to top, rgba(0,0,0,0.9), transparent 72%)",
                WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.9), transparent 72%)",
              }}
            />
          </div>
          {/* gold commentary waveform behind the pieces */}
          <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-[64%] h-44 opacity-[0.14]" viewBox="0 0 600 120" preserveAspectRatio="none" fill="none">
            <path
              d="M0 60 C 40 60 50 22 80 22 S 120 60 150 60 130 96 175 96 205 30 235 30 260 60 300 60 320 14 350 14 380 60 410 60 430 92 460 92 488 36 520 36 545 60 600 60"
              stroke="#c9a84c"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          {/* left vignette keeps the copy crisp over the warm field */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0908]/85 via-[#0b0908]/10 to-transparent" />
          <div className="absolute inset-0" style={{ boxShadow: "inset 0 -120px 140px -60px rgba(0,0,0,0.7), inset 0 90px 120px -70px rgba(0,0,0,0.6)" }} />
        </div>

        <div className="relative z-40 h-full max-w-[1400px] mx-auto w-full px-8 md:px-14 lg:px-20 grid grid-cols-1 md:grid-cols-12 items-center">
          <div className="md:col-span-7 lg:col-span-6 pointer-events-auto">
            <div className="flex items-center gap-3 mb-7">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--gold] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[--gold]" />
              </span>
              <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-white/55">
                Live · AI commentary
              </p>
            </div>

            <h1 className="font-display text-white tracking-[-0.02em]" style={{ lineHeight: 0.82 }}>
              <span className="block font-[340] text-[clamp(2.8rem,6.4vw,6rem)]">The game</span>
              <span
                className="block italic text-[clamp(3.4rem,8.4vw,8rem)] text-[--gold]"
                style={{ fontWeight: 460, fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 1" }}
              >
                speaks.
              </span>
            </h1>

            <div className="mt-8 flex items-start gap-4 max-w-[42ch]">
              <span className="mt-2.5 h-px w-8 shrink-0 bg-[--gold]/50" />
              <p className="text-white/55 text-[15px] md:text-base font-light leading-relaxed">
                Real-time narration for every opening, blunder and brilliancy — called the
                instant it lands, in a voice you choose.
              </p>
            </div>

            <div className="mt-10 flex items-center gap-6">
              <a
                href="#demo"
                className="group inline-flex items-center gap-2.5 rounded-full bg-[--gold] px-7 py-3.5 text-sm font-medium text-[#15110d] transition-transform duration-200 active:scale-[0.97] hover:-translate-y-[1px]"
              >
                Hear it live
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </a>
              <a href="#demo" className="group text-sm text-white/60 hover:text-white transition-colors">
                <span className="border-b border-white/15 pb-1 group-hover:border-[--gold]/60">Watch a game</span>
              </a>
            </div>
          </div>

          <div className="hidden md:block md:col-span-5 lg:col-span-6" aria-hidden />
        </div>

        {/* eval read-out — quiet editorial detail tied to the pieces */}
        <div className="pointer-events-none absolute bottom-12 right-10 hidden lg:flex flex-col items-end gap-1.5 z-40 font-mono text-[11px] tracking-[0.18em]">
          <span className="text-white/35">EVALUATION</span>
          <span className="text-emerald-300/75">WHITE +1.34</span>
          <span className="text-rose-300/60">BLACK −0.87</span>
        </div>

        {/* scroll cue */}
        <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 text-white/30">
          <span className="font-mono text-[10px] uppercase tracking-[0.4em]">Scroll</span>
          <span className="h-8 w-px bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>
    </>
  );
}

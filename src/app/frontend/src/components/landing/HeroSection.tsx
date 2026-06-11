"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { Environment, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChessHeroRig, type ChessRigRefs } from "@/components/three/ChessHeroRig";
import { HeroBackdrop } from "./HeroBackdrop";

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

  // Scroll gate: keep the render loop + canvas alive only while the pieces are in
  // play. Kept dirt-cheap — rAF-throttled, viewport height cached (no per-event
  // layout read), opacity written only on change — so the scroll thread never
  // stalls on a forced reflow (the cause of stop/start jank on native scroll).
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    let vh = c.clientHeight;
    let lastOpacity = -1;
    let ticking = false;

    const apply = () => {
      ticking = false;
      const p = c.scrollTop / (vh * 1.85);
      const o = p < 1 ? 1 : Math.max(0, 1 - (p - 1) * 4);
      if (stageRef.current && Math.abs(o - lastOpacity) > 0.01) {
        stageRef.current.style.opacity = String(o);
        lastOpacity = o;
      }
      const active = p < 1.05;
      if (active !== stageActiveRef.current) {
        stageActiveRef.current = active;
        setStageActive(active);
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    };
    const onResize = () => {
      vh = c.clientHeight;
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    apply();
    return () => {
      c.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
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
              style={{ background: "transparent", pointerEvents: "none" }}
              dpr={[1, 1.2]}
              performance={{ min: 0.5 }}
              frameloop={stageActive ? "always" : "never"}
              onCreated={({ camera }) => camera.lookAt(0, 0.6, 0)}
            >
              <Suspense fallback={null}>
                <AdaptiveDpr />
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
        <HeroBackdrop />

        <div className="relative z-40 h-full max-w-[1400px] mx-auto w-full px-8 md:px-14 lg:px-20 grid grid-cols-1 md:grid-cols-12 items-center pointer-events-none">
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

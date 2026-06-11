"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ChessHeroRig, type ChessRigRefs } from "@/components/three/ChessHeroRig";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.32} color="#e9e2d2" />
      {/* Warm key */}
      <directionalLight position={[4, 7, 5]} intensity={1.35} color="#fff4e6" />
      {/* Cool rim from back-right so the black Queen separates from the charcoal page */}
      <directionalLight position={[5, 4, -5]} intensity={1.7} color="#cfe0ff" />
      {/* Gold under-glow — the dramatic up-light from the reference */}
      <spotLight position={[1, 2, -3]} angle={0.8} penumbra={1} intensity={1.8} color="#c9a84c" />
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
  // Pause the render loop once the pieces have fully exited so the fixed canvas
  // costs nothing while the rest of the page is read.
  const [stageActive, setStageActive] = useState(true);
  const stageActiveRef = useRef(true);

  const handleReady = useCallback((materials: THREE.Material[]) => {
    materialsRef.current = materials;
    setReady(true);
  }, []);

  useGSAP(
    () => {
      const scroller = containerRef.current;
      const hero = heroRef.current;
      const stage = stageRef.current;
      const r = refs.current;
      if (!ready || !scroller || !hero || !r.kingOuter.current || !r.queenOuter.current) return;

      const king = r.kingOuter.current;
      const queen = r.queenOuter.current;
      const mic = r.micOuter.current!;
      const mats = materialsRef.current;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ---- Idle: float + sway on the inner groups (independent of scroll) ----
        const floats: Array<[THREE.Group | null, number, number]> = [
          [r.kingInner.current, 0.035, 3.2],
          [r.queenInner.current, 0.045, 3.6],
          [r.micInner.current, 0.06, 2.4],
        ];
        floats.forEach(([g, amp, dur]) => {
          if (g) gsap.to(g.position, { y: amp, duration: dur, ease: "sine.inOut", repeat: -1, yoyo: true });
        });
        if (r.kingInner.current)
          gsap.to(r.kingInner.current.rotation, { y: 0.05, duration: 5, ease: "sine.inOut", repeat: -1, yoyo: true });
        if (r.queenInner.current)
          gsap.to(r.queenInner.current.rotation, { y: -0.06, duration: 4.4, ease: "sine.inOut", repeat: -1, yoyo: true });
        if (r.micInner.current)
          gsap.to(r.micInner.current.rotation, { z: 0.18, duration: 3.8, ease: "sine.inOut", repeat: -1, yoyo: true });

        // ---- Scroll: cluster → split + flank → exit (scrubbed to scroll) ----
        const tl = gsap.timeline({
          defaults: { ease: "power1.inOut" },
          scrollTrigger: {
            scroller,
            trigger: hero,
            start: "top top",
            end: "+=185%",
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const active = self.progress < 0.99;
              if (stage) stage.style.opacity = active ? "1" : "0";
              if (active !== stageActiveRef.current) {
                stageActiveRef.current = active;
                setStageActive(active);
              }
            },
          },
        });

        // Phase A (0 → 0.6): King sweeps left, Queen right + scales up + matches
        // King's depth so both read the same size, flanking the next section.
        tl.to(king.position, { x: -3.0, y: 0.1, duration: 0.6 }, 0)
          .to(king.rotation, { y: -0.05, duration: 0.6 }, 0)
          .to(queen.position, { x: 3.1, y: 0.18, z: 0.3, duration: 0.6 }, 0)
          .to(queen.rotation, { y: 0.05, duration: 0.6 }, 0)
          .to(queen.scale, { x: 1.18, y: 1.18, z: 1.18, duration: 0.6 }, 0)
          .to(mic.position, { x: 3.6, y: 0.8, duration: 0.6 }, 0)
          // Phase B (0.6 → 1): off the screen edges, fading out.
          .to(king.position, { x: -9, duration: 0.4 }, 0.6)
          .to(queen.position, { x: 9.5, duration: 0.4 }, 0.6)
          .to(mic.position, { x: 10.5, duration: 0.4 }, 0.6)
          .to(mats, { opacity: 0, duration: 0.32 }, 0.7);

        const refresh = () => ScrollTrigger.refresh();
        const t = window.setTimeout(refresh, 400);
        window.addEventListener("load", refresh);
        return () => {
          window.clearTimeout(t);
          window.removeEventListener("load", refresh);
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.to(mats, {
          opacity: 0,
          ease: "none",
          scrollTrigger: { scroller, trigger: hero, start: "top top", end: "+=120%", scrub: true },
        });
      });
    },
    { dependencies: [ready], scope: heroRef },
  );

  // The 3D stage is a viewport-fixed overlay portalled to <body> so it is NOT a
  // child of the snap-container (which indexes its children as sections). The
  // pieces sit in the right half, so the left-aligned copy never overlaps them.
  const stage =
    typeof document !== "undefined"
      ? createPortal(
          <div
            ref={stageRef}
            className="fixed inset-0 z-30 pointer-events-none"
            style={{ transition: "opacity 0.4s ease" }}
          >
            <Canvas
              camera={{ position: [0, 0.85, 4.6], fov: 40, near: 0.1, far: 100 }}
              gl={{
                antialias: true,
                alpha: true,
                powerPreference: "high-performance",
                stencil: false,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.2,
              }}
              style={{ background: "transparent" }}
              dpr={[1, 1.4]}
              frameloop={stageActive ? "always" : "never"}
              onCreated={({ camera }) => camera.lookAt(0, 0.6, 0)}
            >
              <Suspense fallback={null}>
                <Lighting />
                <Environment preset="city" background={false} />
                <ChessHeroRig refs={refs.current} onReady={handleReady} />
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
        style={{
          background:
            "radial-gradient(80% 90% at 74% 46%, rgba(201,168,76,0.10), rgba(201,168,76,0) 58%), " +
            "linear-gradient(90deg, #0a0a0c 0%, #0a0a0c 42%, rgba(10,10,12,0) 78%), " +
            "#0a0a0c",
        }}
      >
        {/* left-edge vignette keeps the copy legible over the charcoal */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-transparent" />

        <div className="relative z-40 h-full max-w-[1400px] mx-auto w-full px-8 md:px-14 lg:px-20 grid grid-cols-1 md:grid-cols-12 items-center">
          <div className="md:col-span-6 lg:col-span-5 pointer-events-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-10 bg-[--gold]/60" />
              <p className="text-[11px] font-mono uppercase tracking-[0.42em] text-[--gold]/85">
                Real-time AI commentary
              </p>
            </div>

            <h1 className="font-serif text-white leading-[0.95] tracking-tight text-5xl md:text-6xl lg:text-7xl">
              The game
              <br />
              <span className="italic text-[--gold]">speaks</span> for itself.
            </h1>

            <p className="mt-7 text-white/55 text-base md:text-lg font-light leading-relaxed max-w-[46ch]">
              Every move narrated the instant it lands — openings, blunders and brilliancies
              called live, in a voice you choose.
            </p>

            <div className="mt-9 flex items-center gap-5">
              <a
                href="#demo"
                className="group inline-flex items-center gap-2 rounded-full bg-[--gold] px-6 py-3 text-sm font-medium text-black transition-transform duration-200 active:scale-[0.97] hover:-translate-y-[1px]"
              >
                Hear it live
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
              </a>
              <a
                href="#demo"
                className="text-sm text-white/60 hover:text-white/90 transition-colors border-b border-white/15 pb-0.5"
              >
                Watch a game
              </a>
            </div>
          </div>

          <div className="hidden md:block md:col-span-6 lg:col-span-7" aria-hidden />
        </div>

        {/* Eval-bar tags echo the reference — quiet editorial detail, lower-right */}
        <div className="pointer-events-none absolute bottom-10 right-10 hidden lg:flex flex-col items-end gap-2 z-40">
          <span className="font-mono text-[11px] tracking-widest text-emerald-300/70">+1.35 KING</span>
          <span className="font-mono text-[11px] tracking-widest text-rose-300/60">−0.87 QUEEN</span>
        </div>
      </section>
    </>
  );
}

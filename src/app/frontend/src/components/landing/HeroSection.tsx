"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ChessHeroRig, type ChessRigRefs } from "@/components/three/ChessHeroRig";
import { HeroVideoFrames } from "./HeroVideoFrames";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function Lighting() {
  return (
    <>
      <fog attach="fog" args={["#080808", 14, 48]} />
      <ambientLight intensity={0.22} color="#e8e0d0" />
      <directionalLight
        position={[5, 8, 4]}
        intensity={1.25}
        color="#fff5e8"
        castShadow={false}
      />
      {/* Cool rim from upper back-right so the black Queen reads against the dark page */}
      <directionalLight position={[4, 5, -4]} intensity={1.5} color="#cfe2ff" />
      {/* Gold up-light — the dramatic under-glow from the ref */}
      <spotLight position={[0, 2.5, -4]} angle={0.7} penumbra={1} intensity={2.2} color="#c9a84c" />
      <pointLight position={[-4, 1.5, 3]} intensity={0.5} color="#a8c8e8" />
      <pointLight position={[4, 0.8, 2.5]} intensity={0.7} color="#e4c87a" />
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
  // Pause the R3F render loop once the pieces have fully exited so the fixed
  // canvas costs nothing while the user reads the rest of the page.
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

        // ---- Scroll choreography: separate → flank → exit (scrubbed) ----
        const tl = gsap.timeline({
          defaults: { ease: "power1.inOut" },
          scrollTrigger: {
            scroller,
            trigger: hero,
            start: "top top",
            end: "+=185%",
            scrub: 1,
            invalidateOnRefresh: true,
            // Stop rendering work once the pieces have fully exited.
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

        // Phase A (0 → 0.6): King left, Queen right + scale up + match King's depth
        // so both read the same size while flanking the next section's content.
        tl.to(king.position, { x: -2.7, y: 0.1, duration: 0.6 }, 0)
          .to(king.rotation, { y: -0.05, duration: 0.6 }, 0)
          .to(queen.position, { x: 2.7, y: 0.18, z: 0.3, duration: 0.6 }, 0)
          .to(queen.rotation, { y: 0.05, duration: 0.6 }, 0)
          .to(queen.scale, { x: 1.18, y: 1.18, z: 1.18, duration: 0.6 }, 0)
          .to(mic.position, { x: 3.2, y: 0.75, duration: 0.6 }, 0)
          // Phase B (0.6 → 1): off the screen edges, fading out.
          .to(king.position, { x: -9, duration: 0.4 }, 0.6)
          .to(queen.position, { x: 9, duration: 0.4 }, 0.6)
          .to(mic.position, { x: 10, duration: 0.4 }, 0.6)
          .to(mats, { opacity: 0, duration: 0.32 }, 0.7);

        // Recalculate trigger positions once lazy sections mount in below.
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

  return (
    <>
      {/* Persistent 3D stage: fixed to the viewport so the pieces stay on screen
          to flank the next section while the page scrolls underneath. */}
      <div
        ref={stageRef}
        className="fixed inset-0 z-[8] pointer-events-none"
        style={{ transition: "opacity 0.4s ease" }}
      >
        <Canvas
          camera={{ position: [0, 0.85, 3.7], fov: 40, near: 0.1, far: 100 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            stencil: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          style={{ background: "transparent" }}
          dpr={[1, 1.75]}
          frameloop={stageActive ? "always" : "never"}
          onCreated={({ camera }) => camera.lookAt(0, 0.6, 0)}
        >
          <Suspense fallback={null}>
            <Lighting />
            <Environment preset="city" background={false} />
            <group scale={1.1}>
              <ChessHeroRig refs={refs.current} onReady={handleReady} />
            </group>
          </Suspense>
        </Canvas>
      </div>

      <div
        id="hero"
        ref={heroRef}
        className="snap-section flex flex-col items-center justify-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/60" />
        <HeroVideoFrames />

        <div className="relative z-20 text-center px-6 pointer-events-none">
          <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.5em] text-[--gold]/80 mb-3">
            AI Commentary Engine
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-4">
            The Game{" "}
            <span
              className="font-serif italic font-normal"
              style={{
                background: "linear-gradient(135deg,#c9a84c,#e4c87a)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 30px rgba(201,168,76,0.6))",
              }}
            >
              Speaks
            </span>
          </h1>
          <p
            className="text-white/70 text-base md:text-lg font-light max-w-md mx-auto leading-relaxed"
            style={{ textShadow: "0 2px 18px rgba(0,0,0,0.85)" }}
          >
            Real-time AI commentary that transforms every move into a moment.
          </p>
        </div>
      </div>
    </>
  );
}

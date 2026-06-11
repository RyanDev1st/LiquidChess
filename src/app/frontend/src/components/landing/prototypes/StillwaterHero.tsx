"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial, useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, Vignette, Noise, SMAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { MODEL_URL, buildPiece, InteractivePiece, Starfield, Mist, type LeadUni, type Mode } from "./liquidShared";

function Moon({ mode }: { mode: Mode }) {
  const halo = useMemo(() => {
    const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    const c = mode === "dark" ? "215,232,255" : "255,224,150";
    g.addColorStop(0, `rgba(${c},0.95)`); g.addColorStop(0.35, `rgba(${c},0.3)`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(cv);
  }, [mode]);
  return (
    <group position={[0, 2.2, -10]}>
      <mesh><sphereGeometry args={[1.9, 64, 64]} /><meshBasicMaterial color={mode === "dark" ? "#eef4ff" : "#ffe39a"} toneMapped={false} /></mesh>
      <sprite scale={[16, 16, 1]}><spriteMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
    </group>
  );
}

// calm ambient ripples expanding on the water surface
function Ripples() {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const seeds = useMemo(() => [
    { x: -1.0, z: 0.6, spd: 0.28, ph: 0 },
    { x: 1.05, z: 0.3, spd: 0.24, ph: 0.5 },
    { x: -0.3, z: 1.4, spd: 0.3, ph: 0.25 },
    { x: 0.6, z: 1.0, spd: 0.26, ph: 0.75 },
    { x: -1.6, z: 1.2, spd: 0.22, ph: 0.4 },
  ], []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * seeds[i].spd + seeds[i].ph) % 1;
      m.scale.setScalar(0.2 + k * 1.6);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.22;
    });
  });
  return (
    <>
      {seeds.map((s, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} rotation={[-Math.PI / 2, 0, 0]} position={[s.x, 0.012, s.z]}>
          <ringGeometry args={[0.7, 0.74, 64]} />
          <meshBasicMaterial color="#cfe0ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function Pieces({ lead }: { lead: LeadUni }) {
  const { scene } = useGLTF(MODEL_URL);
  const grp = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());
  const built = useMemo(() => ({ king: buildPiece(scene, "King", lead), queen: buildPiece(scene, "Queen", lead) }), [scene, lead]);
  const { camera } = useThree();
  void camera;
  useFrame((state, delta) => {
    lead.uProgress.value = Math.min(1.05, lead.uProgress.value + delta / 2.4);
    mouse.current.lerp(state.pointer, 0.04);
    if (grp.current) grp.current.rotation.y = THREE.MathUtils.damp(grp.current.rotation.y, mouse.current.x * 0.09, 2.5, Math.min(delta, 0.05));
  });
  return (
    <group ref={grp} scale={1.7} position={[0, 0.78, 1.0]}>
      <InteractivePiece data={built.king} position={[-0.95, 0, 0]} rotationY={0.32} role="White · play-by-play" />
      <InteractivePiece data={built.queen} position={[0.98, 0, -0.3]} rotationY={-0.34} role="Black · analysis" />
    </group>
  );
}

function Scene({ mode }: { mode: Mode }) {
  const lead = useMemo<LeadUni>(() => ({ uProgress: { value: 0 }, uEdge: { value: 0.07 }, uFreq: { value: 4.0 } }), []);
  const bg = mode === "dark" ? "#06080f" : "#d3dae3";
  return (
    <>
      <color attach="background" args={[bg]} />
      <fogExp2 attach="fog" args={[bg, 0.055]} />
      <ambientLight intensity={mode === "dark" ? 0.32 : 0.6} color={mode === "dark" ? "#9fb6e0" : "#fff4e6"} />
      <directionalLight position={[0, 4, -2]} intensity={mode === "dark" ? 1.6 : 2.1} color={mode === "dark" ? "#dfeaff" : "#fff3e0"} />
      <directionalLight position={[-3, 2, 5]} intensity={0.6} color={mode === "dark" ? "#7890c0" : "#ffd9a0"} />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={mode === "dark" ? 1.4 : 2} position={[0, 4, -6]} scale={[10, 8, 1]} color={mode === "dark" ? "#dfeaff" : "#ffe7c2"} />
      </Environment>

      <Moon mode={mode} />
      <Starfield visible={mode === "dark"} count={700} />
      <Mist color={mode === "dark" ? "#9fc0e8" : "#ffffff"} count={90} />
      <Pieces lead={lead} />
      <Ripples />

      {/* the still mirror water — reflects moon, stars, pieces */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <MeshReflectorMaterial resolution={1024} blur={[300, 120]} mixBlur={1.0} mixStrength={3.2} mirror={0.92} color={mode === "dark" ? "#070b14" : "#9fb0c2"} metalness={0.7} roughness={0.32} depthScale={1.0} />
      </mesh>

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.4} intensity={mode === "dark" ? 1.0 : 0.6} />
        <DepthOfField target={[0, 0.9, 1.0]} focalLength={0.05} bokehScale={2} height={512} />
        <Vignette eskil={false} offset={0.24} darkness={mode === "dark" ? 0.82 : 0.5} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.3} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

export function StillwaterHero() {
  const [mode, setMode] = useState<Mode>("dark");
  const ink = mode === "dark" ? "text-white" : "text-[#1a2230]";
  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 1.0, 6.0], fov: 44 }} dpr={[1, 1.75]} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }} onCreated={({ camera }) => camera.lookAt(0, 1.0, -2)}>
        <Suspense fallback={null}><Scene mode={mode} /></Suspense>
      </Canvas>

      <div className={`pointer-events-none absolute inset-0 z-40 font-mono text-[10px] uppercase tracking-[0.4em] ${mode === "dark" ? "text-white/45" : "text-black/45"}`}>
        <div className="absolute top-7 left-8">Liquid Chess</div>
        <div className="absolute top-7 right-8 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[--gold] animate-pulse" />Live</div>
        <div className="absolute bottom-8 left-8">Hover a piece · it speaks</div>
      </div>
      <div className={`pointer-events-none absolute left-1/2 -translate-x-1/2 top-[14%] z-40 text-center ${ink}`}>
        <h1 className="font-display leading-[0.84] tracking-[-0.02em]" style={{ textShadow: mode === "dark" ? "0 4px 50px rgba(0,0,0,0.6)" : "none" }}>
          <span className="block font-[330] text-[clamp(2.2rem,5vw,4.4rem)]">The game</span>
          <span className="block italic text-[--gold] text-[clamp(2.6rem,6.4vw,5.6rem)]" style={{ fontWeight: 440, fontVariationSettings: "'opsz' 144,'WONK' 1" }}>speaks.</span>
        </h1>
      </div>

      <button onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))} className="absolute bottom-8 right-8 z-50 rounded-full border border-white/20 bg-black/40 backdrop-blur px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-white/80">
        {mode === "dark" ? "☾ Night" : "☀ Day"}
      </button>
      <style>{`@keyframes liqSpeak{0%{opacity:0;transform:translateY(8px) scale(0.9)}20%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-16px)}}`}</style>
    </div>
  );
}

useGLTF.preload(MODEL_URL);

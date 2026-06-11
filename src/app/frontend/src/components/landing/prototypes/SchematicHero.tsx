"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";
const PAPER = "#0a1d2e"; // blueprint navy
const LINE = "#7fd4ff"; // cyan ink

function Wireframe() {
  const { scene } = useGLTF(MODEL_URL);
  const ref = useRef<THREE.Group>(null);
  const obj = useMemo(() => {
    const src = (scene.clone(true).getObjectByName("King") as THREE.Object3D)?.clone(true);
    if (!src) return null;
    const box = new THREE.Box3();
    src.position.set(0, 0, 0);
    src.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = new THREE.MeshBasicMaterial({ color: LINE, wireframe: true, transparent: true, opacity: 0.32 });
      mesh.frustumCulled = false;
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
    });
    const c = box.getCenter(new THREE.Vector3());
    const h = box.max.y - box.min.y;
    src.position.set(-c.x, -box.min.y - h / 2, -c.z);
    return src;
  }, [scene]);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.5;
  });
  return <group ref={ref}>{obj && <primitive object={obj} scale={1.8} />}</group>;
}

// A callout: an anchor dot at (ax%,ay%), leader line to a label box at (lx%,ly%).
function Callout({ ax, ay, lx, ly, num, title, sub }: { ax: number; ay: number; lx: number; ly: number; num: string; title: string; sub: string }) {
  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
        <circle cx={`${ax}%`} cy={`${ay}%`} r="3" fill={LINE} />
        <circle cx={`${ax}%`} cy={`${ay}%`} r="9" fill="none" stroke={LINE} strokeOpacity="0.4" />
        <line x1={`${ax}%`} y1={`${ay}%`} x2={`${lx}%`} y2={`${ly}%`} stroke={LINE} strokeOpacity="0.5" strokeDasharray="3 3" />
      </svg>
      <div className="absolute font-mono text-[11px]" style={{ left: `${lx}%`, top: `${ly}%`, color: LINE, transform: "translateY(-50%)" }}>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 text-[9px]" style={{ boxShadow: `inset 0 0 0 1px ${LINE}` }}>{num}</span>
          <span className="uppercase tracking-[0.2em] font-semibold">{title}</span>
        </div>
        <div className="mt-1 opacity-55 tracking-[0.15em] uppercase text-[9px]">{sub}</div>
      </div>
    </>
  );
}

export function SchematicHero() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: PAPER, color: LINE }}>
      {/* blueprint grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.18]" style={{ backgroundImage: `linear-gradient(${LINE} 0 1px,transparent 1px 28px),linear-gradient(90deg,${LINE} 0 1px,transparent 1px 28px)`, backgroundSize: "28px 28px" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.3]" style={{ backgroundImage: `linear-gradient(${LINE} 0 1px,transparent 1px 140px),linear-gradient(90deg,${LINE} 0 1px,transparent 1px 140px)`, backgroundSize: "140px 140px" }} />

      {/* title block (patent corner) */}
      <div className="absolute top-8 left-9 z-30 font-mono text-[10px] uppercase tracking-[0.3em]">
        <div className="text-[var(--gold,#7fd4ff)] opacity-80">Liquid Chess — Fig. 01</div>
        <div className="opacity-50 mt-1">Apparatus for real-time commentary</div>
      </div>
      <div className="absolute top-8 right-9 z-30 font-mono text-[10px] uppercase tracking-[0.3em] text-right opacity-60">
        <div>Sheet 1 / 1</div>
        <div className="mt-1">Scale 1:1 · Rev. C</div>
      </div>

      {/* the wireframe piece, centered */}
      <div className="absolute inset-0 z-10">
        <Canvas camera={{ position: [0, 0.3, 4.2], fov: 36 }} dpr={[1, 2]} style={{ background: "transparent" }} onCreated={({ camera }) => camera.lookAt(0, 0.25, 0)}>
          <Suspense fallback={null}><Wireframe /></Suspense>
        </Canvas>
      </div>

      {/* annotation callouts */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <Callout ax={52} ay={28} lx={68} ly={22} num="A" title="Headphone array" sub="Live audio feed" />
        <Callout ax={44} ay={40} lx={20} ly={36} num="B" title="Boom microphone" sub="Voice output" />
        <Callout ax={50} ay={16} lx={64} ly={12} num="C" title="Crown sensor" sub="Position intake" />
        <Callout ax={49} ay={70} lx={22} ly={74} num="D" title="Weighted base" sub="Engine core" />
      </div>

      {/* headline lower-left */}
      <div className="absolute bottom-12 left-9 z-30">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] opacity-60 mb-3">Patent pending · The voice of the board</div>
        <h1 className="font-display leading-[0.84] tracking-[-0.02em] text-white" style={{ fontWeight: 360 }}>
          <span className="block text-[clamp(2.2rem,5vw,4.4rem)]">The game</span>
          <span className="block italic text-[clamp(2.6rem,6vw,5.4rem)]" style={{ color: LINE, fontVariationSettings: "'WONK' 1" }}>speaks.</span>
        </h1>
        <a href="#" className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.25em] px-5 py-3 transition-colors hover:bg-[#7fd4ff] hover:text-[#0a1d2e]" style={{ boxShadow: `inset 0 0 0 1.5px ${LINE}` }}>
          Hear it live →
        </a>
      </div>

      {/* bottom dimension line */}
      <div className="absolute bottom-7 right-9 z-30 font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 flex items-center gap-2">
        <span>|←</span><span>320 mm</span><span>→|</span>
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);

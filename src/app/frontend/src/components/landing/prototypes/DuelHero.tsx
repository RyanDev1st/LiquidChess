"use client";

import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";
const DARK = "#0c0c0e";
const LIGHT = "#f0e6d2";

function Pieces() {
  const { scene } = useGLTF(MODEL_URL);
  const king = useRef<THREE.Group>(null);
  const queen = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());

  const built = useMemo(() => {
    const mk = (name: string, color: string, metalness: number, roughness: number) => {
      const src = (scene.clone(true).getObjectByName(name) as THREE.Object3D)?.clone(true);
      if (!src) return null;
      const mat = new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: 1 });
      const box = new THREE.Box3();
      src.position.set(0, 0, 0);
      src.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.material = mat;
        mesh.frustumCulled = false;
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
      });
      const c = box.getCenter(new THREE.Vector3());
      const h = box.max.y - box.min.y;
      src.position.set(-c.x, -box.min.y - h / 2, -c.z);
      return src;
    };
    return { king: mk("King", "#f3ece0", 0.18, 0.5), queen: mk("Queen", "#101013", 0.55, 0.32) };
  }, [scene]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    mouse.current.lerp(state.pointer, 0.05);
    const t = state.clock.elapsedTime;
    if (king.current) {
      king.current.rotation.y = THREE.MathUtils.damp(king.current.rotation.y, 0.3 + mouse.current.x * 0.25, 4, d);
      king.current.position.y = Math.sin(t * 0.6) * 0.03;
    }
    if (queen.current) {
      queen.current.rotation.y = THREE.MathUtils.damp(queen.current.rotation.y, -0.35 + mouse.current.x * 0.25, 4, d);
      queen.current.position.y = Math.sin(t * 0.55 + 1) * 0.03;
    }
  });

  return (
    <>
      {/* warm key for the white King on the dark half */}
      <directionalLight position={[-4, 4, 4]} intensity={2.2} color="#fff0d8" />
      {/* cool/hard light so the black Queen reads on the light half */}
      <directionalLight position={[5, 5, 3]} intensity={1.6} color="#dfe8ff" />
      <ambientLight intensity={0.35} />
      <Environment preset="studio" />
      <group ref={king} position={[-1.55, 0.1, 0]} scale={1.55}>{built.king && <primitive object={built.king} />}</group>
      <group ref={queen} position={[1.55, 0.1, 0]} scale={1.55}>{built.queen && <primitive object={built.queen} />}</group>
    </>
  );
}

export function DuelHero() {
  const [seam, setSeam] = useState(50); // % from left
  const [drag, setDrag] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (x: number) => {
      const r = root.current?.getBoundingClientRect();
      if (!r) return;
      setSeam(Math.min(78, Math.max(22, ((x - r.left) / r.width) * 100)));
    };
    const onMove = (e: PointerEvent) => drag && move(e.clientX);
    const onUp = () => setDrag(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag]);

  return (
    <div ref={root} className="absolute inset-0 overflow-hidden select-none" style={{ background: LIGHT }}>
      {/* dark field on the left, clipped to the seam */}
      <div className="absolute inset-0" style={{ background: DARK, clipPath: `inset(0 ${100 - seam}% 0 0)` }} />

      {/* both pieces (one transparent canvas spanning the whole stage) */}
      <div className="absolute inset-0 z-10">
        <Canvas camera={{ position: [0, 0.45, 5.2], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} style={{ background: "transparent" }} onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}>
          <Suspense fallback={null}><Pieces /></Suspense>
        </Canvas>
      </div>

      {/* straddling headline — two clipped layers invert color across the seam */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <Headline className="text-[#f0e6d2]" clip={`inset(0 ${100 - seam}% 0 0)`} />
        <Headline className="text-[#0c0c0e]" clip={`inset(0 0 0 ${seam}%)`} />
      </div>

      {/* draggable seam */}
      <div className="absolute inset-y-0 z-30" style={{ left: `${seam}%`, transform: "translateX(-50%)" }}>
        <div className="absolute inset-y-0 w-px" style={{ background: "rgba(201,168,76,0.6)" }} />
        <button
          onPointerDown={() => setDrag(true)}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-11 w-11 rounded-full grid place-items-center cursor-ew-resize"
          style={{ background: "var(--gold)", color: "#0c0c0e", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
        >
          <span className="font-mono text-[14px]">⇄</span>
        </button>
      </div>

      {/* corner labels — one per commentator, colored to its field */}
      <div className="absolute top-7 left-8 z-30 font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: LIGHT, mixBlendMode: "difference" }}>Liquid Chess</div>
      <div className="absolute top-7 right-8 z-30 font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: LIGHT, mixBlendMode: "difference" }}>Drag to duel ⇄</div>

      <div className="absolute bottom-10 left-8 z-30 font-mono text-[10px] uppercase tracking-[0.3em] text-white/70">
        <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white" />White · play-by-play</div>
      </div>
      <div className="absolute bottom-10 right-8 z-30 font-mono text-[10px] uppercase tracking-[0.3em] text-black/70 text-right">
        <div className="flex items-center gap-2 justify-end">Black · analysis<span className="h-1.5 w-1.5 rounded-full bg-black" /></div>
      </div>

      <a href="#" className="absolute bottom-9 left-1/2 -translate-x-1/2 z-30 font-mono text-[11px] uppercase tracking-[0.25em] px-6 py-3 rounded-full" style={{ background: "var(--gold)", color: "#0c0c0e" }}>
        Hear it live →
      </a>
    </div>
  );
}

function Headline({ className, clip }: { className: string; clip: string }) {
  return (
    <h1 className={`absolute font-display font-semibold text-center leading-[0.8] tracking-[-0.03em] ${className}`} style={{ clipPath: clip, fontSize: "clamp(3rem,11vw,11rem)" }}>
      <span className="block">THE GAME</span>
      <span className="block italic" style={{ fontVariationSettings: "'WONK' 1" }}>SPEAKS</span>
    </h1>
  );
}

useGLTF.preload(MODEL_URL);

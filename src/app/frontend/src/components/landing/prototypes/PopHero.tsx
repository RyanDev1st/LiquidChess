"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";

// Committed editorial palette — oxblood field, bone ink, one hot accent.
const FIELD = "#5b1a23";
const BONE = "#f0e6d2";
const ACCENT = "#e8552f"; // vermilion tension, used sparingly

// The piece, tinted monochrome INTO the palette (bone sculpture, oxblood rim)
// so it belongs to the art direction instead of floating on it.
function Sculpture() {
  const { scene } = useGLTF(MODEL_URL);
  const ref = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());

  const obj = useMemo(() => {
    const src = (scene.clone(true).getObjectByName("Queen") as THREE.Object3D)?.clone(true);
    if (!src) return null;
    const mat = new THREE.MeshStandardMaterial({ color: BONE, metalness: 0.15, roughness: 0.62, envMapIntensity: 0.8 });
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
  }, [scene]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    mouse.current.lerp(state.pointer, 0.05);
    ref.current.rotation.y = state.clock.elapsedTime * 0.14 + mouse.current.x * 0.4;
    ref.current.rotation.x = -mouse.current.y * 0.12;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.04;
  });

  return <group ref={ref}>{obj && <primitive object={obj} scale={1.7} />}</group>;
}

function SculptureCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0.3, 4], fov: 36 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      dpr={[1, 2]}
      style={{ background: "transparent" }}
      onCreated={({ camera }) => camera.lookAt(0, 0.25, 0)}
    >
      <Suspense fallback={null}>
        <Sculpture />
        {/* oxblood-tinted lighting so the bone piece picks up the field color */}
        <ambientLight intensity={0.5} color="#caa" />
        <directionalLight position={[3, 4, 3]} intensity={1.6} color="#fff3e2" />
        <directionalLight position={[-4, 1, -2]} intensity={1.1} color="#c23a3a" />
        <Environment resolution={128} frames={1}>
          <color attach="background" args={["#3a0f16"]} />
          <Lightformer intensity={2} position={[2, 3, 2]} scale={[6, 6, 1]} color="#ffe6c2" />
          <Lightformer intensity={1.2} position={[-3, 0, -2]} scale={[5, 5, 1]} color="#7a1f28" />
        </Environment>
      </Suspense>
    </Canvas>
  );
}

export function PopHero() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: FIELD, color: BONE }}>
      {/* nav */}
      <div className="absolute top-0 inset-x-0 z-40 flex items-center justify-between px-10 py-7 font-mono text-[11px] uppercase tracking-[0.32em]">
        <span className="font-bold">Liquid Chess<sup className="ml-0.5 text-[0.6em] align-super">®</sup></span>
        <div className="hidden md:flex gap-9 opacity-70"><span>Voices</span><span>Demo</span><span>Pricing</span></div>
        <a href="#" className="px-4 py-2 rounded-full font-bold transition-transform hover:-translate-y-px" style={{ background: BONE, color: FIELD }}>Get started</a>
      </div>

      {/* the sculpture, cropped large on the right and bleeding off the edge */}
      <div className="absolute inset-y-0 right-[-4%] w-[58%] z-20" style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.35))" }}>
        <SculptureCanvas />
      </div>

      {/* giant masked-reveal type, cropped off both edges */}
      <div className="absolute inset-0 z-30 flex flex-col justify-center pointer-events-none select-none">
        <div className="font-display font-bold leading-[0.76] tracking-[-0.035em]" style={{ fontSize: "clamp(4.5rem,18vw,19rem)" }}>
          <div className="overflow-hidden">
            <div className="whitespace-nowrap -ml-[1.5vw]" style={{ animation: "popRise 0.9s cubic-bezier(0.16,1,0.3,1) both" }}>THE GAME</div>
          </div>
          <div className="overflow-hidden">
            <div
              className="whitespace-nowrap italic -ml-[0.5vw]"
              style={{ color: ACCENT, fontVariationSettings: "'WONK' 1", animation: "popRise 0.9s cubic-bezier(0.16,1,0.3,1) 0.12s both" }}
            >
              SPEAKS<span style={{ color: BONE }}>.</span>
            </div>
          </div>
        </div>
      </div>

      {/* lower-left index + CTA */}
      <div className="absolute bottom-12 left-10 z-40 flex items-end gap-10" style={{ animation: "popFade 0.8s ease-out 0.5s both" }}>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] leading-relaxed">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
            <span className="opacity-75">Real-time AI commentary</span>
          </div>
          <div className="opacity-55 max-w-[34ch]">Every move narrated the instant it lands — in a voice you choose.</div>
        </div>
        <a href="#" className="shrink-0 font-mono text-[11px] uppercase tracking-[0.25em] pb-1 border-b-2 transition-colors" style={{ borderColor: ACCENT }}>
          Hear it live →
        </a>
      </div>

      {/* vertical edge label */}
      <div className="absolute top-1/2 left-3 -translate-y-1/2 z-40 font-mono text-[10px] uppercase tracking-[0.5em] opacity-45" style={{ writingMode: "vertical-rl" }}>
        № 01 — The voice of the board
      </div>

      {/* commentary marquee strip */}
      <div className="absolute bottom-0 inset-x-0 z-40 border-t py-2.5 overflow-hidden" style={{ borderColor: "rgba(240,230,210,0.18)" }}>
        <div className="flex whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.3em] opacity-50" style={{ animation: "popMarquee 22s linear infinite" }}>
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex">
              {["Bold opening", "·", "He's hunting", "·", "The bishop eyes f2", "·", "A pawn sacrificed", "·", "Check", "·", "The crowd leans in", "·"].map((w, i) => (
                <span key={i} className="mx-4" style={w === "·" ? { color: ACCENT } : undefined}>{w}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* film grain */}
      <div
        className="pointer-events-none absolute inset-0 z-50 opacity-[0.07] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />

      <style>{`
        @keyframes popRise { from { transform: translateY(102%); } to { transform: translateY(0); } }
        @keyframes popFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { [style*="popRise"],[style*="popFade"],[style*="popMarquee"] { animation: none !important; } }
      `}</style>
    </div>
  );
}

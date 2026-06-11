"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";
const PAPER = "#e9e2d2";
const INK = "#181410";

// Grayscale piece — CSS halftone overlay turns it into a newsprint photo.
function NewsPiece() {
  const { scene } = useGLTF(MODEL_URL);
  const ref = useRef<THREE.Group>(null);
  const obj = useMemo(() => {
    const src = (scene.clone(true).getObjectByName("King") as THREE.Object3D)?.clone(true);
    if (!src) return null;
    const mat = new THREE.MeshStandardMaterial({ color: "#cfc8ba", metalness: 0.1, roughness: 0.7 });
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
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.1;
  });
  return (
    <group ref={ref}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} />
      <Environment preset="city" />
      {obj && <primitive object={obj} scale={1.7} />}
    </group>
  );
}

function Rule({ thick = 1 }: { thick?: number }) {
  return <div style={{ height: thick, background: INK }} />;
}

export function BroadsheetHero() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: PAPER, color: INK, fontFamily: "Fraunces, Georgia, serif" }}>
      {/* paper grain */}
      <div className="pointer-events-none absolute inset-0 z-50 opacity-[0.06] mix-blend-multiply" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      <div className="relative z-20 h-full max-w-[1300px] mx-auto px-10 py-7 flex flex-col">
        {/* masthead */}
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em]">
          <span>Vol. I · No. 1</span>
          <span>Live Edition</span>
          <span>Price: Free</span>
        </div>
        <Rule thick={2} />
        <div className="text-center py-3">
          <h1 className="leading-none tracking-[-0.01em]" style={{ fontWeight: 600, fontSize: "clamp(2rem,5vw,4.2rem)" }}>
            The Liquid Chess Times
          </h1>
        </div>
        <Rule thick={2} />
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] py-1.5">
          <span>The voice of the board</span>
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#b5331f" }} />Reporting live</span>
          <span>Real-time · AI</span>
        </div>
        <Rule />

        {/* body: headline + lead art + columns */}
        <div className="flex-1 grid grid-cols-12 gap-8 pt-6 min-h-0">
          {/* left column text */}
          <div className="col-span-3 hidden md:flex flex-col text-[13px] leading-snug" style={{ columnGap: 0 }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] mb-2 opacity-60">Dispatch</div>
            <p className="mb-3" style={{ textAlign: "justify" }}>
              The engine drew first blood at move four, its voice steady as the position sharpened. Observers called it the cleanest read of the season.
            </p>
            <p className="opacity-80" style={{ textAlign: "justify" }}>
              "It does not merely track the board," one viewer noted. "It narrates intent." A bishop slid to b5 and the room, somehow, leaned in.
            </p>
            <div className="mt-auto font-mono text-[10px] uppercase tracking-[0.25em] opacity-55 pt-4">Continued, p.2</div>
          </div>

          {/* center: the headline + halftone art */}
          <div className="col-span-12 md:col-span-6 flex flex-col">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-center mb-2" style={{ color: "#b5331f" }}>Breaking · The board has found its voice</div>
            <h2 className="text-center leading-[0.82] tracking-[-0.02em]" style={{ fontWeight: 600, fontSize: "clamp(2.6rem,6vw,5.6rem)" }}>
              The Game <span className="italic" style={{ color: "#b5331f", fontVariationSettings: "'WONK' 1" }}>Speaks</span>
            </h2>
            <div className="relative flex-1 mt-3 min-h-0" style={{ filter: "grayscale(1) contrast(1.15)" }}>
              <Canvas camera={{ position: [0, 0.3, 4], fov: 36 }} dpr={[1, 2]} style={{ background: "transparent" }} onCreated={({ camera }) => camera.lookAt(0, 0.25, 0)}>
                <Suspense fallback={null}><NewsPiece /></Suspense>
              </Canvas>
              {/* halftone dots */}
              <div className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-60" style={{ backgroundImage: "radial-gradient(circle, #181410 1px, transparent 1.4px)", backgroundSize: "5px 5px" }} />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-center opacity-55 mt-2">Fig. 1 — The Commentator, in session</div>
          </div>

          {/* right column text + CTA */}
          <div className="col-span-3 hidden md:flex flex-col text-[13px] leading-snug">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] mb-2 opacity-60">On the wire</div>
            <p className="mb-3" style={{ textAlign: "justify" }}>
              Choose a voice — measured analyst, breathless hype, dry wit — and every move arrives narrated the instant it lands.
            </p>
            <ul className="font-mono text-[11px] space-y-1.5 opacity-80 mb-4">
              <li>— 1. e4 &nbsp; e5</li>
              <li>— 2. Nf3 &nbsp; Nc6</li>
              <li>— 3. Bb5 &nbsp; a6</li>
            </ul>
            <a href="#" className="mt-auto inline-block text-center font-mono text-[11px] uppercase tracking-[0.25em] py-3 transition-colors hover:bg-[#181410] hover:text-[#e9e2d2]" style={{ boxShadow: "inset 0 0 0 1.5px #181410" }}>
              Hear it live →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);

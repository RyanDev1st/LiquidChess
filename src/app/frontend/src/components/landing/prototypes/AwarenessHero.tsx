"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";
const WORDS = ["Sharp.", "Bold.", "Brilliant!", "Risky…", "Check.", "He's hunting."];

interface Piece {
  name: "king" | "queen" | "mic";
  group: React.RefObject<THREE.Group>;
  base: THREE.Vector3;
  baseYaw: number;
  mats: THREE.MeshStandardMaterial[];
  center: THREE.Vector3;
  hover: number;
  pulse: number;
}

function Pieces({ onSpeak }: { onSpeak: (w: string, p: THREE.Vector3) => void }) {
  const { camera } = useThree();
  const { scene: gltf } = useGLTF(MODEL_URL);
  const t0 = useRef<number | null>(null);
  const mouse = useRef(new THREE.Vector2());
  const proj = useRef(new THREE.Vector3());
  const kingRef = useRef<THREE.Group>(null);
  const queenRef = useRef<THREE.Group>(null);
  const micRef = useRef<THREE.Group>(null);
  const table = useRef<Piece[]>([]);

  const model = useMemo(() => {
    const c = gltf.clone(true);
    const setup = (name: string) => {
      const o = c.getObjectByName(name);
      if (!o) return { o: undefined as THREE.Object3D | undefined, mats: [] as THREE.MeshStandardMaterial[], center: new THREE.Vector3() };
      o.position.set(0, 0, 0);
      const mats: THREE.MeshStandardMaterial[] = [];
      const box = new THREE.Box3();
      o.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.material = (mesh.material as THREE.MeshStandardMaterial).clone();
        mesh.frustumCulled = false;
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
        mats.push(mesh.material as THREE.MeshStandardMaterial);
      });
      return { o, mats, center: box.getCenter(new THREE.Vector3()) };
    };
    return { king: setup("King"), queen: setup("Queen"), mic: setup("Mic") };
  }, [gltf]);

  const ensure = () => {
    if (table.current.length) return;
    const defs: Array<[Piece["name"], React.RefObject<THREE.Group>, THREE.Vector3, number, typeof model.king]> = [
      ["king", kingRef, new THREE.Vector3(-0.85, 0, 0.4), 0.2, model.king],
      ["queen", queenRef, new THREE.Vector3(0.95, 0, 0.0), -0.25, model.queen],
      ["mic", micRef, new THREE.Vector3(1.8, 0.5, 0.2), -0.3, model.mic],
    ];
    table.current = defs
      .filter(([, r]) => r.current)
      .map(([name, r, base, baseYaw, m]) => ({ name, group: r, base, baseYaw, mats: m.mats, center: m.center, hover: 0, pulse: 0 }));
  };

  useFrame((state, delta) => {
    ensure();
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (t0.current === null) t0.current = t;
    const enter = THREE.MathUtils.clamp((t - t0.current) / 1.5, 0, 1);
    const eEnter = 1 - Math.pow(1 - enter, 3);
    mouse.current.lerp(state.pointer, 0.09);

    table.current.forEach((pc) => {
      const g = pc.group.current;
      if (!g) return;
      g.position.set(pc.base.x, pc.base.y + Math.sin(t * 0.6 + pc.baseYaw) * 0.02, pc.base.z);

      // enter: turn from facing away (yaw+PI) to facing the viewer; then track cursor
      const trackYaw = pc.baseYaw + mouse.current.x * 0.4 + (1 - eEnter) * Math.PI;
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, trackYaw, 5, d);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -mouse.current.y * 0.08 * eEnter, 5, d);

      proj.current.copy(pc.center).applyMatrix4(g.matrixWorld).project(camera);
      const dist = Math.hypot(proj.current.x - mouse.current.x, proj.current.y - mouse.current.y);
      const target = dist < 0.24 ? 1 - dist / 0.24 : 0;
      pc.hover = THREE.MathUtils.damp(pc.hover, target, 6, d);
      pc.pulse = Math.max(0, pc.pulse - d * 1.6);
      pc.mats.forEach((m) => {
        m.emissive.set("#ffcf6a");
        m.emissiveIntensity = pc.hover * 0.4 + pc.pulse * 0.8;
      });
    });
  });

  const speak = (pc: Piece) => {
    pc.pulse = 1;
    const g = pc.group.current;
    if (g) onSpeak(WORDS[Math.floor((performance.now() / 997) % WORDS.length)], g.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
  };

  return (
    <group>
      <group ref={kingRef} onPointerDown={() => table.current[0] && speak(table.current[0])}>
        {model.king.o && <primitive object={model.king.o} />}
        <SoundRing get={() => table.current[0]?.hover ?? 0} />
      </group>
      <group ref={queenRef} onPointerDown={() => table.current[1] && speak(table.current[1])}>
        {model.queen.o && <primitive object={model.queen.o} />}
        <SoundRing get={() => table.current[1]?.hover ?? 0} />
      </group>
      <group ref={micRef} onPointerDown={() => table.current[2] && speak(table.current[2])}>
        {model.mic.o && <primitive object={model.mic.o} />}
      </group>
    </group>
  );
}

// Soundwave rings rising around a piece when it's hovered ("speaking").
function SoundRing({ get }: { get: () => number }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const h = get();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.8 + i * 0.33) % 1;
      m.scale.setScalar(0.4 + k * 1.1);
      m.position.y = 0.05 + k * 1.3;
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.5 * h;
    });
  });
  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.56, 40]} />
          <meshBasicMaterial color="#e6c25a" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function Scene({ onSpeak }: { onSpeak: (w: string, p: THREE.Vector3) => void }) {
  return (
    <>
      <color attach="background" args={["#0b0908"]} />
      <fog attach="fog" args={["#0b0908", 7, 18]} />
      <ambientLight intensity={0.3} color="#efe6d2" />
      <directionalLight position={[3, 6, 4]} intensity={1.35} color="#fff3e2" />
      <directionalLight position={[5, 3, -5]} intensity={1.6} color="#cfe0ff" />
      <spotLight position={[0, 3, 2]} angle={0.7} penumbra={1} intensity={2} color="#c9a84c" />
      <Environment preset="city" />
      <Pieces onSpeak={onSpeak} />
    </>
  );
}

export function AwarenessHero() {
  const [caption, setCaption] = useState<{ w: string; pos: [number, number, number]; id: number } | null>(null);
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.9, 4.4], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.18 }}
        dpr={[1, 1.5]}
        onCreated={({ camera }) => camera.lookAt(0, 0.6, 0)}
      >
        <Suspense fallback={null}>
          <Scene
            onSpeak={(w, p) => setCaption({ w, pos: [p.x, p.y, p.z], id: Math.floor(p.x * 1000 + p.y) })}
          />
          {caption && (
            <Html position={caption.pos} center key={caption.id} style={{ pointerEvents: "none" }}>
              <div className="font-display italic text-2xl text-[#ffcf6a] whitespace-nowrap" style={{ animation: "awSpeak 1.4s ease-out forwards", textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
                {caption.w}
              </div>
            </Html>
          )}
        </Suspense>
      </Canvas>
      <style>{`@keyframes awSpeak{0%{opacity:0;transform:translateY(8px) scale(0.9)}20%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-14px)}}`}</style>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b0908]/85 via-transparent to-transparent" />
    </div>
  );
}

useGLTF.preload(MODEL_URL);

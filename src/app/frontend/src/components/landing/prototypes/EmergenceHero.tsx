"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, MeshReflectorMaterial, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";

// Waterline at y = 0: keep everything above, clip what's submerged.
const WATER_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function metal(color: string, rough: number) {
  const m = new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: rough, envMapIntensity: 1.6 });
  m.clippingPlanes = [WATER_PLANE];
  m.clipShadows = true;
  return m;
}
const GOLD = metal("#cda23f", 0.16);
const OBSIDIAN = metal("#0c0c0e", 0.22);

interface Riser {
  group: React.RefObject<THREE.Group>;
  base: THREE.Vector3; // resting position
  rise: number; // submerged depth
  mats: THREE.MeshStandardMaterial[];
  center: THREE.Vector3;
  hover: number;
  delay: number;
}

function Pieces() {
  const { scene, camera } = useThree();
  void scene;
  const { scene: gltf } = useGLTF(MODEL_URL);
  const t0 = useRef<number | null>(null);
  const mouse = useRef(new THREE.Vector2());
  const proj = useRef(new THREE.Vector3());

  const risers = useRef<Riser[]>([]);
  const kingRef = useRef<THREE.Group>(null);
  const queenRef = useRef<THREE.Group>(null);
  const micRef = useRef<THREE.Group>(null);

  const pieces = useMemo(() => {
    const c = gltf.clone(true);
    const setup = (name: string, mat: THREE.MeshStandardMaterial) => {
      const o = c.getObjectByName(name);
      if (!o) return { o: undefined, mats: [], center: new THREE.Vector3() };
      o.position.set(0, 0, 0);
      const mats: THREE.MeshStandardMaterial[] = [];
      const box = new THREE.Box3();
      o.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.material = mat;
        mesh.frustumCulled = false;
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
        mats.push(mat);
      });
      return { o, mats, center: box.getCenter(new THREE.Vector3()) };
    };
    return { king: setup("King", GOLD), queen: setup("Queen", OBSIDIAN), mic: setup("Mic", GOLD) };
  }, [gltf]);

  // build riser table once refs exist
  const ensure = () => {
    if (risers.current.length) return;
    const defs: Array<[React.RefObject<THREE.Group>, THREE.Vector3, number, THREE.MeshStandardMaterial[], THREE.Vector3, number]> = [
      [kingRef, new THREE.Vector3(-0.9, 0, 0.3), 1.2, pieces.king.mats, pieces.king.center, 0],
      [queenRef, new THREE.Vector3(0.95, 0, -0.1), 1.15, pieces.queen.mats, pieces.queen.center, 0.25],
      [micRef, new THREE.Vector3(1.85, 0.5, 0.15), 0.9, pieces.mic.mats, pieces.mic.center, 0.5],
    ];
    risers.current = defs
      .filter(([r]) => r.current)
      .map(([r, base, rise, mats, center, delay]) => ({ group: r, base, rise, mats, center, hover: 0, delay }));
  };

  useFrame((state, delta) => {
    ensure();
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (t0.current === null) t0.current = t;
    const since = t - t0.current;
    mouse.current.lerp(state.pointer, 0.08);

    risers.current.forEach((rz) => {
      const g = rz.group.current;
      if (!g) return;
      // enter: rise from below the waterline
      const p = THREE.MathUtils.clamp((since - rz.delay) / 1.6, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const restY = rz.base.y + Math.sin(t * 0.6 + rz.delay) * 0.02;
      g.position.set(rz.base.x, restY - (1 - e) * rz.rise, rz.base.z);

      // hover: proximity bloom + lean toward cursor
      proj.current.copy(rz.center).applyMatrix4(g.matrixWorld).project(camera);
      const dist = Math.hypot(proj.current.x - mouse.current.x, proj.current.y - mouse.current.y);
      const target = dist < 0.25 ? 1 - dist / 0.25 : 0;
      rz.hover = THREE.MathUtils.damp(rz.hover, target, 6, d);
      rz.mats.forEach((m) => {
        m.emissive.set("#ffcf6a");
        m.emissiveIntensity = rz.hover * 0.5;
      });
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, mouse.current.x * 0.25 + rz.hover * mouse.current.x * 0.3, 4, d);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -mouse.current.y * 0.05, 4, d);
    });
  });

  return (
    <group>
      <group ref={kingRef}>{pieces.king.o && <primitive object={pieces.king.o} />}</group>
      <group ref={queenRef}>{pieces.queen.o && <primitive object={pieces.queen.o} />}</group>
      <group ref={micRef}>{pieces.mic.o && <primitive object={pieces.mic.o} />}</group>
    </group>
  );
}

// Expanding rings on the pool surface — ambient at piece bases + follows cursor.
function Ripples() {
  const { viewport } = useThree();
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const seeds = useMemo(() => [
    { c: new THREE.Vector3(-0.9, 0.01, 0.3), spd: 0.5, ph: 0 },
    { c: new THREE.Vector3(0.95, 0.01, -0.1), spd: 0.45, ph: 0.6 },
    { c: new THREE.Vector3(-0.9, 0.01, 0.3), spd: 0.5, ph: 0.5 },
    { c: new THREE.Vector3(0.95, 0.01, -0.1), spd: 0.45, ph: 0.1 },
  ], []);
  const cursor = useRef(new THREE.Vector3());
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    cursor.current.set(state.pointer.x * viewport.width * 0.5, 0.012, 1.2 - state.pointer.y * 2);
    refs.current.forEach((m, i) => {
      if (!m) return;
      const isCursor = i >= seeds.length;
      const s = seeds[i] ?? { c: cursor.current, spd: 0.7, ph: 0 };
      const k = (t * s.spd + s.ph) % 1;
      const center = isCursor ? cursor.current : s.c;
      m.position.set(center.x, 0.012, center.z);
      m.scale.setScalar(0.15 + k * 0.9);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.35;
    });
  });
  return (
    <>
      {[...seeds, { c: new THREE.Vector3(), spd: 0.7, ph: 0 }].map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[0.82, 1.0, 48]} />
          <meshBasicMaterial color="#e6c25a" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function Scene() {
  const noise = useMemo(() => {
    const s = 128;
    const data = new Uint8Array(s * s * 4);
    for (let i = 0; i < s * s; i++) {
      const v = 110 + Math.random() * 36;
      data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = 255; data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, s, s, THREE.RGBAFormat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  }, []);
  return (
    <>
      <color attach="background" args={["#08070a"]} />
      <fog attach="fog" args={["#08070a", 6, 16]} />
      <ambientLight intensity={0.14} color="#caa" />
      <directionalLight position={[3, 6, 4]} intensity={1.1} color="#fff0d8" />
      <directionalLight position={[5, 3, -5]} intensity={1.6} color="#bcd2ff" />
      <spotLight position={[0, 2.4, 2.2]} angle={0.7} penumbra={1} intensity={5} color="#ffd98a" />
      <Environment preset="city" />
      <Pieces />
      <Ripples />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          resolution={1024}
          blur={[400, 120]}
          mixBlur={1.1}
          mixStrength={2.6}
          mirror={0.8}
          color="#0b0a0c"
          metalness={0.85}
          roughness={0.35}
          distortion={0.5}
          distortionMap={noise}
          depthScale={1.1}
        />
      </mesh>
    </>
  );
}

export function EmergenceHero() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.9, 5], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, localClippingEnabled: true }}
        dpr={[1, 1.5]}
        onCreated={({ camera }) => camera.lookAt(0, 0.6, 0)}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#08070a]/85 via-transparent to-transparent" />
    </div>
  );
}

useGLTF.preload(MODEL_URL);

"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial, useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom, N8AO, DepthOfField, Vignette, Noise, SMAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";
const WATER_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function physical(color: string, rough: number): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1,
    roughness: rough,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.7,
  });
  m.clippingPlanes = [WATER_PLANE];
  return m;
}
const GOLD = physical("#c69a3c", 0.19);
const OBSIDIAN = physical("#0a0a0c", 0.28);

interface Riser {
  group: React.RefObject<THREE.Group>;
  base: THREE.Vector3;
  rise: number;
  mats: THREE.MeshPhysicalMaterial[];
  center: THREE.Vector3;
  hover: number;
  delay: number;
}

function Pieces() {
  const { camera } = useThree();
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
    const setup = (name: string, mat: THREE.MeshPhysicalMaterial) => {
      const o = c.getObjectByName(name);
      if (!o) return { o: undefined as THREE.Object3D | undefined, mats: [] as THREE.MeshPhysicalMaterial[], center: new THREE.Vector3() };
      o.position.set(0, 0, 0);
      const mats: THREE.MeshPhysicalMaterial[] = [];
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

  const ensure = () => {
    if (risers.current.length) return;
    const defs: Array<[React.RefObject<THREE.Group>, THREE.Vector3, number, THREE.MeshPhysicalMaterial[], THREE.Vector3, number]> = [
      [kingRef, new THREE.Vector3(-0.95, 0, 0.35), 1.25, pieces.king.mats, pieces.king.center, 0],
      [queenRef, new THREE.Vector3(0.95, 0, -0.15), 1.2, pieces.queen.mats, pieces.queen.center, 0.22],
      [micRef, new THREE.Vector3(1.9, 0.5, 0.15), 0.9, pieces.mic.mats, pieces.mic.center, 0.44],
    ];
    risers.current = defs.filter(([r]) => r.current).map(([r, base, rise, mats, center, delay]) => ({ group: r, base, rise, mats, center, hover: 0, delay }));
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
      const p = THREE.MathUtils.clamp((since - rz.delay) / 1.7, 0, 1);
      const e = 1 - Math.pow(1 - p, 4);
      const restY = rz.base.y + Math.sin(t * 0.55 + rz.delay) * 0.018;
      g.position.set(rz.base.x, restY - (1 - e) * rz.rise, rz.base.z);

      proj.current.copy(rz.center).applyMatrix4(g.matrixWorld).project(camera);
      const dist = Math.hypot(proj.current.x - mouse.current.x, proj.current.y - mouse.current.y);
      const target = dist < 0.25 ? 1 - dist / 0.25 : 0;
      rz.hover = THREE.MathUtils.damp(rz.hover, target, 6, d);
      rz.mats.forEach((m) => {
        m.emissive.set("#ffcf6a");
        m.emissiveIntensity = rz.hover * 0.9;
      });
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, mouse.current.x * 0.22, 4, d);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -mouse.current.y * 0.05, 4, d);
    });
  });

  return (
    <group scale={1.28} position={[0.45, 0, 0.6]}>
      <group ref={kingRef}>{pieces.king.o && <primitive object={pieces.king.o} />}</group>
      <group ref={queenRef}>{pieces.queen.o && <primitive object={pieces.queen.o} />}</group>
      <group ref={micRef}>{pieces.mic.o && <primitive object={pieces.mic.o} />}</group>
    </group>
  );
}

function Ripples() {
  const { viewport } = useThree();
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const seeds = useMemo(
    () => [
      // world positions of the King/Queen bases after the cluster's scale+offset
      { c: new THREE.Vector3(-0.77, 0.01, 1.05), spd: 0.45, ph: 0 },
      { c: new THREE.Vector3(1.67, 0.01, 0.41), spd: 0.4, ph: 0.6 },
      { c: new THREE.Vector3(-0.77, 0.01, 1.05), spd: 0.45, ph: 0.5 },
      { c: new THREE.Vector3(1.67, 0.01, 0.41), spd: 0.4, ph: 0.15 },
    ],
    [],
  );
  const cursor = useRef(new THREE.Vector3());
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    cursor.current.set(state.pointer.x * viewport.width * 0.5, 0.012, 1.2 - state.pointer.y * 2);
    refs.current.forEach((m, i) => {
      if (!m) return;
      const isCursor = i >= seeds.length;
      const s = seeds[i] ?? { c: cursor.current, spd: 0.6, ph: 0 };
      const k = (t * s.spd + s.ph) % 1;
      const center = isCursor ? cursor.current : s.c;
      m.position.set(center.x, 0.012, center.z);
      m.scale.setScalar(0.18 + k * 1.0);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.4;
    });
  });
  return (
    <>
      {[...seeds, { c: new THREE.Vector3(), spd: 0.6, ph: 0 }].map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[0.84, 1.0, 64]} />
          <meshBasicMaterial color="#ffca5e" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

// Studio softbox rig — the key to premium-looking metal reflections.
function StudioEnvironment() {
  return (
    <Environment resolution={512} frames={1}>
      <color attach="background" args={["#060507"]} />
      <Lightformer intensity={3} position={[0, 4, -3]} scale={[10, 4, 1]} color="#fff3df" />
      <Lightformer intensity={2} position={[-4, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 6, 1]} color="#ffd9a0" />
      <Lightformer intensity={1.4} position={[4, 1, 3]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 6, 1]} color="#bcd2ff" />
      <Lightformer intensity={2.5} form="ring" position={[0, 2, 4]} scale={3} color="#fff7ea" />
    </Environment>
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
      <color attach="background" args={["#0a0809"]} />
      <fog attach="fog" args={["#0a0809", 8, 22]} />
      <ambientLight intensity={0.18} color="#efe6d2" />
      <directionalLight position={[2.5, 5, 4]} intensity={2.4} color="#fff2dc" />
      <spotLight position={[0, 3.6, 2.6]} angle={0.6} penumbra={1} intensity={7} color="#ffe6b8" />
      <StudioEnvironment />

      <Pieces />
      <Ripples />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <MeshReflectorMaterial
          resolution={1024}
          blur={[300, 80]}
          mixBlur={0.8}
          mixStrength={3.2}
          mirror={0.9}
          color="#08070a"
          metalness={0.9}
          roughness={0.28}
          distortion={0.35}
          distortionMap={noise}
          depthScale={1.0}
        />
      </mesh>

      <EffectComposer multisampling={0} enableNormalPass>
        <N8AO halfRes aoRadius={1.2} intensity={2.2} distanceFalloff={1} color="#000005" />
        <Bloom mipmapBlur luminanceThreshold={0.8} luminanceSmoothing={0.35} intensity={0.55} />
        {/* focus locked on the pieces (z≈0.1); only the far pool + foreground soften */}
        <DepthOfField target={[0, 0.55, 0.1]} focalLength={0.08} bokehScale={2.2} height={512} />
        <Vignette eskil={false} offset={0.3} darkness={0.68} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.42} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

export function EmergenceHero() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0.3, 0.7, 4.1], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.25, localClippingEnabled: true }}
        dpr={[1, 2]}
        onCreated={({ camera }) => camera.lookAt(0.5, 0.7, 0.4)}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#070609]/85 via-transparent to-transparent" />
    </div>
  );
}

useGLTF.preload(MODEL_URL);

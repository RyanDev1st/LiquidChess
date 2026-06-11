"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial, useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom, N8AO, DepthOfField, Vignette, Noise, GodRays, SMAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";
const REVEAL_RADIUS = 2.6; // world units the carried light illuminates

interface Member {
  group: React.RefObject<THREE.Group>;
  mats: THREE.MeshStandardMaterial[];
  wpos: THREE.Vector3; // cached world position
  reveal: number;
  baseYaw: number;
  hero: boolean;
}

// One layout entry: which source mesh, where, scale, rotation, hero or court.
const LAYOUT: Array<{ src: "King" | "Queen"; pos: [number, number, number]; s: number; ry: number; hero?: boolean }> = [
  { src: "King", pos: [-0.62, 0, 0.2], s: 1, ry: 0.28, hero: true },
  { src: "Queen", pos: [0.66, 0, -0.4], s: 1, ry: -0.32, hero: true },
  // the hidden court, dim in the fog until your light finds them
  { src: "Queen", pos: [-1.9, 0, -1.4], s: 0.62, ry: 0.5 },
  { src: "King", pos: [1.7, 0, -1.7], s: 0.6, ry: -0.6 },
  { src: "King", pos: [-2.8, 0, -0.2], s: 0.72, ry: 0.9 },
  { src: "Queen", pos: [2.7, 0, -0.6], s: 0.66, ry: -1.1 },
  { src: "Queen", pos: [0.1, 0, -2.6], s: 0.5, ry: 0.2 },
];

function Court({ cursor }: { cursor: React.MutableRefObject<THREE.Vector3> }) {
  const { scene: gltf } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());
  const t0 = useRef<number | null>(null);
  const members = useRef<Member[]>([]);
  const refs = useRef<Array<THREE.Group | null>>([]);

  const built = useMemo(() => {
    return LAYOUT.map((item) => {
      const src = (gltf.clone(true).getObjectByName(item.src) as THREE.Object3D)?.clone(true);
      const mats: THREE.MeshStandardMaterial[] = [];
      if (src) {
        src.position.set(0, 0, 0);
        src.traverse((m) => {
          const mesh = m as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mat = new THREE.MeshStandardMaterial({ color: "#23242a", metalness: 0.55, roughness: 0.5, envMapIntensity: 0.7 });
          mat.emissive = new THREE.Color("#ffcf6a");
          mat.emissiveIntensity = 0;
          mesh.material = mat;
          mesh.frustumCulled = false;
          mats.push(mat);
        });
      }
      return { src, mats, item };
    });
  }, [gltf]);

  const ensure = () => {
    if (members.current.length) return;
    members.current = built.map((b, i) => ({
      group: { current: refs.current[i] },
      mats: b.mats,
      wpos: new THREE.Vector3(),
      reveal: 0,
      baseYaw: b.item.ry,
      hero: !!b.item.hero,
    }));
  };

  useFrame((state, delta) => {
    ensure();
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (t0.current === null) t0.current = t;
    const since = t - t0.current;
    mouse.current.lerp(state.pointer, 0.05);

    if (group.current) {
      const enter = 1 - Math.pow(1 - THREE.MathUtils.clamp(since / 2.4, 0, 1), 3);
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, mouse.current.x * 0.1 + Math.sin(t * 0.07) * 0.04, 2.5, d);
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, (1 - enter) * -1.2, 3, d);
    }

    members.current.forEach((m) => {
      const g = m.group.current ?? refs.current[members.current.indexOf(m)];
      if (!g) return;
      g.getWorldPosition(m.wpos);
      const dist = m.wpos.distanceTo(cursor.current);
      const lit = m.hero ? 0.18 : 0; // heroes hold a faint base glow
      const target = Math.max(lit, dist < REVEAL_RADIUS ? (1 - dist / REVEAL_RADIUS) ** 1.5 : 0);
      m.reveal = THREE.MathUtils.damp(m.reveal, target, 6, d);
      m.mats.forEach((mat) => (mat.emissiveIntensity = m.reveal * 0.9));
      // woken pieces turn toward the light and lift a touch
      const toLight = Math.atan2(cursor.current.x - m.wpos.x, cursor.current.z - m.wpos.z);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, m.baseYaw + (toLight - m.baseYaw) * m.reveal * 0.5, 4, d);
      g.position.y = THREE.MathUtils.damp(g.position.y, m.reveal * 0.06, 5, d);
    });
  });

  return (
    <group ref={group} scale={2.95}>
      {built.map((b, i) => (
        <group
          key={i}
          ref={(el) => (refs.current[i] = el)}
          position={b.item.pos}
          rotation={[0, b.item.ry, 0]}
          scale={b.item.s}
        >
          {b.src && <primitive object={b.src} />}
        </group>
      ))}
    </group>
  );
}

// The light the user carries through the fog.
function CarriedLight({ cursor }: { cursor: React.MutableRefObject<THREE.Vector3> }) {
  const { camera } = useThree();
  const light = useRef<THREE.PointLight>(null);
  const orb = useRef<THREE.Mesh>(null);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 1.2), []); // z = -1.2 court plane
  const hit = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    ray.setFromCamera(state.pointer, camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      cursor.current.lerp(hit, 0.18);
    }
    const c = cursor.current;
    if (light.current) light.current.position.set(c.x, c.y + 1.4, c.z + 1.6);
    if (orb.current) orb.current.position.set(c.x, c.y + 0.9, c.z + 0.6);
  });

  return (
    <>
      <pointLight ref={light} intensity={26} distance={7} decay={1.6} color="#ffd98a" />
      <mesh ref={orb}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color="#ffe7b8" toneMapped={false} />
      </mesh>
    </>
  );
}

function World({ sun, cursor }: { sun: THREE.Mesh | null; cursor: React.MutableRefObject<THREE.Vector3> }) {
  return (
    <>
      <color attach="background" args={["#0a0b0e"]} />
      <fogExp2 attach="fog" args={["#0a0b0e", 0.085]} />
      <ambientLight intensity={0.07} color="#9fb0c8" />
      <spotLight position={[-1, 7, -5]} angle={0.8} penumbra={1} intensity={5} color="#ffd28a" />
      <directionalLight position={[4, 3, 5]} intensity={0.32} color="#acc4ff" />

      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#05060a"]} />
        <Lightformer intensity={1.6} position={[-2, 5, -4]} scale={[8, 6, 1]} color="#ffe7c2" />
        <Lightformer intensity={0.8} position={[5, 1, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 6, 1]} color="#9fb6e8" />
      </Environment>

      <Court cursor={cursor} />
      <CarriedLight cursor={cursor} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <MeshReflectorMaterial resolution={1024} blur={[500, 200]} mixBlur={1.4} mixStrength={2.0} mirror={0.55} color="#0a0b0e" metalness={0.7} roughness={0.55} />
      </mesh>

      <EffectComposer multisampling={0} enableNormalPass>
        <N8AO halfRes aoRadius={2} intensity={2} distanceFalloff={1} color="#000005" />
        {sun ? (
          <GodRays sun={sun} blendFunction={BlendFunction.SCREEN} samples={60} density={0.93} decay={0.93} weight={0.34} exposure={0.4} clampMax={0.85} blur />
        ) : (
          <></>
        )}
        <Bloom mipmapBlur luminanceThreshold={0.65} luminanceSmoothing={0.4} intensity={0.85} />
        <DepthOfField target={[0, 2.2, 0]} focalLength={0.1} bokehScale={2.4} height={512} />
        <Vignette eskil={false} offset={0.22} darkness={0.85} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.45} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

export function WorldHero() {
  const [sun, setSun] = useState<THREE.Mesh | null>(null);
  const cursor = useRef(new THREE.Vector3(0, 0, -1.2));
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.7, 6.0], fov: 46, near: 0.1, far: 100 }}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        dpr={[1, 2]}
        onCreated={({ camera }) => camera.lookAt(0, 2.5, 0)}
      >
        <Suspense fallback={null}>
          <mesh ref={setSun} position={[1.7, 2.4, -6]}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshBasicMaterial color="#ffe2a6" toneMapped={false} />
          </mesh>
          <World sun={sun} cursor={cursor} />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-0 z-40 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">
        <div className="absolute top-7 left-8">Liquid&nbsp;Chess</div>
        <div className="absolute top-7 right-8 flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--gold] opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[--gold]" /></span>
          Live
        </div>
        <div className="absolute bottom-8 left-8">Move your light · wake the court</div>
        <div className="absolute bottom-8 right-8">Scroll to enter</div>
      </div>
      <div className="pointer-events-none absolute left-8 md:left-14 bottom-[16%] z-40">
        <h1 className="font-display text-white/95 leading-[0.86] tracking-[-0.02em]" style={{ textShadow: "0 4px 40px rgba(0,0,0,0.7)" }}>
          <span className="block font-[330] text-[clamp(2.4rem,5.2vw,4.6rem)]">The game</span>
          <span className="block italic text-[--gold] text-[clamp(2.8rem,6.6vw,5.8rem)]" style={{ fontWeight: 440, fontVariationSettings: "'opsz' 144, 'WONK' 1" }}>speaks.</span>
        </h1>
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);

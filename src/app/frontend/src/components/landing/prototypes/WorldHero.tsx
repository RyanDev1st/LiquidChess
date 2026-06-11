"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial, useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom, N8AO, DepthOfField, Vignette, Noise, GodRays, SMAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";

// Monolithic dark-pewter material — one cohesive monochrome, gold comes from light.
function monolith(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: "#23242a", metalness: 0.55, roughness: 0.5, envMapIntensity: 0.7 });
}

function Monoliths() {
  const { scene: gltf } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());
  const t0 = useRef<number | null>(null);

  const model = useMemo(() => {
    const c = gltf.clone(true);
    const mat = monolith();
    const king = c.getObjectByName("King");
    const queen = c.getObjectByName("Queen");
    [king, queen].forEach((o) => {
      o?.position.set(0, 0, 0);
      o?.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.material = mat;
          mesh.frustumCulled = false;
        }
      });
    });
    return { king, queen };
  }, [gltf]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (t0.current === null) t0.current = t;
    const since = t - t0.current;
    mouse.current.lerp(state.pointer, 0.05);
    if (group.current) {
      // slow cinematic drift + cursor parallax + a gentle settle on enter
      const enter = THREE.MathUtils.clamp(since / 2.4, 0, 1);
      const e = 1 - Math.pow(1 - enter, 3);
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, mouse.current.x * 0.12 + Math.sin(t * 0.08) * 0.05, 2.5, d);
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, (1 - e) * -1.2, 3, d);
    }
  });

  return (
    <group ref={group} scale={2.95}>
      <group position={[-0.62, 0, 0.2]} rotation={[0, 0.28, 0]}>{model.king && <primitive object={model.king} />}</group>
      <group position={[0.66, 0, -0.4]} rotation={[0, -0.32, 0]}>{model.queen && <primitive object={model.queen} />}</group>
    </group>
  );
}

// Slow dust motes catching the light.
function Dust() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 280;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 7;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.012;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.025} color="#d8c184" transparent opacity={0.5} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

function World({ sun }: { sun: THREE.Mesh | null }) {
  return (
    <>
      <color attach="background" args={["#0c0d10"]} />
      <fogExp2 attach="fog" args={["#0c0d10", 0.085]} />
      <ambientLight intensity={0.12} color="#aab4c8" />
      {/* gold key from behind = rim + the god-ray colour */}
      <spotLight position={[-1, 7, -5]} angle={0.8} penumbra={1} intensity={9} color="#ffd28a" />
      <directionalLight position={[4, 3, 5]} intensity={0.5} color="#acc4ff" />

      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#06070a"]} />
        <Lightformer intensity={2} position={[-2, 5, -4]} scale={[8, 6, 1]} color="#ffe7c2" />
        <Lightformer intensity={1} position={[5, 1, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 6, 1]} color="#9fb6e8" />
      </Environment>

      <Monoliths />
      <Dust />

      {/* infinite reflective floor fading into fog */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <MeshReflectorMaterial resolution={1024} blur={[500, 200]} mixBlur={1.4} mixStrength={2.0} mirror={0.55} color="#0c0d10" metalness={0.7} roughness={0.55} />
      </mesh>

      <EffectComposer multisampling={0} enableNormalPass>
        <N8AO halfRes aoRadius={2} intensity={2.2} distanceFalloff={1} color="#000005" />
        {sun ? (
          <GodRays sun={sun} blendFunction={BlendFunction.SCREEN} samples={60} density={0.93} decay={0.93} weight={0.38} exposure={0.42} clampMax={0.9} blur />
        ) : (
          <></>
        )}
        <Bloom mipmapBlur luminanceThreshold={0.7} luminanceSmoothing={0.4} intensity={0.7} />
        <DepthOfField target={[0, 2.2, 0]} focalLength={0.1} bokehScale={2.6} height={512} />
        <Vignette eskil={false} offset={0.22} darkness={0.82} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.45} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

export function WorldHero() {
  const [sun, setSun] = useState<THREE.Mesh | null>(null);
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.7, 6.0], fov: 46, near: 0.1, far: 100 }}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        dpr={[1, 2]}
        onCreated={({ camera }) => camera.lookAt(0, 2.5, 0)}
      >
        <Suspense fallback={null}>
          {/* god-ray emitter: small + low + behind the pieces so they eclipse it
              into shafts and rim halos rather than a bare disc */}
          <mesh ref={setSun} position={[1.7, 2.4, -6]}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshBasicMaterial color="#ffe2a6" toneMapped={false} />
          </mesh>
          <World sun={sun} />
        </Suspense>
      </Canvas>

      {/* cinematic minimal UI — corners + lower-third title, no billboard headline */}
      <div className="pointer-events-none absolute inset-0 z-40 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">
        <div className="absolute top-7 left-8">Liquid&nbsp;Chess</div>
        <div className="absolute top-7 right-8 flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--gold] opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[--gold]" /></span>
          Live
        </div>
        <div className="absolute bottom-8 left-8">e4 · 1.34</div>
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

"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, MeshReflectorMaterial, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";

const GOLD = new THREE.MeshStandardMaterial({ color: "#cda23f", metalness: 1, roughness: 0.16, envMapIntensity: 1.6 });
const OBSIDIAN = new THREE.MeshStandardMaterial({ color: "#0c0c0e", metalness: 1, roughness: 0.22, envMapIntensity: 1.4 });

// Procedural blue-noise normal-ish map so the mirror floor distorts like liquid.
function useNoiseTexture() {
  return useMemo(() => {
    const s = 128;
    const data = new Uint8Array(s * s * 4);
    for (let i = 0; i < s * s; i++) {
      const v = 110 + Math.random() * 36;
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = 255;
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, s, s, THREE.RGBAFormat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  }, []);
}

function Pieces() {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());

  const pieces = useMemo(() => {
    const c = scene.clone(true);
    const king = c.getObjectByName("King");
    const queen = c.getObjectByName("Queen");
    const mic = c.getObjectByName("Mic");
    [king, queen, mic].forEach((o) => o && o.position.set(0, 0, 0));
    king?.traverse((m) => ((m as THREE.Mesh).isMesh) && ((m as THREE.Mesh).material = GOLD));
    queen?.traverse((m) => ((m as THREE.Mesh).isMesh) && ((m as THREE.Mesh).material = OBSIDIAN));
    mic?.traverse((m) => ((m as THREE.Mesh).isMesh) && ((m as THREE.Mesh).material = GOLD));
    return { king, queen, mic };
  }, [scene]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    mouse.current.lerp(state.pointer, 0.06);
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, mouse.current.x * 0.3, 3, d);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -mouse.current.y * 0.12, 3, d);
      group.current.position.y = Math.sin(t * 0.6) * 0.03;
    }
  });

  return (
    <group ref={group}>
      <group position={[-0.9, 0, 0.3]} rotation={[0, 0.3, 0]}>{pieces.king && <primitive object={pieces.king} />}</group>
      <group position={[0.95, 0, -0.1]} rotation={[0, -0.4, 0]}>{pieces.queen && <primitive object={pieces.queen} />}</group>
      <group position={[1.85, 0.5, 0.15]} rotation={[0, -0.3, 0]}>{pieces.mic && <primitive object={pieces.mic} />}</group>
    </group>
  );
}

function CursorLight() {
  const ref = useRef<THREE.PointLight>(null);
  const { viewport } = useThree();
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, state.pointer.x * viewport.width * 0.6, 4, Math.min(delta, 0.05));
      ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, 1.4 + state.pointer.y * 1.2, 4, Math.min(delta, 0.05));
    }
  });
  return <pointLight ref={ref} position={[0, 1.6, 2.2]} intensity={9} distance={9} color="#ffd98a" />;
}

function Scene() {
  const noise = useNoiseTexture();
  return (
    <>
      <color attach="background" args={["#08070a"]} />
      <fog attach="fog" args={["#08070a", 6, 16]} />
      <ambientLight intensity={0.12} color="#caa" />
      <directionalLight position={[3, 6, 4]} intensity={1.1} color="#fff0d8" />
      <directionalLight position={[5, 3, -5]} intensity={1.6} color="#bcd2ff" />
      <CursorLight />
      <Environment preset="city" />

      <Pieces />

      {/* liquid mirror floor — reflections give the depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          resolution={1024}
          blur={[400, 120]}
          mixBlur={1.1}
          mixStrength={2.4}
          mirror={0.75}
          color="#0b0a0c"
          metalness={0.85}
          roughness={0.35}
          distortion={0.45}
          distortionMap={noise}
          depthScale={1.1}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.2}
        />
      </mesh>
    </>
  );
}

export function LiquidGoldHero() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.95, 5], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        dpr={[1, 1.5]}
        onCreated={({ camera }) => camera.lookAt(0, 0.65, 0)}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      {/* warm vignette to anchor the copy */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#08070a]/85 via-transparent to-transparent" />
    </div>
  );
}

useGLTF.preload(MODEL_URL);

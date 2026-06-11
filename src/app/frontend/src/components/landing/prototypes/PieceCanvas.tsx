"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";

/**
 * Lightweight single-piece accent canvas shared by the flat/editorial concepts.
 * Art direction (color, type, layout) is the hero — this is just a clean,
 * well-lit object, not an effects showcase.
 */
export function PieceCanvas({
  piece,
  color,
  metalness = 0.2,
  roughness = 0.55,
  envPreset = "studio",
  shadow = true,
  spin = 0.15,
  cursorTilt = true,
  className,
}: {
  piece: "King" | "Queen";
  color: string;
  metalness?: number;
  roughness?: number;
  envPreset?: "studio" | "city" | "warehouse";
  shadow?: boolean;
  spin?: number;
  cursorTilt?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0.4, 4], fov: 38, near: 0.1, far: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
        onCreated={({ camera }) => camera.lookAt(0, 0.35, 0)}
      >
        <Suspense fallback={null}>
          <Mesh piece={piece} color={color} metalness={metalness} roughness={roughness} spin={spin} cursorTilt={cursorTilt} />
          <Environment preset={envPreset} />
          {/* extra soft key for the bright/editorial look */}
          <Lightformer intensity={1.2} position={[2, 3, 2]} scale={[5, 5, 1]} color="#ffffff" />
          {shadow && <ContactShadows position={[0, -0.92, 0]} opacity={0.5} scale={5} blur={2.4} far={2} color="#1a1410" />}
        </Suspense>
      </Canvas>
    </div>
  );
}

function Mesh({
  piece,
  color,
  metalness,
  roughness,
  spin,
  cursorTilt,
}: {
  piece: "King" | "Queen";
  color: string;
  metalness: number;
  roughness: number;
  spin: number;
  cursorTilt: boolean;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const ref = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());

  const obj = useMemo(() => {
    const src = (scene.clone(true).getObjectByName(piece) as THREE.Object3D)?.clone(true);
    if (!src) return null;
    const mat = new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: 1.1 });
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
    // recenter so the piece sits centred regardless of source pivot
    const c = box.getCenter(new THREE.Vector3());
    const h = box.max.y - box.min.y;
    src.position.set(-c.x, -box.min.y - h / 2, -c.z);
    return src;
  }, [scene, piece, color, metalness, roughness]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    if (!ref.current) return;
    mouse.current.lerp(state.pointer, 0.06);
    const baseSpin = state.clock.elapsedTime * spin;
    ref.current.rotation.y = baseSpin + (cursorTilt ? mouse.current.x * 0.5 : 0);
    ref.current.rotation.x = cursorTilt ? -mouse.current.y * 0.18 : 0;
    ref.current.position.y = 0.35 + Math.sin(state.clock.elapsedTime * 0.6) * 0.03;
  });

  return <group ref={ref}>{obj && <primitive object={obj} scale={1.5} />}</group>;
}

useGLTF.preload(MODEL_URL);

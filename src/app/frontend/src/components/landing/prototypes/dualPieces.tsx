"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";

function buildPiece(scene: THREE.Object3D, name: string, color: string, metalness: number, roughness: number) {
  const src = (scene.clone(true).getObjectByName(name) as THREE.Object3D)?.clone(true);
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
  const c = box.getCenter(new THREE.Vector3());
  const h = box.max.y - box.min.y;
  src.position.set(-c.x, -box.min.y - h / 2, -c.z);
  return src;
}

/** White King + black Queen with dual key/rim lighting so both read. */
export function DualScene({
  king,
  queen,
  spin = true,
  orbit = 0,
}: {
  king: { pos: [number, number, number]; scale: number; ry?: number };
  queen: { pos: [number, number, number]; scale: number; ry?: number };
  spin?: boolean;
  orbit?: number; // if >0, rotate the whole pair around center (medallion)
}) {
  const { scene } = useGLTF(MODEL_URL);
  const kRef = useRef<THREE.Group>(null);
  const qRef = useRef<THREE.Group>(null);
  const pair = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());

  const built = useMemo(
    () => ({ king: buildPiece(scene, "King", "#f3ece0", 0.18, 0.5), queen: buildPiece(scene, "Queen", "#101013", 0.55, 0.32) }),
    [scene],
  );

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    mouse.current.lerp(state.pointer, 0.05);
    if (pair.current && orbit) pair.current.rotation.y = t * orbit;
    if (kRef.current) {
      kRef.current.rotation.y = spin ? THREE.MathUtils.damp(kRef.current.rotation.y, (king.ry ?? 0.3) + mouse.current.x * 0.2, 4, d) : king.ry ?? 0;
      kRef.current.position.y = king.pos[1] + Math.sin(t * 0.6) * 0.03;
    }
    if (qRef.current) {
      qRef.current.rotation.y = spin ? THREE.MathUtils.damp(qRef.current.rotation.y, (queen.ry ?? -0.35) + mouse.current.x * 0.2, 4, d) : queen.ry ?? 0;
      qRef.current.position.y = queen.pos[1] + Math.sin(t * 0.55 + 1) * 0.03;
    }
  });

  return (
    <>
      <directionalLight position={[-4, 4, 4]} intensity={2.1} color="#fff0d8" />
      <directionalLight position={[5, 5, 3]} intensity={1.7} color="#dfe8ff" />
      <ambientLight intensity={0.35} />
      <Environment preset="studio" />
      <group ref={pair}>
        <group ref={kRef} position={king.pos} scale={king.scale}>{built.king && <primitive object={built.king} />}</group>
        <group ref={qRef} position={queen.pos} scale={queen.scale}>{built.queen && <primitive object={built.queen} />}</group>
      </group>
    </>
  );
}

useGLTF.preload(MODEL_URL);

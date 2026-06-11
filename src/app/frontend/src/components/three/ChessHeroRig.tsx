"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";

/**
 * Group refs the hero uses to choreograph the pieces.
 * - `outer` groups are driven by scroll (separation / flank / exit).
 * - `inner` groups are driven by the infinite idle timelines.
 * Keeping the two concerns on separate groups means scroll and idle never
 * fight over the same transform channel.
 */
export interface ChessRigRefs {
  root: React.RefObject<THREE.Group>;
  kingOuter: React.RefObject<THREE.Group>;
  queenOuter: React.RefObject<THREE.Group>;
  micOuter: React.RefObject<THREE.Group>;
  kingInner: React.RefObject<THREE.Group>;
  queenInner: React.RefObject<THREE.Group>;
  micInner: React.RefObject<THREE.Group>;
}

// Rest layout (progress 0): pieces cluster in the RIGHT half of the frame so the
// editorial copy owns the left. King front, Queen back-right, Mic floating beside
// her — the reference composition. Origins are at each piece's base (feet on y=0).
const LAYOUT = {
  king: { x: 0.35, y: 0, z: 0.35, ry: 0.26 },
  queen: { x: 1.5, y: 0, z: -0.15, ry: -0.4 },
  mic: { x: 2.25, y: 0.5, z: 0.1, ry: -0.35 },
};

function tuneMaterial(mat: THREE.Material): THREE.Material {
  const m = mat.clone() as THREE.MeshStandardMaterial;
  // Glossy ceramic look from the ref: stronger env reflections, transparent so
  // the exit phase can fade it, and double-sided guards against decimation gaps.
  m.envMapIntensity = 1.3;
  m.transparent = true;
  m.opacity = 1;
  m.depthWrite = true;
  m.needsUpdate = true;
  return m;
}

export function ChessHeroRig({
  refs,
  onReady,
}: {
  refs: ChessRigRefs;
  onReady?: (materials: THREE.Material[]) => void;
}) {
  const { scene } = useGLTF(MODEL_URL);

  const model = useMemo(() => {
    const cloned = scene.clone(true);
    const pick = (name: string) => cloned.getObjectByName(name) as THREE.Object3D | undefined;
    const king = pick("King");
    const queen = pick("Queen");
    const mic = pick("Mic");

    const materials: THREE.Material[] = [];
    [king, queen, mic].forEach((o) => {
      if (!o) return;
      // Geometry is centred on each piece's base origin; we drive placement via
      // the wrapper groups, so neutralise the authored node transform.
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(1);
      o.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map(tuneMaterial);
            materials.push(...mesh.material);
          } else if (mesh.material) {
            mesh.material = tuneMaterial(mesh.material);
            materials.push(mesh.material);
          }
        }
      });
    });

    return { king, queen, mic, materials };
  }, [scene]);

  useEffect(() => {
    onReady?.(model.materials);
  }, [model, onReady]);

  return (
    <group ref={refs.root}>
      <group
        ref={refs.kingOuter}
        position={[LAYOUT.king.x, LAYOUT.king.y, LAYOUT.king.z]}
        rotation={[0, LAYOUT.king.ry, 0]}
      >
        <group ref={refs.kingInner}>{model.king && <primitive object={model.king} />}</group>
      </group>

      <group
        ref={refs.queenOuter}
        position={[LAYOUT.queen.x, LAYOUT.queen.y, LAYOUT.queen.z]}
        rotation={[0, LAYOUT.queen.ry, 0]}
      >
        <group ref={refs.queenInner}>{model.queen && <primitive object={model.queen} />}</group>
      </group>

      <group
        ref={refs.micOuter}
        position={[LAYOUT.mic.x, LAYOUT.mic.y, LAYOUT.mic.z]}
        rotation={[0, LAYOUT.mic.ry, 0]}
      >
        <group ref={refs.micInner}>{model.mic && <primitive object={model.mic} />}</group>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);

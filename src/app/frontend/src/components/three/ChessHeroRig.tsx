"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";
const GOLD = new THREE.Color("#c9a84c");

/**
 * Group refs the hero uses to choreograph the pieces.
 * - `root`  : entrance + cursor parallax (rotation only).
 * - `outer` : scroll-driven (separation / flank / exit) — owned by GSAP.
 * - `inner` : idle float/sway + hover lift — owned by this rig's useFrame.
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

// Rest layout (progress 0): pieces cluster in the RIGHT half so the editorial
// copy owns the left. Origins are at each piece's base (feet on y = 0).
const LAYOUT = {
  king: { x: 0.35, y: 0, z: 0.35, ry: 0.26 },
  queen: { x: 1.5, y: 0, z: -0.15, ry: -0.4 },
  mic: { x: 2.25, y: 0.5, z: 0.1, ry: -0.35 },
};

function toPhysical(src: THREE.Material): THREE.MeshPhysicalMaterial {
  const s = src as THREE.MeshStandardMaterial;
  const m = new THREE.MeshPhysicalMaterial({
    map: s.map ?? null,
    normalMap: s.normalMap ?? null,
    roughnessMap: s.roughnessMap ?? null,
    metalnessMap: s.metalnessMap ?? null,
    color: s.color ?? new THREE.Color(0xffffff),
    metalness: s.metalness ?? 0,
    roughness: s.roughness ?? 0.5,
  });
  // Glazed-ceramic sheen from the reference + a gold emissive used by hover.
  m.clearcoat = 0.7;
  m.clearcoatRoughness = 0.25;
  m.envMapIntensity = 1.35;
  m.emissive = GOLD.clone();
  m.emissiveIntensity = 0;
  m.transparent = true;
  m.opacity = 1;
  return m;
}

interface PieceData {
  inner: React.RefObject<THREE.Group>;
  object: THREE.Object3D;
  materials: THREE.MeshPhysicalMaterial[];
  center: THREE.Vector3; // local offset of visual centre from base origin
  hover: number; // damped 0..1
}

export function ChessHeroRig({
  refs,
  onReady,
}: {
  refs: ChessRigRefs;
  onReady?: (materials: THREE.Material[]) => void;
}) {
  const { camera } = useThree();
  const { scene: gltf } = useGLTF(MODEL_URL);
  const mouse = useRef(new THREE.Vector2(0, 0));
  const mouseActive = useRef(false);
  const proj = useRef(new THREE.Vector3());
  const reduced = useRef(false);
  const pieceDataRef = useRef<Record<string, PieceData>>({});
  const pieceData = pieceDataRef.current;

  const model = useMemo(() => {
    const cloned = gltf.clone(true);
    const pick = (n: string) => cloned.getObjectByName(n) as THREE.Object3D | undefined;
    const out: { king?: THREE.Object3D; queen?: THREE.Object3D; mic?: THREE.Object3D; mats: THREE.Material[] } = {
      mats: [],
    };
    (["King", "Queen", "Mic"] as const).forEach((name) => {
      const o = pick(name);
      if (!o) return;
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(1);
      const mats: THREE.MeshPhysicalMaterial[] = [];
      const box = new THREE.Box3();
      o.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.frustumCulled = false;
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
        if (Array.isArray(mesh.material)) mesh.material = mesh.material.map(toPhysical);
        else mesh.material = toPhysical(mesh.material);
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mm) =>
          mats.push(mm as THREE.MeshPhysicalMaterial),
        );
      });
      const center = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
      out.mats.push(...mats);
      const key = name.toLowerCase() as "king" | "queen" | "mic";
      out[key] = o;
      pieceData[key] = {
        inner: key === "king" ? refs.kingInner : key === "queen" ? refs.queenInner : refs.micInner,
        object: o,
        materials: mats,
        center,
        hover: 0,
      };
    });
    return out;
    // pieceData is a stable ref container; refs identity is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf]);

  useEffect(() => {
    onReady?.(model.mats);
  }, [model, onReady]);

  // Track the cursor globally — the canvas is pointer-events:none, so the DOM
  // stays clickable while the pieces still react to the mouse.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      mouseActive.current = true;
    };
    const onLeave = () => {
      mouseActive.current = false;
    };
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;
    const onPref = () => (reduced.current = mq.matches);
    mq.addEventListener("change", onPref);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      mq.removeEventListener("change", onPref);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  useFrame((state, delta) => {
    if (reduced.current) return;
    const t = state.clock.elapsedTime;
    const d = Math.min(delta, 0.05);

    // --- Cursor parallax on the root (rotation only; entrance owns position) ---
    if (refs.root.current) {
      const mx = mouseActive.current ? mouse.current.x : 0;
      const my = mouseActive.current ? mouse.current.y : 0;
      refs.root.current.rotation.y = THREE.MathUtils.damp(refs.root.current.rotation.y, mx * 0.2, 3.5, d);
      refs.root.current.rotation.x = THREE.MathUtils.damp(refs.root.current.rotation.x, -my * 0.1, 3.5, d);
    }

    // --- Organic idle (layered sines) + hover lift on the inner groups ---
    const idle = {
      king: { y: Math.sin(t * 0.7) * 0.022 + Math.sin(t * 1.3 + 1) * 0.008, ry: Math.sin(t * 0.5) * 0.04, rz: Math.sin(t * 0.4 + 2) * 0.012 },
      queen: { y: Math.sin(t * 0.62 + 0.8) * 0.03, ry: Math.sin(t * 0.45 + 1) * -0.05, rz: Math.sin(t * 0.5) * 0.01 },
      mic: { y: Math.sin(t * 1.05) * 0.04, ry: 0, rz: Math.sin(t * 0.9) * 0.2 },
    };

    (Object.keys(idle) as Array<keyof typeof idle>).forEach((key) => {
      const pd = pieceData[key];
      const g = pd?.inner.current;
      if (!g) return;

      // hover via cheap screen-space proximity (no per-frame mesh raycast)
      let target = 0;
      proj.current.copy(pd.center).applyMatrix4(g.matrixWorld).project(camera);
      const dist = Math.hypot(proj.current.x - mouse.current.x, proj.current.y - mouse.current.y);
      if (mouseActive.current && dist < 0.22) target = 1 - dist / 0.22;
      pd.hover = THREE.MathUtils.damp(pd.hover, target, 6, d);

      g.position.y = idle[key].y + pd.hover * 0.06;
      g.rotation.y = idle[key].ry;
      g.rotation.z = idle[key].rz;
      const s = 1 + pd.hover * 0.05;
      g.scale.setScalar(s);
      pd.materials.forEach((m) => (m.emissiveIntensity = pd.hover * 0.45));
    });
  });

  return (
    <group ref={refs.root}>
      <group ref={refs.kingOuter} position={[LAYOUT.king.x, LAYOUT.king.y, LAYOUT.king.z]} rotation={[0, LAYOUT.king.ry, 0]}>
        <group ref={refs.kingInner}>{model.king && <primitive object={model.king} />}</group>
      </group>

      <group ref={refs.queenOuter} position={[LAYOUT.queen.x, LAYOUT.queen.y, LAYOUT.queen.z]} rotation={[0, LAYOUT.queen.ry, 0]}>
        <group ref={refs.queenInner}>{model.queen && <primitive object={model.queen} />}</group>
      </group>

      <group ref={refs.micOuter} position={[LAYOUT.mic.x, LAYOUT.mic.y, LAYOUT.mic.z]} rotation={[0, LAYOUT.mic.ry, 0]}>
        <group ref={refs.micInner}>{model.mic && <primitive object={model.mic} />}</group>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);

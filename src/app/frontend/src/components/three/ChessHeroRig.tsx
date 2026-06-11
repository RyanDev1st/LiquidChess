"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";
const GOLD = new THREE.Color("#c9a84c");

export interface ChessRigRefs {
  root: React.RefObject<THREE.Group>;
  kingOuter: React.RefObject<THREE.Group>;
  queenOuter: React.RefObject<THREE.Group>;
  micOuter: React.RefObject<THREE.Group>;
  kingInner: React.RefObject<THREE.Group>;
  queenInner: React.RefObject<THREE.Group>;
  micInner: React.RefObject<THREE.Group>;
}

// Rest layout (progress 0): pieces cluster RIGHT so the editorial copy owns the
// left. `split`/`exit` are the keyframe targets the scroll choreography drives to.
const KEYS = {
  king: { rest: { x: 0.35, y: 0, z: 0.35, ry: 0.26, s: 1 }, split: { x: -2.9, y: 0.1, z: 0, ry: -0.08, s: 1 }, exitX: -9 },
  queen: { rest: { x: 1.5, y: 0, z: -0.15, ry: -0.4, s: 1 }, split: { x: 3.0, y: 0.18, z: 0.3, ry: 0.06, s: 1.18 }, exitX: 9.5 },
  mic: { rest: { x: 2.25, y: 0.5, z: 0.1, ry: -0.35, s: 1 }, split: { x: 3.6, y: 0.85, z: 0.1, ry: -0.2, s: 1 }, exitX: 10.5 },
} as const;

const smooth = (a: number, b: number, t: number) => {
  const k = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
const lerp = THREE.MathUtils.lerp;

function tuneMaterial(src: THREE.Material): THREE.Material {
  const m = (src as THREE.MeshStandardMaterial).clone() as THREE.MeshStandardMaterial;
  m.envMapIntensity = 1.45;
  m.emissive = GOLD.clone();
  m.emissiveIntensity = 0;
  m.transparent = true;
  m.opacity = 1;
  m.needsUpdate = true;
  return m;
}

interface PieceData {
  outer: React.RefObject<THREE.Group>;
  inner: React.RefObject<THREE.Group>;
  materials: THREE.MeshStandardMaterial[];
  center: THREE.Vector3;
  hover: number;
}

export function ChessHeroRig({
  refs,
  containerRef,
  onReady,
}: {
  refs: ChessRigRefs;
  containerRef: React.RefObject<HTMLElement>;
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
    const out: { king?: THREE.Object3D; queen?: THREE.Object3D; mic?: THREE.Object3D; mats: THREE.Material[] } = { mats: [] };
    (["King", "Queen", "Mic"] as const).forEach((name) => {
      const o = pick(name);
      if (!o) return;
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(1);
      const mats: THREE.MeshStandardMaterial[] = [];
      const box = new THREE.Box3();
      o.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.frustumCulled = false;
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(tuneMaterial) : tuneMaterial(mesh.material);
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mm) => mats.push(mm as THREE.MeshStandardMaterial));
      });
      out.mats.push(...mats);
      const key = name.toLowerCase() as "king" | "queen" | "mic";
      out[key] = o;
      pieceData[key] = {
        outer: key === "king" ? refs.kingOuter : key === "queen" ? refs.queenOuter : refs.micOuter,
        inner: key === "king" ? refs.kingInner : key === "queen" ? refs.queenInner : refs.micInner,
        materials: mats,
        center: box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3()),
        hover: 0,
      };
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf]);

  useEffect(() => {
    onReady?.(model.mats);
  }, [model, onReady]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      mouseActive.current = true;
    };
    const onLeave = () => (mouseActive.current = false);
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
    const d = Math.min(delta, 0.05);
    const el = containerRef.current;
    const range = el ? el.clientHeight * 1.85 : 1;
    const p = el ? el.scrollTop / range : 0;

    // progress phases
    const splitT = smooth(0.08, 0.55, p);
    const exitT = smooth(0.6, 1.0, p);
    const fade = 1 - smooth(0.7, 0.98, p);

    // Reduced motion: hold still, only fade out on scroll.
    if (reduced.current) {
      Object.values(pieceData).forEach((pd) => pd.materials.forEach((m) => (m.emissiveIntensity = 0, (m.opacity = fade))));
      return;
    }

    const t = state.clock.elapsedTime;

    // Cursor parallax on the root (rotation only).
    if (refs.root.current) {
      const mx = mouseActive.current ? mouse.current.x : 0;
      const my = mouseActive.current ? mouse.current.y : 0;
      refs.root.current.rotation.y = THREE.MathUtils.damp(refs.root.current.rotation.y, mx * 0.18 + p * 0.15, 3.5, d);
      refs.root.current.rotation.x = THREE.MathUtils.damp(refs.root.current.rotation.x, -my * 0.09, 3.5, d);
    }

    const idle = {
      king: { y: Math.sin(t * 0.7) * 0.022 + Math.sin(t * 1.3 + 1) * 0.008, ry: Math.sin(t * 0.5) * 0.04, rz: Math.sin(t * 0.4 + 2) * 0.012 },
      queen: { y: Math.sin(t * 0.62 + 0.8) * 0.03, ry: Math.sin(t * 0.45 + 1) * -0.05, rz: Math.sin(t * 0.5) * 0.01 },
      mic: { y: Math.sin(t * 1.05) * 0.04, ry: 0, rz: Math.sin(t * 0.9) * 0.2 },
    };

    (Object.keys(KEYS) as Array<keyof typeof KEYS>).forEach((key) => {
      const k = KEYS[key];
      const pd = pieceData[key];
      const outer = pd?.outer.current;
      const inner = pd?.inner.current;
      if (!pd || !outer || !inner) return;

      // scroll choreography: rest -> split (flank) -> exit, layered + damped
      let tx = lerp(k.rest.x, k.split.x, splitT);
      tx = lerp(tx, k.exitX, exitT);
      const ty = lerp(k.rest.y, k.split.y, splitT);
      const tz = lerp(k.rest.z, k.split.z, splitT);
      const ts = lerp(k.rest.s, k.split.s, splitT);
      const trot = lerp(k.rest.ry, k.split.ry, splitT);
      outer.position.x = THREE.MathUtils.damp(outer.position.x, tx, 6, d);
      outer.position.y = THREE.MathUtils.damp(outer.position.y, ty, 6, d);
      outer.position.z = THREE.MathUtils.damp(outer.position.z, tz, 6, d);
      outer.rotation.y = THREE.MathUtils.damp(outer.rotation.y, trot, 6, d);
      const sc = THREE.MathUtils.damp(outer.scale.x, ts, 6, d);
      outer.scale.setScalar(sc);

      // hover via cheap screen-space proximity (no per-frame mesh raycast)
      proj.current.copy(pd.center).applyMatrix4(inner.matrixWorld).project(camera);
      const dist = Math.hypot(proj.current.x - mouse.current.x, proj.current.y - mouse.current.y);
      const target = mouseActive.current && dist < 0.22 && p < 0.4 ? 1 - dist / 0.22 : 0;
      pd.hover = THREE.MathUtils.damp(pd.hover, target, 6, d);

      inner.position.y = idle[key].y + pd.hover * 0.06;
      inner.rotation.y = idle[key].ry;
      inner.rotation.z = idle[key].rz;
      inner.scale.setScalar(1 + pd.hover * 0.05);
      pd.materials.forEach((m) => {
        m.emissiveIntensity = pd.hover * 0.5;
        m.opacity = fade;
      });
    });
  });

  return (
    <group ref={refs.root}>
      <group ref={refs.kingOuter} position={[KEYS.king.rest.x, KEYS.king.rest.y, KEYS.king.rest.z]} rotation={[0, KEYS.king.rest.ry, 0]}>
        <group ref={refs.kingInner}>{model.king && <primitive object={model.king} />}</group>
      </group>
      <group ref={refs.queenOuter} position={[KEYS.queen.rest.x, KEYS.queen.rest.y, KEYS.queen.rest.z]} rotation={[0, KEYS.queen.rest.ry, 0]}>
        <group ref={refs.queenInner}>{model.queen && <primitive object={model.queen} />}</group>
      </group>
      <group ref={refs.micOuter} position={[KEYS.mic.rest.x, KEYS.mic.rest.y, KEYS.mic.rest.z]} rotation={[0, KEYS.mic.rest.ry, 0]}>
        <group ref={refs.micInner}>{model.mic && <primitive object={model.mic} />}</group>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";
const DARK = "#0b0c0f";
const LIGHT = "#e9e1d0";
const GOLD = new THREE.Color("#ffcf6a");

const NOISE_GLSL = /* glsl */ `
  vec3 hash3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453123); }
  float vnoise(vec3 p){ vec3 i=floor(p),f=fract(p); vec3 u=f*f*(3.0-2.0*f);
    float n000=hash3(i).x,n100=hash3(i+vec3(1,0,0)).x,n010=hash3(i+vec3(0,1,0)).x,n110=hash3(i+vec3(1,1,0)).x,
          n001=hash3(i+vec3(0,0,1)).x,n101=hash3(i+vec3(1,0,1)).x,n011=hash3(i+vec3(0,1,1)).x,n111=hash3(i+vec3(1,1,1)).x;
    return mix(mix(mix(n000,n100,u.x),mix(n010,n110,u.x),u.y),mix(mix(n001,n101,u.x),mix(n011,n111,u.x),u.y),u.z); }
`;

function dissolveMat(base: THREE.MeshPhysicalMaterial, uni: { uProgress: { value: number }; uEdge: { value: number }; uFreq: { value: number } }) {
  base.transparent = true;
  base.onBeforeCompile = (sh) => {
    sh.uniforms.uProgress = uni.uProgress;
    sh.uniforms.uEdge = uni.uEdge;
    sh.uniforms.uFreq = uni.uFreq;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDisPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDisPos=position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vDisPos;uniform float uProgress;uniform float uEdge;uniform float uFreq;float vEdge;\n${NOISE_GLSL}`)
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\nfloat dn=vnoise(vDisPos*uFreq);if(dn>uProgress)discard;vEdge=smoothstep(uProgress-uEdge,uProgress,dn);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0,0.81,0.42)*vEdge*5.0;`);
  };
  return base;
}

interface PD { group: React.RefObject<THREE.Group>; mats: THREE.MeshPhysicalMaterial[]; center: THREE.Vector3; hover: number; }

function Pieces({ scrollP }: { scrollP: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  const { scene } = useGLTF(MODEL_URL);
  const root = useRef<THREE.Group>(null);
  const kRef = useRef<THREE.Group>(null);
  const qRef = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());
  const proj = useRef(new THREE.Vector3());
  const t0 = useRef<number | null>(null);
  const uni = useMemo(() => ({ uProgress: { value: 0 }, uEdge: { value: 0.08 }, uFreq: { value: 4.2 } }), []);
  const pdata = useRef<Record<string, PD>>({});

  const built = useMemo(() => {
    const mk = (name: string, color: string, metalness: number, roughness: number, ref: React.RefObject<THREE.Group>) => {
      const src = (scene.clone(true).getObjectByName(name) as THREE.Object3D)?.clone(true);
      if (!src) return null;
      const mats: THREE.MeshPhysicalMaterial[] = [];
      const box = new THREE.Box3();
      src.position.set(0, 0, 0);
      src.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = dissolveMat(new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 1.2 }), uni);
        mat.emissive = GOLD.clone();
        mat.emissiveIntensity = 0;
        mesh.material = mat;
        mesh.frustumCulled = false;
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
        mats.push(mat);
      });
      const c = box.getCenter(new THREE.Vector3());
      const h = box.max.y - box.min.y;
      src.position.set(-c.x, -box.min.y - h / 2, -c.z);
      pdata.current[name] = { group: ref, mats, center: new THREE.Vector3(), hover: 0 };
      return src;
    };
    return { king: mk("King", "#f3ece0", 0.18, 0.5, kRef), queen: mk("Queen", "#121216", 0.5, 0.32, qRef) };
  }, [scene, uni]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (t0.current === null) t0.current = t;
    uni.uProgress.value = Math.min(1.05, uni.uProgress.value + delta / 1.9); // dissolve-in lead
    mouse.current.lerp(state.pointer, 0.05);
    const sp = scrollP.current;

    if (root.current) {
      root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, mouse.current.x * 0.16, 3, d);
      root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, -mouse.current.y * 0.07, 3, d);
    }
    const drive = (ref: React.RefObject<THREE.Group>, name: string, baseX: number, dir: number) => {
      const g = ref.current;
      const pd = pdata.current[name];
      if (!g || !pd) return;
      g.position.x = baseX + dir * sp * 4.5;
      g.position.y = Math.sin(t * 0.6 + dir) * 0.03;
      pd.center.set(0, 0.5, 0);
      proj.current.copy(pd.center).applyMatrix4(g.matrixWorld).project(camera);
      const dist = Math.hypot(proj.current.x - mouse.current.x, proj.current.y - mouse.current.y);
      const target = dist < 0.26 && sp < 0.3 ? 1 - dist / 0.26 : 0;
      pd.hover = THREE.MathUtils.damp(pd.hover, target, 6, d);
      const fade = 1 - THREE.MathUtils.smoothstep(sp, 0.55, 0.95);
      pd.mats.forEach((m) => { m.emissiveIntensity = pd.hover * 0.7; m.opacity = fade; });
    };
    drive(kRef, "King", -1.5, -1);
    drive(qRef, "Queen", 1.5, 1);
  });

  return (
    <group ref={root}>
      {/* warm key for white King (left), cool key for black Queen (right) */}
      <directionalLight position={[-4, 4, 4]} intensity={2.2} color="#ffe9c8" />
      <directionalLight position={[5, 4, 3]} intensity={1.7} color="#cfe0ff" />
      <spotLight position={[0, 4, 1]} angle={0.5} penumbra={1} intensity={3} color="#ffcf6a" />
      <ambientLight intensity={0.25} />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2} position={[-3, 3, 2]} scale={[6, 6, 1]} color="#ffe6c2" />
        <Lightformer intensity={1.4} position={[4, 1, 2]} scale={[5, 5, 1]} color="#bcd2ff" />
      </Environment>
      <group ref={kRef} position={[-1.5, 0, 0]} rotation={[0, 0.35, 0]} scale={1.55}>{built.king && <primitive object={built.king} />}</group>
      <group ref={qRef} position={[1.5, 0, 0]} rotation={[0, -0.4, 0]} scale={1.55}>{built.queen && <primitive object={built.queen} />}</group>
    </group>
  );
}

function Headline({ className, clip }: { className: string; clip: string }) {
  return (
    <h1 className={`absolute font-display font-semibold text-center leading-[0.8] tracking-[-0.03em] ${className}`} style={{ clipPath: clip, fontSize: "clamp(3rem,11vw,11rem)", textShadow: "0 4px 50px rgba(0,0,0,0.4)" }}>
      <span className="block">THE GAME</span>
      <span className="block italic" style={{ fontVariationSettings: "'WONK' 1" }}>SPEAKS</span>
    </h1>
  );
}

export function FusionHero() {
  const [seam, setSeam] = useState(50);
  const [drag, setDrag] = useState(false);
  const scrollP = useRef(0);
  const [, force] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  // drag seam
  useEffect(() => {
    const move = (x: number) => {
      const r = root.current?.getBoundingClientRect();
      if (!r) return;
      setSeam(Math.min(76, Math.max(24, ((x - r.left) / r.width) * 100)));
    };
    const onMove = (e: PointerEvent) => drag && move(e.clientX);
    const onUp = () => setDrag(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [drag]);

  // wheel drives the scroll-beat (separate + fade) so the proto is feelable
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      scrollP.current = Math.min(1, Math.max(0, scrollP.current + e.deltaY * 0.0009));
      force((v) => v + 1);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  const fade = 1 - Math.max(0, Math.min(1, (scrollP.current - 0.5) / 0.4));

  return (
    <div ref={root} className="absolute inset-0 overflow-hidden select-none" style={{ background: LIGHT }}>
      {/* atmospheric split fields (dark left / pale right), clipped at seam */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(80% 90% at 35% 45%, #16171c, ${DARK})`, clipPath: `inset(0 ${100 - seam}% 0 0)` }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(80% 90% at 65% 45%, #f3ecdd, #d8cdb6)`, clipPath: `inset(0 0 0 ${seam}%)` }} />

      {/* drifting fog wisps */}
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ clipPath: `inset(0 ${100 - seam}% 0 0)` }}>
        <div className="absolute w-[60%] h-[60%] left-[5%] top-[20%] rounded-full blur-3xl" style={{ background: "radial-gradient(circle,#3a2e1a55,transparent 70%)", animation: "fogA 14s ease-in-out infinite alternate" }} />
      </div>

      {/* luminous seam shaft (the World's god-ray, repurposed as the divider) */}
      <div className="absolute inset-y-0 z-20" style={{ left: `${seam}%`, transform: "translateX(-50%)" }}>
        <div className="absolute inset-y-0 -translate-x-1/2 w-24 blur-2xl" style={{ background: "linear-gradient(90deg,transparent,rgba(255,207,106,0.22),transparent)" }} />
        <div className="absolute inset-y-0 w-px" style={{ background: "linear-gradient(transparent,rgba(255,207,106,0.85),transparent)" }} />
      </div>

      {/* pieces */}
      <div className="absolute inset-0 z-10">
        <Canvas camera={{ position: [0, 0.5, 5.2], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, alpha: true }} style={{ background: "transparent" }} onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}>
          <Suspense fallback={null}>
            <Pieces scrollP={scrollP} />
            <EffectComposer>
              <Bloom mipmapBlur luminanceThreshold={0.6} luminanceSmoothing={0.4} intensity={0.9} />
              <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.35} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* straddle headline, inverted across the seam */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none" style={{ opacity: fade }}>
        <Headline className="text-[#f0e6d2]" clip={`inset(0 ${100 - seam}% 0 0)`} />
        <Headline className="text-[#14110c]" clip={`inset(0 0 0 ${seam}%)`} />
      </div>

      {/* seam drag handle */}
      <div className="absolute z-30" style={{ left: `${seam}%`, top: "50%", transform: "translate(-50%,-50%)" }}>
        <button onPointerDown={() => setDrag(true)} className="h-11 w-11 rounded-full grid place-items-center cursor-ew-resize" style={{ background: "var(--gold)", color: "#14110c", boxShadow: "0 4px 24px rgba(255,207,106,0.5)" }}>
          <span className="font-mono text-[14px]">⇄</span>
        </button>
      </div>

      {/* film grain + vignette overlays (the cinematic grade across everything) */}
      <div className="pointer-events-none absolute inset-0 z-40" style={{ boxShadow: "inset 0 0 240px 40px rgba(0,0,0,0.55)" }} />
      <div className="pointer-events-none absolute inset-0 z-40 opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* UI */}
      <div className="absolute top-7 left-8 z-40 font-mono text-[10px] uppercase tracking-[0.35em] text-white" style={{ mixBlendMode: "difference" }}>Liquid Chess</div>
      <div className="absolute top-7 right-8 z-40 font-mono text-[10px] uppercase tracking-[0.35em] text-white" style={{ mixBlendMode: "difference" }}>Scroll · drag the seam ⇄</div>
      <div className="absolute bottom-9 left-8 z-40 font-mono text-[10px] uppercase tracking-[0.3em] text-white/70 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white" />White · play-by-play</div>
      <div className="absolute bottom-9 right-8 z-40 font-mono text-[10px] uppercase tracking-[0.3em] text-black/70 flex items-center gap-2">Black · analysis<span className="h-1.5 w-1.5 rounded-full bg-black" /></div>

      <style>{`@keyframes fogA{from{transform:translate(0,0)}to{transform:translate(8%,-6%)}}`}</style>
    </div>
  );
}

useGLTF.preload(MODEL_URL);

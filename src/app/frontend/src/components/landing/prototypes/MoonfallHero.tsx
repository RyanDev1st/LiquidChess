"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial, useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, Vignette, Noise, SMAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { MODEL_URL, buildPiece, InteractivePiece, Starfield, Mist, type LeadUni, type Mode } from "./liquidShared";

const WATER_FRAG = /* glsl */ `
  uniform float uTime; uniform vec3 uDeep; uniform vec3 uFoam; varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
  void main(){
    vec2 uv=vUv; float t=uTime;
    float flow=n2(vec2(uv.x*14.0,uv.y*5.0-t*2.2))*0.6 + n2(vec2(uv.x*30.0,uv.y*10.0-t*3.4))*0.3 + n2(vec2(uv.x*60.0,uv.y*20.0-t*4.6))*0.15;
    float streak=0.5+0.5*sin(uv.x*60.0 + n2(vec2(uv.x*8.0,uv.y*2.0-t))*6.0);
    float water=flow*0.7+streak*0.3;
    float foam=smoothstep(0.62,1.0,water);
    vec3 col=mix(uDeep,uFoam,water)+foam*0.6;
    float edge=smoothstep(0.0,0.13,uv.x)*smoothstep(1.0,0.87,uv.x);
    float top=smoothstep(0.0,0.06,uv.y);
    gl_FragColor=vec4(col, edge*top*(0.5+water*0.55));
  }
`;
const WATER_VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

function Waterfall({ mode }: { mode: Mode }) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(mode === "dark" ? "#1c3550" : "#7fa8c8") },
    uFoam: { value: new THREE.Color(mode === "dark" ? "#cfe6ff" : "#ffffff") },
  }), [mode]);
  useFrame((s) => { if (ref.current) ref.current.uniforms.uTime.value = s.clock.elapsedTime; });
  return (
    <mesh position={[0, 1.4, -3.2]}>
      <planeGeometry args={[3.6, 8, 1, 1]} />
      <shaderMaterial ref={ref} uniforms={uniforms} vertexShader={WATER_VERT} fragmentShader={WATER_FRAG} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function Celestial({ mode }: { mode: Mode }) {
  const halo = useMemo(() => {
    const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    const c = mode === "dark" ? "207,230,255" : "255,226,160";
    g.addColorStop(0, `rgba(${c},0.9)`); g.addColorStop(0.4, `rgba(${c},0.25)`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(cv);
  }, [mode]);
  const color = mode === "dark" ? "#eaf2ff" : "#ffe6a0";
  return (
    <group position={[0, 4.0, -6.5]}>
      <mesh><sphereGeometry args={[1.0, 48, 48]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <sprite scale={[9, 9, 1]}><spriteMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
    </group>
  );
}

function Pieces({ lead }: { lead: LeadUni }) {
  const { scene } = useGLTF(MODEL_URL);
  const grp = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());
  const built = useMemo(() => ({ king: buildPiece(scene, "King", lead), queen: buildPiece(scene, "Queen", lead) }), [scene, lead]);
  useFrame((state, delta) => {
    lead.uProgress.value = Math.min(1.05, lead.uProgress.value + delta / 2.3);
    mouse.current.lerp(state.pointer, 0.04);
    if (grp.current) {
      grp.current.rotation.y = THREE.MathUtils.damp(grp.current.rotation.y, mouse.current.x * 0.1, 2.5, Math.min(delta, 0.05));
    }
  });
  return (
    <group ref={grp} scale={1.85} position={[0, 0.0, 0.8]}>
      <InteractivePiece data={built.king} position={[-1.05, 0, 0]} rotationY={0.3} role="White · play-by-play" />
      <InteractivePiece data={built.queen} position={[1.05, 0, -0.3]} rotationY={-0.34} role="Black · analysis" />
    </group>
  );
}

function Scene({ mode }: { mode: Mode }) {
  const lead = useMemo<LeadUni>(() => ({ uProgress: { value: 0 }, uEdge: { value: 0.07 }, uFreq: { value: 4.0 } }), []);
  const bg = mode === "dark" ? "#070b12" : "#cfd8e2";
  return (
    <>
      <color attach="background" args={[bg]} />
      <fogExp2 attach="fog" args={[bg, 0.05]} />
      <ambientLight intensity={mode === "dark" ? 0.3 : 0.6} color={mode === "dark" ? "#9fb6e0" : "#fff4e6"} />
      <directionalLight position={[0, 5, 2]} intensity={mode === "dark" ? 1.4 : 2.0} color={mode === "dark" ? "#cfe0ff" : "#fff3e0"} />
      <directionalLight position={[-3, 2, 4]} intensity={0.6} color={mode === "dark" ? "#7088b0" : "#ffd9a0"} />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={mode === "dark" ? 1.2 : 2} position={[0, 5, -4]} scale={[8, 6, 1]} color={mode === "dark" ? "#cfe0ff" : "#ffe7c2"} />
      </Environment>

      <Celestial mode={mode} />
      <Starfield visible={mode === "dark"} />
      <Waterfall mode={mode} />
      <Mist color={mode === "dark" ? "#9fc0e8" : "#ffffff"} />
      <Pieces lead={lead} />

      {/* reflective pool */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0.5]}>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial resolution={1024} blur={[400, 200]} mixBlur={1.4} mixStrength={2.6} mirror={0.7} color={mode === "dark" ? "#0a121f" : "#aebccb"} metalness={0.6} roughness={0.4} />
      </mesh>

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.6} luminanceSmoothing={0.4} intensity={mode === "dark" ? 0.9 : 0.6} />
        <DepthOfField target={[0, 0.4, 0.8]} focalLength={0.06} bokehScale={2} height={512} />
        <Vignette eskil={false} offset={0.25} darkness={mode === "dark" ? 0.8 : 0.5} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.32} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

export function MoonfallHero() {
  const [mode, setMode] = useState<Mode>("dark");
  const ink = mode === "dark" ? "text-white" : "text-[#1a2230]";
  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 0.6, 6.2], fov: 44 }} dpr={[1, 1.75]} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }} onCreated={({ camera }) => camera.lookAt(0, 0.5, 0)}>
        <Suspense fallback={null}><Scene mode={mode} /></Suspense>
      </Canvas>

      <div className={`pointer-events-none absolute inset-0 z-40 font-mono text-[10px] uppercase tracking-[0.4em] ${mode === "dark" ? "text-white/45" : "text-black/45"}`}>
        <div className="absolute top-7 left-8">Liquid Chess</div>
        <div className="absolute top-7 right-8 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[--gold] animate-pulse" />Live</div>
        <div className="absolute bottom-8 left-8">Hover a piece · it speaks</div>
      </div>
      <div className={`pointer-events-none absolute left-8 md:left-14 bottom-[15%] z-40 ${ink}`}>
        <h1 className="font-display leading-[0.84] tracking-[-0.02em]" style={{ textShadow: mode === "dark" ? "0 4px 50px rgba(0,0,0,0.7)" : "none" }}>
          <span className="block font-[330] text-[clamp(2.4rem,5.4vw,4.8rem)]">The game</span>
          <span className="block italic text-[--gold] text-[clamp(2.8rem,6.8vw,6rem)]" style={{ fontWeight: 440, fontVariationSettings: "'opsz' 144,'WONK' 1" }}>speaks.</span>
        </h1>
      </div>

      {/* dark/light (moon/sun) toggle */}
      <button onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))} className="absolute bottom-8 right-8 z-50 rounded-full border border-white/20 bg-black/40 backdrop-blur px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-white/80">
        {mode === "dark" ? "☾ Night" : "☀ Day"}
      </button>
      <style>{`@keyframes liqSpeak{0%{opacity:0;transform:translateY(8px) scale(0.9)}20%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-16px)}}`}</style>
    </div>
  );
}

useGLTF.preload(MODEL_URL);

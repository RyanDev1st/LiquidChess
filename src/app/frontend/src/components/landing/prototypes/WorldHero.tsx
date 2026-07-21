"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF, Html } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, Vignette, Noise, GodRays, SMAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";

const NOISE_GLSL = /* glsl */ `
  vec3 hash3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453123); }
  float vnoise(vec3 p){ vec3 i=floor(p),f=fract(p); vec3 u=f*f*(3.0-2.0*f);
    float a=hash3(i).x,b=hash3(i+vec3(1,0,0)).x,c=hash3(i+vec3(0,1,0)).x,d=hash3(i+vec3(1,1,0)).x,
          e=hash3(i+vec3(0,0,1)).x,f1=hash3(i+vec3(1,0,1)).x,g=hash3(i+vec3(0,1,1)).x,h=hash3(i+vec3(1,1,1)).x;
    return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y),mix(mix(e,f1,u.x),mix(g,h,u.x),u.y),u.z); }
`;

// ---- Pieces: two monoliths that dissolve in on load + hover-glow ------------
function dissolve(base: THREE.MeshStandardMaterial, uni: { uProgress: { value: number }; uEdge: { value: number }; uFreq: { value: number } }) {
  base.transparent = true;
  base.onBeforeCompile = (sh) => {
    sh.uniforms.uProgress = uni.uProgress;
    sh.uniforms.uEdge = uni.uEdge;
    sh.uniforms.uFreq = uni.uFreq;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDP=position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vDP;uniform float uProgress;uniform float uEdge;uniform float uFreq;float vE;\n${NOISE_GLSL}`)
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\nfloat dn=vnoise(vDP*uFreq);if(dn>uProgress)discard;vE=smoothstep(uProgress-uEdge,uProgress,dn);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.0,0.78,0.4)*vE*6.0;`);
  };
  return base;
}

const SPEAK = ["Sharp.", "Bold.", "Brilliant!", "Check.", "He's hunting.", "Risky…"];

// Per-piece tactile interaction: hover lifts + scales + glows + emits soundwave
// rings; click makes it "speak" a word with a ring burst. Accurate raycast hover.
function InteractivePiece({
  data,
  position,
  rotationY,
  role,
}: {
  data: { o: THREE.Object3D | null; mats: THREE.MeshStandardMaterial[] };
  position: [number, number, number];
  rotationY: number;
  role: string;
}) {
  const wrap = useRef<THREE.Group>(null);
  const rings = useRef<Array<THREE.Mesh | null>>([]);
  const hover = useRef(0);
  const burst = useRef(0);
  const [word, setWord] = useState<{ w: string; id: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const w = wrap.current;
    if (!w) return;
    // hover: lift + scale + emissive
    w.position.y = position[1] + hover.current * 0.14 + Math.sin(t * 0.5) * 0.03;
    const s = 1 + hover.current * 0.04;
    w.scale.setScalar(s);
    data.mats.forEach((m) => (m.emissiveIntensity = hover.current * 0.85 + burst.current * 1.2));
    burst.current = Math.max(0, burst.current - d * 1.5);
    // soundwave rings — animate while hovered or bursting
    const energy = Math.max(hover.current, burst.current);
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const k = (t * 0.6 + i * 0.34) % 1;
      ring.scale.setScalar(0.5 + k * 2.4);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.5 * energy;
    });
  });

  const speak = () => {
    burst.current = 1;
    setWord({ w: SPEAK[Math.floor((performance.now() / 311) % SPEAK.length)], id: Math.floor(performance.now()) });
  };

  return (
    <group
      ref={wrap}
      position={position}
      rotation={[0, rotationY, 0]}
      onPointerOver={(e) => { e.stopPropagation(); hover.current = 1; setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={(e) => { e.stopPropagation(); hover.current = 0; setHovered(false); document.body.style.cursor = "auto"; }}
      onPointerDown={(e) => { e.stopPropagation(); speak(); }}
    >
      {data.o && <primitive object={data.o} />}
      {/* soundwave rings at the base */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => (rings.current[i] = el)} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
          <ringGeometry args={[0.42, 0.5, 56]} />
          <meshBasicMaterial color="#ffcf6a" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {/* spoken word on click + a persistent role tag while hovered */}
      {word && (
        <Html position={[0, 1.5, 0]} center style={{ pointerEvents: "none" }}>
          <div key={word.id} className="font-display italic text-2xl whitespace-nowrap" style={{ color: "#ffcf6a", textShadow: "0 2px 18px rgba(0,0,0,0.8)", animation: "whSpeak 1.3s ease-out forwards" }}>
            {word.w}
          </div>
        </Html>
      )}
      <Html position={[0, -0.9, 0]} center style={{ pointerEvents: "none" }}>
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/60 whitespace-nowrap transition-opacity duration-300" style={{ opacity: hovered ? 1 : 0 }}>{role}</div>
      </Html>
    </group>
  );
}

function Monoliths() {
  const { scene } = useGLTF(MODEL_URL);
  const grp = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());
  const uni = useMemo(() => ({ uProgress: { value: 0 }, uEdge: { value: 0.07 }, uFreq: { value: 4.0 } }), []);

  const built = useMemo(() => {
    const mk = (name: string) => {
      const src = (scene.clone(true).getObjectByName(name) as THREE.Object3D)?.clone(true);
      if (!src) return { o: null as THREE.Object3D | null, mats: [] as THREE.MeshStandardMaterial[] };
      const mats: THREE.MeshStandardMaterial[] = [];
      const box = new THREE.Box3();
      src.position.set(0, 0, 0);
      src.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
        // KEEP the GLB's authored material (baked Color + Normal maps) — clone it,
        // then inject dissolve + a gold emissive for hover. White King stays white.
        const orig = mesh.material as THREE.MeshStandardMaterial;
        const mat = dissolve(orig.clone(), uni);
        mat.emissive = new THREE.Color("#ffcf6a");
        mat.emissiveIntensity = 0;
        mat.envMapIntensity = 1.0;
        mesh.material = mat;
        mesh.frustumCulled = false;
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
        mats.push(mat);
      });
      const ctr = box.getCenter(new THREE.Vector3());
      const h = box.max.y - box.min.y;
      src.position.set(-ctr.x, -box.min.y - h / 2, -ctr.z);
      return { o: src, mats };
    };
    return { king: mk("King"), queen: mk("Queen") };
  }, [scene, uni]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    uni.uProgress.value = Math.min(1.05, uni.uProgress.value + delta / 2.3);
    mouse.current.lerp(state.pointer, 0.05);
    if (grp.current) {
      grp.current.rotation.y = THREE.MathUtils.damp(grp.current.rotation.y, mouse.current.x * 0.12 + Math.sin(t * 0.06) * 0.04, 2.5, d);
      grp.current.rotation.x = THREE.MathUtils.damp(grp.current.rotation.x, -mouse.current.y * 0.04, 2.5, d);
    }
  });

  return (
    <group ref={grp} scale={2.4} position={[0, 0, 0]}>
      <InteractivePiece data={built.king} position={[-0.7, 0, 0.25]} rotationY={0.32} role="White · play-by-play" />
      <InteractivePiece data={built.queen} position={[0.74, 0, -0.35]} rotationY={-0.36} role="Black · analysis" />
    </group>
  );
}

// ---- Embers / ash / star-glitter: rising, twinkling, drawn toward cursor ----
const emberVert = /* glsl */ `
  uniform float uTime; uniform float uSize; uniform vec2 uMouse; uniform float uSpan;
  attribute float aSeed; attribute float aSpeed; attribute float aScale;
  varying float vTw;
  void main(){
    vec3 p = position;
    // rise + wrap, with gentle sway
    p.y = mod(p.y + uTime*aSpeed, uSpan) - uSpan*0.5;
    p.x += sin(uTime*0.3 + aSeed*30.0)*0.25;
    p.z += cos(uTime*0.22 + aSeed*22.0)*0.2;
    // drawn gently toward cursor (parallax-ish)
    p.x += uMouse.x * (0.4 + aSeed*0.6);
    p.y += uMouse.y * (0.2 + aSeed*0.4);
    vTw = 0.4 + 0.6*sin(uTime*(1.5+aSeed*3.0) + aSeed*60.0);
    vec4 mv = modelViewMatrix * vec4(p,1.0);
    gl_PointSize = uSize * aScale * (1.0/-mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const emberFrag = /* glsl */ `
  uniform vec3 uColor; varying float vTw;
  void main(){
    float d = length(gl_PointCoord-0.5);
    if(d>0.5) discard;
    float a = smoothstep(0.5,0.0,d);
    gl_FragColor = vec4(uColor*(0.7+vTw), a*vTw);
  }
`;

function Embers({ count, span, size, color, speedBase }: { count: number; span: number; size: number; color: string; speedBase: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const mouse = useRef(new THREE.Vector2());
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const speed = new Float32Array(count);
    const scale = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * span;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1;
      seed[i] = Math.random();
      speed[i] = speedBase * (0.5 + Math.random());
      scale[i] = 0.5 + Math.random() * 1.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    g.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    return g;
  }, [count, span, speedBase]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSize: { value: size }, uMouse: { value: new THREE.Vector2() }, uSpan: { value: span }, uColor: { value: new THREE.Color(color) } }), [size, span, color]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    mouse.current.lerp(state.pointer, 0.04);
    matRef.current.uniforms.uMouse.value.copy(mouse.current);
  });

  return (
    <points geometry={geo}>
      <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={emberVert} fragmentShader={emberFrag} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// Faint receding chessboard underfoot — a quiet "this is chess" signal.
function Board() {
  const tex = useMemo(() => {
    const n = 8, px = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = px;
    const ctx = cv.getContext("2d")!;
    const s = px / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#241d12" : "#0d0a07";
        ctx.fillRect(x * s, y * s, s, s);
      }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    t.anisotropy = 4;
    return t;
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.34, -1]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial map={tex} roughness={0.7} metalness={0.15} transparent opacity={0.7} />
    </mesh>
  );
}

function Scene({ sun }: { sun: THREE.Mesh | null }) {
  return (
    <>
      <color attach="background" args={["#0c0a09"]} />
      <fogExp2 attach="fog" args={["#0c0a09", 0.072]} />
      <ambientLight intensity={0.32} color="#cfc4b0" />
      <spotLight position={[0.5, 6, -4]} angle={0.8} penumbra={1} intensity={6} color="#ffd28a" />
      {/* gold rim from behind/sun side */}
      <directionalLight position={[0, 3.5, -3]} intensity={3.5} color="#ffd98a" />
      {/* front key so the white ceramic King reads as WHITE, not silhouette */}
      <directionalLight position={[0, 2, 6]} intensity={1.5} color="#fff4e6" />
      {/* cool fill from camera-left to sculpt the fronts */}
      <directionalLight position={[-4, 2, 5]} intensity={0.7} color="#acc4ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2} position={[0, 4, -4]} scale={[8, 5, 1]} color="#ffe7c2" />
        <Lightformer intensity={1} position={[4, 1, 2]} scale={[5, 5, 1]} color="#7a5a3a" />
      </Environment>

      <Board />
      <Monoliths />

      {/* embers (mid, warm) + finer star-glitter (back, bright) */}
      <Embers count={420} span={16} size={26} color="#ffbf63" speedBase={0.5} />
      <Embers count={220} span={20} size={11} color="#fff0cf" speedBase={0.22} />

      <EffectComposer multisampling={0}>
        {sun ? <GodRays sun={sun} blendFunction={BlendFunction.SCREEN} samples={60} density={0.93} decay={0.94} weight={0.5} exposure={0.5} clampMax={0.95} blur /> : <></>}
        <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.4} intensity={1.0} />
        <DepthOfField target={[0, 0.25, 0]} focalLength={0.06} bokehScale={1.6} height={512} />
        <Vignette eskil={false} offset={0.2} darkness={0.85} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.4} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

// --- Diegetic chess / commentary signal widgets ----------------------------
const COMMENTARY = [
  "1. e4 — he opens the Italian. Safe? No, he's hunting.",
  "…e5. The classical reply, calm as ever.",
  "2. Nf3 — the knight eyes the e5 pawn.",
  "3. Bb5 — the Ruy López. The room leans in.",
];
const MOVES = ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"];

function Caption() {
  const [text, setText] = useState("");
  useEffect(() => {
    let raf = 0, li = 0, ci = 0, last = 0;
    const tick = (t: number) => {
      if (t - last > 38) {
        last = t;
        const line = COMMENTARY[li];
        if (ci <= line.length) setText(line.slice(0, ci++));
        else if (ci < line.length + 50) ci++;
        else { ci = 0; li = (li + 1) % COMMENTARY.length; }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="mt-5 flex items-start gap-3">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[--gold] animate-pulse" />
      <p className="font-mono text-[12px] md:text-[13px] leading-relaxed text-white/65">
        {text}<span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-[--gold]/80 animate-pulse" />
      </p>
    </div>
  );
}

function EvalBar() {
  const [v, setV] = useState(0.62);
  useEffect(() => {
    const id = setInterval(() => setV(0.4 + Math.random() * 0.4), 1500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">Eval</span>
      <div className="relative w-1.5 h-40 rounded-full overflow-hidden bg-black/40" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}>
        <div className="absolute top-0 inset-x-0 bg-white transition-[height] duration-1000 ease-out" style={{ height: `${(1 - v) * 100}%` }} />
      </div>
      <span className="font-mono text-[10px] text-[--gold]/80">+{(v * 2.4).toFixed(2)}</span>
    </div>
  );
}

function MoveTicker() {
  return (
    <div className="pointer-events-none absolute bottom-8 right-8 z-40 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-white/45">
      {MOVES.slice(0, 6).map((m, i) => (
        <span key={i} style={{ opacity: 1 - i * 0.13, color: i === 0 ? "var(--gold)" : undefined }}>
          {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ""}{m}
        </span>
      ))}
    </div>
  );
}

export function WorldHero() {
  const [sun, setSun] = useState<THREE.Mesh | null>(null);
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.45, 5.8], fov: 44, near: 0.1, far: 100 }}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.18 }}
        dpr={[1, 2]}
        onCreated={({ camera }) => camera.lookAt(0, 0.25, 0)}
      >
        <Suspense fallback={null}>
          {/* the sun, set in the gap between the pieces — god-ray emitter */}
          <mesh ref={setSun} position={[0, 0.9, -7]}>
            <sphereGeometry args={[0.6, 32, 32]} />
            <meshBasicMaterial color="#ffe2a0" toneMapped={false} />
          </mesh>
          <Scene sun={sun} />
        </Suspense>
      </Canvas>

      {/* cinematic minimal UI */}
      <div className="pointer-events-none absolute inset-0 z-40 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">
        <div className="absolute top-7 left-8">Liquid Chess</div>
        {/* ON AIR + live waveform — the 'voice / broadcast' signal */}
        <div className="absolute top-7 right-8 flex items-center gap-3">
          <span className="flex items-center gap-2 text-[--gold]/80"><span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#ff4d4d" }} />On Air</span>
          <span className="flex items-end gap-[2px] h-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="w-[2px] bg-[--gold]/70 origin-bottom" style={{ height: "100%", animation: `whWave 0.9s ease-in-out ${(i % 5) * 0.08}s infinite alternate` }} />
            ))}
          </span>
        </div>
      </div>

      {/* eval bar (left edge) — the 'chess engine' signal */}
      <EvalBar />

      {/* move notation ticker (bottom center) — the 'chess' signal */}
      <MoveTicker />

      {/* headline + live AI commentary caption */}
      <div className="pointer-events-none absolute left-8 md:left-14 bottom-[15%] z-40 max-w-[44ch]">
        <h1 className="font-display text-white/95 leading-[0.84] tracking-[-0.02em]" style={{ textShadow: "0 4px 50px rgba(0,0,0,0.7)" }}>
          <span className="block font-[330] text-[clamp(2.4rem,5.4vw,4.8rem)]">The game</span>
          <span className="block italic text-[--gold] text-[clamp(2.8rem,6.8vw,6rem)]" style={{ fontWeight: 440, fontVariationSettings: "'opsz' 144, 'WONK' 1" }}>speaks.</span>
        </h1>
        <Caption />
      </div>
      <style>{`@keyframes whWave{from{transform:scaleY(0.3)}to{transform:scaleY(1)}}@keyframes whSpeak{0%{opacity:0;transform:translateY(8px) scale(0.9)}20%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-16px)}}`}</style>
    </div>
  );
}

useGLTF.preload(MODEL_URL);

"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
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

function Monoliths() {
  const { scene } = useGLTF(MODEL_URL);
  const { camera } = useThree();
  const grp = useRef<THREE.Group>(null);
  const kRef = useRef<THREE.Group>(null);
  const qRef = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2());
  const proj = useRef(new THREE.Vector3());
  const uni = useMemo(() => ({ uProgress: { value: 0 }, uEdge: { value: 0.07 }, uFreq: { value: 4.0 } }), []);
  const hov = useRef({ King: 0, Queen: 0 });

  const built = useMemo(() => {
    const mk = (name: string, color: string, m: number, r: number) => {
      const src = (scene.clone(true).getObjectByName(name) as THREE.Object3D)?.clone(true);
      if (!src) return { o: null as THREE.Object3D | null, mats: [] as THREE.MeshStandardMaterial[] };
      const mats: THREE.MeshStandardMaterial[] = [];
      const box = new THREE.Box3();
      src.position.set(0, 0, 0);
      src.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = dissolve(new THREE.MeshStandardMaterial({ color, metalness: m, roughness: r, envMapIntensity: 0.8 }), uni);
        mat.emissive = new THREE.Color("#ffcf6a");
        mat.emissiveIntensity = 0;
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
    return { king: mk("King", "#4a4c54", 0.45, 0.46), queen: mk("Queen", "#2a2a31", 0.55, 0.4) };
  }, [scene, uni]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    uni.uProgress.value = Math.min(1.05, uni.uProgress.value + delta / 2.3);
    mouse.current.lerp(state.pointer, 0.05);
    if (grp.current) {
      grp.current.rotation.y = THREE.MathUtils.damp(grp.current.rotation.y, mouse.current.x * 0.14 + Math.sin(t * 0.06) * 0.04, 2.5, d);
      grp.current.rotation.x = THREE.MathUtils.damp(grp.current.rotation.x, -mouse.current.y * 0.05, 2.5, d);
    }
    const glow = (ref: React.RefObject<THREE.Group>, name: "King" | "Queen", mats: THREE.MeshStandardMaterial[]) => {
      const g = ref.current;
      if (!g) return;
      g.position.y = Math.sin(t * 0.5 + (name === "King" ? 0 : 1)) * 0.04;
      proj.current.set(0, 1.4, 0).applyMatrix4(g.matrixWorld).project(camera);
      const dist = Math.hypot(proj.current.x - mouse.current.x, proj.current.y - mouse.current.y);
      hov.current[name] = THREE.MathUtils.damp(hov.current[name], dist < 0.3 ? 1 - dist / 0.3 : 0, 6, d);
      mats.forEach((mm) => (mm.emissiveIntensity = Math.max(mm.emissiveIntensity * 0, hov.current[name] * 0.8)));
    };
    glow(kRef, "King", built.king.mats);
    glow(qRef, "Queen", built.queen.mats);
  });

  return (
    <group ref={grp} scale={2.4} position={[0, 0, 0]}>
      <group ref={kRef} position={[-0.7, 0, 0.25]} rotation={[0, 0.32, 0]}>{built.king.o && <primitive object={built.king.o} />}</group>
      <group ref={qRef} position={[0.74, 0, -0.35]} rotation={[0, -0.36, 0]}>{built.queen.o && <primitive object={built.queen.o} />}</group>
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

function Scene({ sun }: { sun: THREE.Mesh | null }) {
  return (
    <>
      <color attach="background" args={["#0c0a09"]} />
      <fogExp2 attach="fog" args={["#0c0a09", 0.072]} />
      <ambientLight intensity={0.2} color="#b8a890" />
      <spotLight position={[0.5, 6, -4]} angle={0.8} penumbra={1} intensity={7} color="#ffd28a" />
      {/* gold rim from behind/sun side so the dark pieces read as lit silhouettes */}
      <directionalLight position={[0, 3.5, -3]} intensity={4} color="#ffd98a" />
      {/* cool fill from camera-left to sculpt the fronts */}
      <directionalLight position={[-4, 2, 5]} intensity={0.7} color="#acc4ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2} position={[0, 4, -4]} scale={[8, 5, 1]} color="#ffe7c2" />
        <Lightformer intensity={1} position={[4, 1, 2]} scale={[5, 5, 1]} color="#7a5a3a" />
      </Environment>

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
        <div className="absolute top-7 right-8 flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--gold] opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[--gold]" /></span>Live
        </div>
        <div className="absolute bottom-8 left-8">e4 · +1.34</div>
        <div className="absolute bottom-8 right-8">Move to stir the ash</div>
      </div>
      <div className="pointer-events-none absolute left-8 md:left-14 bottom-[15%] z-40">
        <h1 className="font-display text-white/95 leading-[0.84] tracking-[-0.02em]" style={{ textShadow: "0 4px 50px rgba(0,0,0,0.7)" }}>
          <span className="block font-[330] text-[clamp(2.4rem,5.4vw,4.8rem)]">The game</span>
          <span className="block italic text-[--gold] text-[clamp(2.8rem,6.8vw,6rem)]" style={{ fontWeight: 440, fontVariationSettings: "'opsz' 144, 'WONK' 1" }}>speaks.</span>
        </h1>
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);

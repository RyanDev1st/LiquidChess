"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";

export const MODEL_URL = "/models/chess-hero.glb";
export type Mode = "dark" | "light";

const NOISE = /* glsl */ `
  vec3 h3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453);}
  float vn(vec3 p){vec3 i=floor(p),f=fract(p);vec3 u=f*f*(3.-2.*f);
    float a=h3(i).x,b=h3(i+vec3(1,0,0)).x,c=h3(i+vec3(0,1,0)).x,d=h3(i+vec3(1,1,0)).x,e=h3(i+vec3(0,0,1)).x,g=h3(i+vec3(1,0,1)).x,k=h3(i+vec3(0,1,1)).x,l=h3(i+vec3(1,1,1)).x;
    return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y),mix(mix(e,g,u.x),mix(k,l,u.x),u.y),u.z);}
`;

export interface LeadUni { uProgress: { value: number }; uEdge: { value: number }; uFreq: { value: number }; }
interface Glow { uGlow: { value: number }; uTime: { value: number }; }

// Material keeps the GLB's baked maps; injects (1) the lead-in dissolve mask with
// a gold edge and (2) a gold "liquid" shimmer band that sweeps up on hover.
function liquidMat(orig: THREE.MeshStandardMaterial, lead: LeadUni): { mat: THREE.MeshStandardMaterial; glow: Glow } {
  const m = orig.clone();
  m.transparent = true;
  const glow: Glow = { uGlow: { value: 0 }, uTime: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uProgress = lead.uProgress;
    sh.uniforms.uEdge = lead.uEdge;
    sh.uniforms.uFreq = lead.uFreq;
    sh.uniforms.uGlow = glow.uGlow;
    sh.uniforms.uTime = glow.uTime;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDP=position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vDP;uniform float uProgress;uniform float uEdge;uniform float uFreq;uniform float uGlow;uniform float uTime;float vE;\n${NOISE}`)
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\nfloat dn=vn(vDP*uFreq);if(dn>uProgress)discard;vE=smoothstep(uProgress-uEdge,uProgress,dn);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.0,0.82,0.32)*vE*5.0;\nfloat band=pow(sin(vDP.y*7.0-uTime*3.5)*0.5+0.5,2.0);\ntotalEmissiveRadiance+=vec3(1.0,0.78,0.25)*uGlow*(0.35+band*0.95);`);
  };
  return { mat: m, glow };
}

export function buildPiece(scene: THREE.Object3D, name: string, lead: LeadUni) {
  const src = (scene.clone(true).getObjectByName(name) as THREE.Object3D)?.clone(true);
  if (!src) return { o: null as THREE.Object3D | null, glows: [] as Glow[] };
  const glows: Glow[] = [];
  const box = new THREE.Box3();
  src.position.set(0, 0, 0);
  src.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    const { mat, glow } = liquidMat(mesh.material as THREE.MeshStandardMaterial, lead);
    mesh.material = mat;
    mesh.frustumCulled = false;
    mesh.geometry.computeBoundingBox();
    if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
    glows.push(glow);
  });
  const ctr = box.getCenter(new THREE.Vector3());
  const h = box.max.y - box.min.y;
  src.position.set(-ctr.x, -box.min.y - h / 2, -ctr.z);
  return { o: src, glows };
}

const SPEAK = ["Sharp.", "Bold.", "Brilliant!", "Check.", "Your move."];

export function InteractivePiece({ data, position, rotationY, role }: { data: { o: THREE.Object3D | null; glows: Glow[] }; position: [number, number, number]; rotationY: number; role: string }) {
  const wrap = useRef<THREE.Group>(null);
  const hover = useRef(0);
  const burst = useRef(0);
  const [word, setWord] = useState<{ w: string; id: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const w = wrap.current;
    if (!w) return;
    w.position.y = position[1] + hover.current * 0.13 + Math.sin(t * 0.5) * 0.025;
    w.scale.setScalar(1 + hover.current * 0.035);
    burst.current = Math.max(0, burst.current - d * 1.4);
    const g = Math.min(1.4, hover.current + burst.current);
    data.glows.forEach((gl) => { gl.uGlow.value = g; gl.uTime.value = t; });
  });

  return (
    <group
      ref={wrap}
      position={position}
      rotation={[0, rotationY, 0]}
      onPointerOver={(e) => { e.stopPropagation(); hover.current = 1; setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={(e) => { e.stopPropagation(); hover.current = 0; setHovered(false); document.body.style.cursor = "auto"; }}
      onPointerDown={(e) => { e.stopPropagation(); burst.current = 1.2; setWord({ w: SPEAK[Math.floor((performance.now() / 311) % SPEAK.length)], id: Math.floor(performance.now()) }); }}
    >
      {data.o && <primitive object={data.o} />}
      {word && (
        <Html position={[0, 1.5, 0]} center style={{ pointerEvents: "none" }}>
          <div key={word.id} className="font-display italic text-2xl whitespace-nowrap" style={{ color: "#ffd86a", textShadow: "0 2px 18px rgba(0,0,0,0.8)", animation: "liqSpeak 1.3s ease-out forwards" }}>{word.w}</div>
        </Html>
      )}
      <Html position={[0, -0.95, 0]} center style={{ pointerEvents: "none" }}>
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/60 whitespace-nowrap transition-opacity duration-300" style={{ opacity: hovered ? 1 : 0 }}>{role}</div>
      </Html>
    </group>
  );
}

// twinkling starfield (dark mode), parallax with cursor
export function Starfield({ count = 600, visible = true }: { count?: number; visible?: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const mref = useRef<THREE.ShaderMaterial>(null);
  const mouse = useRef(new THREE.Vector2());
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 22 - 2;
      pos[i * 3 + 2] = -8 - Math.random() * 22;
      seed[i] = Math.random();
      size[i] = 0.5 + Math.random() * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    return g;
  }, [count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uMouse: { value: new THREE.Vector2() } }), []);
  useFrame((state) => {
    if (!mref.current) return;
    mref.current.uniforms.uTime.value = state.clock.elapsedTime;
    mouse.current.lerp(state.pointer, 0.03);
    mref.current.uniforms.uMouse.value.copy(mouse.current);
  });
  if (!visible) return null;
  return (
    <points ref={ref} geometry={geo}>
      <shaderMaterial
        ref={mref}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`uniform float uTime;uniform vec2 uMouse;attribute float aSeed;attribute float aSize;varying float vT;
          void main(){vec3 p=position;p.x+=uMouse.x*1.2*(0.3+aSeed);p.y+=uMouse.y*0.6;vT=0.4+0.6*sin(uTime*(1.0+aSeed*2.0)+aSeed*40.0);
          vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=aSize*(220.0/-mv.z);gl_Position=projectionMatrix*mv;}`}
        fragmentShader={`varying float vT;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;gl_FragColor=vec4(vec3(0.9,0.94,1.0),smoothstep(0.5,0.0,d)*vT);}`}
      />
    </points>
  );
}

// drifting soft mist / "air"
export function Mist({ count = 120, color = "#bcd0e8" }: { count?: number; color?: string }) {
  const mref = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = Math.random() * 8 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } }), [color]);
  useFrame((s) => { if (mref.current) mref.current.uniforms.uTime.value = s.clock.elapsedTime; });
  return (
    <points geometry={geo}>
      <shaderMaterial
        ref={mref}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`uniform float uTime;attribute float aSeed;varying float vA;
          void main(){vec3 p=position;p.x+=sin(uTime*0.1+aSeed*10.0)*1.5;p.y+=cos(uTime*0.08+aSeed*8.0)*0.5;
          vA=0.06+0.05*sin(uTime*0.5+aSeed*20.0);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=(120.0+aSeed*180.0)*(1.0/-mv.z)*120.0;gl_Position=projectionMatrix*mv;}`}
        fragmentShader={`uniform vec3 uColor;varying float vA;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;gl_FragColor=vec4(uColor,smoothstep(0.5,0.0,d)*vA);}`}
      />
    </points>
  );
}

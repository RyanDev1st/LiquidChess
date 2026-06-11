"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";

// Shared dissolve uniforms — one object, updated once per frame, referenced by
// every injected material so they reveal in lock-step.
function makeUniforms() {
  return {
    uProgress: { value: 0 },
    uEdge: { value: 0.07 },
    uFreq: { value: 4.2 },
    uEdgeColor: { value: new THREE.Color("#ffcf6a") },
  };
}
type DissolveUniforms = ReturnType<typeof makeUniforms>;

const NOISE_GLSL = /* glsl */ `
  vec3 hash3(vec3 p){
    p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
    return fract(sin(p)*43758.5453123);
  }
  float vnoise(vec3 p){
    vec3 i = floor(p); vec3 f = fract(p);
    vec3 u = f*f*(3.0-2.0*f);
    float n000 = hash3(i+vec3(0,0,0)).x; float n100 = hash3(i+vec3(1,0,0)).x;
    float n010 = hash3(i+vec3(0,1,0)).x; float n110 = hash3(i+vec3(1,1,0)).x;
    float n001 = hash3(i+vec3(0,0,1)).x; float n101 = hash3(i+vec3(1,0,1)).x;
    float n011 = hash3(i+vec3(0,1,1)).x; float n111 = hash3(i+vec3(1,1,1)).x;
    return mix(mix(mix(n000,n100,u.x),mix(n010,n110,u.x),u.y),
               mix(mix(n001,n101,u.x),mix(n011,n111,u.x),u.y), u.z);
  }
`;

// Inject a noise-threshold dissolve + glowing edge into a MeshStandardMaterial.
function applyDissolve(mat: THREE.MeshStandardMaterial, uni: DissolveUniforms): THREE.MeshStandardMaterial {
  const m = mat.clone();
  m.transparent = true;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uProgress = uni.uProgress;
    shader.uniforms.uEdge = uni.uEdge;
    shader.uniforms.uFreq = uni.uFreq;
    shader.uniforms.uEdgeColor = uni.uEdgeColor;

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n varying vec3 vDisPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n vDisPos = position;");

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\n varying vec3 vDisPos;\n uniform float uProgress; uniform float uEdge; uniform float uFreq; uniform vec3 uEdgeColor; float vEdge;\n ${NOISE_GLSL}`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
         float dn = vnoise(vDisPos * uFreq);
         if (dn > uProgress) discard;
         vEdge = smoothstep(uProgress - uEdge, uProgress, dn);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>\n totalEmissiveRadiance += uEdgeColor * vEdge * 4.0;`,
      );
  };
  m.needsUpdate = true;
  return m;
}

function DissolvePieces({ uni }: { uni: DissolveUniforms }) {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);

  const pieces = useMemo(() => {
    const c = scene.clone(true);
    const get = (n: string) => c.getObjectByName(n) as THREE.Object3D | undefined;
    (["King", "Queen", "Mic"] as const).forEach((name) => {
      const o = get(name);
      o?.position.set(0, 0, 0);
      o?.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.material = applyDissolve(mesh.material as THREE.MeshStandardMaterial, uni);
          mesh.frustumCulled = false;
        }
      });
    });
    return { king: get("King"), queen: get("Queen"), mic: get("Mic") };
  }, [scene, uni]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, state.pointer.x * 0.28, 3, d);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -state.pointer.y * 0.1, 3, d);
      group.current.position.y = Math.sin(t * 0.6) * 0.025;
    }
  });

  return (
    <group ref={group}>
      <group position={[-0.9, 0, 0.3]} rotation={[0, 0.28, 0]}>{pieces.king && <primitive object={pieces.king} />}</group>
      <group position={[0.95, 0, -0.1]} rotation={[0, -0.4, 0]}>{pieces.queen && <primitive object={pieces.queen} />}</group>
      <group position={[1.85, 0.5, 0.15]} rotation={[0, -0.3, 0]}>{pieces.mic && <primitive object={pieces.mic} />}</group>
    </group>
  );
}

// Gold dust that converges to each piece's surface and fades as the solid forms.
const dustVert = /* glsl */ `
  uniform float uProgress; uniform float uTime; uniform float uSize;
  attribute vec3 aScatter; attribute float aSeed;
  varying float vA;
  float easeOut(float t){ return 1.0 - pow(1.0 - t,3.0); }
  void main(){
    float e = easeOut(clamp(uProgress*1.15 - aSeed*0.2, 0.0, 1.0));
    vec3 p = mix(aScatter, position, e);
    p.x += sin(uTime*0.9 + aSeed*30.0)*0.01*(1.0-e);
    // fade in as they fly, then out as the solid takes over
    vA = smoothstep(0.0,0.3,e) * (1.0 - smoothstep(0.78,1.0,uProgress));
    vec4 mv = modelViewMatrix * vec4(p,1.0);
    gl_PointSize = uSize * (1.0/-mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const dustFrag = /* glsl */ `
  uniform vec3 uColor; varying float vA;
  void main(){
    float d = length(gl_PointCoord-0.5);
    if(d>0.5) discard;
    gl_FragColor = vec4(uColor, smoothstep(0.5,0.0,d)*vA*0.9);
  }
`;

function EdgeDust({ uni }: { uni: DissolveUniforms }) {
  const { scene } = useGLTF(MODEL_URL);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const c = scene.clone(true);
    const offs: Record<string, THREE.Vector3> = {
      King: new THREE.Vector3(-0.9, 0, 0.3),
      Queen: new THREE.Vector3(0.95, 0, -0.1),
    };
    const target: number[] = [];
    (["King", "Queen"] as const).forEach((name) => {
      const o = c.getObjectByName(name);
      if (!o) return;
      o.updateWorldMatrix(true, true);
      o.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (!mesh.isMesh) return;
        const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
        const v = new THREE.Vector3();
        const step = Math.max(1, Math.floor(pos.count / 4000));
        for (let i = 0; i < pos.count; i += step) {
          v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).add(offs[name]);
          target.push(v.x, v.y, v.z);
        }
      });
    });
    const n = target.length / 3;
    const scatter = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = 3 + Math.random() * 4;
      const th = Math.random() * 6.283;
      const ph = Math.acos(2 * Math.random() - 1);
      scatter[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      scatter[i * 3 + 1] = Math.abs(Math.cos(ph) * r) * 0.7 + 0.4;
      scatter[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(target), 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [scene]);

  const uniforms = useMemo(
    () => ({ uProgress: uni.uProgress, uTime: { value: 0 }, uSize: { value: 11 }, uColor: { value: new THREE.Color("#e6c25a") } }),
    [uni],
  );

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={dustVert} fragmentShader={dustFrag} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Scene() {
  const uni = useMemo(makeUniforms, []);
  useFrame((_, delta) => {
    uni.uProgress.value = Math.min(1.0, uni.uProgress.value + delta / 2.8);
  });
  return (
    <>
      <color attach="background" args={["#08070a"]} />
      <fog attach="fog" args={["#08070a", 7, 18]} />
      <ambientLight intensity={0.28} color="#efe6d2" />
      <directionalLight position={[3, 6, 4]} intensity={1.3} color="#fff3e2" />
      <directionalLight position={[5, 3, -5]} intensity={1.7} color="#cfe0ff" />
      <spotLight position={[1, 2, -3]} angle={0.8} penumbra={1} intensity={1.8} color="#c9a84c" />
      <Environment preset="city" />
      <DissolvePieces uni={uni} />
      <EdgeDust uni={uni} />
    </>
  );
}

export function DissolveHero() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.85, 4.8], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.18 }}
        dpr={[1, 1.5]}
        onCreated={({ camera }) => camera.lookAt(0, 0.6, 0)}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#08070a]/85 via-transparent to-transparent" />
    </div>
  );
}

useGLTF.preload(MODEL_URL);

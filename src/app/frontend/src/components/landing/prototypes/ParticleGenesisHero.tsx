"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";
const TARGET_PER_PIECE = 9000;

const vertexShader = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uSize;
  attribute vec3 aScatter;
  attribute float aSeed;
  varying float vGlow;

  float easeOut(float t){ return 1.0 - pow(1.0 - t, 3.0); }

  void main() {
    float e = easeOut(clamp(uProgress - aSeed * 0.25, 0.0, 1.0));
    vec3 p = mix(aScatter, position, e);

    // idle drift once assembled
    float drift = 0.018 * e;
    p.x += sin(uTime * 0.8 + aSeed * 30.0) * drift;
    p.y += cos(uTime * 0.7 + aSeed * 22.0) * drift;
    p.z += sin(uTime * 0.9 + aSeed * 17.0) * drift;

    // cursor repel
    vec2 d = p.xy - uMouse;
    float dl = length(d);
    if (dl < 0.9) p.xy += normalize(d) * (0.9 - dl) * 0.4 * e;

    vGlow = 0.55 + 0.45 * sin(uTime * 2.0 + aSeed * 40.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (1.0 / -mv.z) * (0.5 + e * 0.5);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor * (0.6 + vGlow), a * 0.9);
  }
`;

function sampleVertices(obj: THREE.Object3D, count: number, offset: THREE.Vector3): number[] {
  obj.updateWorldMatrix(true, true);
  const pts: THREE.Vector3[] = [];
  obj.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).add(offset);
      pts.push(v.clone());
    }
  });
  // even thinning to `count`
  const out: number[] = [];
  const step = Math.max(1, Math.floor(pts.length / count));
  for (let i = 0; i < pts.length && out.length < count * 3; i += step) {
    out.push(pts[i].x, pts[i].y, pts[i].z);
  }
  return out;
}

function ParticleField() {
  const { scene } = useGLTF(MODEL_URL);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const mouse = useRef(new THREE.Vector2(99, 99));

  const geometry = useMemo(() => {
    const c = scene.clone(true);
    const king = c.getObjectByName("King");
    const queen = c.getObjectByName("Queen");
    const targets: number[] = [];
    if (king) targets.push(...sampleVertices(king, TARGET_PER_PIECE, new THREE.Vector3(-0.9, 0, 0.2)));
    if (queen) targets.push(...sampleVertices(queen, TARGET_PER_PIECE, new THREE.Vector3(0.95, 0, -0.1)));

    const n = targets.length / 3;
    const position = new Float32Array(targets);
    const scatter = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // scatter from a wide dome so they sweep in
      const r = 4 + Math.random() * 5;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      scatter[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      scatter[i * 3 + 1] = Math.abs(Math.cos(ph) * r) * 0.8 + 0.5;
      scatter[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(position, 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [scene]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(99, 99) },
      uSize: { value: 14 },
      uColor: { value: new THREE.Color("#e6c25a") },
    }),
    [],
  );

  useFrame((state, delta) => {
    const u = matRef.current?.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;
    u.uProgress.value = Math.min(1, u.uProgress.value + delta / 2.6); // ~2.6s assemble
    mouse.current.set(state.pointer.x * viewport.width * 0.5, 0.6 + state.pointer.y * viewport.height * 0.5);
    u.uMouse.value.lerp(mouse.current, 0.1);
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#08070a"]} />
      <fog attach="fog" args={["#08070a", 8, 20]} />
      <ambientLight intensity={0.3} />
      <Environment preset="night" />
      <ParticleField />
    </>
  );
}

export function ParticleGenesisHero() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.9, 5.4], fov: 44, near: 0.1, far: 100 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
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

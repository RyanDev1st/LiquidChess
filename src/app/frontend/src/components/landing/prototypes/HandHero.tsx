"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chess-hero.glb";

function useCheckerTexture() {
  return useMemo(() => {
    const n = 8;
    const px = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = px;
    const ctx = cv.getContext("2d")!;
    const s = px / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const light = (x + y) % 2 === 0;
        ctx.fillStyle = light ? "#d8c486" : "#15110d";
        ctx.fillRect(x * s, y * s, s, s);
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
}

function Diorama() {
  const { scene: gltf } = useGLTF(MODEL_URL);
  const checker = useCheckerTexture();
  const dio = useRef<THREE.Group>(null);
  const kingRef = useRef<THREE.Group>(null);
  const queenRef = useRef<THREE.Group>(null);
  const micRef = useRef<THREE.Group>(null);
  const highlightRef = useRef<THREE.Mesh>(null);
  const pointer = useRef(new THREE.Vector2());
  const drag = useRef({ active: false, x: 0, y: 0, yaw: 0, pitch: 0 });
  const gyro = useRef({ x: 0, y: 0 });
  const t0 = useRef<number | null>(null);

  const pieces = useMemo(() => {
    const c = gltf.clone(true);
    const get = (n: string) => {
      const o = c.getObjectByName(n);
      o?.position.set(0, 0, 0);
      o?.traverse((m) => ((m as THREE.Mesh).isMesh) && ((m as THREE.Mesh).frustumCulled = false));
      return o;
    };
    return { king: get("King"), queen: get("Queen"), mic: get("Mic") };
  }, [gltf]);

  // piece resting spots on the board
  const spots = useMemo(
    () => ({
      king: new THREE.Vector3(-0.7, 0, 0.5),
      queen: new THREE.Vector3(0.6, 0, -0.3),
      mic: new THREE.Vector3(1.4, 0, 0.6),
    }),
    [],
  );
  const hover = useRef<{ king: number; queen: number; mic: number }>({ king: 0, queen: 0, mic: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      if (drag.current.active) {
        drag.current.yaw += (e.clientX - drag.current.x) * 0.005;
        drag.current.pitch = THREE.MathUtils.clamp(drag.current.pitch + (e.clientY - drag.current.y) * 0.003, -0.3, 0.5);
        drag.current.x = e.clientX;
        drag.current.y = e.clientY;
      }
    };
    const onDown = (e: PointerEvent) => {
      drag.current.active = true;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
    };
    const onUp = () => (drag.current.active = false);
    const onGyro = (e: DeviceOrientationEvent) => {
      gyro.current.x = THREE.MathUtils.clamp((e.gamma ?? 0) / 45, -1, 1);
      gyro.current.y = THREE.MathUtils.clamp((e.beta ?? 0) / 45 - 1, -1, 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("deviceorientation", onGyro);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("deviceorientation", onGyro);
    };
  }, []);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (t0.current === null) t0.current = t;
    const since = t - t0.current;

    // diorama tilt: cursor + gyro + drag-orbit
    if (dio.current) {
      const tiltX = -pointer.current.y * 0.25 - gyro.current.y * 0.3 + drag.current.pitch;
      const tiltY = pointer.current.x * 0.4 + gyro.current.x * 0.4 + drag.current.yaw;
      dio.current.rotation.x = THREE.MathUtils.damp(dio.current.rotation.x, 0.35 + tiltX, 4, d);
      dio.current.rotation.y = THREE.MathUtils.damp(dio.current.rotation.y, tiltY, 4, d);
    }

    // enter: pieces drop onto the board with a settle
    const drops: Array<[React.RefObject<THREE.Group>, THREE.Vector3, keyof typeof hover.current, number]> = [
      [kingRef, spots.king, "king", 0],
      [queenRef, spots.queen, "queen", 0.12],
      [micRef, spots.mic, "mic", 0.24],
    ];
    drops.forEach(([r, spot, key, delay]) => {
      const g = r.current;
      if (!g) return;
      const p = THREE.MathUtils.clamp((since - delay) / 0.9, 0, 1);
      const drop = (1 - p) * (1 - p) * 4; // falls from +4
      // hover proximity in screen space (approx via x)
      const sx = (spot.x + (dio.current?.rotation.y ?? 0)) * 0.3;
      const want = Math.abs(pointer.current.x - sx) < 0.28 ? 1 : 0;
      hover.current[key] = THREE.MathUtils.damp(hover.current[key], want, 6, d);
      g.position.set(spot.x, spot.y + drop + hover.current[key] * 0.25 + Math.sin(t + delay) * 0.01, spot.z);
    });

    // highlight square under the most-hovered piece
    if (highlightRef.current) {
      const entries = Object.entries(hover.current).sort((a, b) => b[1] - a[1]);
      const [topKey, topVal] = entries[0] as [keyof typeof hover.current, number];
      const spot = spots[topKey];
      highlightRef.current.position.set(spot.x, 0.011, spot.z);
      (highlightRef.current.material as THREE.MeshBasicMaterial).opacity = topVal * 0.5;
    }
  });

  return (
    <group ref={dio} rotation={[0.35, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial map={checker} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh ref={highlightRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]}>
        <planeGeometry args={[0.62, 0.62]} />
        <meshBasicMaterial color="#ffcf6a" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={kingRef}>{pieces.king && <primitive object={pieces.king} />}</group>
      <group ref={queenRef}>{pieces.queen && <primitive object={pieces.queen} />}</group>
      <group ref={micRef}>{pieces.mic && <primitive object={pieces.mic} />}</group>
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#0b0908"]} />
      <ambientLight intensity={0.4} color="#efe6d2" />
      <directionalLight position={[3, 7, 4]} intensity={1.4} color="#fff3e2" castShadow />
      <directionalLight position={[-4, 4, -4]} intensity={0.9} color="#cfe0ff" />
      <Environment preset="city" />
      <Diorama />
    </>
  );
}

export function HandHero() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 2.6, 4.4], fov: 40, near: 0.1, far: 100 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        dpr={[1, 1.5]}
        shadows
        onCreated={({ camera }) => camera.lookAt(0, 0.2, 0)}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b0908]/80 via-transparent to-transparent" />
    </div>
  );
}

useGLTF.preload(MODEL_URL);

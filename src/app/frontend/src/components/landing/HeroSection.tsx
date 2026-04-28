"use client";

import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useFBX, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";

interface VideoFrameData {
  id: number;
  x: number;
  startZ: number;
  rotation: number;
}

const generateFrames = (): VideoFrameData[] =>
  Array.from({ length: 6 }, (_, i) => ({
    id: i,
    x: (i % 3 - 1) * 25,
    startZ: -80 - i * 30,
    rotation: (Math.random() - 0.5) * 10,
  }));

function ChessScene() {
  const fbxSource = useFBX("/models/chess-pieces.fbx");
  const colorTex = useLoader(THREE.TextureLoader, "/models/Color.jpg");
  const normalTex = useLoader(THREE.TextureLoader, "/models/Normal.jpg");

  const groupRef = useRef<THREE.Group>(null);
  const kingRef = useRef<THREE.Group>(null);
  const queenRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current || !fbxSource) return;

    while (groupRef.current.children.length > 0) {
      const child = groupRef.current.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      groupRef.current.remove(child);
    }

    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.flipY = false;
    normalTex.flipY = false;

    const clone = fbxSource.clone(true);

    const rawBox = new THREE.Box3().setFromObject(clone);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);
    const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);
    const scaleFactor = 3.5 / maxDim;
    clone.scale.setScalar(scaleFactor);

    const scaledBox = new THREE.Box3().setFromObject(clone);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    clone.position.set(-scaledCenter.x, -scaledCenter.y - 0.15, -scaledCenter.z);
    clone.rotation.x = 0;

    let kingFound = false;
    let queenFound = false;
    let kingMinY = 0;
    let queenMinY = 0;

    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const b = new THREE.Box3().setFromBufferAttribute(
        obj.geometry.attributes.position as THREE.BufferAttribute
      );
      const centerY = (b.min.y + b.max.y) / 2;
      if (centerY < 0 && !kingFound) {
        kingFound = true;
        kingMinY = b.min.y;
      }
      if (centerY > 0 && !queenFound) {
        queenFound = true;
        queenMinY = b.min.y;
      }
    });

    const kingGroup = new THREE.Group();
    const queenGroup = new THREE.Group();
    const baseY = Math.min(kingMinY, queenMinY);

    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const b = new THREE.Box3().setFromBufferAttribute(
        obj.geometry.attributes.position as THREE.BufferAttribute
      );
      const centerY = (b.min.y + b.max.y) / 2;
      const targetGroup = centerY < 0 ? kingGroup : queenGroup;

      const material = new THREE.MeshStandardMaterial({
        map: colorTex,
        normalMap: normalTex,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.15,
        metalness: 0.95,
        envMapIntensity: 1.3,
        color: "#f8f8f8",
      });

      const mesh = new THREE.Mesh(obj.geometry, material);
      mesh.position.copy(obj.position);
      mesh.rotation.copy(obj.rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      targetGroup.add(mesh);
    });

    kingGroup.position.set(-1.8, 0, 0);
    queenGroup.position.set(1.8, 0, 0);

    kingRef.current = kingGroup;
    queenRef.current = queenGroup;

    groupRef.current.add(kingGroup);
    groupRef.current.add(queenGroup);

  }, [fbxSource, colorTex, normalTex]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const t = performance.now() * 0.001;

    groupRef.current.rotation.y = Math.sin(t * 0.12) * 0.015;

    if (kingRef.current) {
      kingRef.current.position.y = Math.sin(t * 0.6) * 0.008;
    }
    if (queenRef.current) {
      queenRef.current.position.y = Math.sin(t * 0.5 + 0.8) * 0.006;
    }
  });

  return <group ref={groupRef} />;
}

function Platform() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2.05, 0]}
      receiveShadow
    >
      <cylinderGeometry args={[3.2, 3.5, 0.12, 64]} />
      <meshStandardMaterial
        color="#0a0a0a"
        metalness={1.0}
        roughness={0.02}
        envMapIntensity={2.0}
      />
    </mesh>
  );
}

function RimLight() {
  return (
    <spotLight
      position={[0, 2, -3.5]}
      angle={0.5}
      penumbra={1.2}
      intensity={3.0}
      color="#c9a84c"
      castShadow
    />
  );
}

function BackRim() {
  return (
    <spotLight
      position={[0, 4, 3]}
      angle={0.7}
      penumbra={0.8}
      intensity={1.2}
      color="#ffffff"
    />
  );
}

function SceneContent({ scrollProgress }: { scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const separation = scrollProgress * 5.5;
    const scaleQueen = 1.0 + scrollProgress * 0.3;
    const depthOffset = scrollProgress * -1.2;
    const liftAmount = scrollProgress * 0.4;

    if (groupRef.current.children[0]) {
      const kingGroup = groupRef.current.children[0] as THREE.Group;
      kingGroup.position.x = -separation;
      kingGroup.position.y = liftAmount * 0.2;
    }
    if (groupRef.current.children[1]) {
      const queenGroup = groupRef.current.children[1] as THREE.Group;
      queenGroup.position.x = separation;
      queenGroup.position.z = depthOffset;
      queenGroup.scale.setScalar(scaleQueen);
      queenGroup.position.y = liftAmount;
    }
  });

  return (
    <group ref={groupRef}>
      <fog attach="fog" args={["#080808", 12, 35]} />

      <ambientLight intensity={0.1} color="#e8e0d0" />

      <directionalLight
        position={[3, 5, 2]}
        intensity={1.0}
        color="#fff5e8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      <BackRim />
      <RimLight />

      <pointLight
        position={[-3, 1, 2]}
        intensity={0.4}
        color="#a8c8e8"
      />

      <pointLight
        position={[3, 0, 2]}
        intensity={0.5}
        color="#e4c87a"
      />

      <Environment preset="city" background={false} />

      <ContactShadows
        position={[0, -2.06, 0]}
        opacity={0.95}
        scale={5.5}
        blur={1.2}
        far={4}
      />

      <Platform />
      <ChessScene />
    </group>
  );
}

function StreamVideoFrame({ frame }: { frame: VideoFrameData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let raf: number;
    let z = frame.startZ;
    const speed = 0.2;

    const animate = () => {
      if (!paused) {
        z += speed;
        if (z > 100) z = frame.startZ;
        const opacity = Math.min(1, Math.max(0, (z + 50) / 50));
        const scale = Math.min(1.1, 0.4 + (z + 50) / 180);
        if (ref.current) {
          ref.current.style.transform = `translateX(-50%) translateZ(${z}px) rotateY(${frame.rotation}deg) scale(${scale})`;
          ref.current.style.opacity = String(opacity * 0.35);
        }
      }
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [frame, paused]);

  const handleMouseEnter = () => {
    setHovered(true);
    setPaused(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setPaused(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.muted = true;
    }
  };

  return (
    <div
      ref={ref}
      className="absolute left-1/2 top-1/2 w-28 cursor-pointer"
      style={{
        transform: `translateX(-50%) translateZ(${frame.startZ}px)`,
        marginTop: `${frame.x}px`,
        willChange: "transform, opacity",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`relative rounded-lg overflow-hidden border transition-all duration-300 ${
          hovered ? "border-[--gold]/40 shadow-[0_0_15px_rgba(201,168,76,0.15)]" : "border-white/10"
        }`}
      >
        <video
          ref={videoRef}
          src="/videos/placeholder.mp4"
          className="w-full aspect-video object-cover"
          muted
          playsInline
          loop
          preload="metadata"
        />
        {!hovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-white/50 ml-0.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function HeroSection({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  const frames = useMemo(() => generateFrames(), []);
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const scrollTop = el.scrollTop;
      const heroHeight = window.innerHeight;
      const progress = Math.min(1, Math.max(0, scrollTop / heroHeight));
      setScrollProgress(progress);
    };

    const el = containerRef.current;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  void containerRef;

  if (!mounted) return null;

  return (
    <div id="hero" className="snap-section flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/60" />

      <div
        className="absolute inset-0 overflow-hidden mix-blend-screen"
        style={{ perspective: "2000px", perspectiveOrigin: "50% 50% -300px", opacity: 0.3 }}
      >
        {frames.map((frame) => (
          <StreamVideoFrame key={frame.id} frame={frame} />
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <Suspense fallback={null}>
          <Canvas
            camera={{
              position: [0, -0.5, 5.5],
              fov: 35,
              near: 0.1,
              far: 100
            }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
              stencil: false,
              depth: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.1,
            }}
            style={{ background: "transparent" }}
            dpr={[1, 1.5]}
            shadows
          >
            <SceneContent scrollProgress={scrollProgress} />
          </Canvas>
        </Suspense>
      </div>

      <div className="relative z-20 text-center px-6 pointer-events-none">
        <div className="mb-4">
          <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.5em] text-[--gold]/80 mb-3">
            AI Commentary Engine
          </p>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-4">
          The Game{" "}
          <span
            className="font-serif italic font-normal"
            style={{
              background: "linear-gradient(135deg,#c9a84c,#e4c87a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px rgba(201,168,76,0.6))",
            }}
          >
            Speaks
          </span>
        </h1>
        <p className="text-white/60 text-base md:text-lg font-light max-w-md mx-auto leading-relaxed">
          Real-time AI commentary that transforms every move into a moment.
        </p>
      </div>
    </div>
  );
}

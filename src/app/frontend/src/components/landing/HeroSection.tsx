"use client";

import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useFBX, Environment, ContactShadows, Float } from "@react-three/drei";
import * as THREE from "three";

interface VideoFrameData {
  id: number;
  x: number;
  startZ: number;
  rotation: number;
}

const generateFrames = (): VideoFrameData[] =>
  Array.from({ length: 4 }, (_, i) => ({
    id: i,
    x: (i % 2 - 0.5) * 30,
    startZ: -100 - i * 40,
    rotation: (Math.random() - 0.5) * 8,
  }));

function ChessScene() {
  const fbxSource = useFBX("/models/chess-pieces.fbx");
  const colorTex = useLoader(THREE.TextureLoader, "/models/Color.jpg");
  const normalTex = useLoader(THREE.TextureLoader, "/models/Normal.jpg");

  const groupRef = useRef<THREE.Group>(null);
  const kingRef = useRef<THREE.Mesh>(null);
  const queenRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

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
    const scaleFactor = 3.8 / maxDim;
    clone.scale.setScalar(scaleFactor);

    const scaledBox = new THREE.Box3().setFromObject(clone);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    clone.position.set(-scaledCenter.x, -scaledCenter.y, -scaledCenter.z);
    clone.rotation.x = 0;

    let kingBounds = { min: 0, max: 0 };
    let queenBounds = { min: 0, max: 0 };
    let kingFound = false;
    let queenFound = false;

    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const b = new THREE.Box3().setFromBufferAttribute(
        obj.geometry.attributes.position as THREE.BufferAttribute
      );
      const centerY = (b.min.y + b.max.y) / 2;
      if (!kingFound || !queenFound) {
        if (centerY < 0 && !kingFound) {
          kingBounds = { min: b.min.x, max: b.max.x };
          kingFound = true;
        } else if (centerY > 0 && !queenFound) {
          queenBounds = { min: b.min.x, max: b.max.x };
          queenFound = true;
        }
      }
    });

    let useYSplit = false;
    if (!kingFound || !queenFound) {
      useYSplit = true;
    }

    const kingGroup = new THREE.Group();
    const queenGroup = new THREE.Group();

    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const geo = obj.geometry;
      const pos = geo.attributes.position;

      let isKing = false;
      if (useYSplit) {
        const b = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);
        const centerY = (b.min.y + b.max.y) / 2;
        isKing = centerY < 0;
      } else {
        const b = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);
        isKing = (b.min.x + b.max.x) / 2 < (kingBounds.max + queenBounds.min) / 2;
      }

      const material = new THREE.MeshStandardMaterial({
        map: colorTex,
        normalMap: normalTex,
        normalScale: new THREE.Vector2(1.0, 1.0),
        roughness: isKing ? 0.3 : 0.25,
        metalness: isKing ? 0.9 : 0.95,
        envMapIntensity: 1.0,
        vertexColors: false,
      });

      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (isKing) {
        kingGroup.add(mesh);
      } else {
        queenGroup.add(mesh);
      }
    });

    kingGroup.position.set(-1.5, 0, 0);
    queenGroup.position.set(1.5, 0, 0);

    if (kingGroup.children[0]) {
      const mesh = kingGroup.children[0] as THREE.Mesh;
      kingRef.current = mesh;
    }
    if (queenGroup.children[0]) {
      const mesh = queenGroup.children[0] as THREE.Mesh;
      queenRef.current = mesh;
    }

    groupRef.current.add(kingGroup);
    groupRef.current.add(queenGroup);

  }, [fbxSource, colorTex, normalTex]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    groupRef.current.position.y = Math.sin(t * 0.4) * 0.05;
    groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.03;

    if (kingRef.current) {
      kingRef.current.position.y = Math.sin(t * 0.5 + 0.3) * 0.02;
      kingRef.current.rotation.y = Math.sin(t * 0.3) * 0.015;
    }
    if (queenRef.current) {
      queenRef.current.position.y = Math.sin(t * 0.45 + 0.8) * 0.018;
      queenRef.current.rotation.y = Math.sin(t * 0.28 + 1.0) * 0.012;
    }
  });

  return <group ref={groupRef} />;
}

function Platform() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.9, 0]} receiveShadow>
      <cylinderGeometry args={[2.5, 2.8, 0.15, 32]} />
      <meshStandardMaterial
        color="#1a1a1a"
        metalness={0.9}
        roughness={0.1}
        envMapIntensity={1.0}
      />
    </mesh>
  );
}

function SceneContent({ scrollProgress }: { scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const separation = scrollProgress * 3.0;
    const scaleQueen = 1.0 + scrollProgress * 0.15;
    const depthOffset = scrollProgress * -0.5;

    if (groupRef.current.children[0]) {
      (groupRef.current.children[0] as THREE.Group).position.x = -separation;
    }
    if (groupRef.current.children[1]) {
      const queenGroup = groupRef.current.children[1] as THREE.Group;
      queenGroup.position.x = separation;
      queenGroup.position.z = depthOffset;
      queenGroup.scale.setScalar(scaleQueen);
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.3} color="#e8e0d0" />

      <directionalLight
        position={[5, 8, 5]}
        intensity={1.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <spotLight
        position={[0, -2, -4]}
        angle={0.8}
        penumbra={0.9}
        intensity={2.0}
        color="#c9a84c"
        castShadow
      />

      <pointLight
        position={[-4, 3, 2]}
        intensity={0.6}
        color="#a8c8e8"
      />

      <pointLight
        position={[4, 2, 3]}
        intensity={0.7}
        color="#e4c87a"
      />

      <Environment preset="city" background={false} />

      <ContactShadows
        position={[0, -1.98, 0]}
        opacity={0.8}
        scale={4}
        blur={2}
        far={3}
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
    const speed = 0.35;

    const animate = () => {
      if (!paused) {
        z += speed;
        if (z > 120) z = frame.startZ;
        const opacity = Math.min(1, Math.max(0, (z + 80) / 60));
        const scale = Math.min(1.15, 0.5 + (z + 80) / 240);
        if (ref.current) {
          ref.current.style.transform = `translateX(-50%) translateZ(${z}px) rotateY(${frame.rotation}deg) scale(${scale})`;
          ref.current.style.opacity = String(opacity * 0.6);
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
      className="absolute left-1/2 top-1/2 w-36 cursor-pointer"
      style={{
        transform: `translateX(-50%) translateZ(${frame.startZ}px)`,
        marginTop: `${frame.x}px`,
        willChange: "transform, opacity",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`relative rounded-xl overflow-hidden border transition-all duration-300 ${
          hovered ? "border-[--gold]/60 shadow-[0_0_25px_rgba(201,168,76,0.25)]" : "border-white/8"
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
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-white/50 ml-0.5" />
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.05)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ perspective: "1200px", perspectiveOrigin: "50% 50%" }}
      >
        {frames.map((frame) => (
          <StreamVideoFrame key={frame.id} frame={frame} />
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: "1500px" }}>
        <Suspense fallback={null}>
          <Canvas
            camera={{
              position: [0, 1.0, 7],
              fov: 42,
              near: 0.1,
              far: 100
            }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
              stencil: false,
              depth: true,
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
          <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.5em] text-[--gold]/60 mb-3">
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
              filter: "drop-shadow(0 0 20px rgba(201,168,76,0.4))",
            }}
          >
            Speaks
          </span>
        </h1>
        <p className="text-white/40 text-base md:text-lg font-light max-w-md mx-auto leading-relaxed">
          Real-time AI commentary that transforms every move into a moment.
        </p>
      </div>
    </div>
  );
}

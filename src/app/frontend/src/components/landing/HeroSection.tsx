"use client";

import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useFBX, Environment, ContactShadows } from "@react-three/drei";
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

    // Clean up previous meshes
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

    // Texture setup
    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.flipY = false;
    normalTex.flipY = false;

    const clone = fbxSource.clone(true);

    // Scale to consistent size
    const rawBox = new THREE.Box3().setFromObject(clone);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);
    const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);
    const scaleFactor = 4.5 / maxDim;
    clone.scale.setScalar(scaleFactor);

    // Center and tilt
    const scaledBox = new THREE.Box3().setFromObject(clone);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    clone.position.set(-scaledCenter.x, -scaledCenter.y - 0.2, -scaledCenter.z);
    clone.rotation.x = -0.15;

    // Separate King and Queen
    let kingBounds = { min: 0, max: 0 };
    let queenBounds = { min: 0, max: 0 };
    let kingFound = false;
    let queenFound = false;

    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const b = new THREE.Box3().setFromBufferAttribute(
        obj.geometry.attributes.position as THREE.BufferAttribute
      );

      // Identify King (typically lower vertices) vs Queen (higher vertices)
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

    // If bounds not found, fall back to Y-based split
    let useYSplit = false;
    if (!kingFound || !queenFound) {
      useYSplit = true;
    }

    // Build separate meshes
    const kingGroup = new THREE.Group();
    const queenGroup = new THREE.Group();

    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const geo = obj.geometry;
      const pos = geo.attributes.position;

      // Determine piece type
      let isKing = false;
      if (useYSplit) {
        const b = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);
        const centerY = (b.min.y + b.max.y) / 2;
        isKing = centerY < 0;
      } else {
        // Check if mesh belongs to king bounds
        const b = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);
        isKing = (b.min.x + b.max.x) / 2 < (kingBounds.max + queenBounds.min) / 2;
      }

      // Create new material with premium quality
      const material = new THREE.MeshStandardMaterial({
        map: colorTex,
        normalMap: normalTex,
        normalScale: new THREE.Vector2(1.2, 1.2),
        roughness: isKing ? 0.35 : 0.25,
        metalness: isKing ? 0.85 : 0.9,
        envMapIntensity: 1.2,
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

    // Position King (left) and Queen (right)
    kingGroup.position.set(-1.2, 0, 0);
    queenGroup.position.set(1.2, 0, 0);

    // Store refs for animation
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

    // Gentle floating motion
    groupRef.current.position.y = Math.sin(t * 0.5) * 0.08;

    // Subtle rotation
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.06;

    // Micro-bobbing for individual pieces
    if (kingRef.current) {
      kingRef.current.position.y = Math.sin(t * 0.7 + 0.5) * 0.03;
      kingRef.current.rotation.y = Math.sin(t * 0.4) * 0.02;
    }
    if (queenRef.current) {
      queenRef.current.position.y = Math.sin(t * 0.6 + 1.0) * 0.025;
      queenRef.current.rotation.y = Math.sin(t * 0.35 + 1.2) * 0.018;
    }
  });

  return <group ref={groupRef} />;
}

function SceneContent() {
  return (
    <>
      {/* Atmospheric fog for depth */}
      <fog attach="fog" args={["#0a0a0a", 8, 25]} />

      {/* Ambient lighting */}
      <ambientLight intensity={0.4} color="#e8e0d0" />

      {/* Key light - main illumination */}
      <directionalLight
        position={[3, 6, 5]}
        intensity={1.4}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      {/* Rim light - gold accent from back-right */}
      <spotLight
        position={[4, 3, -3]}
        angle={0.6}
        penumbra={0.8}
        intensity={1.8}
        color="#c9a84c"
        castShadow
      />

      {/* Fill light - soft blue from left */}
      <pointLight
        position={[-4, 2, 3]}
        intensity={0.5}
        color="#a8c8e8"
      />

      {/* Gold accent light - front bottom */}
      <pointLight
        position={[0, -1, 4]}
        intensity={0.8}
        color="#e4c87a"
      />

      {/* Subtle overhead spotlight on pieces */}
      <spotLight
        position={[0, 8, 2]}
        angle={0.4}
        penumbra={0.6}
        intensity={0.6}
        color="#fff8f0"
      />

      <Environment preset="city" background={false} />

      {/* Soft contact shadows for grounding */}
      <ContactShadows
        position={[0, -1.85, 0]}
        opacity={0.6}
        scale={8}
        blur={2.5}
        far={4}
      />

      <ChessScene />
    </>
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
    const speed = 0.45;

    const animate = () => {
      if (!paused) {
        z += speed;
        if (z > 200) z = frame.startZ;
        const opacity = Math.min(1, Math.max(0, (z + 120) / 80));
        const scale = Math.min(1.1, 0.55 + (z + 120) / 280);
        if (ref.current) {
          ref.current.style.transform = `translateX(-50%) translateZ(${z}px) rotateY(${frame.rotation}deg) scale(${scale})`;
          ref.current.style.opacity = String(opacity * 0.8);
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
      className="absolute left-1/2 top-1/2 w-40 cursor-pointer"
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
          hovered ? "border-[--gold]/60 shadow-[0_0_30px_rgba(201,168,76,0.3)]" : "border-white/10"
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
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border border-white/40 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-white/60 ml-0.5" />
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

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  void containerRef;

  return (
    <div id="hero" className="snap-section flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.03)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />

      {/* Video frames - very subtle background layer */}
      <div
        className="absolute inset-0 overflow-hidden opacity-30"
        style={{ perspective: "1000px", perspectiveOrigin: "50% 50%" }}
      >
        {frames.map((frame) => (
          <StreamVideoFrame key={frame.id} frame={frame} />
        ))}
      </div>

      {/* 3D Chess models - center stage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Suspense fallback={null}>
          <Canvas
            camera={{ position: [0, 1.2, 10], fov: 35 }}
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
            <SceneContent />
          </Canvas>
        </Suspense>
      </div>

      {/* Hero text */}
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
              filter: "drop-shadow(0 0 20px rgba(201,168,76,0.3))",
            }}
          >
            Speaks
          </span>
        </h1>
        <p className="text-white/35 text-base md:text-lg font-light max-w-md mx-auto leading-relaxed">
          Real-time AI commentary that transforms every move into a moment.
        </p>
      </div>
    </div>
  );
}

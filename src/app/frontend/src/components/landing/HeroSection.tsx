"use client";

import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useFBX, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useScroll } from "framer-motion";

interface VideoFrameData {
  id: number;
  x: number;
  startZ: number;
  rotation: number;
}

const generateFrames = (): VideoFrameData[] =>
  Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: (i % 4 - 1.5) * 22,
    startZ: -120 - i * 30,
    rotation: (Math.random() - 0.5) * 12,
  }));

// Load FBX once and share via ref
function useSharedFBX(path: string) {
  const fbx = useFBX(path);
  return fbx;
}

function ChessPieceInstance({
  fbx,
  leftSide,
  containerRef,
}: {
  fbx: THREE.Group;
  leftSide: boolean;
  containerRef: React.RefObject<HTMLElement>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const modelRef = useRef<THREE.Group | null>(null);
  const targetX = useRef(leftSide ? -1.5 : 1.5);
  const targetZ = useRef(0);
  const targetScale = useRef(1);

  // Clone FBX and apply material once
  useEffect(() => {
    if (modelRef.current || !groupRef.current) return;

    const clone = fbx.clone(true);
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = new THREE.MeshStandardMaterial({
          color: leftSide ? "#141414" : "#1c1a14",
          metalness: leftSide ? 0.85 : 0.75,
          roughness: leftSide ? 0.15 : 0.25,
          envMapIntensity: 1.2,
        });
        obj.castShadow = true;
        obj.receiveShadow = false;
      }
    });

    // Normalize scale
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetHeight = 3;
    clone.scale.setScalar(targetHeight / maxDim);

    // Mirror king (left side)
    if (leftSide) clone.scale.x *= -1;

    // Center geometry
    const center = new THREE.Vector3();
    box.getCenter(center);
    clone.position.sub(center.multiplyScalar(targetHeight / maxDim));
    clone.position.y = -1.5;

    modelRef.current = clone;
    groupRef.current.add(clone);
  }, [fbx, leftSide]);

  // Scroll-driven animation
  const { scrollYProgress } = useScroll({ target: containerRef });

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      const side = leftSide ? -1 : 1;

      if (v < 0.25) {
        // Hero → Trusted: separate pieces outward
        const t = v / 0.25;
        targetX.current = side * (1.5 + 3.5 * t);
        targetZ.current = 0;
        targetScale.current = 1;
      } else if (v < 0.5) {
        // Trusted → Voice Cards: keep flanking
        const t = (v - 0.25) / 0.25;
        targetX.current = side * (5 + 3 * t);
        targetZ.current = -1 * t;
        targetScale.current = leftSide ? 1 : 1 + 0.15 * t; // Queen scales up
      } else {
        // Exit: move off screen
        targetX.current = side * 14;
        targetZ.current = -2;
        targetScale.current = leftSide ? 1 : 1.15;
      }
    });
    return unsubscribe;
  }, [scrollYProgress, leftSide]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;

    // Idle sway
    groupRef.current.rotation.y = Math.sin(timeRef.current * 0.35) * 0.06 + (leftSide ? 0.2 : -0.2);

    // Smooth lerp to targets
    const lerpSpeed = 2 * delta;
    groupRef.current.position.x += (targetX.current - groupRef.current.position.x) * lerpSpeed;
    groupRef.current.position.z += (targetZ.current - groupRef.current.position.z) * lerpSpeed;

    if (modelRef.current) {
      const targetSc = targetScale.current;
      modelRef.current.scale.y += (targetSc - modelRef.current.scale.y) * lerpSpeed;
      modelRef.current.scale.z += (targetSc - modelRef.current.scale.z) * lerpSpeed;
    }
  });

  return <group ref={groupRef} />;
}

function SceneContent({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  const fbx = useSharedFBX("/models/chess-pieces.fbx");
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
      <pointLight position={[-4, 3, 4]} intensity={0.8} color="#c9a84c" />
      <pointLight position={[4, 3, 4]} intensity={0.8} color="#c9a84c" />
      <Environment preset="city" />
      <ChessPieceInstance fbx={fbx} leftSide={true} containerRef={containerRef} />
      <ChessPieceInstance fbx={fbx} leftSide={false} containerRef={containerRef} />
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

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div id="hero" className="snap-section flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.05)_0%,transparent_70%)]" />

      {/* Video frames streaming inward */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ perspective: "800px", perspectiveOrigin: "50% 50%" }}
      >
        {frames.map((frame) => (
          <StreamVideoFrame key={frame.id} frame={frame} />
        ))}
      </div>

      {/* 3D Chess models */}
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          <Canvas
            camera={{ position: [0, 1, 6], fov: 42 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: "transparent" }}
          >
            <SceneContent containerRef={containerRef} />
          </Canvas>
        </Suspense>
      </div>

      {/* Hero text */}
      <div className="relative z-10 text-center px-6 pointer-events-none">
        <p className="text-xs font-mono uppercase tracking-[0.4em] text-[--gold]/70 mb-4">
          AI Commentary Engine
        </p>
        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-4">
          The Game{" "}
          <span
            className="font-serif italic font-normal"
            style={{
              background: "linear-gradient(135deg,#c9a84c,#e4c87a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Speaks
          </span>
        </h1>
        <p className="text-white/40 text-lg font-light max-w-md mx-auto">
          Real-time AI commentary that transforms every move into a moment.
        </p>
      </div>
    </div>
  );
}

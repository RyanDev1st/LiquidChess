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

function ChessScene({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  const fbxSource = useFBX("/models/chess-pieces.fbx");
  const sceneGroupRef = useRef<THREE.Group>(null);
  const pieceRefs = useRef<THREE.Object3D[]>([]);
  const initPosRef = useRef<THREE.Vector3[]>([]);
  const timeRef = useRef(0);
  const offsetsRef = useRef([new THREE.Vector3(), new THREE.Vector3()]);
  const scaleTargets = useRef([1, 1]);

  useEffect(() => {
    if (!sceneGroupRef.current || pieceRefs.current.length > 0) return;

    const clone = fbxSource.clone(true);

    // Shadows only — preserve original FBX materials
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = false;
      }
    });

    // Normalize scale: target height = 5 units
    const rawBox = new THREE.Box3().setFromObject(clone);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);
    const scaleFactor = 5 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    clone.scale.setScalar(scaleFactor);

    // Center after applying scale
    const scaledBox = new THREE.Box3().setFromObject(clone);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    clone.position.sub(scaledCenter);
    clone.position.y -= 1;

    sceneGroupRef.current.add(clone);

    // Find the two chess piece groups: direct non-empty children, sorted left→right by X center
    const candidatePieces = clone.children.filter((child) => {
      const b = new THREE.Box3().setFromObject(child);
      return !b.isEmpty();
    });

    candidatePieces.sort((a, b) => {
      const ca = new THREE.Box3().setFromObject(a).getCenter(new THREE.Vector3());
      const cb = new THREE.Box3().setFromObject(b).getCenter(new THREE.Vector3());
      return ca.x - cb.x;
    });

    if (candidatePieces.length >= 2) {
      pieceRefs.current = [candidatePieces[0], candidatePieces[candidatePieces.length - 1]];
      pieceRefs.current.forEach((p, i) => {
        initPosRef.current[i] = p.position.clone();
      });
    }
  }, [fbxSource]);

  const { scrollYProgress } = useScroll({ target: containerRef });

  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      if (pieceRefs.current.length < 2) return;

      if (v < 0.25) {
        const t = v / 0.25;
        offsetsRef.current[0].set(-3 * t, 0, 0);
        offsetsRef.current[1].set(3 * t, 0, 0);
        scaleTargets.current = [1, 1];
      } else if (v < 0.5) {
        const t = (v - 0.25) / 0.25;
        offsetsRef.current[0].set(-3 - 3 * t, 0, -t);
        offsetsRef.current[1].set(3 + 3 * t, 0, -t);
        // Queen scales up slightly so both appear same visual size when separated
        scaleTargets.current = [1, 1 + 0.15 * t];
      } else {
        offsetsRef.current[0].set(-12, 0, -2);
        offsetsRef.current[1].set(12, 0, -2);
        scaleTargets.current = [1, 1.15];
      }
    });
  }, [scrollYProgress]);

  useFrame((_, delta) => {
    if (!sceneGroupRef.current) return;
    timeRef.current += delta;
    const lerpSpeed = 2 * delta;

    pieceRefs.current.forEach((piece, i) => {
      const init = initPosRef.current[i];
      if (!init) return;
      const offset = offsetsRef.current[i];

      piece.position.x += (init.x + offset.x - piece.position.x) * lerpSpeed;
      piece.position.z += (init.z + offset.z - piece.position.z) * lerpSpeed;

      // Idle sway
      piece.rotation.y = Math.sin(timeRef.current * 0.35 + i * Math.PI) * 0.06 + (i === 0 ? 0.2 : -0.2);

      // Scale (y + z only to avoid disrupting horizontal mirror)
      const st = scaleTargets.current[i];
      piece.scale.y += (st - piece.scale.y) * lerpSpeed;
      piece.scale.z += (st - piece.scale.z) * lerpSpeed;
    });
  });

  return <group ref={sceneGroupRef} />;
}

function SceneContent({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
      <pointLight position={[-4, 3, 4]} intensity={0.8} color="#c9a84c" />
      <pointLight position={[4, 3, 4]} intensity={0.8} color="#c9a84c" />
      <Environment preset="city" />
      <ChessScene containerRef={containerRef} />
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
            camera={{ position: [0, 1, 8], fov: 42 }}
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

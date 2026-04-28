"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useFBX, Environment, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

const PROMO_VIDEO = "/videos/promo.mp4"; // Placeholder path

function CTAModel({ leftSide }: { leftSide: boolean }) {
  const fbx = useFBX("/models/chess-pieces.fbx");
  const groupRef = useRef<THREE.Group>(null);
  const pieceRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!fbx || pieceRef.current) return;
    const children = fbx.children.filter((c) => c instanceof THREE.Group || c instanceof THREE.Mesh) as THREE.Object3D[];
    if (children.length === 0) return;
    const childData = children.map((child) => {
      const box = new THREE.Box3().setFromObject(child);
      const center = box.getCenter(new THREE.Vector3());
      return { child, centerX: center.x };
    });
    childData.sort((a, b) => a.centerX - b.centerX);
    const targetPiece = leftSide ? childData[0] : childData[childData.length - 1];
    if (targetPiece) {
      const piece = targetPiece.child.clone ? targetPiece.child.clone() : targetPiece.child.clone();
      piece.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.material = new THREE.MeshStandardMaterial({
            color: "#1a1a1a",
            metalness: 0.8,
            roughness: 0.2,
          });
          obj.castShadow = true;
        }
      });
      piece.scale.setScalar(0.012);
      pieceRef.current = piece;
      if (groupRef.current) groupRef.current.add(piece);
    }
  }, [fbx, leftSide]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!pieceRef.current) return;
    // Idle bob
    pieceRef.current.position.y = Math.sin(timeRef.current * 0.8) * 0.05;
    // Face center
    const targetRotY = leftSide ? 0.3 : -0.3;
    pieceRef.current.rotation.y += (targetRotY - pieceRef.current.rotation.y) * 2 * delta;
  });

  // Entrance animation: snap in with scale
  useFrame(() => {
    if (!groupRef.current) return;
    if (groupRef.current.scale.x < 1) {
      const s = Math.min(1, groupRef.current.scale.x + 0.02);
      groupRef.current.scale.setScalar(s);
    }
  });

  return <group ref={groupRef} position={[leftSide ? -2.5 : 2.5, -1.2, 0]} scale={0} />;
}

export function CTASection() {
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStart = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setVideoStarted(true);
    }
  };

  const handleEnded = () => setVideoEnded(true);

  return (
    <div id="cta" className="snap-section relative flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.08)_0%,transparent_70%)]" />

      {/* 3D Models Flanking */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-7xl relative h-80">
          <Suspense fallback={null}>
            <Canvas camera={{ position: [0, 1, 5], fov: 50 }} gl={{ antialias: true }}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[5, 8, 5]} intensity={1.2} />
              <pointLight position={[-3, 2, 3]} intensity={0.6} color="#c9a84c" />
              <pointLight position={[3, 2, 3]} intensity={0.6} color="#c9a84c" />
              <CTAModel leftSide={true} />
              <CTAModel leftSide={false} />
              <Environment preset="city" />
            </Canvas>
          </Suspense>

          {/* Center screen */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-48 md:w-96 md:h-56 rounded-xl overflow-hidden glass-gold border border-[--gold]/30 shadow-[0_0_40px_rgba(201,168,76,0.2)]">
            <video
              ref={videoRef}
              src={PROMO_VIDEO}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
              onEnded={handleEnded}
            />
            {/* Subtitles overlay */}
            {videoStarted && !videoEnded && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 glass rounded-lg">
                <p className="text-white text-sm font-mono text-center">
                  {videoRef.current && videoRef.current.currentTime < 1.5
                    ? "What are you waiting for?"
                    : "Join us now!"}
                </p>
              </div>
            )}
            {/* Play button overlay */}
            {!videoStarted && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
                onClick={handleStart}
              >
                <div className="w-14 h-14 rounded-full glass border border-[--gold]/40 flex items-center justify-center hover:border-[--gold] transition-colors">
                  <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[18px] border-l-white ml-1" />
                </div>
                <p className="text-white/50 text-sm">Watch the story</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Text + Button */}
      <div className="relative z-30 mt-96 flex flex-col items-center gap-6 px-6">
        <AnimatePresence mode="wait">
          {!videoEnded ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-[--gold] mb-3">The stage is set</p>
              <h2 className="text-4xl md:text-6xl font-bold text-white">Ready to play?</h2>
            </motion.div>
          ) : (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-5xl md:text-7xl font-bold text-white mb-2">Your move.</h2>
              <p className="text-white/40 text-lg mb-8">The future of chess commentary is live.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {videoEnded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col items-center gap-4"
            >
              <a
                href="/signup"
                className="glass-gold inline-flex items-center gap-3 px-8 py-4 rounded-full border border-[--gold]/30 text-[--gold] font-semibold text-lg hover:bg-[--gold]/10 transition-all duration-300 shadow-[0_0_40px_rgba(201,168,76,0.2)]"
              >
                Get Started
                <span className="text-xs font-mono opacity-60">→</span>
              </a>
              <p className="text-white/25 text-xs">No credit card required</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

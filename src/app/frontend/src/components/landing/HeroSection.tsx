"use client";

import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
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

function splitByConnectedComponents(geometry: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const index = geometry.index;
  if (!index) return [geometry];

  const vertCount = geometry.attributes.position.count;
  const indices = index.array as Uint16Array | Uint32Array;

  const parent = new Int32Array(vertCount);
  for (let i = 0; i < vertCount; i++) parent[i] = i;

  function find(x: number): number {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(a: number, b: number) { parent[find(a)] = find(b); }

  for (let i = 0; i < indices.length; i += 3) {
    union(indices[i], indices[i + 1]);
    union(indices[i + 1], indices[i + 2]);
  }

  const components = new Map<number, number[]>();
  for (let i = 0; i < indices.length; i += 3) {
    const root = find(indices[i]);
    let arr = components.get(root);
    if (!arr) { arr = []; components.set(root, arr); }
    arr.push(i);
  }

  if (components.size < 2) return [geometry];

  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = geometry.attributes.uv;

  return [...components.values()].map((triStarts) => {
    const vertexMap = new Map<number, number>();
    const newPos: number[] = [];
    const newNor: number[] = [];
    const newUV: number[] = [];
    const newIdx: number[] = [];

    for (const triStart of triStarts) {
      for (let k = 0; k < 3; k++) {
        const old = indices[triStart + k];
        if (!vertexMap.has(old)) {
          const n = newPos.length / 3;
          vertexMap.set(old, n);
          newPos.push(pos.getX(old), pos.getY(old), pos.getZ(old));
          if (nor) newNor.push(nor.getX(old), nor.getY(old), nor.getZ(old));
          if (uv) newUV.push(uv.getX(old), uv.getY(old));
        }
        newIdx.push(vertexMap.get(old)!);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(newPos), 3));
    if (nor) geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(newNor), 3));
    if (uv) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(newUV), 2));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(newIdx), 1));
    geo.computeVertexNormals();
    return geo;
  });
}

function ChessScene({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  const fbxSource = useFBX("/models/chess-pieces.fbx");
  // Load textures manually — FBXLoader can't resolve absolute Windows paths in browser
  const colorTex = useLoader(THREE.TextureLoader, "/models/Color.jpg");
  const normalTex = useLoader(THREE.TextureLoader, "/models/Normal.jpg");

  const sceneGroupRef = useRef<THREE.Group>(null);
  const pieceGroupRefs = useRef<THREE.Group[]>([]);
  const initPosRef = useRef<THREE.Vector3[]>([]);
  const timeRef = useRef(0);
  const offsetsRef = useRef([new THREE.Vector3(), new THREE.Vector3()]);
  const scaleTargets = useRef([1, 1]);

  useEffect(() => {
    if (!sceneGroupRef.current || pieceGroupRefs.current.length > 0) return;

    // Configure textures
    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.flipY = false;
    normalTex.flipY = false;

    const clone = fbxSource.clone(true);

    // Normalize scale to fit in ~5 units
    const rawBox = new THREE.Box3().setFromObject(clone);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);
    const scaleFactor = 5 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    clone.scale.setScalar(scaleFactor);

    // Center
    const scaledBox = new THREE.Box3().setFromObject(clone);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    clone.position.set(-scaledCenter.x, -scaledCenter.y - 0.5, -scaledCenter.z);

    const meshes: THREE.Mesh[] = [];
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshes.push(obj);
    });

    const buildMat = (geo: THREE.BufferGeometry, baseMat: THREE.Material | THREE.Material[]): THREE.MeshStandardMaterial => {
      // Infer piece color from bounding box center X to determine King (white) vs Queen (dark)
      const b = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute);
      const cx = (b.min.x + b.max.x) / 2;
      // cx < 0 → King (left, white), cx >= 0 → Queen (right, dark/black)
      const isKing = cx < 0;

      const mat = new THREE.MeshStandardMaterial({
        map: colorTex,
        normalMap: normalTex,
        roughness: isKing ? 0.3 : 0.25,
        metalness: isKing ? 0.1 : 0.15,
        envMapIntensity: 1.2,
      });

      // If no UV or texture looks wrong, tint via color
      if (!geo.attributes.uv) {
        mat.map = null;
        mat.normalMap = null;
        mat.color.set(isKing ? 0xf0ede8 : 0x1a1a1a);
      }

      // Suppress unused warning
      void baseMat;
      return mat;
    };

    if (meshes.length === 1) {
      const sourceMesh = meshes[0];
      const components = splitByConnectedComponents(sourceMesh.geometry);

      if (components.length >= 2) {
        const sorted = components.map((geo) => {
          const b = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute);
          return { geo, cx: (b.min.x + b.max.x) / 2 };
        }).sort((a, b) => a.cx - b.cx);

        sorted.forEach(({ geo }, i) => {
          const mat = buildMat(geo, sourceMesh.material);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          mesh.position.copy(sourceMesh.position);
          mesh.rotation.copy(sourceMesh.rotation);
          mesh.scale.copy(sourceMesh.scale);

          const group = new THREE.Group();
          group.add(mesh);
          group.position.z = i === 0 ? 0.6 : -0.3;
          sceneGroupRef.current!.add(group);
          pieceGroupRefs.current[i] = group;
          initPosRef.current[i] = group.position.clone();
        });

        sceneGroupRef.current!.rotation.x = -0.18;
        return;
      }
    }

    // Fallback: multiple meshes
    const childPieces = clone.children.filter((c) => {
      const b = new THREE.Box3().setFromObject(c);
      return !b.isEmpty();
    });
    childPieces.sort((a, b) => {
      const ca = new THREE.Box3().setFromObject(a).getCenter(new THREE.Vector3());
      const cb = new THREE.Box3().setFromObject(b).getCenter(new THREE.Vector3());
      return ca.x - cb.x;
    });

    if (childPieces.length >= 2) {
      childPieces.forEach((child, i) => {
        child.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const b = new THREE.Box3().setFromObject(obj);
            obj.material = buildMat(obj.geometry, obj.material);
            void b;
          }
        });
        const g = new THREE.Group();
        g.position.copy(child.position);
        g.add(child);
        sceneGroupRef.current!.add(g);
        pieceGroupRefs.current[i] = g;
        initPosRef.current[i] = g.position.clone();
      });
    } else {
      clone.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.material = new THREE.MeshStandardMaterial({
            map: colorTex,
            normalMap: normalTex,
            roughness: 0.3,
            metalness: 0.1,
          });
        }
      });
      sceneGroupRef.current.add(clone);
    }
  }, [fbxSource, colorTex, normalTex]);

  const { scrollYProgress } = useScroll({ target: containerRef });

  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      if (pieceGroupRefs.current.length < 2) return;

      if (v < 0.25) {
        const t = v / 0.25;
        offsetsRef.current[0].set(-3 * t, 0, 0);
        offsetsRef.current[1].set(3 * t, 0, 0);
        scaleTargets.current = [1, 1];
      } else if (v < 0.5) {
        const t = (v - 0.25) / 0.25;
        offsetsRef.current[0].set(-3 - 2 * t, 0, -t);
        offsetsRef.current[1].set(3 + 2 * t, 0, -t);
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

    pieceGroupRefs.current.forEach((group, i) => {
      const init = initPosRef.current[i];
      if (!init) return;
      const off = offsetsRef.current[i];

      group.position.x += (init.x + off.x - group.position.x) * lerpSpeed;
      group.position.z += (init.z + off.z - group.position.z) * lerpSpeed;

      group.rotation.y = Math.sin(timeRef.current * 0.35 + i * Math.PI) * 0.05 + (i === 0 ? 0.15 : -0.15);

      const st = scaleTargets.current[i];
      group.scale.y += (st - group.scale.y) * lerpSpeed;
      group.scale.z += (st - group.scale.z) * lerpSpeed;
    });
  });

  return <group ref={sceneGroupRef} />;
}

function SceneContent({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 10, 6]} intensity={2.2} castShadow />
      <directionalLight position={[-3, 6, 8]} intensity={0.7} />
      <pointLight position={[-3, 4, 5]} intensity={1.0} color="#c9a84c" />
      <pointLight position={[3, 4, 5]} intensity={1.0} color="#c9a84c" />
      <Environment preset="studio" />
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
            camera={{ position: [0, 3, 9], fov: 40 }}
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

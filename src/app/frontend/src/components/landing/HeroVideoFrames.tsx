"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
    rotation: (i - 2.5) * 4,
  }));

/**
 * A single paused commentary frame drifting toward the viewer. On hover it
 * pauses the drift, plays its video and (when present) its matching commentary
 * audio. Files are matched by name so each video maps to its audio when the
 * real assets are dropped into /videos and /commentations.
 */
function StreamVideoFrame({ frame }: { frame: VideoFrameData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let raf: number;
    let z = frame.startZ;
    const speed = 0.25;

    const animate = () => {
      if (!paused) {
        z -= speed;
        if (z < -100) z = frame.startZ;
        const opacity = Math.min(1, Math.max(0, (z + 50) / 50));
        const scale = Math.min(1.1, 0.4 + (z + 100) / 180);
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
          hovered
            ? "border-[--gold]/40 shadow-[0_0_15px_rgba(201,168,76,0.15)]"
            : "border-white/10"
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

export function HeroVideoFrames() {
  const frames = useMemo(() => generateFrames(), []);
  return (
    <div
      className="absolute inset-0 overflow-hidden mix-blend-screen"
      style={{ perspective: "2000px", perspectiveOrigin: "50% 50% -300px", opacity: 0.3 }}
    >
      {frames.map((frame) => (
        <StreamVideoFrame key={frame.id} frame={frame} />
      ))}
    </div>
  );
}

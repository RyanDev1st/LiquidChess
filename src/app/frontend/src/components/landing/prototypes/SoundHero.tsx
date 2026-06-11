"use client";

import { useEffect, useRef, useState } from "react";

const ACCENT = "#e8c14a";
const FEED = [
  "bold opening — he's hunting",
  "the bishop eyes f2 already",
  "a pawn sacrificed, the engine gasps",
  "check. and the crowd leans in",
];

// Live waveform the word "speaks" sits on — canvas, audio-reactive feel via layered sines.
function Waveform() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef(0.5);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const onMove = (e: PointerEvent) => (mouse.current = e.clientX / window.innerWidth);
    window.addEventListener("pointermove", onMove);
    let raf: number;
    const resize = () => {
      cv.width = cv.clientWidth * devicePixelRatio;
      cv.height = cv.clientHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);
    const draw = (t: number) => {
      const w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);
      const mid = h / 2;
      const amp = h * 0.32 * (0.6 + mouse.current * 0.8);
      ctx.lineWidth = 2 * devicePixelRatio;
      ctx.strokeStyle = ACCENT;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const p = x / w;
        const env = Math.sin(p * Math.PI); // taper at edges
        const y =
          mid +
          env *
            amp *
            (Math.sin(p * 22 + t * 0.004) * 0.5 +
              Math.sin(p * 47 - t * 0.006) * 0.3 +
              Math.sin(p * 90 + t * 0.009) * 0.2);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

function useCycle(items: string[], ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % items.length), ms);
    return () => clearInterval(id);
  }, [items, ms]);
  return items[i];
}

export function SoundHero() {
  const line = useCycle(FEED, 2600);
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0c0b0e] text-white flex flex-col items-center justify-center">
      {/* corner UI */}
      <div className="absolute top-7 left-9 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">Liquid Chess</div>
      <div className="absolute top-7 right-9 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45 flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: ACCENT }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} /></span>
        Listening
      </div>

      {/* THE GAME */}
      <div className="font-display text-white/92 leading-none tracking-[-0.02em] text-center" style={{ fontWeight: 330, fontSize: "clamp(2.6rem,7vw,6.5rem)" }}>
        The game
      </div>

      {/* SPEAKS sitting on the live waveform */}
      <div className="relative w-[min(1100px,92vw)] h-[clamp(7rem,20vw,15rem)] my-1">
        <Waveform />
        <div
          className="absolute inset-0 flex items-center justify-center font-display italic tracking-[-0.02em] mix-blend-screen"
          style={{ color: ACCENT, fontWeight: 460, fontSize: "clamp(4rem,13vw,12rem)", fontVariationSettings: "'opsz' 144, 'WONK' 1", textShadow: "0 0 60px rgba(232,193,74,0.35)" }}
        >
          speaks
        </div>
      </div>

      {/* streaming commentary line */}
      <div className="h-8 mt-2 font-mono text-[13px] md:text-sm tracking-wide text-white/55 text-center px-6">
        <span className="opacity-40">“</span>
        <span key={line} style={{ animation: "sndIn 0.5s ease-out" }}>{line}</span>
        <span className="opacity-40">”</span>
      </div>

      <a href="#" className="mt-9 group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-medium text-[#0c0b0e] transition-transform duration-200 active:scale-[0.97] hover:-translate-y-[1px]" style={{ background: ACCENT }}>
        Hear it live <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
      </a>

      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.4em] text-white/30">Move your cursor · shape the sound</div>
      <style>{`@keyframes sndIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

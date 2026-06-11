"use client";

import { useEffect, useRef, useState } from "react";

const ACCENT = "#5ad1c4"; // teal signal

interface Beat {
  t: number; // 0..1 position on the timeline
  move: string;
  eval: number;
  line: string;
}
const BEATS: Beat[] = [
  { t: 0.0, move: "1. e4", eval: 0.3, line: "He opens the Italian. Safe? No — he's hunting." },
  { t: 0.22, move: "…e5", eval: 0.1, line: "Symmetry. The classical reply, calm as ever." },
  { t: 0.42, move: "2. Nf3", eval: 0.5, line: "The knight develops, eyeing the e5 pawn." },
  { t: 0.6, move: "…Nc6", eval: 0.2, line: "Defended. The tension begins to coil." },
  { t: 0.78, move: "3. Bb5", eval: 0.9, line: "The Ruy López. Now the room leans in." },
  { t: 1.0, move: "…a6", eval: 0.6, line: "He questions the bishop. The dance is on." },
];

function beatAt(p: number): Beat {
  let b = BEATS[0];
  for (const x of BEATS) if (p >= x.t - 0.0001) b = x;
  return b;
}

function Waveform({ progress }: { progress: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const prog = useRef(progress);
  prog.current = progress;
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    let raf: number;
    const resize = () => {
      cv.width = cv.clientWidth * devicePixelRatio;
      cv.height = cv.clientHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);
    const draw = (t: number) => {
      const w = cv.width, h = cv.height, mid = h / 2;
      ctx.clearRect(0, 0, w, h);
      const px = prog.current * w;
      const bars = 160;
      const bw = w / bars;
      for (let i = 0; i < bars; i++) {
        const x = i * bw;
        const seed = Math.abs(Math.sin(i * 0.7) * 0.6 + Math.sin(i * 0.27) * 0.4);
        const live = Math.sin(i * 0.5 + t * 0.004) * 0.15;
        const amp = (seed + live) * (h * 0.4);
        const played = x < px;
        ctx.fillStyle = played ? ACCENT : "rgba(255,255,255,0.16)";
        ctx.fillRect(x, mid - amp, Math.max(1, bw - 2 * devicePixelRatio), amp * 2);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

export function ScrubHero() {
  const [p, setP] = useState(0.0);
  const [dragging, setDragging] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const auto = useRef(true);

  // auto-advance until the user grabs the playhead
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (auto.current && !dragging) setP((v) => (v + dt * 0.07) % 1.0001);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragging]);

  useEffect(() => {
    const move = (clientX: number) => {
      const el = track.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setP(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
    };
    const onMove = (e: PointerEvent) => dragging && move(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  const beat = beatAt(p);

  return (
    <div className="absolute inset-0 overflow-hidden flex flex-col" style={{ background: "#0e0f12", color: "#fff" }}>
      <div className="absolute top-7 left-9 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">Liquid Chess</div>
      <div className="absolute top-7 right-9 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">Replay · Scrub the match</div>

      {/* upper: live move + headline + commentary, driven by playhead */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="font-mono text-sm tracking-[0.3em] mb-5" style={{ color: ACCENT }}>{beat.move}</div>
        <h1 className="font-display text-white leading-[0.86] tracking-[-0.02em]">
          <span className="block font-[330] text-[clamp(2.6rem,6vw,5.5rem)]">The game</span>
          <span className="block italic text-[clamp(3rem,7.5vw,7rem)]" style={{ color: ACCENT, fontVariationSettings: "'opsz' 144,'WONK' 1" }}>speaks.</span>
        </h1>
        <p key={beat.move} className="mt-7 max-w-[44ch] font-mono text-[13px] md:text-sm text-white/60 leading-relaxed" style={{ animation: "scrIn 0.4s ease-out" }}>
          “{beat.line}”
        </p>
      </div>

      {/* the scrubber */}
      <div className="px-8 md:px-16 pb-14">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">
          <span>00:00</span>
          <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full" style={{ background: ACCENT }} /> Eval {beat.eval > 0 ? "+" : ""}{(beat.eval * 2).toFixed(2)}</span>
          <span>full game</span>
        </div>
        <div
          ref={track}
          className="relative h-24 cursor-ew-resize rounded-lg overflow-hidden"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
          onPointerDown={(e) => { auto.current = false; setDragging(true); const r = e.currentTarget.getBoundingClientRect(); setP(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); }}
        >
          <Waveform progress={p} />
          {/* beat ticks */}
          {BEATS.map((b, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-white/15" style={{ left: `${b.t * 100}%` }} />
          ))}
          {/* playhead */}
          <div className="absolute top-0 bottom-0 w-0.5 pointer-events-none" style={{ left: `${p * 100}%`, background: ACCENT, boxShadow: `0 0 12px ${ACCENT}` }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45" style={{ background: ACCENT }} />
          </div>
        </div>
        <div className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.4em] text-white/35">← Drag the playhead · hear every move →</div>
      </div>

      <style>{`@keyframes scrIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

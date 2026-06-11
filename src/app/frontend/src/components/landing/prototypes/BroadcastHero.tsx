"use client";

import { useEffect, useRef, useState } from "react";
import { PieceCanvas } from "./PieceCanvas";

const SIGNAL = "#d8ff3e"; // electric lime — the one signal color
const LINES = [
  "1. e4 — he opens the Italian. Safe? No. He's hunting.",
  "…Bc5. Classic. The bishop eyes f2 already.",
  "Knight to g5 — the threat is real now.",
  "He sacrifices the pawn. Bold. The engine gasps.",
];
const MOVES = ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"];

function useTyping(lines: string[], speed = 38) {
  const [text, setText] = useState("");
  const li = useRef(0);
  const ci = useRef(0);
  useEffect(() => {
    let raf: number;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > speed) {
        last = t;
        const line = lines[li.current];
        if (ci.current <= line.length) {
          setText(line.slice(0, ci.current));
          ci.current++;
        } else {
          // pause then next line
          if (ci.current < line.length + 40) ci.current++;
          else {
            ci.current = 0;
            li.current = (li.current + 1) % lines.length;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lines, speed]);
  return text;
}

function EvalBar() {
  const [v, setV] = useState(0.62);
  useEffect(() => {
    const id = setInterval(() => setV(0.4 + Math.random() * 0.45), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] opacity-50">EVAL</span>
      <div className="relative h-2 w-40 bg-white/10 overflow-hidden">
        <div className="absolute inset-y-0 left-0 transition-[width] duration-1000 ease-out" style={{ width: `${v * 100}%`, background: SIGNAL }} />
      </div>
      <span className="font-mono text-[11px]" style={{ color: SIGNAL }}>+{(v * 2.4).toFixed(2)}</span>
    </div>
  );
}

export function BroadcastHero() {
  const commentary = useTyping(LINES);
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a0a0b] text-white/90 font-mono">
      {/* top status strip */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-8 h-12 border-b border-white/10 text-[11px] uppercase tracking-[0.25em]">
        <span className="font-semibold tracking-[0.3em]">LIQUIDCHESS</span>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#ff4d4d" }} />REC 12:04</span>
          <EvalBar />
        </div>
      </div>

      {/* 3-panel grid */}
      <div className="absolute inset-0 top-12 grid grid-cols-12">
        {/* left: move list ticker */}
        <div className="col-span-3 border-r border-white/10 p-6 hidden md:flex flex-col">
          <div className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-4">Move log</div>
          <div className="space-y-1.5 text-[13px]">
            {MOVES.map((m, i) => (
              <div key={i} className="flex justify-between" style={{ opacity: 1 - i * 0.07 }}>
                <span className="opacity-40">{Math.floor(i / 2) + 1}.</span>
                <span className={i === 0 ? "" : "opacity-80"} style={i === 0 ? { color: SIGNAL } : undefined}>{m}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto text-[10px] uppercase tracking-[0.3em] opacity-40">White to move</div>
        </div>

        {/* center: piece + title */}
        <div className="col-span-12 md:col-span-6 relative flex flex-col">
          <div className="flex-1 relative">
            <PieceCanvas piece="Queen" color="#e8e8ec" metalness={0.35} roughness={0.4} envPreset="warehouse" spin={0.18} className="absolute inset-0" />
            {/* corner crosshair ticks */}
            {[["top-6 left-6", "border-t border-l"], ["top-6 right-6", "border-t border-r"], ["bottom-6 left-6", "border-b border-l"], ["bottom-6 right-6", "border-b border-r"]].map(([pos, b], i) => (
              <span key={i} className={`absolute ${pos} h-4 w-4 ${b} border-white/25`} />
            ))}
          </div>
          <div className="px-8 pb-10">
            <h1 className="text-[clamp(2rem,4.4vw,3.4rem)] font-bold tracking-[-0.01em] leading-none">
              THE GAME <span style={{ color: SIGNAL }}>SPEAKS</span>
            </h1>
            <div className="mt-3 text-[11px] uppercase tracking-[0.3em] opacity-45">Real-time AI commentary engine</div>
          </div>
        </div>

        {/* right: live commentary feed */}
        <div className="col-span-3 border-l border-white/10 p-6 hidden md:flex flex-col">
          <div className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: SIGNAL }} />Live caster
          </div>
          <p className="text-[13px] leading-relaxed text-white/85 min-h-[7rem]">
            {commentary}
            <span className="inline-block w-2 h-4 ml-0.5 align-middle animate-pulse" style={{ background: SIGNAL }} />
          </p>
          <a href="#" className="mt-auto inline-block text-[11px] uppercase tracking-[0.25em] border px-4 py-2 transition-colors hover:bg-white hover:text-black" style={{ borderColor: "rgba(255,255,255,0.3)" }}>
            Hear it live →
          </a>
        </div>
      </div>

      {/* bottom waveform strip */}
      <div className="absolute bottom-0 inset-x-0 h-8 border-t border-white/10 flex items-end gap-[3px] px-8 pb-2 overflow-hidden">
        {Array.from({ length: 90 }).map((_, i) => (
          <span
            key={i}
            className="flex-1 origin-bottom"
            style={{
              height: `${20 + Math.abs(Math.sin(i * 0.5)) * 70}%`,
              background: i % 7 === 0 ? SIGNAL : "rgba(255,255,255,0.22)",
              animation: `bcwave 1.1s ease-in-out ${(i % 12) * 0.06}s infinite alternate`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes bcwave{from{transform:scaleY(0.35)}to{transform:scaleY(1)}}`}</style>
    </div>
  );
}

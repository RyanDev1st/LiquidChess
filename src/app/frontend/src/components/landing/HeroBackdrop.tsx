"use client";

import { useMemo } from "react";

const COLS = 12;
const ROWS = 8;

// Deterministic-ish jitter so cells twinkle on their own staggered clocks.
function useCells() {
  return useMemo(
    () =>
      Array.from({ length: COLS * ROWS }, (_, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const light = (col + row) % 2 === 0;
        return {
          light,
          delay: +(Math.random() * 9).toFixed(2),
          dur: +(5 + Math.random() * 6).toFixed(2),
          peak: +(0.18 + Math.random() * 0.32).toFixed(2),
        };
      }),
    [],
  );
}

const WAVE =
  "M0 60 C 40 60 50 22 80 22 S 120 60 150 60 130 96 175 96 205 30 235 30 260 60 300 60 320 14 350 14 380 60 410 60 430 92 460 92 488 36 520 36 545 60 600 60";

export function HeroBackdrop() {
  const cells = useCells();

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes hb-twinkle { 0%,100% { opacity: 0 } 7% { opacity: var(--pk) } 15% { opacity: 0 } }
        @keyframes hb-flow { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes hb-breathe { 0%,100% { transform: scaleY(0.82) } 50% { transform: scaleY(1.16) } }
        .hb-cell { position: relative; border: 1px solid rgba(201,168,76,0.05); transition: background-color .35s ease; }
        .hb-cell:hover { background-color: rgba(201,168,76,0.16); }
        .hb-shine { position: absolute; inset: 0; opacity: 0; animation: hb-twinkle var(--dur) ease-in-out infinite; animation-delay: var(--dl); }
        .hb-cell:hover .hb-shine { opacity: .55 !important; animation: none; }
        @media (prefers-reduced-motion: reduce) { .hb-shine { animation: none } .hb-wave-flow, .hb-wave-breathe { animation: none !important } }
      `}</style>

      {/* receding chessboard floor — real cells that twinkle + react to hover */}
      <div
        className="absolute inset-x-0 bottom-0 h-[62%]"
        style={{ perspective: "640px", perspectiveOrigin: "50% 0%" }}
      >
        <div
          className="absolute inset-0 origin-top grid"
          style={{
            transform: "rotateX(71deg)",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            maskImage: "linear-gradient(to top, rgba(0,0,0,0.95), transparent 78%)",
            WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.95), transparent 78%)",
          }}
        >
          {cells.map((c, i) => (
            <div
              key={i}
              className="hb-cell"
              style={{ backgroundColor: c.light ? "rgba(201,168,76,0.035)" : "rgba(28,18,8,0.22)" }}
            >
              <div
                className="hb-shine"
                style={
                  {
                    background: c.light
                      ? "radial-gradient(60% 60% at 50% 50%, rgba(201,168,76,0.85), transparent 70%)"
                      : "radial-gradient(60% 60% at 50% 50%, rgba(150,92,38,0.8), transparent 70%)",
                    ["--dur" as string]: `${c.dur}s`,
                    ["--dl" as string]: `${c.delay}s`,
                    ["--pk" as string]: c.peak,
                  } as React.CSSProperties
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* flowing gold commentary waveform behind the pieces */}
      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-[66%] h-44 opacity-[0.16] overflow-hidden">
        <div className="hb-wave-flow flex w-[200%] h-full" style={{ animation: "hb-flow 14s linear infinite" }}>
          {[0, 1].map((k) => (
            <svg
              key={k}
              className="hb-wave-breathe w-1/2 h-full"
              style={{ animation: "hb-breathe 4.5s ease-in-out infinite" }}
              viewBox="0 0 600 120"
              preserveAspectRatio="none"
              fill="none"
            >
              <path d={WAVE} stroke="#c9a84c" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          ))}
        </div>
      </div>

      {/* left vignette for copy legibility + soft frame */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b0908]/85 via-[#0b0908]/10 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 -120px 140px -60px rgba(0,0,0,0.7), inset 0 90px 120px -70px rgba(0,0,0,0.55)" }}
      />
    </div>
  );
}

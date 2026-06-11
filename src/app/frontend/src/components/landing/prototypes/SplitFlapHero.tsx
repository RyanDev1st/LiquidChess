"use client";

import { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.+-#♔♕ ";
const GLYPH = (c: string) => (CHARS.includes(c) ? c : c.toUpperCase());

// One flap cell that "spins" through random glyphs then locks to its target.
function Flap({ target, delay }: { target: string; delay: number }) {
  const [ch, setCh] = useState(" ");
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let raf: number;
    let i = 0;
    const start = performance.now() + delay;
    const spin = (t: number) => {
      if (t < start) {
        raf = requestAnimationFrame(spin);
        return;
      }
      i++;
      if (i % 2 === 0) setCh(CHARS[Math.floor((t / 40) % CHARS.length)]);
      const elapsed = t - start;
      const dur = 420 + delay * 0.4;
      if (elapsed < dur) raf = requestAnimationFrame(spin);
      else {
        setCh(GLYPH(target));
        setSettled(true);
      }
    };
    raf = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(raf);
  }, [target, delay]);

  return (
    <span
      className="relative inline-flex items-center justify-center font-mono font-bold select-none"
      style={{
        width: "1ch",
        background: "linear-gradient(#1b1c20 0 50%, #141519 50% 100%)",
        color: settled ? "#f3ead3" : "#c9b27a",
        borderRadius: 3,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04)",
        transition: "color 0.15s",
        lineHeight: 1.1,
        padding: "0.12em 0.04em",
      }}
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-black/60" />
      {ch}
    </span>
  );
}

function FlapRow({ text, size, delayBase = 0, gap = "0.06em" }: { text: string; size: string; delayBase?: number; gap?: string }) {
  return (
    <div className="flex" style={{ fontSize: size, gap }}>
      {text.split("").map((c, i) => (
        <Flap key={`${text}-${i}`} target={c} delay={delayBase + i * 55} />
      ))}
    </div>
  );
}

const FEED = ["E4  E5  NF3", "BOLD OPENING", "HE IS HUNTING", "PAWN SACRIFICED", "CHECK +1.34"];

export function SplitFlapHero() {
  const [feedIdx, setFeedIdx] = useState(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const id = setInterval(() => setFeedIdx((v) => (v + 1) % FEED.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center px-6" style={{ background: "#0c0d10" }}>
      {/* faint hangar/board backdrop lines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 64px),repeating-linear-gradient(90deg,#fff 0 1px,transparent 1px 64px)" }} />

      <div className="absolute top-7 left-9 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">Liquid Chess</div>
      <div className="absolute top-7 right-9 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45 flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--gold] opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[--gold]" /></span>
        Departures · Live
      </div>

      {/* the board */}
      <div className="flex flex-col items-center gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-[--gold]/70 mb-2">— Now boarding —</div>
        <FlapRow text="THE GAME" size="clamp(2.6rem,8vw,7rem)" delayBase={120} />
        <FlapRow text="SPEAKS" size="clamp(3.4rem,11vw,9.5rem)" delayBase={700} />

        {/* live commentary flap strip */}
        <div className="mt-7 px-4 py-3 rounded-md" style={{ background: "rgba(255,255,255,0.03)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
          <FlapRow key={feedIdx} text={FEED[feedIdx].padEnd(15, " ")} size="clamp(0.9rem,2.4vw,1.6rem)" delayBase={0} gap="0.1em" />
        </div>
      </div>

      <a href="#" className="mt-10 group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-medium text-black transition-transform duration-200 active:scale-[0.97] hover:-translate-y-[1px]" style={{ background: "var(--gold)" }}>
        Hear it live <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
      </a>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.4em] text-white/30">Every move, announced</div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EtheralShadow } from "@/components/ui/etheral-shadow";

interface HookSectionProps {
  onComplete: () => void;
}

const CODE_LINES = [
  'import { LiquidChess } from "@liquidchess/ai";',
  "",
  "const commentator = new LiquidChess({",
  '  voice: "Magnus",',
  '  style: "grandmaster",',
  "  intelligence: Infinity,",
  "});",
  "",
  "commentator.analyze(game);",
];

const CHAR_SPEED = 32;   // ms per char
const LINE_GAP = 90;     // ms between lines

const KEYWORDS = new Set(["import", "from", "new", "const", "Infinity"]);

function colorize(text: string) {
  if (!text) return <span>&nbsp;</span>;
  const tokens = text.split(/(\s+|["'](?:[^"'\\]|\\.)*["']|[{}();,:])/g);
  return (
    <>
      {tokens.map((tok, i) => {
        if (KEYWORDS.has(tok)) return <span key={i} style={{ color: "#c9a84c" }}>{tok}</span>;
        if (/^["']/.test(tok)) return <span key={i} style={{ color: "#6ee7b7" }}>{tok}</span>;
        if (tok.startsWith("//")) return <span key={i} style={{ color: "rgba(255,255,255,0.3)" }}>{tok}</span>;
        return <span key={i}>{tok}</span>;
      })}
    </>
  );
}

type Phase = "typing" | "pause" | "executing" | "output" | "flash";

export function HookSection({ onComplete }: HookSectionProps) {
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [activeLine, setActiveLine] = useState(0);
  const [activeChars, setActiveChars] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [execText, setExecText] = useState("");
  const [execDots, setExecDots] = useState(0);
  const [showOutput, setShowOutput] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMounted = useRef(true);

  const addTimer = (fn: () => void, delay: number) => {
    const t = setTimeout(() => { if (isMounted.current) fn(); }, delay);
    timers.current.push(t);
    return t;
  };

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    isMounted.current = true;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("hook") === "0") { onCompleteRef.current(); return; }

    // Type all lines sequentially
    let cursor = 0; // ms elapsed

    CODE_LINES.forEach((line, lineIdx) => {
      // When this line starts appearing
      const lineStart = cursor;

      if (line === "") {
        // Blank line — just advance
        addTimer(() => {
          setTypedLines((prev) => {
            const next = [...prev];
            next[lineIdx] = "";
            return next;
          });
          setActiveLine(lineIdx + 1);
          setActiveChars(0);
        }, lineStart);
        cursor += LINE_GAP;
      } else {
        // Reveal chars one by one
        for (let ci = 0; ci <= line.length; ci++) {
          const charDelay = lineStart + ci * CHAR_SPEED;
          const partial = line.slice(0, ci);
          const capturedCi = ci;
          addTimer(() => {
            setTypedLines((prev) => {
              const next = [...prev];
              next[lineIdx] = partial;
              return next;
            });
            setActiveLine(lineIdx);
            setActiveChars(capturedCi);
          }, charDelay);
        }
        cursor += line.length * CHAR_SPEED + LINE_GAP;
      }
    });

    const allDone = cursor;

    // Pause phase
    addTimer(() => setPhase("pause"), allDone);

    // Execution phase — type "$ node analyze.js" dramatically
    const EXEC_CMD = "$ node analyze.js";
    addTimer(() => {
      setPhase("executing");
      setActiveLine(CODE_LINES.length); // cursor off main code
    }, allDone + 1800);

    EXEC_CMD.split("").forEach((ch, i) => {
      addTimer(() => setExecText(EXEC_CMD.slice(0, i + 1)), allDone + 1800 + 300 + i * 55);
    });

    const execDone = allDone + 1800 + 300 + EXEC_CMD.length * 55;

    // Animated dots (3 pulses)
    [0, 1, 2, 3].forEach((d) => {
      addTimer(() => setExecDots(d % 4), execDone + d * 280);
    });

    // Output
    addTimer(() => {
      setPhase("output");
      setShowOutput(true);
    }, execDone + 1400);

    // Flash → complete
    addTimer(() => {
      setPhase("flash");
      setShowFlash(true);
      addTimer(() => onCompleteRef.current(), 500);
    }, execDone + 2800);

    return () => {
      isMounted.current = false;
      timers.current.forEach(clearTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cursorVisible = phase === "typing" || phase === "pause";
  const isLastCodeLine = activeLine < CODE_LINES.length;

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-[#070707]">
      {/* Etheral bg */}
      <div className="absolute inset-0">
        <EtheralShadow
          color="rgba(201, 168, 76, 0.35)"
          animation={{ scale: 60, speed: 30 }}
          noise={{ opacity: 0.4, scale: 1.5 }}
          sizing="fill"
        />
      </div>
      <div className="absolute inset-0 bg-[#070707]/60" />

      {/* Terminal card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl mx-6"
      >
        <div className="glass rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(201,168,76,0.15)]">
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <span className="text-white/25 text-xs font-mono mx-auto">liquidchess — bash</span>
          </div>

          {/* Code area */}
          <div className="p-6 font-mono text-sm leading-relaxed min-h-[260px]">
            {CODE_LINES.map((line, i) => {
              const typed = typedLines[i];
              if (typed === undefined) return null;

              const isActive = activeLine === i && phase === "typing";
              const display = typed;

              return (
                <div key={i} className="text-white/80 min-h-[1.5em]">
                  {line === "" ? (
                    <span>&nbsp;</span>
                  ) : (
                    <>
                      {colorize(display)}
                      {isActive && (
                        <span className="inline-block w-[2px] h-[1em] bg-[--gold] animate-blink ml-px align-middle" />
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* Pause cursor (after all lines typed) */}
            {phase === "pause" && typedLines.length === CODE_LINES.length && (
              <span className="inline-block w-[2px] h-[1em] bg-[--gold] animate-blink align-middle" />
            )}

            {/* Execution line */}
            {(phase === "executing" || phase === "output" || phase === "flash") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                className="mt-2"
              >
                <span style={{ color: "#c9a84c" }}>{execText}</span>
                {phase === "executing" && execText.length > 0 && execText.length < 18 && (
                  <span className="inline-block w-[2px] h-[1em] bg-[--gold] animate-blink ml-px align-middle" />
                )}
                {phase === "executing" && execText === "$ node analyze.js" && (
                  <span className="text-white/40 ml-2">
                    {".".repeat(execDots)}
                  </span>
                )}
              </motion.div>
            )}

            {/* Output */}
            <AnimatePresence>
              {showOutput && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-4 pt-4 border-t border-white/8"
                >
                  <p className="text-[--gold-light] text-base font-semibold tracking-wide">
                    ✦ Welcome to the future of Commentating
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="dot-overtaking" style={{ color: "#c9a84c" }} />
                    <span className="text-white/30 text-xs">Initializing AI engine...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs font-mono mt-4 tracking-widest">
          LIQUID CHESS · AI COMMENTARY ENGINE
        </p>
      </motion.div>

      {/* Flash overlay */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            className="absolute inset-0 bg-white z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.5, times: [0, 0.4, 1] }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

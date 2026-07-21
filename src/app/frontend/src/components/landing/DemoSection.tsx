import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import {
  ImageComparison,
  ImageComparisonImage,
  ImageComparisonSlider,
} from "@/components/ui/image-comparison";
import SplineKeyboard from "@/components/three/SplineKeyboard";

const VIDEO_SRC = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4";
const PAGE_BG = 0x000000;
const SLIDER_ANIMATION_MS = 760;
const SLIDER_VISIBLE_MS = 1040;

type ChatMessage = {
  user: string;
  text: string;
  tone?: "muted" | "live" | "gold";
};

const QUIET_CHAT: ChatMessage[] = [
  { user: "eLo_grinder", text: "nice move", tone: "muted" },
  { user: "patter_pro", text: "what line is this", tone: "muted" },
  { user: "rookrolled", text: "bishop is hanging", tone: "muted" },
  { user: "watcher42", text: "ok", tone: "muted" },
];

const LIVE_CHAT: ChatMessage[] = [
  { user: "eLo_grinder", text: "engine eval +3.4", tone: "gold" },
  { user: "patter_pro", text: "the commentary is unreal", tone: "live" },
  { user: "bongcloud_god", text: "my yelling", tone: "live" },
  { user: "lucenaposition", text: "TEACH ME COACH", tone: "gold" },
  { user: "kingfisher_92", text: "OH MY GOD THE BISHOP", tone: "live" },
  { user: "checkmate_bru", text: "she's cooking", tone: "gold" },
];

const PIECES = [
  ["r", "n", "b", "q", "k", "", "n", "r"],
  ["p", "p", "p", "", "", "p", "p", "p"],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "p", "p", "", "", ""],
  ["", "", "B", "", "P", "", "", ""],
  ["", "", "", "", "", "N", "", ""],
  ["P", "P", "P", "P", "", "P", "P", "P"],
  ["R", "N", "B", "Q", "K", "", "", "R"],
];

function comparisonFrame(active: boolean) {
  const gold = active ? "#c9a84c" : "#6c6c6c";
  const bg = active ? "#120f08" : "#060606";
  const label = active ? "AI VOICE + COACH" : "GAME AUDIO";
  const caption = active ? "He sacrificed the bishop. White is going for the king." : "Only board sound. Chat waits.";
  const glow = active ? ".32" : ".08";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <rect width="1280" height="720" fill="${bg}"/>
      <rect x="56" y="54" width="1168" height="612" rx="34" fill="#080807" stroke="${gold}" stroke-opacity=".52" stroke-width="2"/>
      <rect x="120" y="126" width="500" height="500" rx="22" fill="#111" stroke="#fff" stroke-opacity=".12"/>
      ${Array.from({ length: 64 }, (_, i) => {
        const x = 140 + (i % 8) * 57.5;
        const y = 146 + Math.floor(i / 8) * 57.5;
        const light = (Math.floor(i / 8) + i) % 2 === 0;
        return `<rect x="${x}" y="${y}" width="57.5" height="57.5" fill="${light ? "#d8c487" : "#3a3021"}" opacity="${active ? ".92" : ".52"}"/>`;
      }).join("")}
      <circle cx="426" cy="374" r="${active ? 92 : 32}" fill="${gold}" opacity="${glow}"/>
      <rect x="716" y="132" width="372" height="68" rx="18" fill="#030303" stroke="${gold}" stroke-opacity=".5"/>
      <text x="742" y="174" fill="${gold}" font-family="monospace" font-size="25" font-weight="700">${label}</text>
      <rect x="716" y="260" width="${active ? 340 : 156}" height="18" rx="9" fill="${gold}" opacity=".9"/>
      <rect x="716" y="312" width="${active ? 278 : 116}" height="18" rx="9" fill="#fff" opacity="${active ? ".22" : ".08"}"/>
      <text x="716" y="430" fill="#fff" fill-opacity="${active ? ".86" : ".42"}" font-family="monospace" font-size="38">${active ? "+3.4" : "+0.2"}</text>
      <text x="120" y="666" fill="#fff" fill-opacity="${active ? ".8" : ".44"}" font-family="Georgia, serif" font-size="28" font-style="italic">${caption}</text>
    </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const MUTED_FRAME = comparisonFrame(false);
const LIVE_FRAME = comparisonFrame(true);

function ChatPanel({ aiActive }: { aiActive: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>(QUIET_CHAT);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(aiActive ? LIVE_CHAT : QUIET_CHAT);
  }, [aiActive]);

  useEffect(() => {
    const pool = aiActive ? LIVE_CHAT : QUIET_CHAT;
    const interval = window.setInterval(() => {
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        setMessages((prev) => [...prev.slice(-6), pool[Math.floor(Math.random() * pool.length)]]);
      }, aiActive ? 240 : 620);
    }, aiActive ? 1320 : 4300);

    return () => window.clearInterval(interval);
  }, [aiActive]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, typing]);

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setDraft("");
    setMessages((prev) => [...prev.slice(-6), { user: "you", text, tone: "live" }]);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev.slice(-6),
        { user: aiActive ? "chat" : "guest", text: aiActive ? "crowd heard that" : "noted", tone: aiActive ? "gold" : "muted" },
      ]);
    }, aiActive ? 300 : 760);
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[--gold]/22 bg-[#090704]/92 shadow-[0_24px_80px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[--gold]/14 px-4">
        <span className={`size-1.5 rounded-full ${aiActive ? "bg-orange-500 shadow-[0_0_14px_rgba(249,115,22,.9)]" : "bg-white/24"}`} />
        <span className="font-mono text-[10px] uppercase tracking-[0.27em] text-white/70">Live Chat</span>
        <span className="ml-auto font-mono text-[9px] text-[--gold]">{aiActive ? "4,218 viewers" : "481 viewers"}</span>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.p
              key={`${message.user}-${message.text}-${index}`}
              className="grid grid-cols-[auto_1fr] gap-2 text-[11px] leading-snug"
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <span
                className={
                  message.tone === "gold"
                    ? "font-semibold text-[--gold]"
                    : message.tone === "live"
                      ? "font-semibold text-emerald-300"
                      : "font-semibold text-white/38"
                }
              >
                {message.user}
              </span>
              <span className={aiActive ? "text-white/84" : "text-white/40"}>{message.text}</span>
            </motion.p>
          ))}
        </AnimatePresence>
        {typing && (
          <div className="flex gap-1 pt-1">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="size-1 rounded-full bg-[--gold]"
                animate={{ opacity: [0.18, 1, 0.18] }}
                transition={{ repeat: Infinity, duration: 0.85, delay: dot * 0.12 }}
              />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submitMessage} className="shrink-0 border-t border-[--gold]/14 p-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="h-8 w-full rounded-lg border border-white/8 bg-white/[0.04] px-3 font-mono text-[10px] text-white/78 outline-none placeholder:text-white/24 focus:border-[--gold]/45"
          placeholder="Type a message..."
        />
      </form>
    </aside>
  );
}

function Board({ aiActive }: { aiActive: boolean }) {
  return (
    <div className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg border border-white/10 shadow-[0_28px_70px_rgba(0,0,0,.48)]">
      {PIECES.flatMap((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const light = (rowIndex + colIndex) % 2 === 0;
          const hot = aiActive && ((rowIndex === 4 && colIndex === 2) || (rowIndex === 5 && colIndex === 5));

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`relative flex items-center justify-center font-serif text-[clamp(14px,2.25vw,31px)] ${
                light ? "bg-[#d8c487] text-black" : "bg-[#3a3021] text-white"
              }`}
            >
              {hot && <span className="absolute inset-1 rounded-sm bg-[--gold]/32 shadow-[0_0_28px_rgba(201,168,76,.65)]" />}
              <span className="relative">{piece}</span>
            </div>
          );
        }),
      )}
    </div>
  );
}

function BroadcastFrame({ aiActive }: { aiActive: boolean }) {
  return (
    <div className="relative aspect-video h-full max-h-full w-full overflow-hidden rounded-xl border border-[--gold]/24 bg-[#070604] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
      <video src={VIDEO_SRC} className="absolute inset-0 h-full w-full object-cover opacity-[0.12] grayscale" muted autoPlay loop playsInline />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_35%,rgba(201,168,76,.22),transparent_32%),linear-gradient(180deg,rgba(255,255,255,.05),transparent_34%,rgba(0,0,0,.34))]" />

      <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.24em] text-white/45 md:inset-x-5">
        <span className="flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${aiActive ? "bg-orange-500" : "bg-white/28"}`} />
          Stream - Live
        </span>
        <span>83:42 / 85:00</span>
      </div>

      <div className="absolute left-[4.5%] top-[18%] z-10 w-[36%] max-w-[340px]">
        <Board aiActive={aiActive} />
      </div>

      <div className="absolute bottom-5 left-[45%] right-5 top-16 hidden md:block">
        <div className="flex h-full flex-col justify-between rounded-xl border border-white/10 bg-black/42 p-4 shadow-[0_24px_68px_rgba(0,0,0,.48)] backdrop-blur-sm">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full border border-[--gold]/25 bg-black/50 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/62">
                AI voice - Coach
              </span>
              <span className="font-mono text-[9px] text-[--gold]">voice {aiActive ? "on" : "off"}</span>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/34">analysis</p>
            <p className="mt-2 font-mono text-3xl text-white/86">{aiActive ? "+3.4" : "+0.2"}</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[--gold-dark] via-[--gold] to-[--gold-light]"
                animate={{ width: aiActive ? "82%" : "44%" }}
                transition={{ duration: 0.36, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-[--gold]/38 bg-black/62 px-4 py-3 text-center">
            <p className="font-serif text-base italic leading-snug text-white/78">
              {aiActive ? "He sacrificed the bishop. White is going for the king." : "Only board sound. Chat waits."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonOverlay({ aiActive, sequence }: { aiActive: boolean; sequence: number }) {
  const start = aiActive ? 0 : 100;
  const end = aiActive ? 100 : 0;
  const [position, setPosition] = useState(start);

  useEffect(() => {
    setPosition(start);
    const frame = window.requestAnimationFrame(() => setPosition(end));
    return () => window.cancelAnimationFrame(frame);
  }, [end, sequence, start]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <ImageComparison
        className="h-full w-full rounded-xl"
        defaultPosition={start}
        value={position}
        springOptions={{ bounce: 0, duration: SLIDER_ANIMATION_MS / 1000 }}
      >
        <ImageComparisonImage src={MUTED_FRAME} alt="Muted commentary state" position="left" className="grayscale" />
        <ImageComparisonImage src={LIVE_FRAME} alt="AI commentary state" position="right" />
        <ImageComparisonSlider className="w-0.5 bg-white/30 backdrop-blur-xs">
          <div className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,.55)]" />
        </ImageComparisonSlider>
      </ImageComparison>
    </motion.div>
  );
}

function DemoStage({
  aiActive,
  comparisonVisible,
  comparisonSequence,
}: {
  aiActive: boolean;
  comparisonVisible: boolean;
  comparisonSequence: number;
}) {
  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="relative flex h-full w-full items-center justify-center">
        <BroadcastFrame aiActive={aiActive} />
        <div className="absolute bottom-4 right-4 z-20 h-[42%] min-h-[160px] w-[min(72vw,270px)] md:-right-5 md:bottom-7 md:h-[60%] md:min-h-[216px] md:w-[292px]">
          <ChatPanel aiActive={aiActive} />
        </div>
        <AnimatePresence initial={false}>
          {comparisonVisible && (
            <ComparisonOverlay key={comparisonSequence} aiActive={aiActive} sequence={comparisonSequence} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function DemoSection({ containerRef }: { containerRef?: RefObject<HTMLElement> }) {
  const [aiActive, setAiActive] = useState(false);
  const [comparisonVisible, setComparisonVisible] = useState(false);
  const [comparisonSequence, setComparisonSequence] = useState(0);
  const comparisonTimer = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: containerRef,
    offset: ["start start", "end end"],
  });
  const keyboardOpacity = useTransform(scrollYProgress, [0.42, 0.58], [0, 1]);
  const keyboardY = useTransform(scrollYProgress, [0.42, 0.58], [50, 0]);

  useEffect(() => {
    return () => {
      if (comparisonTimer.current) window.clearTimeout(comparisonTimer.current);
    };
  }, []);

  function toggleAi() {
    setAiActive((value) => !value);
    setComparisonSequence((value) => value + 1);
    setComparisonVisible(true);
    if (comparisonTimer.current) window.clearTimeout(comparisonTimer.current);
    comparisonTimer.current = window.setTimeout(() => {
      setComparisonVisible(false);
      comparisonTimer.current = null;
    }, SLIDER_VISIBLE_MS);
  }

  const title = useMemo(
    () => (
      <div className="mx-auto max-w-3xl px-4 text-center">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[--gold] md:text-xs">Live Demo</p>
        <h2 className="text-2xl font-bold leading-tight text-white md:text-4xl">
          Ctrl+C. Ctrl+V. <span className="font-serif italic font-normal text-[--gold-light]">Game changed.</span>
        </h2>
        <p className="mt-2 text-xs text-white/36 md:text-sm">
          {aiActive ? "AI commentary is live. The room is awake." : "Press Start to wake up the broadcast."}
        </p>
      </div>
    ),
    [aiActive],
  );

  return (
    <section id="demo" ref={sectionRef} className="relative min-h-[224svh] overflow-visible bg-black">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(201,168,76,.035)_1px,transparent_1px),linear-gradient(180deg,rgba(201,168,76,.028)_1px,transparent_1px)] bg-[size:76px_76px]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black via-black/92 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[56svh] bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,.14),transparent_46%),linear-gradient(to_bottom,transparent,#000_42%)]" />

      <div className="relative z-10 pt-14 md:pt-16">
        <ContainerScroll
          scrollContainerRef={containerRef}
          scrollOffset={["start end", "center center"]}
          transformRange={[0.05, 0.7]}
          titleTranslateRange={[0, -190]}
          className="h-[148svh] px-3 pb-0 pt-0 md:h-[152svh] md:px-8"
          contentClassName="py-16 md:py-24"
          cardClassName="!-mt-2 h-[min(60svh,620px)] max-w-[1120px] rounded-[28px] border border-[--gold]/28 bg-[#100d08]/92 p-2 shadow-[0_40px_140px_rgba(0,0,0,.82),0_0_70px_rgba(201,168,76,.12)] md:!-mt-4 md:h-[min(64svh,660px)] md:p-4"
          bodyClassName="!overflow-visible bg-transparent"
          titleComponent={title}
        >
          <DemoStage aiActive={aiActive} comparisonVisible={comparisonVisible} comparisonSequence={comparisonSequence} />
        </ContainerScroll>
      </div>

      <motion.div
        className="relative z-20 mx-auto -mt-[20svh] h-[44svh] min-h-[360px] w-full max-w-[1280px] overflow-hidden px-0 md:h-[50svh] md:min-h-[420px]"
        style={{ opacity: keyboardOpacity, y: keyboardY }}
      >
        <SplineKeyboard
          onClick={toggleAi}
          aiActive={aiActive}
          bgColor={PAGE_BG}
          height="100%"
          className="mx-auto h-full w-full"
        />
      </motion.div>
    </section>
  );
}

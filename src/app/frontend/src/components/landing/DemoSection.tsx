import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SplineKeyboard from "@/components/three/SplineKeyboard";

const VIDEO_SRC = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const BORING_MSGS = [
  { user: "GuestPlayer", text: "nice move", time: "1:02" },
  { user: "chess_fan", text: "ok", time: "1:15" },
  { user: "watcher42", text: "gg", time: "1:34" },
  { user: "GuestPlayer", text: "...", time: "1:52" },
  { user: "anon", text: "is anyone watching?", time: "2:10" },
];

const HYPE_MSGS = [
  { user: "KingSlayer99", text: "WHAT A SACRIFICE 🔥🔥🔥", time: "1:02" },
  { user: "ChessLord", text: "HE CALCULATED 20 MOVES AHEAD omg", time: "1:05" },
  { user: "GrandmasterFan", text: "LIQUIDCHESS IS INSANE 🏆", time: "1:08" },
  { user: "SpectatorX", text: "pog pog pog this is unreal", time: "1:12" },
  { user: "watcher42", text: "AI COMMENTARY > human commentary ngl", time: "1:15" },
  { user: "chess_nerd", text: "LET'S GOOOOO 🎉🎉🎉", time: "1:18" },
  { user: "KingSlayer99", text: "how is this free lmaooo", time: "1:22" },
  { user: "QuickMoves", text: "POGGERS 🚀🔥💥", time: "1:25" },
];

function ChatBox({ aiActive }: { aiActive: boolean }) {
  const [messages, setMessages] = useState(aiActive ? HYPE_MSGS : BORING_MSGS);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(aiActive ? HYPE_MSGS : BORING_MSGS);
  }, [aiActive]);

  useEffect(() => {
    const msgList = aiActive ? HYPE_MSGS : BORING_MSGS;
    const interval = setInterval(() => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        const next = msgList[Math.floor(Math.random() * msgList.length)];
        setMessages((prev) => [
          ...prev.slice(-20),
          { ...next, time: new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }) },
        ]);
      }, 800);
    }, aiActive ? 1200 : 4000);
    return () => clearInterval(interval);
  }, [aiActive]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-white/8 bg-black/40 backdrop-blur-sm">
      <div className="px-3 py-2 border-b border-white/8 flex items-center gap-2 bg-white/3 flex-shrink-0">
        <div
          className={`w-2 h-2 rounded-full transition-all duration-500 ${
            aiActive
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              : "bg-white/20"
          }`}
        />
        <span className="text-white/60 text-xs font-mono">LIVE CHAT</span>
        <span className="ml-auto text-[10px] font-mono">
          {aiActive ? (
            <span className="text-[--gold]">✦ AI ENHANCED</span>
          ) : (
            <span className="text-white/25">default</span>
          )}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2 text-xs"
            >
              <span className={`font-medium shrink-0 ${aiActive ? "text-[--gold]" : "text-white/40"}`}>
                {msg.user}
              </span>
              <span className={aiActive ? "text-white/80" : "text-white/40"}>{msg.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {typing && (
          <div className="flex items-center gap-1 py-1">
            {[0, 1, 2].map((d) => (
              <motion.div
                key={d}
                className="w-1 h-1 rounded-full bg-white/30"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-2 border-t border-white/8 flex-shrink-0">
        <div className="rounded-lg px-3 py-1.5 text-white/20 text-xs bg-white/4 border border-white/6">
          Type a message...
        </div>
      </div>
    </div>
  );
}

function VideoPanel({ aiActive }: { aiActive: boolean }) {
  return (
    <div className="relative h-full rounded-xl overflow-hidden">
      {/* Base video — muted, no commentary */}
      <video
        src={VIDEO_SRC}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.75 }}
        muted
        autoPlay
        loop
        playsInline
      />
      <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded text-white/40 text-[10px] bg-black/50 backdrop-blur-sm font-mono">
        No commentary
      </div>

      {/* AI overlay — wipes in from left */}
      <div
        className="absolute inset-0 z-20"
        style={{
          clipPath: `inset(0 ${aiActive ? "0%" : "100%"} 0 0)`,
          transition: "clip-path 0.6s cubic-bezier(0.77,0,0.18,1)",
        }}
      >
        <video
          src={VIDEO_SRC}
          className="w-full h-full object-cover"
          muted={!aiActive}
          autoPlay
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#c9a84c]/10 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[--gold] text-[10px] font-mono bg-black/60 backdrop-blur-sm border border-[--gold]/30">
          ♟ AI Commentary LIVE
        </div>
      </div>

      {/* Slider divider */}
      <div
        className="absolute top-0 bottom-0 w-px z-30 bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.6)]"
        style={{
          left: aiActive ? "100%" : "0%",
          transition: "left 0.6s cubic-bezier(0.77,0,0.18,1)",
        }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-md" />
      </div>

      {/* Border */}
      <div className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none z-40" />
    </div>
  );
}

function Wire({ aiActive }: { aiActive: boolean }) {
  return (
    <div className="relative flex justify-center" style={{ height: 44 }}>
      <svg width="60" height="44" viewBox="0 0 60 44" fill="none" style={{ overflow: "visible" }}>
        {/* Shadow glow under active wire */}
        {aiActive && (
          <path
            d="M30 0 L30 44"
            stroke="rgba(201,168,76,0.3)"
            strokeWidth="10"
            strokeLinecap="round"
          />
        )}
        {/* Base cable */}
        <path
          d="M30 0 L30 44"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Active wire */}
        <path
          d="M30 0 L30 44"
          stroke={aiActive ? "#c9a84c" : "rgba(255,255,255,0.25)"}
          strokeWidth="2"
          strokeLinecap="round"
          style={{ transition: "stroke 0.5s ease" }}
        />
        {/* Plug connector at top */}
        <rect x="26" y="0" width="8" height="4" rx="1" fill={aiActive ? "#c9a84c" : "rgba(255,255,255,0.2)"} style={{ transition: "fill 0.5s" }} />
        {/* Plug connector at bottom */}
        <rect x="26" y="40" width="8" height="4" rx="1" fill={aiActive ? "#c9a84c" : "rgba(255,255,255,0.2)"} style={{ transition: "fill 0.5s" }} />
      </svg>
    </div>
  );
}

export function DemoSection() {
  const [aiActive, setAiActive] = useState(false);

  return (
    <div id="demo" className="snap-section relative flex flex-col overflow-hidden bg-[#060606]">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(201,168,76,0.06) 0%, transparent 70%)",
          opacity: aiActive ? 1 : 0.4,
        }}
      />

      {/* Header — compact */}
      <div className="flex-shrink-0 pt-10 pb-3 text-center px-6 relative z-10">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-[--gold] mb-2">Live Demo</p>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Ctrl+C. Ctrl+V.{" "}
          <span
            className="font-serif italic font-normal"
            style={{
              background: "linear-gradient(135deg,#c9a84c,#e4c87a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Game Changed.
          </span>
        </h2>
        <p className="text-white/30 text-xs mt-1.5 font-light">
          {aiActive ? "AI commentary is live — watch the chat explode" : "Click the keyboard to activate AI commentary"}
        </p>
      </div>

      {/* Demo card — video + chat */}
      <div className="flex-1 min-h-0 px-6 md:px-10 relative z-10">
        <motion.div
          className="h-full rounded-2xl overflow-hidden border border-white/8 bg-black/20 backdrop-blur-sm"
          style={{
            boxShadow: aiActive
              ? "0 0 60px rgba(201,168,76,0.15), 0 0 0 1px rgba(201,168,76,0.2)"
              : "0 8px 40px rgba(0,0,0,0.4)",
            transition: "box-shadow 0.7s ease",
          }}
        >
          <div className="h-full grid grid-cols-1 md:grid-cols-2">
            {/* Video */}
            <div className="relative min-h-[160px] md:min-h-0 border-r border-white/5">
              <div className="absolute inset-0 p-2">
                <VideoPanel aiActive={aiActive} />
              </div>
            </div>
            {/* Chat */}
            <div className="relative min-h-[140px] md:min-h-0">
              <div className="absolute inset-0 p-2">
                <ChatBox aiActive={aiActive} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Wire connecting card to keyboard */}
      <div className="flex-shrink-0 relative z-10">
        <Wire aiActive={aiActive} />
      </div>

      {/* Keyboard + hint */}
      <div className="flex-shrink-0 pb-4 px-6 flex flex-col items-center relative z-10">
        <div className="w-full max-w-xs">
          <SplineKeyboard onClick={() => setAiActive((v) => !v)} aiActive={aiActive} />
        </div>
        <motion.p
          className="text-white/20 text-[10px] font-mono mt-1 tracking-widest uppercase"
          animate={{ opacity: aiActive ? 0 : [0.4, 1, 0.4] }}
          transition={aiActive ? { duration: 0.3 } : { repeat: Infinity, duration: 2.5 }}
        >
          ↑ click to activate
        </motion.p>
      </div>
    </div>
  );
}

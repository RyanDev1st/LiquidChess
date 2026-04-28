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
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-white/8 bg-black/30 backdrop-blur-sm shadow-lg">
      <div className="px-3 py-2 border-b border-white/8 flex items-center gap-2 bg-white/3">
        <div className={`w-2 h-2 rounded-full ${aiActive ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-white/20"} transition-all duration-500`} />
        <span className="text-white/60 text-xs font-mono">LIVE CHAT</span>
        <span className="ml-auto text-white/25 text-[10px] font-mono">{aiActive ? "✦ AI ENHANCED" : "default"}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2 text-xs"
            >
              <span className="text-[--gold] font-medium shrink-0">{msg.user}</span>
              <span className="text-white/70">{msg.text}</span>
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
      <div className="px-3 py-2 border-t border-white/8">
        <div className="rounded-lg px-3 py-2 text-white/20 text-xs bg-white/4 border border-white/6">
          Type a message...
        </div>
      </div>
    </div>
  );
}

function VideoPanel({ aiActive }: { aiActive: boolean }) {
  return (
    <div className="relative h-full rounded-xl overflow-hidden">
      <video
        src={VIDEO_SRC}
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        muted
        autoPlay
        loop
        playsInline
      />
      <div className="absolute inset-0 flex items-end p-3 z-10">
        <div className="px-2 py-1 rounded text-white/30 text-xs bg-black/40 backdrop-blur-sm">
          No commentary
        </div>
      </div>
      <div
        className="absolute inset-0 z-20"
        style={{
          clipPath: `inset(0 ${aiActive ? "0%" : "100%"} 0 0)`,
          transition: "clip-path 0.5s cubic-bezier(0.77,0,0.18,1)",
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
        <div className="absolute inset-0 flex items-end p-3">
          <div className="px-2 py-1 rounded text-[--gold] text-xs font-mono bg-black/50 backdrop-blur-sm border border-[--gold]/30">
            ♟ AI Commentary LIVE
          </div>
        </div>
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 z-30 bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
        style={{
          left: aiActive ? "100%" : "0%",
          transition: "left 0.5s cubic-bezier(0.77,0,0.18,1)",
        }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-md" />
      </div>
    </div>
  );
}

function PowerWire({ aiActive }: { aiActive: boolean }) {
  return (
    <div className="relative w-full flex justify-center" style={{ height: 60 }}>
      <svg width="120" height="60" viewBox="0 0 120 60" fill="none">
        <path d="M60 0 C60 20, 20 20, 20 40 S60 65 60 60" stroke="rgba(0,0,0,0.4)" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path
          d="M60 0 C60 20, 20 20, 20 40 S60 65 60 60"
          stroke={aiActive ? "#c9a84c" : "rgba(255,255,255,0.25)"}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          style={{ transition: "stroke 0.5s ease" }}
        />
        {aiActive && (
          <path d="M60 0 C60 20, 20 20, 20 40 S60 65 60 60" stroke="rgba(201,168,76,0.4)" strokeWidth="8" fill="none" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

export function DemoSection() {
  const [aiActive, setAiActive] = useState(false);

  return (
    <div id="demo" className="snap-section relative flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 pt-12 pb-4 text-center px-6">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-[--gold] mb-3">Live Demo</p>
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Ctrl+C. Ctrl+V.{" "}
          <span
            className="font-serif italic"
            style={{
              background: "linear-gradient(135deg,#c9a84c,#e4c87a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Game Changed.
          </span>
        </h2>
        <p className="text-white/35 text-sm mt-2 font-light">Press the keyboard below to activate AI commentary</p>
      </div>

      {/* Demo card */}
      <div className="flex-1 px-6 md:px-12 min-h-0">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="min-h-[180px] md:min-h-0">
            <p className="text-white/30 text-[10px] font-mono uppercase tracking-wider mb-2 text-center">Experience</p>
            <div className="h-[calc(100%-1.5rem)]">
              <VideoPanel aiActive={aiActive} />
            </div>
          </div>
          <div className="flex flex-col min-h-[180px] md:min-h-0">
            <p className="text-white/30 text-[10px] font-mono uppercase tracking-wider mb-2 text-center">Chat</p>
            <div className="flex-1">
              <ChatBox aiActive={aiActive} />
            </div>
          </div>
        </div>
      </div>

      {/* Power wire + keyboard */}
      <div className="flex-shrink-0 flex flex-col items-center py-4">
        <PowerWire aiActive={aiActive} />
        <div className="w-full max-w-sm px-4">
          <SplineKeyboard onClick={() => setAiActive((v) => !v)} aiActive={aiActive} />
        </div>
        <motion.p
          className="text-white/25 text-xs font-mono mt-2 tracking-widest"
          animate={{ opacity: aiActive ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          ↑ CLICK TO ACTIVATE AI
        </motion.p>
      </div>
    </div>
  );
}

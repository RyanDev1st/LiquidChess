"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Marquee } from "@/components/ui/3d-testimonials";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Testimonial {
  name: string;
  username: string;
  body: string;
  img: string;
  tag: string;
  detail: string;
  usage: { label: string; value: string }[];
  portfolio?: {
    twitch?: { handle: string; followers: string };
    youtube?: { channel: string; subscribers: string };
    chesscom?: { username: string; rating: number };
    lichess?: { username: string; rating: number };
    twitter?: { handle: string };
  };
}

const testimonials: Testimonial[] = [
  {
    name: "Magnus C.",
    username: "@magnusc",
    body: "LiquidChess commentary is genuinely better than most human casters. Wild.",
    img: "https://randomuser.me/api/portraits/men/32.jpg",
    tag: "World Champion",
    detail: "I've been using LiquidChess during my training streams for 6 months. The AI catches nuances even seasoned commentators miss — pawn structure implications, hidden queen maneuvers. My audience retention doubled.",
    usage: [
      { label: "Games analyzed", value: "1,240" },
      { label: "Avg session", value: "3.2 hrs" },
      { label: "Viewer growth", value: "+180%" },
    ],
    portfolio: {
      twitch: { handle: "magnuscarlsen", followers: "1.5M" },
      youtube: { channel: "Magnus Carlsen", subscribers: "2.1M" },
      chesscom: { username: "DrNykterstein", rating: 2850 },
      lichess: { username: "DrNykterstein", rating: 3200 },
      twitter: { handle: "MagnusCarlsen" },
    },
  },
  {
    name: "Hikaru N.",
    username: "@hikarunaka",
    body: "I turned it on during a stream and chat went absolutely insane. 10/10.",
    img: "https://randomuser.me/api/portraits/men/44.jpg",
    tag: "Speedchess King",
    detail: "Speed chess demands instant takes. LiquidChess delivers commentary within 200ms of a move. My chat engagement spiked 4× the first night I used it. It's the co-host I never had.",
    usage: [
      { label: "Games analyzed", value: "3,800" },
      { label: "Avg session", value: "5.1 hrs" },
      { label: "Viewer growth", value: "+240%" },
    ],
    portfolio: {
      twitch: { handle: "hikaru", followers: "4.2M" },
      youtube: { channel: "Hikaru", subscribers: "1.8M" },
      chesscom: { username: "hikaru", rating: 2800 },
      lichess: { username: "hikaru", rating: 3100 },
      twitter: { handle: "GMHikaru" },
    },
  },
  {
    name: "Levy R.",
    username: "@levyroz",
    body: "My viewers keep asking if I have a co-host. It's the AI. Every time.",
    img: "https://randomuser.me/api/portraits/men/51.jpg",
    tag: "GothamChess",
    detail: "I was skeptical at first. After one stream the DMs were flooded: 'who's the new commentator?' Nobody believed it was AI until I showed them. It adapts its humor to the position — that's what gets me.",
    usage: [
      { label: "Games analyzed", value: "2,100" },
      { label: "Avg session", value: "4.0 hrs" },
      { label: "Viewer growth", value: "+160%" },
    ],
    portfolio: {
      youtube: { channel: "GothamChess", subscribers: "3.9M" },
      twitch: { handle: "gothamchess", followers: "1.8M" },
      chesscom: { username: "GothamChess", rating: 2600 },
      lichess: { username: "GothamChess", rating: 2900 },
      twitter: { handle: "GothamChess" },
    },
  },
  {
    name: "Anna P.",
    username: "@annap",
    body: "The voice quality is insane. It actually understands the game emotionally.",
    img: "https://randomuser.me/api/portraits/women/22.jpg",
    tag: "WGM",
    detail: "As a WGM, I care deeply about accuracy. LiquidChess doesn't just recite engine evaluations — it contextualizes moves within the middlegame narrative. Remarkable emotional intelligence for an AI.",
    usage: [
      { label: "Games analyzed", value: "890" },
      { label: "Avg session", value: "2.8 hrs" },
      { label: "Viewer growth", value: "+95%" },
    ],
    portfolio: {
      twitch: { handle: "annacramling", followers: "320K" },
      youtube: { channel: "Anna Cramling", subscribers: "580K" },
      chesscom: { username: "AnnaCramling", rating: 2400 },
      lichess: { username: "AnnaCramling", rating: 2700 },
      twitter: { handle: "AnnaCramling" },
    },
  },
  {
    name: "ChessBlitz",
    username: "@blitzmaster",
    body: "Went from 400 to 4000 concurrent viewers after adding AI commentary.",
    img: "https://randomuser.me/api/portraits/men/63.jpg",
    tag: "Streamer",
    detail: "I was averaging 400 viewers grinding blitz. Added LiquidChess on stream one Tuesday, hit 4k by Friday. The commentary creates a shared experience — even non-chess people watch because the AI makes it a narrative.",
    usage: [
      { label: "Games analyzed", value: "6,700" },
      { label: "Avg session", value: "6.5 hrs" },
      { label: "Viewer growth", value: "+900%" },
    ],
    portfolio: {
      twitch: { handle: "chessblitz", followers: "850K" },
      youtube: { channel: "ChessBlitz", subscribers: "1.2M" },
      chesscom: { username: "ChessBlitz", rating: 2500 },
      lichess: { username: "ChessBlitz", rating: 2800 },
    },
  },
  {
    name: "Judit P.",
    username: "@juditp",
    body: "Finally, commentary that keeps up with my calculation speed.",
    img: "https://randomuser.me/api/portraits/women/45.jpg",
    tag: "Legend",
    detail: "Human commentators always lag behind my calculation pace. LiquidChess processes and delivers faster than any human can react. It's the first AI commentary that doesn't feel like it's catching up.",
    usage: [
      { label: "Games analyzed", value: "430" },
      { label: "Avg session", value: "1.9 hrs" },
      { label: "Viewer growth", value: "+120%" },
    ],
    portfolio: {
      chesscom: { username: "JuditPolgar", rating: 2700 },
      lichess: { username: "JuditPolgar", rating: 3000 },
      twitter: { handle: "JuditPolgar" },
    },
  },
  {
    name: "Wesley S.",
    username: "@wesleyso",
    body: "It caught a tactic before my opponent did. I'm a believer.",
    img: "https://randomuser.me/api/portraits/men/28.jpg",
    tag: "Super GM",
    detail: "During a classical game, the AI flagged a bishop sacrifice two moves before either of us saw it, then explained the win precisely. At Super GM level that kind of real-time depth is extraordinary.",
    usage: [
      { label: "Games analyzed", value: "1,050" },
      { label: "Avg session", value: "3.6 hrs" },
      { label: "Viewer growth", value: "+200%" },
    ],
    portfolio: {
      twitch: { handle: "wesleystudy", followers: "180K" },
      youtube: { channel: "Wesley So", subscribers: "320K" },
      chesscom: { username: "WeslySo", rating: 2800 },
      lichess: { username: "WeslySo", rating: 3100 },
    },
  },
  {
    name: "Anish G.",
    username: "@anishg",
    body: "The AI called my novelty before the engine did. Genuinely impressive.",
    img: "https://randomuser.me/api/portraits/men/35.jpg",
    tag: "Elite GM",
    detail: "I played a prepared novelty in a tournament. LiquidChess identified the new idea instantly and explained its positional merits in seconds. I don't know how it does it, but the results speak for themselves.",
    usage: [
      { label: "Games analyzed", value: "780" },
      { label: "Avg session", value: "2.5 hrs" },
      { label: "Viewer growth", value: "+130%" },
    ],
    portfolio: {
      youtube: { channel: "Anish Giri", subscribers: "420K" },
      twitch: { handle: "anishgiri", followers: "280K" },
      chesscom: { username: "AnishGiri", rating: 2750 },
      lichess: { username: "AnishGiri", rating: 3050 },
      twitter: { handle: "AnishGiri" },
    },
  },
  {
    name: "Danya D.",
    username: "@danya_d",
    body: "This is what chess streaming was always missing. Liquid Chess delivers.",
    img: "https://randomuser.me/api/portraits/men/56.jpg",
    tag: "Analyst",
    detail: "I've covered hundreds of tournaments. The one thing that always frustrated me was the gap between what I saw on the board and what I could articulate to viewers fast enough. LiquidChess closes that gap completely.",
    usage: [
      { label: "Games analyzed", value: "2,900" },
      { label: "Avg session", value: "4.8 hrs" },
      { label: "Viewer growth", value: "+310%" },
    ],
    portfolio: {
      youtube: { channel: "Daniel Naroditsky", subscribers: "580K" },
      twitch: { handle: "danya_naroditsky", followers: "220K" },
      chesscom: { username: "DanielNaroditsky", rating: 2650 },
      lichess: { username: "DanielNaroditsky", rating: 2950 },
      twitter: { handle: "DanielNaroditsky" },
    },
  },
];

function TestimonialCard({
  testimonial,
  onSelect,
}: {
  testimonial: Testimonial;
  onSelect: (t: Testimonial) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="relative w-64 cursor-pointer select-none rounded-xl overflow-hidden border transition-all duration-300"
      style={{
        borderColor: hovered ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.08)",
        boxShadow: hovered ? "0 0 24px rgba(201,168,76,0.25), 0 0 60px rgba(201,168,76,0.1)" : "none",
      }}
      animate={{ scale: hovered ? 1.04 : 1 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(testimonial)}
    >
      <div className="glass-sm p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar className="size-9">
            <AvatarImage src={testimonial.img} alt={testimonial.name} />
            <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-semibold text-white/90">{testimonial.name}</p>
            <p className="text-[10px] text-[--gold] font-mono">{testimonial.tag}</p>
          </div>
        </div>
        <blockquote className="text-xs text-white/55 leading-relaxed">
          &ldquo;{testimonial.body}&rdquo;
        </blockquote>
      </div>
      {hovered && (
        <div className="absolute inset-0 bg-gradient-to-br from-[--gold]/8 to-transparent pointer-events-none" />
      )}
    </motion.div>
  );
}

function ProfileCard({ testimonial, onClose }: { testimonial: Testimonial; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);

  const p = testimonial.portfolio;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        <motion.div
          className="relative z-10"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          style={{ perspective: 1400 }}
        >
          {/* 3D flip card - larger */}
          <motion.div
            className="relative w-[420px] h-[520px] cursor-pointer"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
            onClick={() => setFlipped((f) => !f)}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-2xl border border-white/10 overflow-hidden flex flex-col items-center justify-center gap-6 p-8"
              style={{
                backfaceVisibility: "hidden",
                background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(201,168,76,0.08) 100%)",
                boxShadow: "0 0 100px rgba(201,168,76,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.12)_0%,transparent_70%)]" />
              <Avatar className="size-28 ring-2 ring-[--gold]/60 ring-offset-2 ring-offset-transparent shadow-lg shadow-[--gold]/20">
                <AvatarImage src={testimonial.img} alt={testimonial.name} />
                <AvatarFallback className="text-3xl">{testimonial.name[0]}</AvatarFallback>
              </Avatar>
              <div className="text-center relative z-10">
                <p className="text-2xl font-bold text-white">{testimonial.name}</p>
                <p className="text-base text-[--gold] font-mono mt-1">{testimonial.tag}</p>
                <p className="text-white/40 text-xs mt-1">{testimonial.username}</p>
              </div>
              <blockquote className="text-center text-sm text-white/70 leading-relaxed max-w-[320px] relative z-10">
                &ldquo;{testimonial.body}&rdquo;
              </blockquote>
              <div className="mt-auto">
                <p className="text-white/25 text-[10px] font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[--gold] animate-pulse" />
                  Click to flip & see their stats
                </p>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-2xl border border-[--gold]/25 overflow-hidden flex flex-col"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                boxShadow: "0 0 120px rgba(201,168,76,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-6 border-b border-white/8">
                <Avatar className="size-12 ring-1 ring-[--gold]/40">
                  <AvatarImage src={testimonial.img} alt={testimonial.name} />
                  <AvatarFallback className="text-lg">{testimonial.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-base font-bold text-white">{testimonial.name}</p>
                  <p className="text-xs text-[--gold] font-mono">{testimonial.tag}</p>
                </div>
              </div>

              {/* Bio */}
              <div className="px-6 py-4 flex-1 overflow-y-auto">
                <p className="text-sm text-white/70 leading-relaxed">{testimonial.detail}</p>
              </div>

              {/* Portfolio grid */}
              {p && (
                <div className="px-6 pb-4">
                  <p className="text-[10px] font-mono text-white/35 uppercase tracking-wider mb-2">Portfolio</p>
                  <div className="grid grid-cols-2 gap-2">
                    {p.twitch && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1f1f1f] border border-white/5">
                        <div className="w-6 h-6 rounded-full bg-[#9146FF] flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.715zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/90 truncate">Twitch</p>
                          <p className="text-[10px] text-white/50 truncate">{p.twitch.followers} followers</p>
                        </div>
                      </div>
                    )}
                    {p.youtube && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1f1f1f] border border-white/5">
                        <div className="w-6 h-6 rounded-full bg-[#FF0000] flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/90 truncate">YouTube</p>
                          <p className="text-[10px] text-white/50 truncate">{p.youtube.subscribers} subs</p>
                        </div>
                      </div>
                    )}
                    {p.chesscom && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1f1f1f] border border-white/5">
                        <div className="w-6 h-6 rounded-full bg-[#769656] flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/90 truncate">Chess.com</p>
                          <p className="text-[10px] text-white/50 truncate">{p.chesscom.rating} rating</p>
                        </div>
                      </div>
                    )}
                    {p.lichess && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1f1f1f] border border-white/5">
                        <div className="w-6 h-6 rounded-full bg-[#4A6B3D] flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/90 truncate">Lichess</p>
                          <p className="text-[10px] text-white/50 truncate">{p.lichess.rating} rating</p>
                        </div>
                      </div>
                    )}
                    {p.twitter && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1f1f1f] border border-white/5">
                        <div className="w-6 h-6 rounded-full bg-[#000000] flex items-center justify-center border border-white/10">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/90 truncate">X / Twitter</p>
                          <p className="text-[10px] text-white/50 truncate">@{p.twitter.handle}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stats bar */}
              <div className="border-t border-white/8 p-6 bg-black/20">
                <div className="grid grid-cols-3 gap-4">
                  {testimonial.usage.map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p
                        className="text-xl font-bold"
                        style={{
                          background: "linear-gradient(135deg,#c9a84c,#e4c87a)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {value}
                      </p>
                      <p className="text-[10px] text-white/35 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flip hint */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                <p className="text-white/20 text-[10px] font-mono flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Click to flip back
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export function TestimonialSection() {
  const [selected, setSelected] = useState<Testimonial | null>(null);

  const col1 = testimonials.slice(0, 2);
  const col2 = testimonials.slice(2, 4);
  const col3 = testimonials.slice(4, 6);
  const col4 = testimonials.slice(6, 8);
  const col5 = [...testimonials.slice(8, 9), ...testimonials.slice(0, 1)];

  return (
    <div id="testimonials" className="snap-section relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.05)_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-8 px-6 relative z-10 flex-shrink-0"
      >
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-[--gold] mb-4">Trusted by the elite</p>
        <h2 className="text-4xl md:text-5xl font-bold text-white">
          What the{" "}
          <span
            className="font-serif italic"
            style={{
              background: "linear-gradient(135deg,#c9a84c,#e4c87a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            players
          </span>{" "}
          say
        </h2>
        <p className="text-white/30 text-sm mt-2">Click any card to see their full story</p>
      </motion.div>

      {/* 90vw marquee block */}
      <div
        className="relative overflow-hidden flex-shrink-0 flex justify-center"
        style={{ width: "90vw", height: "65vh" }}
      >
        <div
          className="flex flex-row items-start gap-4 h-full"
          style={{
            transform: "translateY(0px) rotateX(8deg) rotateY(-3deg) rotateZ(3deg)",
            transformOrigin: "center center",
          }}
        >
          <Marquee vertical pauseOnHover repeat={3} className="[--duration:7.2s] h-full w-auto">
            {col1.map((r) => <TestimonialCard key={r.username} testimonial={r} onSelect={setSelected} />)}
          </Marquee>
          <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:7.2s] h-full w-auto">
            {col2.map((r) => <TestimonialCard key={r.username} testimonial={r} onSelect={setSelected} />)}
          </Marquee>
          <Marquee vertical pauseOnHover repeat={3} className="[--duration:7.2s] h-full w-auto">
            {col3.map((r) => <TestimonialCard key={r.username} testimonial={r} onSelect={setSelected} />)}
          </Marquee>
          <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:7.2s] h-full w-auto">
            {col4.map((r) => <TestimonialCard key={r.username} testimonial={r} onSelect={setSelected} />)}
          </Marquee>
          <Marquee vertical pauseOnHover repeat={3} className="[--duration:7.2s] h-full w-auto">
            {col5.map((r) => <TestimonialCard key={r.username} testimonial={r} onSelect={setSelected} />)}
          </Marquee>
        </div>

        {/* Gradient masks */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/5 bg-gradient-to-b from-[#070707]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-[#070707]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#070707]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#070707]" />
      </div>

      {selected && <ProfileCard testimonial={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

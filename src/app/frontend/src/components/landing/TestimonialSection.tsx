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
          style={{ perspective: 1200 }}
        >
          {/* 3D flip card */}
          <motion.div
            className="relative w-[380px] h-[480px] cursor-pointer"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
            onClick={() => setFlipped((f) => !f)}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-2xl border border-white/10 overflow-hidden flex flex-col items-center justify-center gap-5 p-8"
              style={{
                backfaceVisibility: "hidden",
                background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(201,168,76,0.06) 100%)",
                boxShadow: "0 0 80px rgba(201,168,76,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              <Avatar className="size-24 ring-2 ring-[--gold]/50 ring-offset-2 ring-offset-transparent">
                <AvatarImage src={testimonial.img} alt={testimonial.name} />
                <AvatarFallback className="text-2xl">{testimonial.name[0]}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{testimonial.name}</p>
                <p className="text-sm text-[--gold] font-mono mt-1">{testimonial.tag}</p>
                <p className="text-white/40 text-xs mt-1">{testimonial.username}</p>
              </div>
              <blockquote className="text-center text-sm text-white/70 leading-relaxed italic max-w-[280px]">
                &ldquo;{testimonial.body}&rdquo;
              </blockquote>
              <p className="text-white/20 text-[10px] font-mono mt-4">Click to flip →</p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-2xl border border-[--gold]/20 overflow-hidden flex flex-col p-8 gap-5"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(255,255,255,0.04) 100%)",
                boxShadow: "0 0 80px rgba(201,168,76,0.25), inset 0 1px 0 rgba(201,168,76,0.15)",
              }}
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={testimonial.img} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-white">{testimonial.name}</p>
                  <p className="text-xs text-[--gold]">{testimonial.tag}</p>
                </div>
              </div>

              <p className="text-sm text-white/70 leading-relaxed flex-1">{testimonial.detail}</p>

              <div className="border-t border-white/8 pt-4 grid grid-cols-3 gap-3">
                {testimonial.usage.map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p
                      className="text-lg font-bold"
                      style={{
                        background: "linear-gradient(135deg,#c9a84c,#e4c87a)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {value}
                    </p>
                    <p className="text-white/35 text-[10px] mt-0.5">{label}</p>
                  </div>
                ))}
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

  const col1 = testimonials.slice(0, 3);
  const col2 = testimonials.slice(3, 6);
  const col3 = testimonials.slice(6, 9);
  const col4 = [...testimonials.slice(0, 2), ...testimonials.slice(7, 9)];

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
        className="relative overflow-hidden flex-shrink-0"
        style={{ width: "90vw", height: "65vh" }}
      >
        <div
          className="flex flex-row items-start gap-4 h-full"
          style={{
            transform: "translateY(0px) rotateX(8deg) rotateY(-3deg) rotateZ(3deg)",
            transformOrigin: "center center",
          }}
        >
          <Marquee vertical pauseOnHover repeat={3} className="[--duration:35s] h-full w-auto">
            {col1.map((r) => <TestimonialCard key={r.username} testimonial={r} onSelect={setSelected} />)}
          </Marquee>
          <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:42s] h-full w-auto">
            {col2.map((r) => <TestimonialCard key={r.username} testimonial={r} onSelect={setSelected} />)}
          </Marquee>
          <Marquee vertical pauseOnHover repeat={3} className="[--duration:28s] h-full w-auto">
            {col3.map((r) => <TestimonialCard key={r.username} testimonial={r} onSelect={setSelected} />)}
          </Marquee>
          <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:50s] h-full w-auto">
            {col4.map((r) => <TestimonialCard key={r.username} testimonial={r} onSelect={setSelected} />)}
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

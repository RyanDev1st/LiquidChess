import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { HoverPeek } from "@/components/ui/link-preview";

const ROWS = [
  {
    label: "Liquid Chess",
    links: [
      { title: "Features", href: "#features" },
      { title: "Voices", href: "#voices" },
      { title: "API", href: "#" },
      { title: "Changelog", href: "#" },
      { title: "Docs", href: "#" },
      { title: "Support", href: "#" },
      { title: "About", href: "#" },
    ],
  },
  {
    label: "For",
    links: [
      { title: "Streamers", href: "#" },
      { title: "Commentators", href: "#" },
      { title: "Champions", href: "#" },
      { title: "Creators", href: "#" },
    ],
  },
  {
    label: "Social",
    links: [
      { title: "Twitter / X", href: "https://twitter.com/liquidchess" },
      { title: "YouTube", href: "https://youtube.com/@liquidchess" },
      { title: "Twitch", href: "https://twitch.tv/liquidchess" },
      { title: "GitHub", href: "https://github.com/liquidchess" },
    ],
  },
  {
    label: "Community",
    links: [
      { title: "Discord", href: "#" },
      { title: "Help Center", href: "#" },
      { title: "Blog", href: "#" },
      { title: "Status", href: "#" },
    ],
  },
];

export function FooterSection() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [gridFontSize, setGridFontSize] = useState(112);

  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 640) setGridFontSize(44);
      else if (window.innerWidth < 1024) setGridFontSize(72);
      else setGridFontSize(112);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  }

  return (
    <div id="footer" className="snap-section relative flex flex-col bg-[#070707] overflow-hidden">

      {/* ── Top block: nav rows (left) + subscribe (right) ── */}
      <div className="flex-1 flex flex-col gap-6 min-h-0 pt-10 pb-4 px-6 md:flex-row md:gap-0 md:px-14 border-t border-white/6">

        {/* Nav rows — CodePen-style label + links on same horizontal line */}
        <div className="flex-1 flex flex-col justify-center space-y-5 max-w-3xl">
          {ROWS.map(({ label, links }, rowIdx) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: rowIdx * 0.06, duration: 0.5 }}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-2"
            >
              <span
                className="font-bold text-lg md:text-xl tracking-tight min-w-[136px]"
                style={{
                  background: "linear-gradient(135deg,#c9a84c,#e4c87a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {label}
              </span>
              {links.map((link) => (
                <HoverPeek key={link.title} url={link.href}>
                  <a
                    href={link.href}
                    className="text-white/40 hover:text-white/90 text-xs md:text-sm transition-colors duration-200"
                  >
                    {link.title}
                  </a>
                </HoverPeek>
              ))}
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-white/6 mx-10 self-stretch flex-shrink-0" />

        {/* Subscribe — right side, vertically centered */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex-shrink-0 w-72 flex flex-col justify-center gap-4"
        >
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-[--gold] mb-2">Stay Updated</p>
            <h3 className="text-xl font-bold text-white leading-snug">
              Get notified of{" "}
              <span
                className="font-serif italic font-normal"
                style={{
                  background: "linear-gradient(135deg,#c9a84c,#e4c87a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                latest updates
              </span>
            </h3>
            <p className="text-white/35 text-xs mt-1">New voices, features, and releases — delivered first.</p>
          </div>
          {submitted ? (
            <p className="text-[--gold] text-sm font-mono">✓ You're on the list.</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-[--gold]/50 transition-colors"
              />
              <button
                type="submit"
                className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg,#c9a84c,#e4c87a)" }}
              >
                Subscribe
              </button>
            </form>
          )}
        </motion.div>
      </div>

      {/* ── Thin divider ── */}
      <div className="h-px bg-white/6 mx-0 flex-shrink-0" />

      {/* ── Elevate YOUR Experience — FlickeringGrid banner ── */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ height: "clamp(180px, 24svh, 250px)" }}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-transparent to-[#070707] z-10 pointer-events-none" />
        <FlickeringGrid
          text="Elevate YOUR Experience"
          fontSize={gridFontSize}
          fontWeight={700}
          color="#c9a84c"
          flickerChance={0.1}
          maxOpacity={0.28}
          className="absolute inset-0"
        />
      </div>

      {/* ── Copyright bar ── */}
      <div className="flex-shrink-0 px-8 md:px-16 py-5 border-t border-white/6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-serif italic text-white/60 text-sm">Liquid</span>
          <span className="font-bold text-white/60 text-sm">Chess</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[--gold]/60" />
        </div>
        <p className="text-white/20 text-xs font-mono">
          © {year} Liquid Chess. All rights reserved.
        </p>
        <p className="text-white/15 text-xs font-mono hidden md:block">
          Built with intention. Designed for the game.
        </p>
      </div>
    </div>
  );
}

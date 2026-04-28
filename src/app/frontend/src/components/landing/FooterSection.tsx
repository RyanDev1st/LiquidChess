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

  return (
    <div id="footer" className="snap-section relative flex flex-col bg-[#070707] overflow-hidden">
      {/* Flickering grid banner */}
      <div className="relative border-t border-white/6 overflow-hidden flex-shrink-0" style={{ height: "200px" }}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-transparent z-10 pointer-events-none" />
        <FlickeringGrid
          text="Elevate YOUR Experience"
          fontSize={68}
          fontWeight={700}
          color="#c9a84c"
          flickerChance={0.1}
          maxOpacity={0.18}
          className="absolute inset-0"
        />
      </div>

      {/* CodePen-style horizontal rows */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 pb-8">
        <div className="space-y-5 max-w-5xl">
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
                className="font-bold text-base md:text-lg tracking-tight min-w-[120px]"
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
                    className="text-white/40 hover:text-white/90 text-sm transition-colors duration-200"
                  >
                    {link.title}
                  </a>
                </HoverPeek>
              ))}
            </motion.div>
          ))}
        </div>

        {/* Bottom strip */}
        <div className="mt-10 pt-5 border-t border-white/6 flex flex-wrap items-center justify-between gap-4">
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
    </div>
  );
}

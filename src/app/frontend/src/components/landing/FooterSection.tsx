import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { HoverPeek } from "@/components/ui/link-preview";

const footerLinks = [
  {
    label: "Product",
    links: [
      { title: "Features", href: "#features" },
      { title: "Voices", href: "#voices" },
      { title: "API", href: "#" },
      { title: "Changelog", href: "#" },
    ],
  },
  {
    label: "Company",
    links: [
      { title: "About Us", href: "#" },
      { title: "Blog", href: "#" },
      { title: "Privacy Policy", href: "#" },
      { title: "Terms of Service", href: "#" },
    ],
  },
  {
    label: "Resources",
    links: [
      { title: "Docs", href: "#" },
      { title: "Discord", href: "#" },
      { title: "Help Center", href: "#" },
      { title: "Status", href: "#" },
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
];

const HOOKS = [
  { primary: "Liquid Chess", secondary: "for commentators" },
  { primary: "Liquid Chess", secondary: "for streamers" },
  { primary: "Liquid Chess", secondary: "for champions" },
  { primary: "Liquid Chess", secondary: "for creators" },
];

type AnimatedContainerProps = {
  delay?: number;
  className?: ComponentProps<typeof motion.div>["className"];
  children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: AnimatedContainerProps) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <>{children}</>;
  return (
    <motion.div
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FooterSection() {
  const year = new Date().getFullYear();

  return (
    <div id="footer" className="snap-section relative flex flex-col bg-[#070707] overflow-hidden">
      {/* Flickering grid banner — "Elevate YOUR Experience" */}
      <div className="relative border-t border-white/6 overflow-hidden" style={{ height: "220px" }}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-transparent z-10 pointer-events-none" />
        <FlickeringGrid
          text="Elevate YOUR Experience"
          fontSize={72}
          fontWeight={700}
          color="#c9a84c"
          flickerChance={0.1}
          maxOpacity={0.18}
          className="absolute inset-0"
        />
      </div>

      {/* CodePen-style horizontal hooks */}
      <div className="relative z-20 px-6 md:px-12 py-6 border-b border-white/6">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 max-w-5xl mx-auto">
          {HOOKS.map(({ primary, secondary }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="flex items-baseline gap-2"
            >
              <span
                className="font-bold text-2xl md:text-3xl tracking-tight"
                style={{
                  background: "linear-gradient(135deg,#c9a84c,#e4c87a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {primary}
              </span>
              <span className="text-white/35 text-sm md:text-base font-light">{secondary}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer links */}
      <div className="flex-1 px-8 py-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-8">
          {/* Brand column */}
          <AnimatedContainer className="col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-serif italic text-white text-xl">Liquid</span>
              <span className="font-bold text-white text-lg">Chess</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[--gold]" />
            </div>
            <p className="text-white/35 text-xs leading-relaxed">
              AI-powered commentary for every game. Built for champions, streamers, and fans alike.
            </p>
            <p className="text-white/20 text-xs font-mono mt-6">
              © {year} Liquid Chess. All rights reserved.
            </p>
          </AnimatedContainer>

          {/* Link columns */}
          {footerLinks.map((section, i) => (
            <AnimatedContainer key={section.label} delay={0.1 + i * 0.08}>
              <div>
                <p className="text-white/50 text-[10px] font-mono uppercase tracking-widest mb-4">
                  {section.label}
                </p>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.title}>
                      <HoverPeek url={link.href}>
                        <a
                          href={link.href}
                          className="text-white/30 hover:text-white text-sm transition-colors duration-200 inline-flex items-center"
                        >
                          {link.title}
                        </a>
                      </HoverPeek>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedContainer>
          ))}
        </div>

        {/* Bottom tagline */}
        <div className="mt-10 pt-5 border-t border-white/6 text-center">
          <p className="text-white/15 text-xs font-mono">
            Built with intention. Designed for the game.
          </p>
        </div>
      </div>
    </div>
  );
}

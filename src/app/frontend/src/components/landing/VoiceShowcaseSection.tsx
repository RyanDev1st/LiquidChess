import { motion } from "framer-motion";
import { Logos3 } from "@/components/ui/logos3";
import ExpandOnHover from "@/components/ui/expand-cards";

export function VoiceShowcaseSection() {
  return (
    <div id="voices" className="snap-section flex flex-col overflow-hidden relative">
      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#070707] to-transparent z-10 pointer-events-none" />

      {/* Trusted sub-block */}
      <div className="relative z-10 pt-16 pb-8 px-6">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center text-xs font-mono uppercase tracking-[0.3em] text-[--gold] mb-4"
        >
          Built for the community
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-center text-4xl md:text-6xl font-semibold tracking-tight text-white mb-2"
        >
          Trusted by the{" "}
          <span
            className="font-serif italic font-normal"
            style={{
              background: "linear-gradient(135deg, #c9a84c, #e4c87a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            best
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-center text-white/35 text-sm mb-10"
        >
          Leagues, streamers, creators worldwide
        </motion.p>
        <Logos3 />
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto max-w-3xl" />

      {/* Voice cards */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xs font-mono uppercase tracking-[0.35em] text-[--gold]/80 mb-6"
        >
          Choose your voice
        </motion.p>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="text-center text-xl md:text-2xl font-light text-white/70 tracking-wide mb-8"
        >
          Your game. Their voice.
        </motion.h3>
        <ExpandOnHover />
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#070707] to-transparent z-10 pointer-events-none" />
    </div>
  );
}

import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does Liquid Chess AI commentary work?",
    a: "Our engine analyzes each position in real-time using a combination of engine evaluation and a large language model trained on thousands of grandmaster games. It generates natural, contextual commentary that matches the energy of the position.",
  },
  {
    q: "Which voices are available?",
    a: "We offer a growing library of commentator voices — from calm analytical styles to high-energy hype casters. Each voice has a unique personality and vocabulary built from real chess commentary data.",
  },
  {
    q: "Does it work with any chess platform?",
    a: "Liquid Chess integrates with Chess.com, Lichess, and any platform that supports PGN export. Our browser extension enables real-time overlay on supported sites.",
  },
  {
    q: "Can I use it during my livestreams?",
    a: "Absolutely. LiquidChess is built for streamers. It outputs audio directly to your stream setup and can be controlled with keyboard shortcuts (Ctrl+C / Ctrl+V) without interrupting your broadcast.",
  },
  {
    q: "What about latency — will it keep up with blitz games?",
    a: "Our inference pipeline runs in under 200ms, making it suitable for blitz and even bullet games. For rapid and classical games, commentary is richer and more detailed.",
  },
  {
    q: "Is there a free tier?",
    a: "Yes. The free tier includes 5 hours of commentary per month with access to 3 voices. Pro unlocks unlimited hours, all voices, and API access for custom integrations.",
  },
  {
    q: "Can I train a custom voice?",
    a: "Custom voice training is available on our Enterprise plan. You provide 10+ hours of voice samples and we fine-tune a model that matches your style.",
  },
];

export function FAQSection() {
  return (
    <div id="faq" className="snap-section relative flex flex-col items-center justify-center px-6 py-16 overflow-y-auto">
      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.04)_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12 relative z-10"
      >
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-[--gold] mb-4">Got questions?</p>
        <h2 className="text-4xl md:text-6xl font-bold text-white">
          We have{" "}
          <span
            className="font-serif italic"
            style={{ background: "linear-gradient(135deg,#c9a84c,#e4c87a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            answers
          </span>
        </h2>
      </motion.div>

      <div className="w-full max-w-2xl relative z-10">
        <Accordion type="single" collapsible className="space-y-0">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <AccordionItem value={`item-${i}`} className="mb-2">
                <AccordionTrigger className="text-sm font-medium">{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

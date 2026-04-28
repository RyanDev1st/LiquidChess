import { useState, lazy, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HookSection } from "@/components/landing/HookSection";
import { Header } from "@/components/layout/Header";

const HeroSection = lazy(() => import("@/components/landing/HeroSection").then(m => ({ default: m.HeroSection })));
const VoiceShowcaseSection = lazy(() => import("@/components/landing/VoiceShowcaseSection").then(m => ({ default: m.VoiceShowcaseSection })));
const DemoSection = lazy(() => import("@/components/landing/DemoSection").then(m => ({ default: m.DemoSection })));
const TestimonialSection = lazy(() => import("@/components/landing/TestimonialSection").then(m => ({ default: m.TestimonialSection })));
const CTASection = lazy(() => import("@/components/landing/CTASection").then(m => ({ default: m.CTASection })));
const FAQSection = lazy(() => import("@/components/landing/FAQSection").then(m => ({ default: m.FAQSection })));
const FooterSection = lazy(() => import("@/components/landing/FooterSection").then(m => ({ default: m.FooterSection })));

function SectionLoader() {
  return (
    <div className="snap-section flex items-center justify-center">
      <div className="dot-overtaking" />
    </div>
  );
}

export function LandingPage() {
  const [hookDone, setHookDone] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  return (
    <>
      <AnimatePresence>
        {!hookDone && (
          <motion.div
            key="hook"
            className="fixed inset-0 z-[100]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HookSection onComplete={() => setHookDone(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed header outside snap container */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ visibility: hookDone ? "visible" : "hidden" }}>
        <Header />
      </div>

      <div
        ref={containerRef}
        className="snap-container"
        style={{ visibility: hookDone ? "visible" : "hidden" }}
        aria-hidden={!hookDone}
      >
        <Suspense fallback={<SectionLoader />}>
          <HeroSection containerRef={containerRef} />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <VoiceShowcaseSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <DemoSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <TestimonialSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <CTASection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <FAQSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <FooterSection />
        </Suspense>
      </div>
    </>
  );
}

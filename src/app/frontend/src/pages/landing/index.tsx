import { useState, lazy, Suspense, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HookSection } from "@/components/landing/HookSection";
import { Header } from "@/components/layout/Header";

const SECTION_COUNT = 7;
const SNAP_DURATION = 650;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function isInsideScrollable(target: EventTarget | null, container: HTMLElement): boolean {
  let node = target as HTMLElement | null;
  while (node && node !== container) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) return true;
    node = node.parentElement;
  }
  return false;
}

function useSnapScroll(containerRef: React.RefObject<HTMLElement>, enabled: boolean) {
  const idxRef = useRef(0);
  const animating = useRef(false);
  const accDelta = useRef(0);
  const accTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownUntil = useRef(0);

  const goTo = useCallback((next: number) => {
    const el = containerRef.current;
    if (!el || animating.current) return;
    const clamped = Math.max(0, Math.min(SECTION_COUNT - 1, next));
    if (clamped === idxRef.current) return;
    idxRef.current = clamped;
    animating.current = true;
    accDelta.current = 0;
    if (accTimer.current) { clearTimeout(accTimer.current); accTimer.current = null; }

    const from = el.scrollTop;
    const to = clamped * window.innerHeight;
    const t0 = performance.now();

    function tick(now: number) {
      const t = Math.min((now - t0) / SNAP_DURATION, 1);
      el.scrollTop = from + (to - from) * easeInOutCubic(t);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        el.scrollTop = to;
        animating.current = false;
        accDelta.current = 0;
        cooldownUntil.current = performance.now() + 800;
      }
    }
    requestAnimationFrame(tick);
  }, [containerRef]);

  // Reset to section 0 when snap scroll activates
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = 0;
    idxRef.current = 0;
    cooldownUntil.current = 0;
    accDelta.current = 0;
  }, [enabled, containerRef]);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      if (isInsideScrollable(e.target, el!)) return;
      e.preventDefault();
      if (animating.current || performance.now() < cooldownUntil.current) return;

      const dy = e.deltaY;
      if (Math.abs(dy) >= 80) {
        accDelta.current = 0;
        if (accTimer.current) clearTimeout(accTimer.current);
        goTo(idxRef.current + (dy > 0 ? 1 : -1));
        return;
      }
      accDelta.current += dy;
      if (accTimer.current) clearTimeout(accTimer.current);
      if (Math.abs(accDelta.current) >= 60) {
        const dir = accDelta.current > 0 ? 1 : -1;
        accDelta.current = 0;
        goTo(idxRef.current + dir);
      } else {
        accTimer.current = setTimeout(() => { accDelta.current = 0; }, 200);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); goTo(idxRef.current + 1); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); goTo(idxRef.current - 1); }
    }

    let touchY = 0;
    function onTouchStart(e: TouchEvent) { touchY = e.touches[0].clientY; }
    function onTouchEnd(e: TouchEvent) {
      const dy = touchY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 50) goTo(idxRef.current + (dy > 0 ? 1 : -1));
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [containerRef, enabled, goTo]);
}

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
  useSnapScroll(containerRef, hookDone);

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

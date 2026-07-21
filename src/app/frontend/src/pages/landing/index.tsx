import { useState, lazy, Suspense, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HookSection } from "@/components/landing/HookSection";
import { Header } from "@/components/layout/Header";

const SECTION_COUNT = 7;
const FREE_SCROLL_UNTIL = 3; // sections 0 (Hero), 1 (VoiceShowcase), 2 (Demo) free-scroll; 3+ snap
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

function getSectionOffset(container: HTMLElement, idx: number): number {
  const child = container.children[idx] as HTMLElement | undefined;
  return child ? child.offsetTop : idx * window.innerHeight;
}

function getIdxFromScrollTop(container: HTMLElement, scrollTop: number): number {
  const children = container.children;
  let idx = 0;
  for (let i = 0; i < children.length; i++) {
    if ((children[i] as HTMLElement).offsetTop <= scrollTop + 1) idx = i;
    else break;
  }
  return Math.min(idx, SECTION_COUNT - 1);
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
    const to = getSectionOffset(el, clamped);
    const t0 = performance.now();

    const tick = (now: number) => {
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
    };
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
      const freeEnd = getSectionOffset(el!, FREE_SCROLL_UNTIL);
      if (el!.scrollTop < freeEnd) {
        accDelta.current = 0; // reset stale delta when in free zone
        return;
      }
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
      const freeEnd = getSectionOffset(el!, FREE_SCROLL_UNTIL);
      if (el!.scrollTop < freeEnd) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); goTo(idxRef.current + 1); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); goTo(idxRef.current - 1); }
    }

    let touchY = 0;
    function onTouchStart(e: TouchEvent) { touchY = e.touches[0].clientY; }
    function onTouchEnd(e: TouchEvent) {
      const freeEnd = getSectionOffset(el!, FREE_SCROLL_UNTIL);
      if (el!.scrollTop < freeEnd) return;
      const dy = touchY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 50) goTo(idxRef.current + (dy > 0 ? 1 : -1));
    }

    let syncTimer: ReturnType<typeof setTimeout> | null = null;
    function onScroll() {
      if (animating.current) return;
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        const cur = containerRef.current;
        if (!cur) return;
        idxRef.current = getIdxFromScrollTop(cur, cur.scrollTop);
      }, 50);
    }

    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("keydown", onKeyDown);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("scroll", onScroll);
      if (syncTimer) clearTimeout(syncTimer);
    };
  }, [containerRef, enabled, goTo]);
}

const loadHeroSection = () => import("@/components/landing/HeroSection");
const loadVoiceShowcaseSection = () => import("@/components/landing/VoiceShowcaseSection");
const loadDemoSection = () => import("@/components/landing/DemoSection");
const loadTestimonialSection = () => import("@/components/landing/TestimonialSection");
const loadCTASection = () => import("@/components/landing/CTASection");
const loadFAQSection = () => import("@/components/landing/FAQSection");
const loadFooterSection = () => import("@/components/landing/FooterSection");

const SECTION_LOADERS = [
  loadHeroSection,
  loadVoiceShowcaseSection,
  loadDemoSection,
  loadTestimonialSection,
  loadCTASection,
  loadFAQSection,
  loadFooterSection,
];

const HeroSection = lazy(() => loadHeroSection().then(m => ({ default: m.HeroSection })));
const VoiceShowcaseSection = lazy(() => loadVoiceShowcaseSection().then(m => ({ default: m.VoiceShowcaseSection })));
const DemoSection = lazy(() => loadDemoSection().then(m => ({ default: m.DemoSection })));
const TestimonialSection = lazy(() => loadTestimonialSection().then(m => ({ default: m.TestimonialSection })));
const CTASection = lazy(() => loadCTASection().then(m => ({ default: m.CTASection })));
const FAQSection = lazy(() => loadFAQSection().then(m => ({ default: m.FAQSection })));
const FooterSection = lazy(() => loadFooterSection().then(m => ({ default: m.FooterSection })));

function SectionLoader() {
  return (
    <div className="snap-section flex items-center justify-center">
      <div className="dot-overtaking" />
    </div>
  );
}

function DemoSectionLoader() {
  return (
    <div className="relative bg-black flex items-start justify-center pt-40" style={{ minHeight: '220svh' }}>
      <div className="dot-overtaking" />
    </div>
  );
}

export function LandingPage() {
  const [hookDone, setHookDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useSnapScroll(containerRef, hookDone);

  useEffect(() => {
    if (hookDone) return;

    let cancelled = false;
    const timeoutHandles: number[] = [];
    const idleHandles: number[] = [];
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    SECTION_LOADERS.forEach((loader, index) => {
      const timeout = window.setTimeout(() => {
        if (cancelled) return;

        const run = () => {
          if (!cancelled) loader().catch(() => undefined);
        };

        if (win.requestIdleCallback) {
          idleHandles.push(win.requestIdleCallback(run, { timeout: 2400 }));
        } else {
          timeoutHandles.push(window.setTimeout(run, 0));
        }
      }, 900 + index * 260);

      timeoutHandles.push(timeout);
    });

    return () => {
      cancelled = true;
      timeoutHandles.forEach(window.clearTimeout);
      if (win.cancelIdleCallback) idleHandles.forEach(win.cancelIdleCallback);
    };
  }, [hookDone]);

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

      {hookDone && (
        <div ref={containerRef} className="snap-container">
          <Suspense fallback={<SectionLoader />}>
            <HeroSection containerRef={containerRef} />
          </Suspense>
          <Suspense fallback={<SectionLoader />}>
            <VoiceShowcaseSection />
          </Suspense>
          <Suspense fallback={<DemoSectionLoader />}>
            <DemoSection containerRef={containerRef} />
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
      )}
    </>
  );
}

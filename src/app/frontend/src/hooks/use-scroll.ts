import { useState, useEffect } from "react";

export function useScroll(threshold = 10): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.querySelector(".snap-container") ?? window;

    const onScroll = () => {
      const scrollTop = el instanceof Window ? el.scrollY : (el as Element).scrollTop;
      setScrolled(scrollTop > threshold);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

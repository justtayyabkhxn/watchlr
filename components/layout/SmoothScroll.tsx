"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Lenis-powered inertia scrolling for the whole page. Renders nothing.
 * - Skipped entirely under prefers-reduced-motion (native scroll instead).
 * - Touch devices keep native momentum scroll (Lenis default).
 * - Nested scroll areas opt out with data-lenis-prevent.
 */
export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.11, // a touch floatier than default, still snappy enough for a UI
      anchors: true,
      wheelMultiplier: 1,
    });
    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Route changes must land at the top instantly — gliding from the previous
  // page's scroll position reads as broken, not smooth.
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}

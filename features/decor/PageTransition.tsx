"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Entrance transition for page content. Lives in each route group's
 * template.tsx so it re-runs on every navigation while the group's
 * layout (navbar, footer) stays mounted and still.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  if (reduceMotion) return <>{children}</>;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        // Once the entrance settles, drop the lingering transform/filter that
        // framer-motion leaves behind. Any transform/filter other than `none`
        // makes this wrapper a containing block for fixed-position descendants,
        // which would anchor overlays (e.g. theatre mode) to it instead of the
        // viewport. Clearing to `none` is visually identical to the end state.
        const el = ref.current;
        if (el) {
          el.style.transform = "none";
          el.style.filter = "none";
          el.style.willChange = "auto";
        }
      }}
    >
      {children}
    </motion.div>
  );
}

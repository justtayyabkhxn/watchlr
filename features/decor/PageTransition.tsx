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
      // transform + opacity only — both GPU-composited. An animated blur()
      // filter here forced a full-page repaint per frame and stuttered badly
      // on mobile WebViews.
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        // Once the entrance settles, drop the lingering transform that
        // framer-motion leaves behind. Any transform other than `none`
        // makes this wrapper a containing block for fixed-position descendants,
        // which would anchor overlays (e.g. theatre mode) to it instead of the
        // viewport. Clearing to `none` is visually identical to the end state.
        const el = ref.current;
        if (el) {
          el.style.transform = "none";
          el.style.willChange = "auto";
        }
      }}
    >
      {children}
    </motion.div>
  );
}

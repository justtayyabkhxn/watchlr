"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Entrance transition for page content. Lives in each route group's
 * template.tsx so it re-runs on every navigation while the group's
 * layout (navbar, footer) stays mounted and still.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

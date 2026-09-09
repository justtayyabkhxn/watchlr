"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle } from "lucide-react";

/**
 * The always-there way into the conversation — a sticker that sits in the
 * bottom corner of every page.
 *
 * It hides on `/tonight` itself (nothing worse than a button that goes
 * where you already are) and on the auth screens, which have their own
 * focused layout. On phones it rides above the tab bar rather than over it.
 */
export function TonightFab() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const hidden =
    pathname.startsWith("/tonight") ||
    ["/login", "/register", "/forgot-password", "/reset-password"].includes(pathname);

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.6, y: 12 }}
          transition={{ type: "spring", stiffness: 400, damping: 24 }}
          className="fixed bottom-20 right-5 z-40 md:bottom-6 md:right-6"
        >
          <Link
            href="/tonight"
            aria-label="ask what to watch"
            className="group flex items-center gap-2 rounded-full border-2 border-ink bg-accent py-2.5 pl-3 pr-3 shadow-offset transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-offset-lg active:translate-x-[4px] active:translate-y-[4px] active:shadow-none sm:pr-4"
          >
            <MessageCircle
              className="size-5 shrink-0 group-hover:animate-wiggle"
              strokeWidth={2.5}
              aria-hidden
            />
            {/* the label is a desktop nicety; the icon carries it on phones */}
            <span className="hidden text-sm font-black sm:inline">ask me</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

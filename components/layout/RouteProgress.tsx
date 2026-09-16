"use client";

import { Suspense, useCallback, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RotateCcw, X } from "lucide-react";
import { LoadingMessage } from "@/components/ui/LoadingMessage";

/**
 * Instant feedback for every navigation in the app.
 *
 * Two things make this work, and both are deliberate:
 *
 * 1. **The indicator is painted by a DOM write, not by React state.** Next's
 *    `<Link>` performs the navigation inside `startTransition`. Any `setState`
 *    in that same tick is folded into the transition, which React treats as
 *    non-urgent — so a state-driven spinner does not paint until the
 *    navigation has already resolved. Measured on this app, that meant a full
 *    second of a completely unchanged page after a click. Setting an attribute
 *    on `<html>` sidesteps React's scheduler entirely and lands in the very
 *    next frame.
 *
 * 2. **The markup is always mounted**, hidden by CSS. Revealing it costs a
 *    class match, not a render, so there is nothing for the scheduler to delay.
 *
 * The staging (see globals.css): `data-navigating` shows the top bar in the
 * same frame as the click; `data-navigating-slow` follows ~260ms later and
 * softens the outgoing page and shows a small note. Fast navigations
 * therefore only ever show the bar. Deliberately quiet — no overlay, no
 * backdrop, nothing blocked: the bar answers "did my click land?", the note
 * says what's happening, and the route's own skeleton shows what's coming.
 */
function RouteProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const failsafe = useRef<number | null>(null);
  const slowTimer = useRef<number | null>(null);

  const stop = useCallback(() => {
    const el = document.documentElement;
    el.removeAttribute("data-navigating");
    el.removeAttribute("data-navigating-slow");
    el.removeAttribute("data-navigating-stalled");
    for (const t of [failsafe, slowTimer]) {
      if (t.current !== null) {
        clearTimeout(t.current);
        t.current = null;
      }
    }
  }, []);

  // The new route has committed (or the user went back) — stand down. Keyed on
  // the serialized query too, so /search?genre=35 → /search?genre=27 clears.
  const query = searchParams.toString();
  useEffect(() => stop(), [pathname, query, stop]);

  useEffect(() => {
    function start() {
      const el = document.documentElement;
      // Stage one, in this very frame: the top bar.
      el.setAttribute("data-navigating", "");

      if (slowTimer.current !== null) clearTimeout(slowTimer.current);
      // Stage two: only if the navigation is genuinely taking a while do we
      // soften the page and show the note. Anything faster than this and the
      // user just sees the new page arrive.
      slowTimer.current = window.setTimeout(
        () => el.setAttribute("data-navigating-slow", ""),
        260,
      );

      if (failsafe.current !== null) clearTimeout(failsafe.current);
      /* Stage three. Nine seconds in, this navigation is not arriving —
         the server render is hung, the RSC fetch died, or the click never
         became a navigation at all. Clearing the indicator silently (what
         this used to do) leaves the user on an unchanged page with no idea
         anything failed and nothing to press. So the note turns into a
         retry, and the outgoing page comes back to full opacity because it
         is now the only page they have. */
      failsafe.current = window.setTimeout(() => {
        el.removeAttribute("data-navigating");
        el.setAttribute("data-navigating-stalled", "");
      }, 9000);
    }

    function onClick(e: MouseEvent) {
      // Modified clicks open a new tab — this document isn't going anywhere.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) {
        return;
      }
      /* Nearest of "a link" or "a control", not just the nearest link. Cards
         nest real buttons inside their <Link> (the poster's want-to-watch and
         watched actions), and those handlers call preventDefault — so the
         click reaches the anchor in the capture phase but never becomes a
         navigation. Starting here would leave the indicator running with
         nothing to stop it: no pathname change, so the effect below never
         fires, and nine seconds later the user is told the page failed to
         load while the thing they clicked worked fine. A control closer to
         the target than the anchor is handling this click itself. */
      const hit = (e.target as Element | null)?.closest?.(
        "a[href], button, input, select, textarea, [role='button']",
      );
      if (!hit || hit.tagName !== "A") return;
      const anchor = hit as HTMLAnchorElement;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      // Opt-out for links that deliberately don't feel like a page change.
      if (anchor.dataset.noNavProgress !== undefined) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same destination, or a pure hash jump — nothing to wait on.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      start();
    }

    function onPopState() {
      start();
    }

    // Capture phase: this runs before React's root listener, so the attribute
    // is set even though Link will call preventDefault a moment later.
    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
      stop();
    };
  }, [stop]);

  return (
    <>
      <div
        aria-hidden
        className="nav-bar pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-accent-soft"
      >
        <span className="block h-full w-full origin-left animate-crawl bg-accent" />
      </div>

      {/* Shown only once a navigation has stalled. Pointer events stay on —
          unlike the other two, this one is meant to be clicked. */}
      <div className="nav-stalled fixed left-1/2 top-20 z-[96] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 -rotate-1 items-center gap-3 rounded-full border-2 border-ink bg-card py-1.5 pl-4 pr-1.5 shadow-offset-sm">
        <span className="text-xs font-bold text-ink">that page isn&apos;t loading.</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-accent px-3 py-1 text-xs font-black shadow-offset-xs transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <RotateCcw className="size-3" aria-hidden />
          reload
        </button>
        <button
          type="button"
          onClick={stop}
          aria-label="dismiss"
          className="grid size-6 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      {/* A sticker chip, not a panel: small, tucked under the sticky h-16
          navbar, and only ever shown on a navigation that's actually taking a
          while. The softened page behind it supplies the contrast. */}
      <div className="nav-note pointer-events-none fixed left-1/2 top-20 z-[95] -translate-x-1/2 -rotate-1 items-center rounded-full border-2 border-ink bg-card px-4 py-1.5 shadow-offset-xs">
        <LoadingMessage context="generic" icon={null} className="text-xs text-ink" />
      </div>
    </>
  );
}

export function RouteProgress() {
  // useSearchParams needs a Suspense boundary to keep statically rendered
  // routes (login, register, …) from being forced to client-render.
  return (
    <Suspense fallback={null}>
      <RouteProgressInner />
    </Suspense>
  );
}

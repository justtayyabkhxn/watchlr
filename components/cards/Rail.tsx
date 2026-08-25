"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";

/**
 * Horizontally scrollable card rail.
 * - Touch: native momentum scroll.
 * - Mouse: true grab-and-drag (1:1, no scroll-smooth fighting the pointer),
 *   with click suppression so a drag never opens a card by accident.
 * - Arrows: smooth programmatic paging.
 */
export function Rail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ startX: 0, startScroll: 0, moved: 0, pointerId: -1, pressed: false });
  // velocity in px/ms, sampled during the drag so release can glide
  const momentum = useRef({ velocity: 0, lastX: 0, lastT: 0, raf: 0 });
  const [dragging, setDragging] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft + el.clientWidth > el.scrollWidth - 8);
  };

  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({
      left: dir * ref.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  const stopMomentum = () => {
    cancelAnimationFrame(momentum.current.raf);
    momentum.current.velocity = 0;
  };

  useEffect(() => {
    const m = momentum.current;
    return () => cancelAnimationFrame(m.raf);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    // touch gets native scrolling; mouse gets grab-to-drag
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    stopMomentum();
    momentum.current.lastX = e.clientX;
    momentum.current.lastT = e.timeStamp;
    drag.current = {
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: 0,
      pointerId: e.pointerId,
      pressed: true,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !drag.current.pressed) return;
    if (!(e.buttons & 1)) {
      // button was released outside the rail — stale press, not a drag
      drag.current.pressed = false;
      return;
    }
    const dx = e.clientX - drag.current.startX;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
    if (!dragging) {
      // don't capture the pointer until this is clearly a drag, otherwise
      // plain clicks never reach the cards or their quick-action buttons
      if (drag.current.moved <= 8) return;
      el.setPointerCapture(drag.current.pointerId);
      setDragging(true);
    }
    el.scrollLeft = drag.current.startScroll - dx;

    // sample velocity, lightly smoothed so one jittery frame doesn't dominate
    const dt = e.timeStamp - momentum.current.lastT;
    if (dt > 0) {
      const v = (e.clientX - momentum.current.lastX) / dt;
      momentum.current.velocity = momentum.current.velocity * 0.4 + v * 0.6;
      momentum.current.lastX = e.clientX;
      momentum.current.lastT = e.timeStamp;
    }
  };

  const endDrag = () => {
    const wasDragging = dragging;
    drag.current.pressed = false;
    setDragging(false);

    // let go with speed → glide with exponential decay, like native fling
    if (!wasDragging || Math.abs(momentum.current.velocity) < 0.25) return;
    let v = momentum.current.velocity;
    let last = performance.now();
    const glide = (now: number) => {
      const el = ref.current;
      if (!el) return;
      const dt = now - last;
      last = now;
      el.scrollLeft -= v * dt;
      v *= Math.pow(0.994, dt);
      if (Math.abs(v) > 0.02) momentum.current.raf = requestAnimationFrame(glide);
    };
    momentum.current.raf = requestAnimationFrame(glide);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    // a real drag shouldn't count as a click on a card
    if (drag.current.moved > 8) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = 0;
    }
  };

  return (
    <div className="group/rail relative">
      <div
        ref={ref}
        onScroll={update}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={`no-scrollbar -mx-6 flex gap-4 overflow-x-auto overscroll-x-contain px-6 pb-2 pt-1 sm:gap-5 ${
          dragging
            ? "cursor-grabbing select-none *:pointer-events-none"
            : "cursor-grab"
        }`}
      >
        {children}
      </div>

      <p className="pointer-events-none absolute -top-9 right-0 hidden items-center gap-1.5 text-[11px] font-black text-muted sm:flex">
        <MoveHorizontal className="size-3.5" aria-hidden /> drag
      </p>

      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label={`Scroll ${label} left`}
        disabled={atStart}
        className="absolute -left-3 top-[35%] z-10 grid size-11 place-items-center rounded-full border-2 border-ink bg-card shadow-offset-sm transition-all duration-150 hover:bg-accent-soft active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-0 max-sm:hidden"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label={`Scroll ${label} right`}
        disabled={atEnd}
        className="absolute -right-3 top-[35%] z-10 grid size-11 place-items-center rounded-full border-2 border-ink bg-card shadow-offset-sm transition-all duration-150 hover:bg-accent-soft active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-0 max-sm:hidden"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

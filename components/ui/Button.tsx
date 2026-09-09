"use client";

import { forwardRef, useCallback, useRef, useState } from "react";
import { ThinkingDots } from "./Loader";

type Variant = "primary" | "accent" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

/* Solid variants get a hard offset shadow that "presses in" on click */
const pressable =
  "shadow-offset-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-offset active:translate-x-[3px] active:translate-y-[3px] active:shadow-none";

const variants: Record<Variant, string> = {
  primary: `bg-ink text-white hover:bg-accent hover:text-ink ${pressable}`,
  accent: `border-2 border-ink bg-accent text-ink hover:bg-accent-soft ${pressable}`,
  outline: `border-2 border-ink bg-card text-ink hover:bg-surface-hover ${pressable}`,
  ghost: "bg-transparent text-muted hover:bg-surface-hover hover:text-ink active:scale-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Force the pending state. Async `onClick`s are detected automatically. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", loading, className = "", children, disabled, onClick, ...props },
    ref,
  ) {
    /* If an onClick returns a promise, show the pending state for its duration
       without every call site having to thread its own boolean. A click that
       kicks off real work should never look like a click that did nothing. */
    const [awaiting, setAwaiting] = useState(false);
    const alive = useRef(true);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        const result = onClick?.(e) as unknown;
        if (!(result instanceof Promise)) return;
        alive.current = true;
        setAwaiting(true);
        // Settle either way — an error still ends the wait; surfacing it is
        // the caller's job.
        result.finally(() => {
          if (alive.current) setAwaiting(false);
        });
      },
      [onClick],
    );

    const pending = loading || awaiting;

    return (
      <button
        ref={ref}
        disabled={disabled || pending}
        onClick={handleClick}
        aria-busy={pending || undefined}
        className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {/* dots, not a spinning ring — nothing in this UI spins freely */}
        {pending && <ThinkingDots />}
        {children}
      </button>
    );
  },
);

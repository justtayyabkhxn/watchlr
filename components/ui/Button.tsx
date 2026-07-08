import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

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
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", loading, className = "", children, disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);

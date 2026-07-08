type Tone = "soft" | "accent" | "ink" | "outline";

const tones: Record<Tone, string> = {
  soft: "bg-accent-soft text-ink",
  accent: "bg-accent text-ink",
  ink: "bg-ink text-white",
  outline: "border-2 border-ink text-ink",
};

export function Badge({
  tone = "soft",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Rotated sticker-style badge, allthingswtf-style. */
export function Sticker({
  className = "",
  rotate = "-rotate-3",
  children,
}: {
  className?: string;
  rotate?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-2 border-ink bg-accent px-3 py-1.5 text-xs font-black text-ink shadow-offset-xs ${rotate} ${className}`}
    >
      {children}
    </span>
  );
}

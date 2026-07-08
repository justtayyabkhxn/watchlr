"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";

/** Clears the cached AI picks, then re-renders the page to regenerate. */
export function ReshuffleButton() {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const busy = clearing || isPending;

  async function reshuffle() {
    setClearing(true);
    try {
      await fetch("/api/ai/picks", { method: "DELETE" });
    } finally {
      setClearing(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <button
      type="button"
      onClick={reshuffle}
      disabled={busy}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 self-center rounded-full border-2 border-ink bg-card px-3.5 text-xs font-black shadow-offset-xs transition-all duration-150 hover:-translate-x-px hover:-translate-y-px hover:bg-accent-soft hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
    >
      <Shuffle className={`size-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden />
      {busy ? "reshuffling…" : "reshuffle"}
    </button>
  );
}

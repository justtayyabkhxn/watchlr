"use client";

import Link from "next/link";
import { Clapperboard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <span
          className="inline-grid size-20 -rotate-6 animate-float place-items-center rounded-3xl border-2 border-ink bg-accent-soft shadow-sticker"
          aria-hidden
        >
          <Clapperboard className="size-9" strokeWidth={2.25} />
        </span>
        <p className="overline-track mt-6 text-accent">Cut! Something broke</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          That scene didn&apos;t load.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Something went sideways on our end. A retry usually fixes it.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>
            <RotateCcw className="size-4" aria-hidden /> Try again
          </Button>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border-2 border-ink bg-card px-6 text-sm font-bold shadow-offset-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-surface-hover hover:shadow-offset active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

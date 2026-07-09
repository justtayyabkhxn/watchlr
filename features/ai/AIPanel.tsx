"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Drama,
  EyeOff,
  Globe,
  HelpCircle,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { SummaryType } from "@/models/AISummary";
import type { MediaType } from "@/types/tmdb";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

const TABS: { type: SummaryType; label: string; icon: typeof Sparkles; spoilers: boolean }[] = [
  { type: "should_i_watch", label: "Should I watch?", icon: HelpCircle, spoilers: false },
  { type: "internet_verdict", label: "The internet's verdict", icon: Globe, spoilers: false },
  { type: "spoiler_free", label: "Spoiler-free", icon: EyeOff, spoilers: false },
  { type: "themes", label: "Themes", icon: Drama, spoilers: false },
  { type: "detailed", label: "Full plot", icon: BookOpen, spoilers: true },
  { type: "ending_explained", label: "The ending", icon: TriangleAlert, spoilers: true },
];

export function AIPanel({
  tmdbId,
  mediaType,
  title,
}: {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
}) {
  const [active, setActive] = useState<SummaryType>("should_i_watch");
  const [spoilerOk, setSpoilerOk] = useState<Record<string, boolean>>({});

  const tab = TABS.find((t) => t.type === active)!;
  const gated = tab.spoilers && !spoilerOk[active];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ai-summary", mediaType, tmdbId, active],
    enabled: !gated,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<{ content: string }> => {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType, summaryType: active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "AI request failed");
      return json;
    },
  });

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-offset">
      <div className="flex flex-wrap gap-1.5 border-b-2 border-border p-4" role="tablist" aria-label="AI summary types">
        {TABS.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            role="tab"
            aria-selected={active === type}
            onClick={() => setActive(type)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all duration-150 sm:text-sm ${
              active === type
                ? "-rotate-1 bg-ink text-white shadow-offset-xs"
                : "text-muted hover:-translate-y-0.5 hover:bg-surface-hover hover:text-ink"
            }`}
          >
            <Icon className="size-3.5 max-[420px]:hidden" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-72 p-7 sm:p-8" role="tabpanel">
        {gated ? (
          <div className="flex flex-col items-start gap-3 py-4">
            <p className="flex items-center gap-2 font-black">
              <TriangleAlert className="size-5 text-accent" aria-hidden />
              This one spoils {title}.
            </p>
            <p className="text-sm text-muted">
              {active === "ending_explained"
                ? "The ending, dissected in full. Only proceed if you've seen it (or truly don't care)."
                : "The complete plot, twists included."}
            </p>
            <Button
              size="sm"
              variant="accent"
              onClick={() => setSpoilerOk({ ...spoilerOk, [active]: true })}
            >
              Spoil me
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-sm font-bold text-muted">
              <Sparkles className="size-4 animate-pulse text-accent" aria-hidden />
              Thinking about {title}…
            </p>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : isError ? (
          <div className="py-2">
            <p className="text-sm font-bold">{(error as Error).message}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {data?.content.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="text-base leading-relaxed text-ink">
                {para}
              </p>
            ))}
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
              <Sparkles className="size-3" aria-hidden /> AI-generated — may get details wrong
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

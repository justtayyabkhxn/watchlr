"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, RefreshCw, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

interface TasteResponse {
  content?: string;
  insufficient?: boolean;
  error?: string;
}

/** "your taste, explained" — the AI reads the user's history and has notes. */
export function TasteRoast() {
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["taste-roast"],
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<TasteResponse> => {
      const res = await fetch("/api/ai/taste");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "The roast fell through.");
      return json;
    },
  });

  const reroast = useMutation({
    mutationFn: async () => {
      await fetch("/api/ai/taste", { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taste-roast"] }),
  });

  // Not enough history to judge — stay quiet instead of roasting thin air.
  if (data?.insufficient) return null;

  return (
    <section className="min-w-0 rounded-3xl border-2 border-ink bg-card p-6 shadow-offset sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 -rotate-6 place-items-center rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs">
            <Flame className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-black leading-tight">Your taste, explained</h2>
            <p className="text-xs font-bold text-muted">The AI read your history. It has notes.</p>
          </div>
        </div>
        {data?.content && (
          <Button
            size="sm"
            variant="outline"
            loading={reroast.isPending}
            onClick={() => reroast.mutate()}
            className="group"
          >
            <RefreshCw className="size-3.5 group-hover:animate-wiggle" aria-hidden />
            Roast me again
          </Button>
        )}
      </div>

      <div className="mt-5">
        {isLoading || reroast.isPending ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-bold text-muted">
              <Sparkles className="size-4 animate-pulse text-accent" aria-hidden />
              Judging you…
            </p>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : isError ? (
          <div>
            <p className="text-sm font-bold">{(error as Error).message}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.content?.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="max-w-3xl text-[15px] leading-relaxed text-ink">
                {para}
              </p>
            ))}
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
              <Sparkles className="size-3" aria-hidden /> AI-generated from your real logs — new watches rewrite it
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

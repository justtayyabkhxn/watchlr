"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareQuote, Trash2, TriangleAlert } from "lucide-react";
import type { MediaType } from "@/types/tmdb";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";

interface ReviewItem {
  id: string;
  author: string;
  username: string | null;
  isMine: boolean;
  rating: number | null;
  content: string;
  hasSpoilers: boolean;
  createdAt: string;
}

function SpoilerGuard({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  if (revealed) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className="w-full rounded-2xl bg-surface-hover px-4 py-6 text-sm font-bold text-muted transition-colors hover:bg-accent-soft hover:text-ink"
    >
      <span className="inline-flex items-center gap-2">
        <TriangleAlert className="size-4 text-accent" aria-hidden />
        Spoilers inside — tap to reveal
      </span>
    </button>
  );
}

export function Reviews({ tmdbId, mediaType }: { tmdbId: number; mediaType: MediaType }) {
  const { status: authStatus } = useSession();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [hasSpoilers, setHasSpoilers] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", mediaType, tmdbId],
    queryFn: async (): Promise<{ reviews: ReviewItem[] }> => {
      const res = await fetch(`/api/reviews?tmdbId=${tmdbId}&mediaType=${mediaType}`);
      return res.json();
    },
  });

  const post = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType, content, hasSpoilers }),
      });
      if (!res.ok) throw new Error("Failed to post");
    },
    onSuccess: () => {
      setContent("");
      setHasSpoilers(false);
      qc.invalidateQueries({ queryKey: ["reviews", mediaType, tmdbId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/reviews?id=${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews", mediaType, tmdbId] }),
  });

  const reviews = data?.reviews ?? [];

  return (
    <div className="space-y-6">
      {authStatus === "authenticated" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (content.trim().length >= 3) post.mutate();
          }}
          className="rounded-3xl border-2 border-border bg-card p-5"
        >
          <Textarea
            placeholder="What did you think? (Posting again replaces your earlier review.)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label="Your review"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-muted">
              <input
                type="checkbox"
                checked={hasSpoilers}
                onChange={(e) => setHasSpoilers(e.target.checked)}
                className="size-4 accent-[#f59e52]"
              />
              Contains spoilers
            </label>
            <Button type="submit" size="sm" loading={post.isPending} disabled={content.trim().length < 3}>
              Post review
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-3xl border-2 border-dashed border-border bg-card p-5 text-sm text-muted">
          <Link href="/login" className="font-bold text-ink underline decoration-accent decoration-2 underline-offset-2">
            Sign in
          </Link>{" "}
          to leave a review.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <MessageSquareQuote className="size-4" aria-hidden />
          No reviews yet — be the first.
        </p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-3xl border-2 border-border bg-card p-5">
              <div className="mb-2 flex items-center gap-3">
                <span className="grid size-9 -rotate-3 place-items-center rounded-full bg-accent-soft text-sm font-black">
                  {r.author.replace(/^@/, "")[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">
                    {r.username ? (
                      <Link
                        href={`/${r.username}`}
                        className="hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-4"
                      >
                        {r.author}
                      </Link>
                    ) : (
                      r.author
                    )}
                    {r.rating != null && (
                      <span className="ml-2 rounded-full bg-surface-hover px-2 py-0.5 text-xs font-bold text-muted">
                        {r.rating}/10
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {r.isMine && (
                  <button
                    type="button"
                    onClick={() => remove.mutate(r.id)}
                    aria-label="Delete your review"
                    className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-ink"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              {r.hasSpoilers ? (
                <SpoilerGuard>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
                </SpoilerGuard>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

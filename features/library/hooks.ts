"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MediaType } from "@/types/tmdb";
import type { LibraryStatus } from "@/models/Watchlist";

export interface TitlePayload {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  voteAverage?: number;
  genreIds?: number[];
  releaseDate?: string;
  runtime?: number;
}

export function useLibraryStatus(tmdbId: number, mediaType: MediaType, enabled = true) {
  return useQuery({
    queryKey: ["library-status", mediaType, tmdbId],
    enabled,
    queryFn: async (): Promise<LibraryStatus | null> => {
      const res = await fetch(`/api/library?tmdbId=${tmdbId}&mediaType=${mediaType}`);
      if (res.status === 401) return null;
      const data = await res.json();
      return data.status ?? null;
    },
  });
}

export function useSetStatus(item: TitlePayload) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: LibraryStatus | null) => {
      if (status === null) {
        await fetch(`/api/library?tmdbId=${item.tmdbId}&mediaType=${item.mediaType}`, {
          method: "DELETE",
        });
        return null;
      }
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, status }),
      });
      if (!res.ok) throw new Error("Failed to update library");
      return status;
    },
    onSuccess: (status) => {
      qc.setQueryData(["library-status", item.mediaType, item.tmdbId], status);
      qc.invalidateQueries({ queryKey: ["library"] });
      // "completed" cross-writes a history row server-side, and any status
      // change moves the dashboard's completed count
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useTitleHistory(tmdbId: number, mediaType: MediaType, enabled = true) {
  return useQuery({
    queryKey: ["history", mediaType, tmdbId],
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/history?tmdbId=${tmdbId}&mediaType=${mediaType}`);
      if (res.status === 401) return { entries: [] as { seasonNumber: number | null; episodeNumber: number | null; playCount: number; watchedAt: string }[] };
      return res.json() as Promise<{
        entries: { seasonNumber: number | null; episodeNumber: number | null; playCount: number; watchedAt: string }[];
      }>;
    },
  });
}

export function useLogWatch(item: TitlePayload) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (episode?: {
      seasonNumber?: number;
      episodeNumber?: number;
      runtime?: number | null;
      source?: "log" | "stream";
    }) => {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...item,
          runtime: episode?.runtime ?? item.runtime ?? 0,
          seasonNumber: episode?.seasonNumber,
          episodeNumber: episode?.episodeNumber,
          source: episode?.source ?? "log",
        }),
      });
      if (!res.ok) throw new Error("Failed to log watch");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history"] });
      // logging cross-writes the "completed" shelf server-side and changes
      // every dashboard/achievement total
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["library-status", item.mediaType, item.tmdbId] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUnlogWatch(item: TitlePayload) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (episode?: { seasonNumber: number; episodeNumber: number }) => {
      const qs = new URLSearchParams({
        tmdbId: String(item.tmdbId),
        mediaType: item.mediaType,
      });
      if (episode) {
        qs.set("seasonNumber", String(episode.seasonNumber));
        qs.set("episodeNumber", String(episode.episodeNumber));
      }
      await fetch(`/api/history?${qs}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useRatings(tmdbId: number, mediaType: MediaType) {
  return useQuery({
    queryKey: ["ratings", mediaType, tmdbId],
    queryFn: async () => {
      const res = await fetch(`/api/ratings?tmdbId=${tmdbId}&mediaType=${mediaType}`);
      return res.json() as Promise<{
        mine: number | null;
        average: number | null;
        count: number;
        distribution: number[];
      }>;
    },
  });
}

export function useSetRating(tmdbId: number, mediaType: MediaType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (value: number) => {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType, value }),
      });
      if (!res.ok) throw new Error("Failed to rate");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ratings", mediaType, tmdbId] });
      // review cards embed the reviewer's rating badge; stats count ratings
      qc.invalidateQueries({ queryKey: ["reviews", mediaType, tmdbId] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

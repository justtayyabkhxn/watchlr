"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListPlus, Plus } from "lucide-react";
import type { TitlePayload } from "./hooks";

interface CollectionSummary {
  id: string;
  name: string;
  items: { tmdbId: number; mediaType: string }[];
}

export function AddToCollection({ item }: { item: TitlePayload }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data } = useQuery({
    queryKey: ["collections"],
    enabled: open,
    queryFn: async (): Promise<{ collections: CollectionSummary[] }> => {
      const res = await fetch("/api/collections");
      if (!res.ok) return { collections: [] };
      return res.json();
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, inList }: { id: string; inList: boolean }) => {
      await fetch("/api/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: inList ? "remove" : "add",
          item: {
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath,
          },
        }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      // Immediately add the current title to the new list
      await fetch("/api/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: json.id,
          action: "add",
          item: {
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath,
          },
        }),
      });
    },
    onSuccess: () => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-border bg-card px-4 text-sm font-bold text-muted transition-colors hover:border-accent hover:text-ink"
      >
        <ListPlus className="size-4" aria-hidden />
        Add to list
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-20 w-64 rounded-2xl border-2 border-border bg-card p-3 shadow-lift">
          {(data?.collections ?? []).length === 0 && (
            <p className="px-1 pb-2 text-xs font-semibold text-muted">
              No lists yet — make your first one:
            </p>
          )}
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {(data?.collections ?? []).map((c) => {
              const inList = c.items.some(
                (i) => i.tmdbId === item.tmdbId && i.mediaType === item.mediaType,
              );
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ id: c.id, inList })}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors hover:bg-surface-hover"
                  >
                    <span className="truncate">{c.name}</span>
                    {inList && <Check className="size-4 shrink-0 text-accent" strokeWidth={3} />}
                  </button>
                </li>
              );
            })}
          </ul>
          <form
            className="mt-2 flex gap-1.5 border-t-2 border-border pt-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) create.mutate(newName.trim());
            }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New list name"
              aria-label="New list name"
              className="h-9 min-w-0 flex-1 rounded-xl border-2 border-border bg-background px-3 text-sm focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newName.trim() || create.isPending}
              aria-label="Create list"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent disabled:opacity-50"
            >
              <Plus className="size-4" strokeWidth={3} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Check, Lock, Plus, Trophy, X } from "lucide-react";
import { StickerField, type StickerSpec } from "@/features/decor/Doodads";

const PAGE_STICKERS: StickerSpec[] = [
  { icon: "star", className: "right-[2%] top-16 hidden lg:block", tilt: 10, delay: "0.3s" },
  { icon: "trophy", className: "right-[10%] top-48 hidden xl:block", tilt: -8, delay: "1.2s", size: "sm" },
];
import { GENRES, formatHours } from "@/lib/media";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";

interface Profile {
  name: string;
  username: string;
  email: string;
  bio: string;
  favoriteGenres: string[];
  favoriteActors: string[];
  createdAt: string;
}

interface StatsTotals {
  totals: { watches: number; minutes: number; titles: number; completed: number; reviews: number; ratings: number };
}

const GENRE_CHOICES = [...new Set(Object.values(GENRES))].sort();

function achievements(t: StatsTotals["totals"]) {
  return [
    { name: "First frame", desc: "Log your first watch", earned: t.watches >= 1 },
    { name: "Double digits", desc: "Log 10 watches", earned: t.watches >= 10 },
    { name: "Century club", desc: "Log 100 watches", earned: t.watches >= 100 },
    { name: "Day one", desc: "Watch 24+ hours total", earned: t.minutes >= 1440 },
    { name: "Finisher", desc: "Complete 5 titles", earned: t.completed >= 5 },
    { name: "Critic", desc: "Write 3 reviews", earned: t.reviews >= 3 },
    { name: "Judge", desc: "Rate 10 titles", earned: t.ratings >= 10 },
    { name: "Explorer", desc: "Watch 25 unique titles", earned: t.titles >= 25 },
  ];
}

export function ProfileView() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile> => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<StatsTotals> => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
  });

  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [actors, setActors] = useState<string[]>([]);
  const [actorInput, setActorInput] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (profile) {
      setBio(profile.bio);
      setUsername(profile.username);
      setGenres(profile.favoriteGenres);
      setActors(profile.favoriteActors);
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, username, favoriteGenres: genres, favoriteActors: actors }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to save");
      }
    },
    onSuccess: () => {
      setDirty(false);
      setSaveError("");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err) => setSaveError(err instanceof Error ? err.message : "Failed to save"),
  });

  if (isLoading || !profile) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-14">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  const t = stats?.totals;

  return (
    <div className="relative mx-auto max-w-4xl px-6 pb-24">
      <StickerField items={PAGE_STICKERS} />
      <header className="flex flex-wrap items-center gap-6 pb-10 pt-10 sm:pt-14">
        {/* avatar + identity stay side by side even on mobile */}
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <span className="grid size-16 shrink-0 -rotate-6 place-items-center rounded-2xl border-2 border-ink bg-accent text-2xl font-black shadow-offset-sm sm:size-24 sm:rounded-3xl sm:text-4xl">
            {profile.name[0]}
          </span>
          <div className="min-w-0">
            <p className="overline-track text-accent">Member since {new Date(profile.createdAt).getFullYear()}</p>
            <h1 className="text-offset mt-1 truncate text-2xl font-black tracking-tight sm:text-5xl">{profile.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-muted sm:text-sm">
              {profile.username && (
                <a
                  href={`/${profile.username}`}
                  title="View your public profile"
                  className="inline-block -rotate-1 rounded-full border-2 border-ink bg-accent-soft px-2 py-0.5 text-xs font-black text-ink shadow-offset-xs transition-transform hover:rotate-1 hover:scale-105"
                >
                  @{profile.username}
                </a>
              )}
              <span className="truncate">{profile.email}</span>
            </p>
          </div>
        </div>
        {t && (
          <div className="ml-auto flex gap-8 max-sm:w-full">
            {[
              [formatHours(t.minutes), "watched"],
              [String(t.titles), "titles"],
              [String(t.reviews), "reviews"],
            ].map(([num, label]) => (
              <p key={label}>
                <span className="block text-2xl font-black">{num}</span>
                <span className="text-[11px] font-black text-muted">{label}</span>
              </p>
            ))}
          </div>
        )}
      </header>

      <div className="space-y-6">
        <section className="rounded-3xl border-2 border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-black">About you</h2>
          <div className="mb-4 max-w-xs">
            <label className="mb-1.5 block text-sm font-bold" htmlFor="profile-username">
              Username
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted" aria-hidden>
                @
              </span>
              <input
                id="profile-username"
                value={username}
                minLength={3}
                maxLength={20}
                pattern="[a-z0-9_]+"
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase());
                  setDirty(true);
                }}
                className="h-11 w-full rounded-2xl border-2 border-border bg-card pl-9 pr-4 text-sm text-ink transition-all duration-200 focus:border-ink focus:shadow-offset-xs focus:outline-none"
              />
            </div>
          </div>
          <Textarea
            label="Bio"
            placeholder="Chronically rewatching the same 5 shows…"
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setDirty(true);
            }}
          />

          <p className="mb-2 mt-5 text-sm font-bold">Favorite genres</p>
          <div className="flex flex-wrap gap-2">
            {GENRE_CHOICES.map((g) => {
              const on = genres.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setGenres(on ? genres.filter((x) => x !== g) : [...genres, g].slice(0, 10));
                    setDirty(true);
                  }}
                  className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    on ? "bg-accent text-ink" : "border-2 border-border text-muted hover:bg-surface-hover hover:text-ink"
                  }`}
                >
                  {on && <Check className="size-3" strokeWidth={3} aria-hidden />}
                  {g}
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-5 text-sm font-bold">Favorite actors</p>
          <div className="flex flex-wrap items-center gap-2">
            {actors.map((a) => (
              <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold">
                {a}
                <button
                  type="button"
                  aria-label={`Remove ${a}`}
                  onClick={() => {
                    setActors(actors.filter((x) => x !== a));
                    setDirty(true);
                  }}
                >
                  <X className="size-3" strokeWidth={3} />
                </button>
              </span>
            ))}
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                const name = actorInput.trim();
                if (name && !actors.includes(name)) {
                  setActors([...actors, name].slice(0, 10));
                  setActorInput("");
                  setDirty(true);
                }
              }}
            >
              <input
                value={actorInput}
                onChange={(e) => setActorInput(e.target.value)}
                placeholder="Add actor"
                aria-label="Add favorite actor"
                className="h-8 w-32 rounded-full border-2 border-border bg-background px-3 text-xs font-bold focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Add actor"
                className="grid size-8 place-items-center rounded-full border-2 border-border text-muted hover:border-accent hover:text-ink"
              >
                <Plus className="size-3.5" strokeWidth={3} />
              </button>
            </form>
          </div>

          {saveError && <p className="mt-4 text-sm font-bold text-accent">{saveError}</p>}
          {dirty && (
            <Button size="sm" className="mt-6" loading={save.isPending} onClick={() => save.mutate()}>
              Save changes
            </Button>
          )}
        </section>

        <section className="rounded-3xl border-2 border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
            <Award className="size-5 text-accent" aria-hidden /> Achievements
          </h2>
          {t ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {achievements(t).map((a) => (
                <li
                  key={a.name}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 ${
                    a.earned ? "border-accent bg-surface-hover" : "border-dashed border-border opacity-60"
                  }`}
                >
                  <span
                    className={`grid size-10 shrink-0 -rotate-6 place-items-center rounded-xl text-lg ${
                      a.earned ? "bg-accent" : "bg-border"
                    }`}
                    aria-hidden
                  >
                    {a.earned ? (
                      <Trophy className="size-5" strokeWidth={2.25} />
                    ) : (
                      <Lock className="size-5 text-muted" strokeWidth={2.25} />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-black">{a.name}</p>
                    <p className="text-xs font-semibold text-muted">{a.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Skeleton className="h-32 w-full" />
          )}
        </section>
      </div>
    </div>
  );
}

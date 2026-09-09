"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Check, Download, Lock, Plus, Shield, Trophy, Upload, X } from "lucide-react";
import { StickerField, type StickerSpec } from "@/features/decor/Doodads";

const PAGE_STICKERS: StickerSpec[] = [
  { icon: "star", className: "right-[2%] top-16 hidden lg:block", tilt: 10, delay: "0.3s" },
  { icon: "trophy", className: "right-[10%] top-48 hidden xl:block", tilt: -8, delay: "1.2s", size: "sm" },
];
import { GENRES, formatHours } from "@/lib/media";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { CardSkeleton, Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { LoadingMessage } from "@/components/ui/LoadingMessage";

interface Profile {
  name: string;
  username: string;
  email: string;
  bio: string;
  favoriteGenres: string[];
  favoriteActors: string[];
  profilePrivate: boolean;
  hideHistory: boolean;
  hideReviews: boolean;
  createdAt: string;
}

interface StatsTotals {
  totals: { watches: number; minutes: number; titles: number; completed: number; reviews: number; ratings: number };
  genres: { name: string; count: number }[];
}

const GENRE_CHOICES = [...new Set(Object.values(GENRES))].sort();

function achievements(t: StatsTotals["totals"], genreCount: number) {
  const hours = (m: number) => formatHours(m);
  const list: { name: string; desc: string; current: number; target: number; fmt?: (n: number) => string }[] = [
    { name: "First frame", desc: "Log your first watch", current: t.watches, target: 1 },
    { name: "Double digits", desc: "Log 10 watches", current: t.watches, target: 10 },
    { name: "Century club", desc: "Log 100 watches", current: t.watches, target: 100 },
    { name: "Day one", desc: "Watch 24+ hours total", current: t.minutes, target: 1440, fmt: hours },
    { name: "Binge week", desc: "Watch a full week of screen time", current: t.minutes, target: 10080, fmt: hours },
    { name: "Finisher", desc: "Complete 5 titles", current: t.completed, target: 5 },
    { name: "Critic", desc: "Write 3 reviews", current: t.reviews, target: 3 },
    { name: "Judge", desc: "Rate 10 titles", current: t.ratings, target: 10 },
    { name: "Explorer", desc: "Watch 25 unique titles", current: t.titles, target: 25 },
    { name: "Genre hopper", desc: "Watch across 5 genres", current: genreCount, target: 5 },
  ];
  return list.map((a) => ({ ...a, earned: a.current >= a.target }));
}

function ToggleRow({
  label,
  desc,
  on,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border-2 border-border p-4 text-left transition-colors hover:bg-surface-hover"
    >
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className="block text-xs font-semibold text-muted">{desc}</span>
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-11 shrink-0 rounded-full border-2 border-ink transition-colors ${
          on ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-ink transition-all ${
            on ? "left-[calc(100%-1.125rem)]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
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
  const [profilePrivate, setProfilePrivate] = useState(false);
  const [hideHistory, setHideHistory] = useState(false);
  const [hideReviews, setHideReviews] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (profile) {
      setBio(profile.bio);
      setUsername(profile.username);
      setGenres(profile.favoriteGenres);
      setActors(profile.favoriteActors);
      setProfilePrivate(profile.profilePrivate);
      setHideHistory(profile.hideHistory);
      setHideReviews(profile.hideReviews);
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          username,
          favoriteGenres: genres,
          favoriteActors: actors,
          profilePrivate,
          hideHistory,
          hideReviews,
        }),
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

  const [importMsg, setImportMsg] = useState("");
  const importData = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/account/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      return data.imported as Record<string, number>;
    },
    onSuccess: (imported) => {
      const total = Object.values(imported).reduce((a, b) => a + b, 0);
      setImportMsg(`Imported ${total} items. Refresh to see everything.`);
      qc.invalidateQueries();
    },
    onError: (err) =>
      setImportMsg(err instanceof Error ? err.message : "Import failed — is it a watchlr export?"),
  });

  if (isLoading || !profile) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-14">
        <LoadingMessage context="profile" />
        <CardSkeleton className="flex items-center gap-5">
          <Skeleton className="size-16 shrink-0 -rotate-6 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton index={1} className="h-6 w-48" />
            <Skeleton index={2} className="h-3 w-32" />
          </div>
        </CardSkeleton>
        <CardSkeleton index={1}>
          <SkeletonText lines={5} />
        </CardSkeleton>
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
            <Shield className="size-5 text-accent" aria-hidden /> Privacy
          </h2>
          <div className="space-y-3">
            <ToggleRow
              label="Private profile"
              desc="Your public page acts like it doesn't exist"
              on={profilePrivate}
              onChange={() => {
                setProfilePrivate(!profilePrivate);
                setDirty(true);
              }}
            />
            <ToggleRow
              label="Hide watch history"
              desc="Keep your recently seen titles off your public page"
              on={hideHistory}
              onChange={() => {
                setHideHistory(!hideHistory);
                setDirty(true);
              }}
            />
            <ToggleRow
              label="Hide reviews"
              desc="Keep your reviews off your public page"
              on={hideReviews}
              onChange={() => {
                setHideReviews(!hideReviews);
                setDirty(true);
              }}
            />
          </div>
          {dirty && (
            <Button size="sm" className="mt-5" loading={save.isPending} onClick={() => save.mutate()}>
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
              {achievements(t, stats?.genres.length ?? 0).map((a) => {
                const fmt = a.fmt ?? String;
                const pct = Math.min(100, Math.round((a.current / a.target) * 100));
                return (
                  <li
                    key={a.name}
                    className={`flex items-center gap-3 rounded-2xl border-2 p-4 ${
                      a.earned ? "border-accent bg-surface-hover" : "border-dashed border-border"
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
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-black ${a.earned ? "" : "text-muted"}`}>{a.name}</p>
                      <p className="text-xs font-semibold text-muted">{a.desc}</p>
                      {!a.earned && (
                        <>
                          <div
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${a.name} progress`}
                            className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
                          >
                            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1 text-[11px] font-black text-muted">
                            {fmt(a.current)} / {fmt(a.target)}
                          </p>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Skeleton className="h-32 w-full" />
          )}
        </section>

        <section className="rounded-3xl border-2 border-border bg-card p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-black">
            <Download className="size-5 text-accent" aria-hidden /> Your data
          </h2>
          <p className="mb-4 text-sm font-semibold text-muted">
            Export your watchlist, ratings, reviews, lists, and history as a file — or bring it
            back in. Import merges without duplicating.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/api/account/export"
              download
              className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-ink bg-card px-4 text-sm font-black shadow-offset-xs transition-transform hover:-translate-y-0.5"
            >
              <Download className="size-4" aria-hidden /> Export
            </a>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white transition-colors hover:bg-accent hover:text-ink">
              <Upload className="size-4" aria-hidden />
              {importData.isPending ? "Importing…" : "Import"}
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportMsg("");
                    importData.mutate(file);
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {importMsg && <p className="mt-3 text-sm font-bold text-accent">{importMsg}</p>}
        </section>
      </div>
    </div>
  );
}

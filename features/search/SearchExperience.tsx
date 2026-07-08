"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, Flame, Clock3 } from "lucide-react";
import type { MediaItem, MediaType } from "@/types/tmdb";
import { GENRES } from "@/lib/media";
import { PosterCard } from "@/components/cards/PosterCard";
import { PosterSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDebounce } from "@/hooks/use-debounce";
import { Highlighter } from "@/components/ui/highlighter";
import { StickerField, type StickerSpec } from "@/features/decor/Doodads";

const PAGE_STICKERS: StickerSpec[] = [
  { icon: "film", className: "right-[2%] top-16 hidden lg:block", tilt: 8, delay: "0.4s" },
  { icon: "sparkles", className: "right-[10%] top-40 hidden xl:block", tilt: -10, delay: "1.3s", size: "sm" },
];

type Tab = "all" | MediaType;

interface Filters {
  genre: string;
  year: string;
  minRating: string;
  language: string;
  maxRuntime: string;
  watchProvider: string;
}

const EMPTY_FILTERS: Filters = {
  genre: "",
  year: "",
  minRating: "",
  language: "",
  maxRuntime: "",
  watchProvider: "",
};

const POPULAR_SEARCHES = [
  "Oppenheimer",
  "The Bear",
  "Dune",
  "Severance",
  "Interstellar",
  "Breaking Bad",
];

const LANGUAGES = [
  ["en", "English"],
  ["hi", "Hindi"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["de", "German"],
] as const;

const PROVIDERS = [
  ["8", "Netflix"],
  ["9", "Prime Video"],
  ["337", "Disney+"],
  ["350", "Apple TV+"],
  ["1899", "HBO Max"],
  ["15", "Hulu"],
] as const;

const GENRE_OPTIONS = Object.entries(GENRES).sort((a, b) =>
  a[1].localeCompare(b[1]),
);

interface PageResult {
  items: MediaItem[];
  page: number;
  totalPages: number;
}

async function fetchPage(url: string): Promise<PageResult> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-black text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border-2 border-border bg-card px-3 text-sm font-semibold focus:border-accent focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export function SearchExperience() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [tab, setTab] = useState<Tab>("all");
  // Mood cards on the home page deep-link here with ?genre=<tmdb id>
  const [filters, setFilters] = useState<Filters>(() => ({
    ...EMPTY_FILTERS,
    genre: params.get("genre") ?? "",
  }));
  const [showFilters, setShowFilters] = useState(false);
  const debouncedQuery = useDebounce(query.trim(), 350);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Keep the URL shareable.
  useEffect(() => {
    const qs = new URLSearchParams();
    if (debouncedQuery) qs.set("q", debouncedQuery);
    else if (filters.genre) qs.set("genre", filters.genre);
    router.replace(qs.size > 0 ? `/search?${qs}` : "/search", { scroll: false });
  }, [debouncedQuery, filters.genre, router]);

  const isSearchMode = debouncedQuery.length > 0;
  const discoverType: MediaType = tab === "tv" ? "tv" : "movie";

  const queryKey = isSearchMode
    ? ["search", debouncedQuery]
    : ["discover", discoverType, filters];

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      if (isSearchMode) {
        return fetchPage(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}&page=${pageParam}`,
        );
      }
      const qs = new URLSearchParams({ mediaType: discoverType, page: String(pageParam) });
      if (filters.genre) qs.set("genre", filters.genre);
      if (filters.year) qs.set("year", filters.year);
      if (filters.minRating) qs.set("minRating", filters.minRating);
      if (filters.language) qs.set("language", filters.language);
      if (filters.maxRuntime) qs.set("maxRuntime", filters.maxRuntime);
      if (filters.watchProvider) qs.set("watchProvider", filters.watchProvider);
      return fetchPage(`/api/discover?${qs}`);
    },
    getNextPageParam: (last) =>
      last.page < Math.min(last.totalPages, 20) ? last.page + 1 : undefined,
  });

  // Infinite scroll sentinel.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: recent } = useQuery({
    queryKey: ["recent-searches"],
    queryFn: async () => {
      const res = await fetch("/api/recent-searches");
      const data = await res.json();
      return (data.searches ?? []) as string[];
    },
  });

  // Refresh recents after a search lands.
  useEffect(() => {
    if (isSearchMode) {
      const t = setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ["recent-searches"] }),
        1500,
      );
      return () => clearTimeout(t);
    }
  }, [debouncedQuery, isSearchMode, queryClient]);

  const items = useMemo(() => {
    let all = data?.pages.flatMap((p) => p.items) ?? [];
    if (isSearchMode) {
      // Search-multi can't take TMDB filters; apply them client-side.
      if (tab !== "all") all = all.filter((i) => i.mediaType === tab);
      if (filters.genre) all = all.filter((i) => i.genreIds.includes(Number(filters.genre)));
      if (filters.year) all = all.filter((i) => i.releaseDate.startsWith(filters.year));
      if (filters.minRating) all = all.filter((i) => i.voteAverage >= Number(filters.minRating));
    }
    const seen = new Set<string>();
    return all.filter((i) => {
      const key = `${i.mediaType}-${i.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data, isSearchMode, tab, filters]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="relative mx-auto max-w-6xl px-6 pb-24">
      <StickerField items={PAGE_STICKERS} />
      <header className="pb-8 pt-14">
        <p className="overline-track text-accent">Discover</p>
        <h1 className="text-offset mt-2 text-4xl font-black tracking-tight sm:text-6xl">
          Find your next{" "}
          <Highlighter action="underline" color="#f59e52" strokeWidth={3} padding={5}>
            obsession.
          </Highlighter>
        </h1>
      </header>

      {/* Big search input */}
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Movies, shows, that one film with the guy…"
          aria-label="Search movies and shows"
          autoFocus
          className="h-16 w-full rounded-full border-2 border-border bg-card pl-13 pr-32 text-lg font-semibold shadow-soft placeholder:font-normal placeholder:text-muted  "
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-20 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-ink"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          className={`absolute right-3 top-1/2 flex h-11 -translate-y-1/2 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors ${
            showFilters || activeFilterCount > 0
              ? "-rotate-1 bg-ink text-white shadow-offset-xs"
              : "bg-surface-hover text-ink hover:bg-accent-soft"
          }`}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          <span className="max-sm:hidden">Filters</span>
          {activeFilterCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] font-black text-ink">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex flex-wrap items-center gap-2" role="tablist" aria-label="Media type">
        {(["all", "movie", "tv"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
              tab === t ? "-rotate-1 bg-ink text-white shadow-offset-xs" : "bg-card text-muted border-2 border-border hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {t === "all" ? "Everything" : t === "movie" ? "Movies" : "TV Shows"}
          </button>
        ))}
        {!isSearchMode && tab === "all" && (
          <p className="text-xs font-semibold text-muted">browsing movies — pick a tab to narrow</p>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mt-5 grid grid-cols-2 gap-4 rounded-3xl border-2 border-border bg-card p-6 sm:grid-cols-3 lg:grid-cols-6">
          <Select label="Genre" value={filters.genre} onChange={(v) => setFilters({ ...filters, genre: v })}>
            <option value="">Any</option>
            {GENRE_OPTIONS.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </Select>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-muted">Year</span>
            <input
              type="number"
              min={1900}
              max={2030}
              placeholder="Any"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="h-10 rounded-xl border-2 border-border bg-card px-3 text-sm font-semibold focus:border-accent focus:outline-none"
            />
          </label>
          <Select label="Min rating" value={filters.minRating} onChange={(v) => setFilters({ ...filters, minRating: v })}>
            <option value="">Any</option>
            {[9, 8, 7, 6, 5].map((r) => (
              <option key={r} value={r}>{r}+ stars</option>
            ))}
          </Select>
          <Select label="Language" value={filters.language} onChange={(v) => setFilters({ ...filters, language: v })}>
            <option value="">Any</option>
            {LANGUAGES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </Select>
          <Select label="Max runtime" value={filters.maxRuntime} onChange={(v) => setFilters({ ...filters, maxRuntime: v })}>
            <option value="">Any</option>
            {[90, 120, 150, 180].map((m) => (
              <option key={m} value={m}>≤ {m} min</option>
            ))}
          </Select>
          <Select label="Streaming on" value={filters.watchProvider} onChange={(v) => setFilters({ ...filters, watchProvider: v })}>
            <option value="">Anywhere</option>
            {PROVIDERS.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </Select>
          {isSearchMode && (filters.language || filters.maxRuntime || filters.watchProvider) && (
            <p className="col-span-full text-xs font-semibold text-muted">
              Language, runtime and streaming filters apply when browsing (empty search box).
            </p>
          )}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="col-span-full justify-self-start text-sm font-bold text-accent hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Recent + popular searches (idle state) */}
      {!isSearchMode && activeFilterCount === 0 && (
        <div className="mt-8 space-y-5">
          {recent && recent.length > 0 && (
            <div>
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-black text-muted">
                <Clock3 className="size-3.5" aria-hidden /> Recent searches
              </p>
              <div className="flex flex-wrap gap-2">
                {recent.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuery(q)}
                    className="rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-bold transition-colors hover:border-accent hover:bg-surface-hover"
                  >
                    {q}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/recent-searches", { method: "DELETE" });
                    queryClient.invalidateQueries({ queryKey: ["recent-searches"] });
                  }}
                  className="rounded-full px-3 py-1.5 text-sm font-bold text-muted hover:text-ink"
                >
                  clear
                </button>
              </div>
            </div>
          )}
          <div>
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-black text-muted">
              <Flame className="size-3.5" aria-hidden /> Popular right now
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuery(q)}
                  className="rounded-full bg-accent-soft px-4 py-1.5 text-sm font-bold transition-transform hover:-rotate-2"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="mt-10">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <PosterSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={Search}
            title="Search hit a snag"
            body="The movie data source didn't answer. Check your connection and try again."
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Search}
            title={isSearchMode ? `Nothing for “${debouncedQuery}”` : "Nothing matches those filters"}
            body="Try fewer filters, a different spelling, or the title it had in its home country."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((item) => (
                <PosterCard
                  key={`${item.mediaType}-${item.id}`}
                  item={item}
                  className="w-full"
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 210px"
                />
              ))}
            </div>
            <div ref={sentinelRef} aria-hidden className="h-1" />
            {isFetchingNextPage && (
              <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <PosterSkeleton key={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

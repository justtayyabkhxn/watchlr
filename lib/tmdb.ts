import "server-only";
import type {
  DiscoverFilters,
  MediaItem,
  MediaType,
  TmdbMovieDetails,
  TmdbMovieResult,
  TmdbMultiResult,
  TmdbPaged,
  TmdbReviewResult,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbTvResult,
} from "@/types/tmdb";

/**
 * TMDB hosts, tried in order. Some ISPs (notably in India) reset
 * connections to api.themoviedb.org; api.tmdb.org is an official
 * alternate that often works. TMDB_API_BASE lets you point at your
 * own proxy (e.g. a Cloudflare Worker) when both are blocked.
 */
const HOSTS = [
  ...(process.env.TMDB_API_BASE ? [process.env.TMDB_API_BASE.replace(/\/$/, "")] : []),
  "https://api.themoviedb.org/3",
  "https://api.tmdb.org/3",
];

class TmdbError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tmdb<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  revalidate = 3600,
): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new TmdbError("TMDB_API_KEY is not set", 500);

  const query = new URLSearchParams({ api_key: key });
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") query.set(k, String(v));
  }

  // Two rounds across the host list: absorbs transient ECONNRESETs and
  // falls back to the alternate host when the primary is unreachable.
  const attempts = [...HOSTS, ...HOSTS];
  let lastError: unknown;

  for (let i = 0; i < attempts.length; i++) {
    const url = `${attempts[i]}${path}?${query}`;
    try {
      const res = await fetch(url, {
        next: { revalidate },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return res.json() as Promise<T>;
      // 4xx won't improve with a retry; 5xx might.
      if (res.status < 500) {
        throw new TmdbError(`TMDB ${path} failed (${res.status})`, res.status);
      }
      lastError = new TmdbError(`TMDB ${path} failed (${res.status})`, res.status);
    } catch (err) {
      if (err instanceof TmdbError && err.status < 500) throw err;
      lastError = err;
    }
    if (i < attempts.length - 1) await sleep(200 * (i + 1));
  }

  throw new TmdbError(
    `TMDB unreachable (${lastError instanceof Error ? lastError.message : "network error"}). If this persists, your ISP may be blocking TMDB — set TMDB_API_BASE to a proxy or change DNS.`,
    502,
  );
}

/* ---------- Normalization ---------- */

export function normalizeMovie(m: TmdbMovieResult): MediaItem {
  return {
    id: m.id,
    mediaType: "movie",
    title: m.title,
    overview: m.overview,
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    releaseDate: m.release_date ?? "",
    voteAverage: m.vote_average,
    genreIds: m.genre_ids ?? [],
  };
}

export function normalizeTv(t: TmdbTvResult): MediaItem {
  return {
    id: t.id,
    mediaType: "tv",
    title: t.name,
    overview: t.overview,
    posterPath: t.poster_path,
    backdropPath: t.backdrop_path,
    releaseDate: t.first_air_date ?? "",
    voteAverage: t.vote_average,
    genreIds: t.genre_ids ?? [],
  };
}

export function normalizeMulti(r: TmdbMultiResult): MediaItem | null {
  if (r.media_type === "movie") return normalizeMovie(r);
  if (r.media_type === "tv") return normalizeTv(r);
  return null; // people are dropped
}

/* ---------- Catalog rails ---------- */

export async function getTrending(
  mediaType: MediaType,
  window: "day" | "week" = "week",
): Promise<MediaItem[]> {
  const data = await tmdb<TmdbPaged<TmdbMovieResult & TmdbTvResult>>(
    `/trending/${mediaType}/${window}`,
  );
  return data.results.map((r) =>
    mediaType === "movie" ? normalizeMovie(r) : normalizeTv(r),
  );
}

export async function getPopularToday(): Promise<MediaItem[]> {
  const data = await tmdb<TmdbPaged<TmdbMultiResult>>("/trending/all/day");
  return data.results
    .map(normalizeMulti)
    .filter((m): m is MediaItem => m !== null);
}

export async function getTopRated(mediaType: MediaType): Promise<MediaItem[]> {
  const data = await tmdb<TmdbPaged<TmdbMovieResult & TmdbTvResult>>(
    `/${mediaType}/top_rated`,
  );
  return data.results.map((r) =>
    mediaType === "movie" ? normalizeMovie(r) : normalizeTv(r),
  );
}

export async function getUpcoming(): Promise<MediaItem[]> {
  const data = await tmdb<TmdbPaged<TmdbMovieResult>>("/movie/upcoming");
  return data.results.map(normalizeMovie);
}

export async function getNowPlaying(): Promise<MediaItem[]> {
  const data = await tmdb<TmdbPaged<TmdbMovieResult>>("/movie/now_playing");
  return data.results.map(normalizeMovie);
}

/* ---------- Search & discover ---------- */

export async function searchMulti(
  query: string,
  page = 1,
): Promise<{ items: MediaItem[]; page: number; totalPages: number }> {
  const data = await tmdb<TmdbPaged<TmdbMultiResult>>(
    "/search/multi",
    { query, page, include_adult: "false" },
    600,
  );
  return {
    items: data.results
      .map(normalizeMulti)
      .filter((m): m is MediaItem => m !== null),
    page: data.page,
    totalPages: data.total_pages,
  };
}

/**
 * Resolve an AI-suggested title to a real TMDB entry of the right kind —
 * hallucinated titles and duplicates (via `known`) come back null.
 */
export async function resolveTitle(
  title: string,
  year: string,
  wantType: MediaType,
  known: Set<string>,
): Promise<MediaItem | null> {
  try {
    const { items } = await searchMulti(title);
    const y = year?.slice(0, 4);
    const match =
      items.find(
        (i) =>
          i.mediaType === wantType &&
          i.posterPath &&
          (!y || Math.abs(Number(i.releaseDate.slice(0, 4)) - Number(y)) <= 1),
      ) ?? items.find((i) => i.mediaType === wantType && i.posterPath);
    if (!match || known.has(`${match.mediaType}-${match.id}`)) return null;
    known.add(`${match.mediaType}-${match.id}`);
    return match;
  } catch {
    return null;
  }
}

export async function discover(
  f: DiscoverFilters,
): Promise<{ items: MediaItem[]; page: number; totalPages: number }> {
  const dateKey =
    f.mediaType === "movie" ? "primary_release_year" : "first_air_date_year";
  const data = await tmdb<TmdbPaged<TmdbMovieResult & TmdbTvResult>>(
    `/discover/${f.mediaType}`,
    {
      page: f.page ?? 1,
      sort_by: f.sortBy ?? "popularity.desc",
      with_genres: f.genre,
      [dateKey]: f.year,
      "vote_average.gte": f.minRating,
      "vote_count.gte": f.minRating ? 100 : undefined,
      with_original_language: f.language,
      "with_runtime.lte": f.maxRuntime,
      with_watch_providers: f.watchProvider,
      watch_region: f.watchProvider ? "US" : undefined,
      include_adult: "false",
    },
    600,
  );
  return {
    items: data.results.map((r) =>
      f.mediaType === "movie" ? normalizeMovie(r) : normalizeTv(r),
    ),
    page: data.page,
    totalPages: data.total_pages,
  };
}

/* ---------- Details ---------- */

const DETAIL_APPEND =
  "credits,videos,watch/providers,similar,recommendations";

export async function getMovieDetails(id: number): Promise<TmdbMovieDetails> {
  return tmdb<TmdbMovieDetails>(`/movie/${id}`, {
    append_to_response: DETAIL_APPEND,
  });
}

export async function getTvDetails(id: number): Promise<TmdbTvDetails> {
  return tmdb<TmdbTvDetails>(`/tv/${id}`, {
    append_to_response: DETAIL_APPEND,
  });
}

/** Lightweight per-title meta for card hovers — no appended sub-requests. */
export async function getTitleMeta(
  id: number,
  mediaType: MediaType,
): Promise<{ runtime: number | null; seasons: number | null }> {
  if (mediaType === "movie") {
    const d = await tmdb<{ runtime: number | null }>(`/movie/${id}`);
    return { runtime: d.runtime ?? null, seasons: null };
  }
  const d = await tmdb<{ number_of_seasons: number | null }>(`/tv/${id}`);
  return { runtime: null, seasons: d.number_of_seasons ?? null };
}

/** Community reviews (both pages TMDB usually has), newest-ish first. */
export async function getTitleReviews(
  id: number,
  mediaType: MediaType,
): Promise<TmdbReviewResult[]> {
  const first = await tmdb<TmdbPaged<TmdbReviewResult>>(
    `/${mediaType}/${id}/reviews`,
  );
  let results = first.results;
  if (first.total_pages > 1) {
    const second = await tmdb<TmdbPaged<TmdbReviewResult>>(
      `/${mediaType}/${id}/reviews`,
      { page: 2 },
    );
    results = [...results, ...second.results];
  }
  return results;
}

export async function getSeasonDetails(
  tvId: number,
  seasonNumber: number,
): Promise<TmdbSeasonDetails> {
  return tmdb<TmdbSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
}

/** Client-safe media helpers: image URLs, genre names, formatters. */

export type ImageSize =
  | "w92"
  | "w185"
  | "w342"
  | "w500"
  | "w780"
  | "w1280"
  | "original";

export function tmdbImage(
  path: string | null | undefined,
  size: ImageSize = "w342",
): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

/** Static TMDB genre id → name map (movie + tv merged). */
export const GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

export function genreName(id: number): string {
  return GENRES[id] ?? "";
}

/**
 * TMDB genre ids are per-media-type: 878 (Sci-Fi) only exists for movies,
 * 10765 (Sci-Fi & Fantasy) only for TV. These pairs are the true equivalents
 * so one genre filter works on both tabs; ids without a counterpart
 * (e.g. Horror on TV) pass through unchanged.
 */
const GENRE_EQUIVALENTS: [movie: number, tv: number][] = [
  [28, 10759], // action ↔ action & adventure
  [12, 10759], // adventure ↔ action & adventure
  [878, 10765], // sci-fi ↔ sci-fi & fantasy
  [14, 10765], // fantasy ↔ sci-fi & fantasy
  [10752, 10768], // war ↔ war & politics
  [10751, 10762], // family ↔ kids (family also exists on tv; kids maps back)
];

const MOVIE_TO_TV = new Map<number, number>();
const TV_TO_MOVIE = new Map<number, number>();
for (const [movie, tv] of GENRE_EQUIVALENTS) {
  if (!MOVIE_TO_TV.has(movie)) MOVIE_TO_TV.set(movie, tv);
  if (!TV_TO_MOVIE.has(tv)) TV_TO_MOVIE.set(tv, movie);
}
// family is valid on both types — never translate it away from itself
MOVIE_TO_TV.delete(10751);

/** Translate a genre id to the given media type's vocabulary when an
 *  equivalent exists; otherwise return it unchanged. */
export function genreIdForType(id: number, mediaType: "movie" | "tv"): number {
  return (mediaType === "tv" ? MOVIE_TO_TV.get(id) : TV_TO_MOVIE.get(id)) ?? id;
}

/** Does an item's genre list match a selected genre id, counting the
 *  cross-media-type equivalent as a match? */
export function genreIdMatches(selectedId: number, itemGenreIds: number[]): boolean {
  if (itemGenreIds.includes(selectedId)) return true;
  const alt = MOVIE_TO_TV.get(selectedId) ?? TV_TO_MOVIE.get(selectedId);
  return alt != null && itemGenreIds.includes(alt);
}

export function releaseYear(date: string | null | undefined): string {
  return date ? date.slice(0, 4) : "TBA";
}

export function formatRating(vote: number): string {
  return vote > 0 ? vote.toFixed(1) : "–";
}

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatHours(minutes: number): string {
  const h = Math.round(minutes / 60);
  return h >= 1 ? `${h}h` : `${minutes}m`;
}

/**
 * Coarse age of a date, for "added 2 years ago" copy. Deliberately blunt —
 * the archaeologist's argument is "this has been here a while", and
 * "1 year" makes that better than "13 months, 4 days".
 */
export function relativeAge(from: Date | string, now: Date = new Date()): string {
  const then = typeof from === "string" ? new Date(from) : from;
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days < 1) return "today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"}`;
}

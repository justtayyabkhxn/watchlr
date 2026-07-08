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

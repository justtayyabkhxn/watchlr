import type { MediaItem, MediaType } from "@/types/tmdb";

/** A suggestion after the server has confirmed it exists on TMDB. */
export interface SuggestedItem {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
  reason: string;
  /** Came off the user's own want-to-watch pile rather than the wider catalogue. */
  onShelf: boolean;
}

export interface Turn {
  role: "user" | "assistant";
  content: string;
  items: SuggestedItem[];
  chips: string[];
}

export function toMediaItem(s: SuggestedItem): MediaItem {
  return {
    id: s.tmdbId,
    mediaType: s.mediaType,
    title: s.title,
    overview: "",
    posterPath: s.posterPath,
    backdropPath: null,
    releaseDate: s.releaseDate,
    voteAverage: s.voteAverage,
    genreIds: s.genreIds,
  };
}

export const itemKey = (s: SuggestedItem) => `${s.mediaType}-${s.tmdbId}`;

/** How a title is named back to the model — title plus year disambiguates remakes. */
export const itemLabel = (s: SuggestedItem) =>
  s.releaseDate ? `${s.title} (${s.releaseDate.slice(0, 4)})` : s.title;

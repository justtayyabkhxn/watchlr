export type MediaType = "movie" | "tv";

/** Normalized shape shared by movie + tv results across the app. */
export interface MediaItem {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string; // YYYY-MM-DD or ""
  voteAverage: number;
  genreIds: number[];
}

/* ---------- Raw TMDB response shapes ---------- */

export interface TmdbMovieResult {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  vote_average: number;
  genre_ids?: number[];
  media_type?: "movie";
}

export interface TmdbTvResult {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  vote_average: number;
  genre_ids?: number[];
  media_type?: "tv";
}

export type TmdbMultiResult =
  | (TmdbMovieResult & { media_type: "movie" })
  | (TmdbTvResult & { media_type: "tv" })
  | { media_type: "person"; id: number };

export interface TmdbPaged<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  profile_path: string | null;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
  name: string;
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TmdbWatchProviders {
  results: Record<
    string,
    {
      link: string;
      flatrate?: TmdbProvider[];
      rent?: TmdbProvider[];
      buy?: TmdbProvider[];
    }
  >;
}

export interface TmdbSeasonSummary {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
  air_date: string | null;
  overview: string;
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface TmdbSeasonDetails {
  season_number: number;
  name: string;
  episodes: TmdbEpisode[];
}

interface TmdbDetailsBase {
  id: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genres: TmdbGenre[];
  tagline: string | null;
  status: string;
  original_language: string;
  credits?: TmdbCredits;
  videos?: { results: TmdbVideo[] };
  "watch/providers"?: TmdbWatchProviders;
  similar?: TmdbPaged<TmdbMovieResult | TmdbTvResult>;
  recommendations?: TmdbPaged<TmdbMultiResult>;
}

export interface TmdbMovieDetails extends TmdbDetailsBase {
  title: string;
  release_date: string;
  runtime: number | null;
}

export interface TmdbTvDetails extends TmdbDetailsBase {
  name: string;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  seasons: TmdbSeasonSummary[];
}

/* ---------- Discover filters (search page) ---------- */

export interface DiscoverFilters {
  mediaType: MediaType;
  genre?: number;
  year?: number;
  minRating?: number;
  language?: string;
  maxRuntime?: number;
  watchProvider?: number;
  sortBy?: string;
  page?: number;
}

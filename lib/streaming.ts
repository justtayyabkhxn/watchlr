import "server-only";
import type { MediaType } from "@/types/tmdb";
import type { StreamingOption, StreamingOptionType } from "@/types/streaming";

/**
 * Movie of the Night — Streaming Availability API (v4, via RapidAPI).
 * Looks up live streaming options (with deep links) for a TMDB title.
 * Needs RAPIDAPI_KEY in .env.local — grab one free at
 * https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability
 */

const HOST = "streaming-availability.p.rapidapi.com";

export const DEFAULT_COUNTRY = (
  process.env.STREAMING_REGION ?? "in"
).toLowerCase();

export function isStreamingConfigured(): boolean {
  return Boolean(process.env.RAPIDAPI_KEY);
}

class StreamingError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "StreamingError";
  }
}

/* ---------- Raw API shapes (only the fields we use) ---------- */

interface RawStreamingOption {
  service: {
    id: string;
    name: string;
    themeColorCode: string;
    imageSet: { lightThemeImage: string; darkThemeImage: string };
  };
  type: StreamingOptionType;
  addon?: { id: string; name: string };
  link: string;
  quality?: string;
  price?: { formatted: string };
  expiresSoon: boolean;
  expiresOn?: number; // unix seconds
}

interface RawShow {
  streamingOptions: Record<string, RawStreamingOption[]>;
}

/* ---------- Normalization ---------- */

const QUALITY_RANK: Record<string, number> = { sd: 0, hd: 1, uhd: 2 };

function normalizeOption(o: RawStreamingOption): StreamingOption {
  return {
    serviceId: o.service.id,
    serviceName: o.service.name,
    logoLight: o.service.imageSet.lightThemeImage,
    logoDark: o.service.imageSet.darkThemeImage,
    themeColor: o.service.themeColorCode,
    type: o.type,
    addonName: o.addon?.name ?? null,
    link: o.link,
    quality: o.quality ?? null,
    price: o.price?.formatted ?? null,
    expiresSoon: o.expiresSoon,
    expiresOn: o.expiresOn
      ? new Date(o.expiresOn * 1000).toISOString().slice(0, 10)
      : null,
  };
}

/**
 * The API lists one entry per audio/quality combo — collapse to one per
 * service+type+addon, keeping the best quality.
 */
function dedupe(options: RawStreamingOption[]): StreamingOption[] {
  const best = new Map<string, RawStreamingOption>();
  for (const o of options) {
    const key = `${o.service.id}:${o.type}:${o.addon?.id ?? ""}`;
    const prev = best.get(key);
    if (
      !prev ||
      (QUALITY_RANK[o.quality ?? ""] ?? -1) >
        (QUALITY_RANK[prev.quality ?? ""] ?? -1)
    ) {
      best.set(key, o);
    }
  }
  return [...best.values()].map(normalizeOption);
}

/* ---------- Fetch ---------- */

/**
 * Live streaming options for a TMDB title in a country (lowercase ISO
 * 3166-1, e.g. "in", "us"). Returns [] when the title isn't in Movie of
 * the Night's catalog — that's data, not an error.
 */
export async function getStreamingOptions(
  tmdbId: number,
  mediaType: MediaType,
  country: string = DEFAULT_COUNTRY,
): Promise<StreamingOption[]> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new StreamingError("RAPIDAPI_KEY is not set", 500);

  const id = encodeURIComponent(`${mediaType}/${tmdbId}`);
  const res = await fetch(
    `https://${HOST}/shows/${id}?country=${country.toLowerCase()}`,
    {
      headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": HOST },
      next: { revalidate: 0 }, // freshness is handled by the Mongo cache
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (res.status === 404) return [];
  if (!res.ok) {
    throw new StreamingError(
      `Streaming Availability API failed (${res.status})`,
      res.status,
    );
  }

  const show = (await res.json()) as RawShow;
  return dedupe(show.streamingOptions?.[country.toLowerCase()] ?? []);
}

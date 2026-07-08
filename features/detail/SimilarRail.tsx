import type { MediaItem, TmdbMovieDetails, TmdbTvDetails } from "@/types/tmdb";
import { normalizeMovie, normalizeMulti, normalizeTv } from "@/lib/tmdb";
import { Rail } from "@/components/cards/Rail";
import { PosterCard } from "@/components/cards/PosterCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function SimilarRail({
  details,
  mediaType,
}: {
  details: TmdbMovieDetails | TmdbTvDetails;
  mediaType: "movie" | "tv";
}) {
  const seen = new Set<string>([`${mediaType}-${details.id}`]);
  const items: MediaItem[] = [];

  for (const raw of details.recommendations?.results ?? []) {
    const item = normalizeMulti(raw);
    if (item && !seen.has(`${item.mediaType}-${item.id}`)) {
      seen.add(`${item.mediaType}-${item.id}`);
      items.push(item);
    }
  }
  for (const raw of details.similar?.results ?? []) {
    const item =
      mediaType === "movie"
        ? normalizeMovie(raw as Parameters<typeof normalizeMovie>[0])
        : normalizeTv(raw as Parameters<typeof normalizeTv>[0]);
    if (!seen.has(`${item.mediaType}-${item.id}`)) {
      seen.add(`${item.mediaType}-${item.id}`);
      items.push(item);
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6">
      <SectionHeader overline="If you liked this" title="More like it" />
      <Rail label="Similar titles">
        {items.slice(0, 18).map((item) => (
          <PosterCard key={`${item.mediaType}-${item.id}`} item={item} />
        ))}
      </Rail>
    </section>
  );
}

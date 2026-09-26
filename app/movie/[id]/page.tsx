import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMovieDetails } from "@/lib/tmdb";
import { formatRuntime, releaseYear, tmdbImage } from "@/lib/media";
import { SITE_URL } from "@/lib/site";
import type { TmdbMovieDetails } from "@/types/tmdb";
import { DetailHero } from "@/features/detail/DetailHero";
import { TrailerEmbed } from "@/features/detail/TrailerEmbed";
import { MovieStreamPlayer } from "@/features/detail/StreamPlayer";
import { CastRail } from "@/features/detail/CastRail";
import { WhereToWatch } from "@/features/detail/WhereToWatch";
import { SimilarRail } from "@/features/detail/SimilarRail";
import { Reviews } from "@/features/detail/Reviews";
import { TitleActions } from "@/features/library/TitleActions";
import { AIPanel } from "@/features/ai/AIPanel";
import { TitleChat } from "@/features/ai/TitleChat";
import { SectionHeader } from "@/components/ui/SectionHeader";

// Route-level ISR: the server component only renders TMDB data (all
// personalization is client-side), so a day-long cache gives crawlers a fast
// warm response without going stale.
export const revalidate = 86400;

// An empty list opts the dynamic segment into on-demand ISR: nothing is
// prebuilt, but each id is rendered once on first visit and then served from
// the cache. Without this, Next renders the page on every request and the
// `revalidate` above is ignored.
export async function generateStaticParams() {
  return [];
}

async function loadMovie(id: string): Promise<TmdbMovieDetails> {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();
  try {
    return await getMovieDetails(numId);
  } catch (err) {
    if (err instanceof Error && "status" in err && err.status === 404) notFound();
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const movie = await loadMovie(id);
    const description =
      movie.overview?.slice(0, 160) ||
      `${movie.title}${
        movie.release_date ? ` (${releaseYear(movie.release_date)})` : ""
      } on Watchlr — synopsis, cast, where to watch, AI summaries and reviews.`;
    const image =
      tmdbImage(movie.backdrop_path, "w780") ??
      tmdbImage(movie.poster_path, "w500");
    return {
      title: movie.title,
      description,
      alternates: { canonical: `/movie/${movie.id}` },
      openGraph: {
        type: "video.movie",
        title: movie.title,
        description,
        url: `${SITE_URL}/movie/${movie.id}`,
        images: image ? [{ url: image, alt: movie.title }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: movie.title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { title: "Movie" };
  }
}

export default async function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await loadMovie(id);

  const trailer =
    movie.videos?.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer" && v.official,
    ) ?? movie.videos?.results.find((v) => v.site === "YouTube" && v.type === "Trailer");

  const director = movie.credits?.crew.find((c) => c.job === "Director");
  const metaLine = [
    releaseYear(movie.release_date),
    formatRuntime(movie.runtime),
    movie.original_language.toUpperCase(),
  ]
    .filter(Boolean)
    .join(" · ");

  const payload = {
    tmdbId: movie.id,
    mediaType: "movie" as const,
    title: movie.title,
    posterPath: movie.poster_path,
    voteAverage: movie.vote_average,
    genreIds: movie.genres.map((g) => g.id),
    releaseDate: movie.release_date,
    runtime: movie.runtime ?? 0,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.overview || undefined,
    datePublished: movie.release_date || undefined,
    duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
    genre: movie.genres.map((g) => g.name),
    image: tmdbImage(movie.poster_path, "w500") ?? undefined,
    url: `${SITE_URL}/movie/${movie.id}`,
    sameAs: `https://www.themoviedb.org/movie/${movie.id}`,
    director: director ? { "@type": "Person", name: director.name } : undefined,
    aggregateRating:
      movie.vote_count > 10
        ? {
            "@type": "AggregateRating",
            ratingValue: movie.vote_average.toFixed(1),
            ratingCount: movie.vote_count,
            bestRating: "10",
            worstRating: "1",
          }
        : undefined,
  };

  return (
    <div className="overflow-x-clip pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DetailHero
        title={movie.title}
        tagline={movie.tagline}
        backdropPath={movie.backdrop_path}
        posterPath={movie.poster_path}
        metaLine={metaLine}
        voteAverage={movie.vote_average}
        genres={movie.genres}
      >
        <TitleActions item={payload} />
      </DetailHero>

      <div className="mx-auto mt-14 grid max-w-6xl gap-12 px-6 lg:grid-cols-[2fr_1fr]">
        <div className="min-w-0 space-y-14">
          <section>
            <SectionHeader overline="The pitch" title="Overview" />
            <p className="max-w-2xl text-base leading-relaxed text-muted">
              {movie.overview || "No synopsis yet — mysterious."}
            </p>
          </section>

          <section>
            <MovieStreamPlayer
              tmdbId={movie.id}
              title={movie.title}
              backdropPath={movie.backdrop_path}
              item={payload}
            />
          </section>

          <section>
            <SectionHeader overline="Ask the assistant" title="AI takes" />
            <AIPanel tmdbId={movie.id} mediaType="movie" title={movie.title} />
          </section>

          {trailer && (
            <section>
              <SectionHeader overline="Watch it" title="Trailer" />
              <TrailerEmbed videoKey={trailer.key} title={movie.title} />
            </section>
          )}

          {movie.credits && movie.credits.cast.length > 0 && (
            <section>
              <SectionHeader overline="The faces" title="Cast" />
              <CastRail cast={movie.credits.cast} />
            </section>
          )}

          <section>
            <SectionHeader overline="Hot takes welcome" title="Reviews" />
            <Reviews tmdbId={movie.id} mediaType="movie" />
          </section>
        </div>

        <aside className="space-y-8 lg:pt-4">
          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-black">Where to watch</h2>
            <WhereToWatch
              tmdbId={movie.id}
              mediaType="movie"
              providers={movie["watch/providers"]}
            />
          </div>
          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-black">Facts</h2>
            <dl className="space-y-3 text-sm">
              {director && (
                <div>
                  <dt className="text-[11px] font-black text-muted">Director</dt>
                  <dd className="font-bold">{director.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-black text-muted">Status</dt>
                <dd className="font-bold">{movie.status}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-black text-muted">Audience votes</dt>
                <dd className="font-bold">{movie.vote_count.toLocaleString()}</dd>
              </div>
            </dl>
          </div>
          <TitleChat tmdbId={movie.id} mediaType="movie" title={movie.title} year={releaseYear(movie.release_date)} />
        </aside>
      </div>

      <div className="mt-20">
        <SimilarRail details={movie} mediaType="movie" />
      </div>
    </div>
  );
}

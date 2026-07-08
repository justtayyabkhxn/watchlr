import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMovieDetails } from "@/lib/tmdb";
import { formatRuntime, releaseYear } from "@/lib/media";
import type { TmdbMovieDetails } from "@/types/tmdb";
import { DetailHero } from "@/features/detail/DetailHero";
import { TrailerEmbed } from "@/features/detail/TrailerEmbed";
import { CastRail } from "@/features/detail/CastRail";
import { Providers } from "@/features/detail/Providers";
import { SimilarRail } from "@/features/detail/SimilarRail";
import { Reviews } from "@/features/detail/Reviews";
import { TitleActions } from "@/features/library/TitleActions";
import { AIPanel } from "@/features/ai/AIPanel";
import { TitleChat } from "@/features/ai/TitleChat";
import { SectionHeader } from "@/components/ui/SectionHeader";

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
    return { title: movie.title, description: movie.overview?.slice(0, 160) };
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

  return (
    <div className="overflow-x-clip pb-24">
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
            <Providers providers={movie["watch/providers"]} />
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

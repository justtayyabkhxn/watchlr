import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTvDetails } from "@/lib/tmdb";
import { releaseYear } from "@/lib/media";
import type { TmdbTvDetails } from "@/types/tmdb";
import { DetailHero } from "@/features/detail/DetailHero";
import { TrailerEmbed } from "@/features/detail/TrailerEmbed";
import { CastRail } from "@/features/detail/CastRail";
import { Providers } from "@/features/detail/Providers";
import { SimilarRail } from "@/features/detail/SimilarRail";
import { Reviews } from "@/features/detail/Reviews";
import { Seasons } from "@/features/detail/Seasons";
import { TitleActions } from "@/features/library/TitleActions";
import { AIPanel } from "@/features/ai/AIPanel";
import { TitleChat } from "@/features/ai/TitleChat";
import { SectionHeader } from "@/components/ui/SectionHeader";

async function loadShow(id: string): Promise<TmdbTvDetails> {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();
  try {
    return await getTvDetails(numId);
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
    const show = await loadShow(id);
    return { title: show.name, description: show.overview?.slice(0, 160) };
  } catch {
    return { title: "TV Show" };
  }
}

export default async function TvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const show = await loadShow(id);

  const trailer =
    show.videos?.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer" && v.official,
    ) ?? show.videos?.results.find((v) => v.site === "YouTube" && v.type === "Trailer");

  const creator = show.credits?.crew.find((c) => c.job === "Creator" || c.job === "Executive Producer");
  const avgRuntime = show.episode_run_time?.[0];
  const metaLine = [
    `${releaseYear(show.first_air_date)}–${show.status === "Ended" ? releaseYear(show.last_air_date) : ""}`,
    `${show.number_of_seasons} season${show.number_of_seasons === 1 ? "" : "s"}`,
    `${show.number_of_episodes} episodes`,
  ].join(" · ");

  const payload = {
    tmdbId: show.id,
    mediaType: "tv" as const,
    title: show.name,
    posterPath: show.poster_path,
    voteAverage: show.vote_average,
    genreIds: show.genres.map((g) => g.id),
    releaseDate: show.first_air_date,
    runtime: avgRuntime ?? 0,
  };

  return (
    <div className="overflow-x-clip pb-24">
      <DetailHero
        title={show.name}
        tagline={show.tagline}
        backdropPath={show.backdrop_path}
        posterPath={show.poster_path}
        metaLine={metaLine}
        voteAverage={show.vote_average}
        genres={show.genres}
      >
        <TitleActions item={payload} />
      </DetailHero>

      <div className="mx-auto mt-14 grid max-w-6xl gap-12 px-6 lg:grid-cols-[2fr_1fr]">
        <div className="min-w-0 space-y-14">
          <section>
            <SectionHeader overline="The pitch" title="Overview" />
            <p className="max-w-2xl text-base leading-relaxed text-muted">
              {show.overview || "No synopsis yet — mysterious."}
            </p>
          </section>

          <section>
            <SectionHeader overline="Track your progress" title="Seasons & episodes" />
            <Seasons tvId={show.id} seasons={show.seasons} item={payload} />
          </section>

          <section>
            <SectionHeader overline="Ask the assistant" title="AI takes" />
            <AIPanel tmdbId={show.id} mediaType="tv" title={show.name} />
          </section>

          {trailer && (
            <section>
              <SectionHeader overline="Watch it" title="Trailer" />
              <TrailerEmbed videoKey={trailer.key} title={show.name} />
            </section>
          )}

          {show.credits && show.credits.cast.length > 0 && (
            <section>
              <SectionHeader overline="The faces" title="Cast" />
              <CastRail cast={show.credits.cast} />
            </section>
          )}

          <section>
            <SectionHeader overline="Hot takes welcome" title="Reviews" />
            <Reviews tmdbId={show.id} mediaType="tv" />
          </section>
        </div>

        <aside className="space-y-8 lg:pt-4">
          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-black">Where to watch</h2>
            <Providers providers={show["watch/providers"]} />
          </div>
          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-black">Facts</h2>
            <dl className="space-y-3 text-sm">
              {creator && (
                <div>
                  <dt className="text-[11px] font-black text-muted">Created by</dt>
                  <dd className="font-bold">{creator.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-black text-muted">Status</dt>
                <dd className="font-bold">{show.status}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-black text-muted">Audience votes</dt>
                <dd className="font-bold">{show.vote_count.toLocaleString()}</dd>
              </div>
            </dl>
          </div>
          <TitleChat tmdbId={show.id} mediaType="tv" title={show.name} year={releaseYear(show.first_air_date)} />
        </aside>
      </div>

      <div className="mt-20">
        <SimilarRail details={show} mediaType="tv" />
      </div>
    </div>
  );
}

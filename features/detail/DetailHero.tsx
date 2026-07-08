import Image from "next/image";
import { Star } from "lucide-react";
import { formatRating, tmdbImage } from "@/lib/media";
import type { TmdbGenre } from "@/types/tmdb";

export function DetailHero({
  title,
  tagline,
  backdropPath,
  posterPath,
  metaLine,
  voteAverage,
  genres,
  children,
}: {
  title: string;
  tagline?: string | null;
  backdropPath: string | null;
  posterPath: string | null;
  metaLine: string;
  voteAverage: number;
  genres: TmdbGenre[];
  children?: React.ReactNode; // actions slot
}) {
  const backdrop = tmdbImage(backdropPath, "w1280");
  const poster = tmdbImage(posterPath, "w500");

  return (
    <section className="relative">
      {/* Cinematic backdrop, faded into the cream background */}
      <div className="absolute inset-x-0 top-0 h-72 overflow-hidden sm:h-96" aria-hidden>
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-40 sm:pt-56">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
          <div className="w-44 shrink-0 -rotate-2 overflow-hidden rounded-3xl border-4 border-white shadow-lift sm:w-60">
            {poster ? (
              <Image
                src={poster}
                alt={`${title} poster`}
                width={500}
                height={750}
                priority
                className="aspect-[2/3] object-cover"
              />
            ) : (
              <div className="grid aspect-[2/3] place-items-center bg-card p-4 text-center font-bold text-muted">
                {title}
              </div>
            )}
          </div>

          <div className="pb-2">
            {tagline && <p className="overline-track text-accent">{tagline}</p>}
            <h1 className="text-offset mt-2 text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
              {title}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-muted">
              {voteAverage > 0 && (
                <span className="inline-flex -rotate-2 items-center gap-1 rounded-full border-2 border-ink bg-accent-soft px-2.5 py-1 text-xs font-black text-ink shadow-offset-xs">
                  <Star className="size-3.5 fill-ink" aria-hidden />
                  {formatRating(voteAverage)}
                </span>
              )}
              {metaLine}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {genres.map((g) => (
                <span
                  key={g.id}
                  className="rounded-full border-2 border-border bg-card px-3 py-1 text-xs font-bold"
                >
                  {g.name}
                </span>
              ))}
            </div>
            {children && <div className="mt-6">{children}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

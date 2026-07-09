"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { formatHours, tmdbImage } from "@/lib/media";
import { Skeleton } from "@/components/ui/Skeleton";
import { Highlighter } from "@/components/ui/highlighter";
import { StickerField, type StickerSpec } from "@/features/decor/Doodads";

const PAGE_STICKERS: StickerSpec[] = [
  { icon: "trophy", className: "right-[3%] top-16 hidden lg:block", tilt: 8, delay: "0.2s" },
  { icon: "flame", className: "right-[12%] top-44 hidden xl:block", tilt: -10, delay: "1.4s", size: "sm" },
];
import { EmptyState } from "@/components/ui/EmptyState";
import { TasteRoast } from "./TasteRoast";
import {
  CalendarHeatmap,
  GenreBars,
  StatTile,
  WeeklyBars,
  type DailyPoint,
} from "./charts";

interface Stats {
  totals: {
    watches: number;
    minutes: number;
    titles: number;
    completed: number;
    reviews: number;
    ratings: number;
  };
  daily: DailyPoint[];
  genres: { name: string; count: number }[];
  recent: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
    watchedAt: string;
  }[];
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border-2 border-border bg-card p-6">
      <h2 className="text-lg font-black">{title}</h2>
      {sub && <p className="mb-4 mt-0.5 text-xs font-bold text-muted">{sub}</p>}
      <div className={sub ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

export function DashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<Stats> => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
  });

  return (
    <div className="relative mx-auto max-w-6xl px-6 pb-24">
      <StickerField items={PAGE_STICKERS} />
      <header className="pb-8 pt-14">
        <p className="overline-track text-accent">The receipts</p>
        <h1 className="text-offset mt-2 text-4xl font-black tracking-tight sm:text-6xl">
          Your watching,{" "}
          <Highlighter action="underline" color="#f59e52" strokeWidth={3} padding={5} isView>
            charted.
          </Highlighter>
        </h1>
      </header>

      {isLoading || !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : data.totals.watches === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No stats without watches"
          body="Log your first watch and this page turns into charts, streaks, and mildly judgmental genre breakdowns."
          cta={{ href: "/search", label: "Log something" }}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            <StatTile value={formatHours(data.totals.minutes)} label="watched" rotate="-rotate-1" />
            <StatTile value={String(data.totals.watches)} label="watches logged" />
            <StatTile value={String(data.totals.titles)} label="unique titles" rotate="rotate-1" />
            <StatTile value={String(data.totals.completed)} label="completed" />
          </div>

          <TasteRoast />

          <ChartCard title="Weekly rhythm" sub="Watches per week, last 12 weeks">
            <WeeklyBars daily={data.daily} />
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Genre breakdown" sub="What you actually watch (top 8)">
              <GenreBars genres={data.genres} />
            </ChartCard>
            <ChartCard title="Consistency check" sub="Daily activity, last 20 weeks">
              <CalendarHeatmap daily={data.daily} />
              <p className="mt-5 text-xs font-bold text-muted">
                {data.totals.reviews} review{data.totals.reviews === 1 ? "" : "s"} written ·{" "}
                {data.totals.ratings} rating{data.totals.ratings === 1 ? "" : "s"} given
              </p>
            </ChartCard>
          </div>

          <ChartCard title="Recent activity" sub="Your last few watches">
            <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {data.recent.map((r, i) => {
                const poster = tmdbImage(r.posterPath, "w185");
                return (
                  <li key={i}>
                    <Link href={`/${r.mediaType}/${r.tmdbId}`} className="group block">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-border bg-border transition-shadow duration-300 group-hover:shadow-lift">
                        {poster ? (
                          <Image
                            src={poster}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 30vw, 160px"
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="grid h-full place-items-center p-2 text-center text-xs font-bold text-muted">
                            {r.title}
                          </div>
                        )}
                        {r.seasonNumber != null && r.episodeNumber != null && (
                          <span className="absolute bottom-1.5 left-1.5 rounded-full border-2 border-ink bg-accent-soft px-1.5 py-0.5 text-[10px] font-black shadow-offset-xs">
                            S{r.seasonNumber}E{r.episodeNumber}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-1 text-xs font-bold group-hover:underline group-hover:decoration-accent group-hover:decoration-2 group-hover:underline-offset-2">
                        {r.title}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-muted">
                        {new Date(r.watchedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

import { Suspense } from "react";
import { getTrending } from "@/lib/tmdb";
import type { MediaItem } from "@/types/tmdb";
import { Hero } from "@/features/home/Hero";
import { MoodPicker } from "@/features/home/MoodPicker";
import { Marquee } from "@/components/layout/Marquee";
import { DriftStream } from "@/features/decor/Doodads";
import {
  ContinueWatchingRail,
  MediaRail,
  RailSkeleton,
} from "@/features/home/Rails";
import { AIPicks } from "@/features/home/AIPicks";

export default async function HomePage() {
  let heroItems: MediaItem[] = [];
  try {
    heroItems = await getTrending("movie");
  } catch {
    // Hero degrades to text-only when TMDB is unreachable.
  }

  return (
    <div className="relative overflow-x-clip">
      <DriftStream />
      <Hero trending={heroItems} />
      <Marquee />

      <div className="mt-14 space-y-14 pb-10 sm:mt-20 sm:space-y-20">
        <MoodPicker />

        <Suspense fallback={<RailSkeleton />}>
          <ContinueWatchingRail />
        </Suspense>

        <Suspense fallback={<RailSkeleton />}>
          <MediaRail kind="trendingMovies" overline="Hot this week" title="Trending movies" />
        </Suspense>

        <Suspense fallback={<RailSkeleton />}>
          <MediaRail kind="trendingTv" overline="Binge material" title="Trending shows" />
        </Suspense>

        <Suspense
          fallback={
            <>
              <RailSkeleton />
              <RailSkeleton />
            </>
          }
        >
          <AIPicks />
        </Suspense>

        <Suspense fallback={<RailSkeleton />}>
          <MediaRail kind="popularToday" overline="Right now" title="Popular today" />
        </Suspense>

        <Suspense fallback={<RailSkeleton />}>
          <MediaRail kind="topRated" overline="The canon" title="Top rated" />
        </Suspense>

        <Suspense fallback={<RailSkeleton />}>
          <MediaRail kind="upcoming" overline="Mark the calendar" title="Coming soon" />
        </Suspense>

        <Suspense fallback={<RailSkeleton />}>
          <MediaRail kind="nowPlaying" overline="Fresh out" title="Recently released" />
        </Suspense>
      </div>
    </div>
  );
}

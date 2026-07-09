import { NextRequest, NextResponse } from "next/server";
import { discover } from "@/lib/tmdb";
import type { DiscoverFilters } from "@/types/tmdb";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const num = (key: string) => {
    const v = Number(p.get(key));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };

  const filters: DiscoverFilters = {
    mediaType: p.get("mediaType") === "tv" ? "tv" : "movie",
    genre: num("genre"),
    year: num("year"),
    minRating: num("minRating"),
    language: p.get("language") || undefined,
    maxRuntime: num("maxRuntime"),
    watchProvider: num("watchProvider"),
    sortBy: p.get("sortBy") || undefined,
    page: num("page") ?? 1,
  };

  try {
    // Pure function of the query string, same for every user — let the CDN
    // and browser hold it. Catalog data drifts slowly; 10 min is plenty fresh.
    return NextResponse.json(await discover(filters), {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Discover is unavailable right now." }, { status: 502 });
  }
}

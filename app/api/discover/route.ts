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
    return NextResponse.json(await discover(filters));
  } catch {
    return NextResponse.json({ error: "Discover is unavailable right now." }, { status: 502 });
  }
}

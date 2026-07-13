import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StreamingAvailability } from "@/models/StreamingAvailability";
import {
  DEFAULT_COUNTRY,
  getStreamingOptions,
  isStreamingConfigured,
} from "@/lib/streaming";
import type { StreamingOption } from "@/types/streaming";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tmdbId = Number(url.searchParams.get("tmdbId"));
  const mediaType = url.searchParams.get("mediaType");
  const country = (
    url.searchParams.get("country") ?? DEFAULT_COUNTRY
  ).toLowerCase();

  if (
    !Number.isInteger(tmdbId) ||
    tmdbId <= 0 ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    !/^[a-z]{2}$/.test(country)
  ) {
    return NextResponse.json({ error: "Invalid params." }, { status: 400 });
  }

  // No key configured — tell the client so it can fall back to TMDB
  // provider logos instead of showing an error.
  if (!isStreamingConfigured()) {
    return NextResponse.json({ configured: false, country, options: [] });
  }

  await connectDB();

  const cached = await StreamingAvailability.findOne({
    tmdbId,
    mediaType,
    country,
  }).lean();

  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return NextResponse.json({
      configured: true,
      country,
      options: cached.options as StreamingOption[],
      cached: true,
    });
  }

  try {
    const options = await getStreamingOptions(tmdbId, mediaType, country);
    await StreamingAvailability.findOneAndUpdate(
      { tmdbId, mediaType, country },
      { $set: { options, fetchedAt: new Date() } },
      { upsert: true },
    );
    return NextResponse.json({ configured: true, country, options, cached: false });
  } catch {
    // API hiccup or quota hit — stale data beats no data.
    if (cached) {
      return NextResponse.json({
        configured: true,
        country,
        options: cached.options as StreamingOption[],
        cached: true,
        stale: true,
      });
    }
    return NextResponse.json(
      { error: "Couldn't check streaming availability right now." },
      { status: 502 },
    );
  }
}

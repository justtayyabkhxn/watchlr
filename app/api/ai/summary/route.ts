import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AISummary, SUMMARY_TYPES, type SummaryType } from "@/models/AISummary";
import { generateSummary, MODEL_TAG, type TitleContext } from "@/lib/ai";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb";
import { releaseYear } from "@/lib/media";

export const maxDuration = 60;

async function buildContext(tmdbId: number, mediaType: "movie" | "tv"): Promise<TitleContext> {
  if (mediaType === "movie") {
    const m = await getMovieDetails(tmdbId);
    return {
      title: m.title,
      year: releaseYear(m.release_date),
      mediaType,
      overview: m.overview,
      genres: m.genres.map((g) => g.name),
    };
  }
  const t = await getTvDetails(tmdbId);
  return {
    title: t.name,
    year: releaseYear(t.first_air_date),
    mediaType,
    overview: t.overview,
    genres: t.genres.map((g) => g.name),
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { tmdbId, mediaType, summaryType } = body ?? {};

  if (
    !Number.isInteger(tmdbId) ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    !SUMMARY_TYPES.includes(summaryType as SummaryType)
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  await connectDB();

  // Cache first — repeat requests never re-call the API. Matching on
  // MODEL_TAG means old-voice summaries silently regenerate after a
  // prompt change instead of being served forever.
  const cached = await AISummary.findOne({
    tmdbId,
    mediaType,
    summaryType,
    model: MODEL_TAG,
  }).lean();
  if (cached) {
    return NextResponse.json({ content: cached.content, cached: true });
  }

  try {
    const media = await buildContext(tmdbId, mediaType);
    const content = await generateSummary(summaryType as SummaryType, media);

    await AISummary.findOneAndUpdate(
      { tmdbId, mediaType, summaryType },
      { $set: { content, model: MODEL_TAG } },
      { upsert: true },
    );

    return NextResponse.json({ content, cached: false });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("GROQ_API_KEY")
        ? "AI features need GROQ_API_KEY set in .env.local."
        : "The AI couldn't answer right now. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

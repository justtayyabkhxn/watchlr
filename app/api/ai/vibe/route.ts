import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AIVibeSearch } from "@/models/AIVibeSearch";
import { generateVibeSearch, MODEL_TAG, type VibeCandidate } from "@/lib/ai";
import { resolveTitle } from "@/lib/tmdb";

export const maxDuration = 60;

interface VibeItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
  reason: string;
}

/** Resolve a model guess to a real TMDB entry — hallucinations get dropped. */
async function resolveCandidate(
  c: VibeCandidate,
  known: Set<string>,
): Promise<VibeItem | null> {
  const match = await resolveTitle(c.title, c.year, c.mediaType, known);
  if (!match) return null;
  return {
    tmdbId: match.id,
    mediaType: match.mediaType,
    title: match.title,
    posterPath: match.posterPath,
    releaseDate: match.releaseDate,
    voteAverage: match.voteAverage,
    genreIds: match.genreIds,
    reason: c.reason,
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (query.length < 3 || query.length > 300) {
    return NextResponse.json({ error: "Describe it in 3–300 characters." }, { status: 400 });
  }

  await connectDB();

  // Same phrasing, same answer — normalize just enough to catch retypes.
  const normalized = query.toLowerCase().replace(/\s+/g, " ");

  const cached = await AIVibeSearch.findOne({ query: normalized, model: MODEL_TAG }).lean();
  if (cached && cached.items.length > 0) {
    return NextResponse.json({ items: cached.items, cached: true });
  }

  try {
    const candidates = await generateVibeSearch(query);
    const known = new Set<string>();
    const items = (
      await Promise.all(candidates.map((c) => resolveCandidate(c, known)))
    ).filter((i): i is VibeItem => i !== null);

    if (items.length > 0) {
      await AIVibeSearch.findOneAndUpdate(
        { query: normalized, model: MODEL_TAG },
        { $set: { items } },
        { upsert: true },
      );
    }

    return NextResponse.json({ items, cached: false });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("GROQ_API_KEY")
        ? "Vibe search needs GROQ_API_KEY set in .env.local."
        : "The AI couldn't read your mind right now. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Watchlist } from "@/models/Watchlist";
import { WatchHistory } from "@/models/WatchHistory";
import { generateTriage, type TriageEntry } from "@/lib/ai";
import { resolveTitle } from "@/lib/tmdb";
import { GENRES, releaseYear } from "@/lib/media";

export const maxDuration = 60;

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const mood = typeof body?.mood === "string" ? body.mood.trim() : "";
  if (mood.length < 3 || mood.length > 300) {
    return NextResponse.json({ error: "Tell it in 3–300 characters." }, { status: 400 });
  }

  await connectDB();
  const uid = new Types.ObjectId(userId);

  const [entries, allLibrary, historyKeys] = await Promise.all([
    Watchlist.find({ userId: uid, status: "want_to_watch" })
      .sort({ updatedAt: -1 })
      .limit(60)
      .lean(),
    Watchlist.find({ userId: uid }).select("tmdbId mediaType").lean(),
    WatchHistory.distinct("tmdbId", { userId: uid }),
  ]);

  const forModel: TriageEntry[] = entries.map((e, i) => ({
    index: i + 1,
    title: e.title,
    year: releaseYear(e.releaseDate),
    mediaType: e.mediaType,
    genres: e.genreIds.map((id) => GENRES[id]).filter(Boolean).slice(0, 3),
  }));

  // Fresh picks must actually be fresh — nothing shelved or already watched.
  const known = new Set<string>(
    allLibrary.map((l) => `${l.mediaType}-${l.tmdbId}`),
  );
  for (const id of historyKeys) {
    known.add(`movie-${id}`);
    known.add(`tv-${id}`);
  }

  try {
    const { shelf, fresh } = await generateTriage(mood, forModel);

    const shelfPicks = shelf.map((p) => {
      const e = entries[p.index - 1];
      return {
        tmdbId: e.tmdbId,
        mediaType: e.mediaType,
        title: e.title,
        posterPath: e.posterPath,
        releaseDate: e.releaseDate,
        voteAverage: e.voteAverage,
        genreIds: e.genreIds,
        reason: p.reason,
      };
    });

    const freshPicks = (
      await Promise.all(
        fresh.map(async (f) => {
          const match = await resolveTitle(f.title, f.year, f.mediaType, known);
          if (!match) return null;
          return {
            tmdbId: match.id,
            mediaType: match.mediaType,
            title: match.title,
            posterPath: match.posterPath,
            releaseDate: match.releaseDate,
            voteAverage: match.voteAverage,
            genreIds: match.genreIds,
            reason: f.reason,
          };
        }),
      )
    ).filter((p) => p !== null);

    if (shelfPicks.length === 0 && freshPicks.length === 0) {
      throw new Error("Empty triage");
    }
    return NextResponse.json({ shelf: shelfPicks, fresh: freshPicks });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("GROQ_API_KEY")
        ? "Triage needs GROQ_API_KEY set in .env.local."
        : "The AI couldn't decide right now. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

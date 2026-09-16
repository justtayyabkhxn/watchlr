import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Watchlist } from "@/models/Watchlist";
import { generateArchaeology, type DustEntry } from "@/lib/ai";
import { GENRES, relativeAge, releaseYear } from "@/lib/media";
import { MAX_DIG, STALE_BEFORE, STALE_MIN_PILE } from "@/lib/archaeology";

export const maxDuration = 60;

interface DugItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
  /** "2 years" — how long it sat there untouched. */
  age: string;
  reason: string;
}

/**
 * Audit the want-to-watch pile: keep a few, let go of the rest.
 *
 * Only rows untouched since STALE_BEFORE are dug up. A shelf someone is
 * actively working through isn't a graveyard, and telling them it is would be
 * both wrong and rude — so a pile that doesn't qualify returns `stale: false`
 * and never reaches the model.
 */
export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  const uid = new Types.ObjectId(userId);

  // Oldest first: the dig starts at the bottom of the pile, and the cap
  // trims the freshest rows rather than the most damning ones.
  const entries = await Watchlist.find({
    userId: uid,
    status: "want_to_watch",
    updatedAt: { $lt: STALE_BEFORE() },
  })
    .sort({ updatedAt: 1 })
    .limit(MAX_DIG)
    .lean();

  if (entries.length < STALE_MIN_PILE) {
    return NextResponse.json({ stale: false, count: entries.length });
  }

  const forModel: DustEntry[] = entries.map((e, i) => ({
    index: i + 1,
    title: e.title,
    year: releaseYear(e.releaseDate),
    mediaType: e.mediaType,
    genres: e.genreIds.map((id) => GENRES[id]).filter(Boolean).slice(0, 3),
    age: relativeAge(e.updatedAt ?? new Date()),
  }));

  const hydrate = (index: number, reason: string): DugItem => {
    const e = entries[index - 1];
    return {
      tmdbId: e.tmdbId,
      mediaType: e.mediaType,
      title: e.title,
      posterPath: e.posterPath ?? null,
      releaseDate: e.releaseDate,
      voteAverage: e.voteAverage,
      genreIds: e.genreIds,
      age: forModel[index - 1].age,
      reason,
    };
  };

  try {
    const { verdict, keep, clear } = await generateArchaeology(forModel);

    const keptIndices = new Set(keep.map((k) => k.index));
    const clearReasons = new Map(clear.map((c) => [c.index, c.reason]));

    /* The model's "clear" list is advisory — it names a handful and drops the
       rest. The audit has to cover the whole pile or the bulk button lies
       about what it's clearing, so the real clear set is everything not kept,
       with the model's line where it bothered to write one. */
    const cleared = forModel
      .filter((e) => !keptIndices.has(e.index))
      .map((e) => hydrate(e.index, clearReasons.get(e.index) ?? `untouched for ${e.age}`));

    return NextResponse.json({
      stale: true,
      verdict,
      keep: keep.map((k) => hydrate(k.index, k.reason)),
      clear: cleared,
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("GROQ_API_KEY")
        ? "The archaeologist needs GROQ_API_KEY set in .env.local."
        : "The AI couldn't read the pile right now. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

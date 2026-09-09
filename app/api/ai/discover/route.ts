import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Watchlist } from "@/models/Watchlist";
import { WatchHistory } from "@/models/WatchHistory";
import { Rating } from "@/models/Rating";
import { User } from "@/models/User";
import { AIConversation } from "@/models/AIConversation";
import {
  DISCOVER_DELIMITER,
  generateDiscoverPicks,
  MODEL_TAG,
  parseDiscoverPayload,
  streamDiscoverTurn,
  type ChatTurn,
  type DiscoverShelfEntry,
  type TasteProfile,
} from "@/lib/ai";
import { resolveTitle } from "@/lib/tmdb";
import { GENRES, releaseYear } from "@/lib/media";
import type { MediaType } from "@/types/tmdb";

export const maxDuration = 60;

interface SuggestedItem {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
  reason: string;
  onShelf: boolean;
}

/* ---------- the saved thread ---------- */

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ turns: [], constraints: [], dismissed: [] });

  await connectDB();
  const doc = await AIConversation.findOne({ userId: new Types.ObjectId(userId) }).lean();
  return NextResponse.json({
    turns: doc?.turns ?? [],
    constraints: doc?.constraints ?? [],
    dismissed: doc?.dismissed ?? [],
  });
}

/** Start over — a thread this deep into one mood is worthless for the next. */
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ ok: true });

  await connectDB();
  await AIConversation.deleteOne({ userId: new Types.ObjectId(userId) });
  return NextResponse.json({ ok: true });
}

/* ---------- a turn ---------- */

interface Body {
  messages?: unknown;
  constraints?: unknown;
  dismissed?: unknown;
  suggested?: unknown;
  knownKeys?: unknown;
}

const strings = (v: unknown, cap: number, len: number): string[] =>
  (Array.isArray(v) ? v : [])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim().slice(0, len))
    .slice(0, cap);

type ShelfRow = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const messages = body?.messages;

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 40 ||
    !messages.every(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.length > 0 &&
        m.content.length <= 2000,
    ) ||
    messages[messages.length - 1].role !== "user"
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const constraints = strings(body?.constraints, 8, 40);
  const dismissed = strings(body?.dismissed, 40, 120);
  const suggested = strings(body?.suggested, 80, 120);

  // Everything already on screen in this thread, so a "more like that" turn
  // can't hand back the same poster twice.
  const known = new Set<string>(
    strings(body?.knownKeys, 200, 40).filter((k) => /^(movie|tv)-\d+$/.test(k)),
  );

  const userId = await getUserId();
  let taste: TasteProfile = { watched: [], loved: [], avoided: [], genres: [] };
  let shelf: DiscoverShelfEntry[] = [];
  let shelfRows: ShelfRow[] = [];
  let uid: Types.ObjectId | null = null;

  if (userId) {
    await connectDB();
    uid = new Types.ObjectId(userId);

    const [historyRows, libraryRows, ratings, user, pile] = await Promise.all([
      WatchHistory.aggregate<{
        _id: { tmdbId: number; mediaType: MediaType };
        title: string;
        watchedAt: Date;
      }>([
        { $match: { userId: uid } },
        { $sort: { watchedAt: -1 } },
        {
          $group: {
            _id: { tmdbId: "$tmdbId", mediaType: "$mediaType" },
            title: { $first: "$title" },
            watchedAt: { $first: "$watchedAt" },
          },
        },
        { $sort: { watchedAt: -1 } },
        { $limit: 40 },
      ]),
      Watchlist.find({ userId: uid }).lean(),
      Rating.find({ userId: uid }).lean(),
      User.findById(uid).lean(),
      Watchlist.find({ userId: uid, status: "want_to_watch" })
        .sort({ updatedAt: -1 })
        .limit(40)
        .lean(),
    ]);

    const titleOf = new Map<string, string>();
    for (const h of historyRows) titleOf.set(`${h._id.mediaType}-${h._id.tmdbId}`, h.title);
    for (const l of libraryRows) titleOf.set(`${l.mediaType}-${l.tmdbId}`, l.title);

    taste = {
      watched: historyRows.map((h) => h.title),
      loved: [
        ...libraryRows.filter((l) => l.status === "favorite").map((l) => l.title),
        ...ratings
          .filter((r) => r.value >= 8)
          .map((r) => titleOf.get(`${r.mediaType}-${r.tmdbId}`) ?? ""),
      ].filter(Boolean),
      avoided: [
        ...libraryRows.filter((l) => l.status === "dropped").map((l) => l.title),
        ...ratings
          .filter((r) => r.value <= 4)
          .map((r) => titleOf.get(`${r.mediaType}-${r.tmdbId}`) ?? ""),
      ].filter(Boolean),
      genres: user?.favoriteGenres ?? [],
    };

    // Fresh picks must be genuinely fresh — nothing watched, shelved or rated.
    for (const h of historyRows) known.add(`${h._id.mediaType}-${h._id.tmdbId}`);
    for (const l of libraryRows) known.add(`${l.mediaType}-${l.tmdbId}`);
    for (const r of ratings) known.add(`${r.mediaType}-${r.tmdbId}`);

    shelfRows = pile.map((e) => ({
      tmdbId: e.tmdbId,
      mediaType: e.mediaType,
      title: e.title,
      posterPath: e.posterPath ?? null,
      releaseDate: e.releaseDate,
      voteAverage: e.voteAverage,
      genreIds: e.genreIds,
    }));
    shelf = shelfRows.map((e, i) => ({
      index: i + 1,
      title: e.title,
      year: releaseYear(e.releaseDate),
      mediaType: e.mediaType,
      genres: e.genreIds.map((id) => GENRES[id]).filter(Boolean).slice(0, 3),
    }));
  }

  let groqStream: Awaited<ReturnType<typeof streamDiscoverTurn>>;
  try {
    groqStream = await streamDiscoverTurn(
      { taste, shelf, constraints, alreadySuggested: suggested, dismissed },
      messages as ChatTurn[],
    );
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("GROQ_API_KEY")
        ? "Suggestions need GROQ_API_KEY set in .env.local."
        : "The AI couldn't answer right now.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const encoder = new TextEncoder();

  /*
   * NDJSON out: one JSON object per line, so the client can tell prose from
   * posters without a second request. Prose streams as it lands; picks only
   * appear once TMDB has confirmed every one of them is real.
   */
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      let prose = "";
      let tail = "";
      let buffered = "";
      let pastDelimiter = false;

      const pushText = (text: string) => {
        if (!text) return;
        prose += text;
        send({ type: "text", value: text });
      };

      try {
        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (!delta) continue;

          if (pastDelimiter) {
            tail += delta;
            continue;
          }

          buffered += delta;
          const at = buffered.indexOf(DISCOVER_DELIMITER);
          if (at !== -1) {
            pushText(buffered.slice(0, at));
            tail = buffered.slice(at + DISCOVER_DELIMITER.length);
            buffered = "";
            pastDelimiter = true;
            continue;
          }

          // Hold back enough characters that a delimiter split across two
          // chunks never reaches the user as prose.
          const hold = Math.min(DISCOVER_DELIMITER.length - 1, buffered.length);
          pushText(buffered.slice(0, buffered.length - hold));
          buffered = buffered.slice(buffered.length - hold);
        }
        if (!pastDelimiter) pushText(buffered);

        let payload = parseDiscoverPayload(tail);

        // Multi-turn threads sometimes end after the prose and never emit the
        // JSON half. The prose is already on screen by then, so ask a second,
        // JSON-mode call for the picks it just promised rather than showing a
        // sentence with nothing under it.
        if (payload.fresh.length === 0 && payload.shelf.length === 0) {
          payload = await generateDiscoverPicks(
            { taste, shelf, constraints, alreadySuggested: suggested, dismissed },
            messages as ChatTurn[],
            prose.trim(),
          ).catch(() => payload);
        }

        const shelfItems: SuggestedItem[] = payload.shelf
          .map((p) => {
            const row = shelfRows[p.index - 1];
            if (!row || known.has(`${row.mediaType}-${row.tmdbId}`)) return null;
            known.add(`${row.mediaType}-${row.tmdbId}`);
            return {
              tmdbId: row.tmdbId,
              mediaType: row.mediaType,
              title: row.title,
              posterPath: row.posterPath,
              releaseDate: row.releaseDate,
              voteAverage: row.voteAverage,
              genreIds: row.genreIds,
              reason: p.reason,
              onShelf: true,
            };
          })
          .filter((i): i is SuggestedItem => i !== null);

        const freshItems = (
          await Promise.all(
            payload.fresh.map(async (f) => {
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
                onShelf: false,
              };
            }),
          )
        ).filter((i): i is SuggestedItem => i !== null);

        const items = [...shelfItems, ...freshItems];
        send({ type: "picks", items });
        send({ type: "constraints", items: payload.constraints });
        send({ type: "chips", items: payload.chips });

        if (uid) {
          // Earlier turns replay from the client as prose alone; only the turn
          // we just generated carries its posters.
          const turns = [
            ...(messages as ChatTurn[]).map((m) => ({
              role: m.role,
              content: m.content,
              items: [],
              chips: [],
            })),
            { role: "assistant" as const, content: prose.trim(), items, chips: payload.chips },
          ];
          await AIConversation.findOneAndUpdate(
            { userId: uid },
            {
              $set: {
                turns: turns.slice(-24),
                constraints: payload.constraints,
                dismissed,
                model: MODEL_TAG,
              },
            },
            { upsert: true },
          ).catch(() => null);
        }

        controller.close();
      } catch {
        send({ type: "error", message: "The AI dropped the thread. Try that again." });
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

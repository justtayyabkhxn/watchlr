import "server-only";
import Groq from "groq-sdk";
import type { SummaryType } from "@/models/AISummary";

export const AI_MODEL = "llama-3.3-70b-versatile";

/* Bump when prompts change — stored in the cache's `model` field so stale
   summaries in Mongo regenerate in the new voice instead of being served. */
export const PROMPT_VERSION = "v2-funny-tight";
export const MODEL_TAG = `${AI_MODEL}#${PROMPT_VERSION}`;

let _client: Groq | null = null;

function getClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set. Add it to .env.local");
  }
  _client ??= new Groq();
  return _client;
}

export interface TitleContext {
  title: string;
  year: string;
  mediaType: "movie" | "tv";
  overview: string;
  genres: string[];
}

function describe(media: TitleContext): string {
  const kind = media.mediaType === "movie" ? "movie" : "TV series";
  return `the ${media.year} ${kind} "${media.title}" (genres: ${media.genres.join(", ") || "unknown"}). Official synopsis: ${media.overview || "not available"}`;
}

/* internet_verdict is generated from real reviews via generateVerdict below,
   so it has no synopsis-based prompt here. */
export type ProseSummaryType = Exclude<SummaryType, "internet_verdict">;

const SUMMARY_PROMPTS: Record<ProseSummaryType, (m: TitleContext) => string> = {
  spoiler_free: (m) =>
    `Give a spoiler-free pitch for ${describe(m)}. Premise and vibe only — nothing past act one, no twists, no fates. Max 2 short paragraphs. Make it genuinely fun to read.`,
  detailed: (m) =>
    `Tell the full story of ${describe(m)} like you're recapping it to a friend who missed it. Whole arc including the ending, spoilers fine — but tight: max 3 paragraphs, no scene-by-scene padding.`,
  ending_explained: (m) =>
    `Explain the ending of ${describe(m)} like a 1am debrief with a friend: what literally happened, what it meant, and the one thing fans still argue about. Full spoilers. Max 3 punchy paragraphs.`,
  themes: (m) =>
    `What is ${describe(m)} actually about under the hood? Pick the 3 themes that matter, one tight sentence-or-three each. Wit welcome, don't ruin the ending.`,
  should_i_watch: (m) =>
    `Verdict time for ${describe(m)}: who'll love it, who should skip it, and a one-line verdict at the end. Zero spoilers, max 2 short paragraphs, be funny but honest.`,
};

const SYSTEM_PROMPT =
  "You are Watchlr's resident film nerd — sharp, funny, allergic to filler. Write like a witty friend, not a press release. Plain prose only: no markdown, no bullet lists, no headings, no 'in conclusion', no hedging, no restating the question. Every sentence earns its place. If you don't actually know this title, say so in one honest line instead of inventing plot details.";

/** One-shot summary generation (cached in Mongo by the caller). */
export async function generateSummary(
  summaryType: ProseSummaryType,
  media: TitleContext,
): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 700,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: SUMMARY_PROMPTS[summaryType](media) },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from model");
  return text;
}

/* ---------- personalized picks ---------- */

export interface TasteProfile {
  watched: string[]; // recently watched title names
  loved: string[]; // favorites + rated 8-10
  avoided: string[]; // dropped + rated 1-4
  genres: string[]; // self-declared favorite genres
}

export interface RawPick {
  title: string;
  year: string;
  reason: string;
}

function pickList(items: unknown): RawPick[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (p): p is RawPick =>
        typeof p?.title === "string" && p.title.length > 0 && typeof p?.reason === "string",
    )
    .map((p) => ({ title: p.title, year: String(p.year ?? ""), reason: p.reason.slice(0, 120) }))
    .slice(0, 14);
}

/** One-shot taste-based recommendations, strict JSON out. */
export async function generatePicks(
  taste: TasteProfile,
): Promise<{ movies: RawPick[]; shows: RawPick[] }> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 1800,
    temperature: 0.9, // reshuffles should feel like a fresh hand, not a rerun
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Watchlr's recommendation brain. You only recommend real, verifiable movies and TV shows. Respond with strict JSON only.",
      },
      {
        role: "user",
        content: `A user's taste profile:
- recently watched: ${taste.watched.slice(0, 25).join("; ") || "nothing yet"}
- loved (favorites + rated 8-10): ${taste.loved.slice(0, 15).join("; ") || "unknown"}
- disliked or dropped: ${taste.avoided.slice(0, 10).join("; ") || "unknown"}
- favorite genres: ${taste.genres.join(", ") || "unknown"}

Recommend exactly 12 MOVIES and 12 TV SHOWS they have NOT already watched. Mostly strong fits, plus 2-3 leftfield curveballs. Every "reason" is one witty line, max 12 words, no spoilers, tailored to THEIR taste. Variety seed (vary picks across calls): ${Math.random().toString(36).slice(2, 8)}.

Return JSON exactly like: {"movies":[{"title":"...","year":"2014","reason":"..."}],"shows":[{"title":"...","year":"2019","reason":"..."}]}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  let parsed: { movies?: unknown; shows?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  const movies = pickList(parsed.movies);
  const shows = pickList(parsed.shows);
  if (movies.length === 0 && shows.length === 0) throw new Error("Empty picks");
  return { movies, shows };
}

/* ---------- vibe search ---------- */

export interface VibeCandidate {
  title: string;
  year: string;
  mediaType: "movie" | "tv";
  reason: string;
}

/** Natural-language search: "the wedding time-loop one" → real title guesses. */
export async function generateVibeSearch(query: string): Promise<VibeCandidate[]> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Watchlr's vibe-search engine. Users describe a movie or show in loose natural language — a half-remembered plot, a mood, 'like X but Y'. You only return real, verifiable titles. Respond with strict JSON only.",
      },
      {
        role: "user",
        content: `The user typed: "${query}"

Interpret what they're after and return the 10 real movies or TV shows that best match. If they're describing one specific half-remembered title, lead with your best guesses for it, then close matches. Every "reason" is one line, max 10 words, saying why it fits their words. mediaType is "movie" or "tv".

Return JSON exactly like: {"picks":[{"title":"...","year":"2014","mediaType":"movie","reason":"..."}]}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  let parsed: { picks?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Model returned invalid JSON");
  }
  if (!Array.isArray(parsed.picks)) throw new Error("Empty vibe results");
  return parsed.picks
    .filter(
      (p): p is VibeCandidate =>
        typeof p?.title === "string" &&
        p.title.length > 0 &&
        (p?.mediaType === "movie" || p?.mediaType === "tv"),
    )
    .map((p) => ({
      title: p.title,
      year: String(p.year ?? ""),
      mediaType: p.mediaType,
      reason: typeof p.reason === "string" ? p.reason.slice(0, 120) : "",
    }))
    .slice(0, 10);
}

/* ---------- taste roast ---------- */

export interface TasteSignals {
  watched: string[];
  loved: string[];
  avoided: string[];
  topGenres: string[];
  stats: {
    watches: number;
    hours: number;
    completed: number;
    dropped: number;
    ratings: number;
    avgRating: number;
  };
}

/** A funny, slightly savage read of the user's taste, from their real data. */
export async function generateTasteRoast(t: TasteSignals): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 600,
    temperature: 0.9, // re-roasts should sting in new places
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is a real person's viewing record on Watchlr:
- recently watched: ${t.watched.slice(0, 30).join("; ") || "nothing"}
- loved (favorites + rated 8-10): ${t.loved.slice(0, 15).join("; ") || "nothing"}
- disliked or dropped: ${t.avoided.slice(0, 10).join("; ") || "nothing"}
- most-watched genres: ${t.topGenres.join(", ") || "unknown"}
- numbers: ${t.stats.watches} watches, ~${t.stats.hours} hours, ${t.stats.completed} completed, ${t.stats.dropped} dropped, ${t.stats.ratings} ratings (average ${t.stats.avgRating || "?"}/10)

Write "your taste, explained": a funny, affectionately savage read of this person, in second person. Exactly 3 short paragraphs: (1) the diagnosis — what kind of watcher they are, (2) the pattern they'd never admit to (use specific titles as evidence), (3) a backhanded compliment plus a one-line prescription for what to do next. Roast the taste, never the person. No lists, no headings, no intro line.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from model");
  return text;
}

/* ---------- watchlist triage ---------- */

export interface TriageEntry {
  index: number;
  title: string;
  year: string;
  mediaType: "movie" | "tv";
  genres: string[];
}

export interface FreshPick {
  title: string;
  year: string;
  mediaType: "movie" | "tv";
  reason: string;
}

export interface TriageResult {
  shelf: { index: number; reason: string }[];
  fresh: FreshPick[];
}

/**
 * Pick tonight's watch for the user's mood: the best fits from their own
 * pile, plus fresh suggestions they don't already have.
 */
export async function generateTriage(
  mood: string,
  entries: TriageEntry[],
): Promise<TriageResult> {
  const client = getClient();
  const list = entries
    .map((e) => `${e.index}. ${e.title} (${e.year}, ${e.mediaType}${e.genres.length ? `, ${e.genres.join("/")}` : ""})`)
    .join("\n");

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Watchlr's what-tonight concierge: the user tells you their mood and available time, you pick tonight's watch. You only suggest real, verifiable movies and TV shows. Respond with strict JSON only.",
      },
      {
        role: "user",
        content: `Tonight the user says: "${mood}"

Their want-to-watch pile:
${list || "(empty)"}

Two jobs, both tuned to tonight's mood — respect any time limit they mention (a movie beats starting a series when time is short):
1. "shelf": the ${Math.min(3, entries.length)} best fits FROM their pile, best first, referenced ONLY by the numbers above.${entries.length === 0 ? " (empty pile — return [])" : ""}
2. "fresh": exactly 3 real titles NOT on their pile that nail the mood — new ideas, not classics they've obviously seen.

Every "reason" is one witty line, max 12 words, tied to what they said.

Return JSON exactly like: {"shelf":[{"index":3,"reason":"..."}],"fresh":[{"title":"...","year":"2014","mediaType":"movie","reason":"..."}]}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  let parsed: { shelf?: unknown; fresh?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  const valid = new Set(entries.map((e) => e.index));
  const seen = new Set<number>();
  const shelf = (Array.isArray(parsed.shelf) ? parsed.shelf : [])
    .filter(
      (p): p is { index: number; reason: string } =>
        Number.isInteger(p?.index) && valid.has(p.index) && typeof p?.reason === "string",
    )
    .filter((p) => {
      if (seen.has(p.index)) return false;
      seen.add(p.index);
      return true;
    })
    .map((p) => ({ index: p.index, reason: p.reason.slice(0, 120) }))
    .slice(0, 3);

  const fresh = (Array.isArray(parsed.fresh) ? parsed.fresh : [])
    .filter(
      (p): p is FreshPick =>
        typeof p?.title === "string" &&
        p.title.length > 0 &&
        (p?.mediaType === "movie" || p?.mediaType === "tv"),
    )
    .map((p) => ({
      title: p.title,
      year: String(p.year ?? ""),
      mediaType: p.mediaType,
      reason: typeof p.reason === "string" ? p.reason.slice(0, 120) : "",
    }))
    .slice(0, 3);

  if (shelf.length === 0 && fresh.length === 0) throw new Error("Empty triage");
  return { shelf, fresh };
}

/* ---------- the internet's verdict ---------- */

export interface ReviewExcerpt {
  rating: number | null; // /10, when the reviewer left one
  excerpt: string;
}

/** Summarize real community reviews into a consensus + the main fight. */
export async function generateVerdict(
  media: TitleContext,
  reviews: ReviewExcerpt[],
): Promise<string> {
  const client = getClient();
  const corpus = reviews
    .map((r, i) => `review ${i + 1}${r.rating != null ? ` (${r.rating}/10)` : ""}: ${r.excerpt}`)
    .join("\n\n");

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 600,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here are ${reviews.length} real audience reviews of ${describe(media)}:

${corpus}

Answer the eternal question: is everyone on the internet lying, or is it actually good? Max 3 short paragraphs: (1) the consensus — what almost everyone agrees on, (2) the fight — where reviewers split and why, (3) a one-or-two-line verdict on who should trust the hype. Speak from the reviews, not your own opinion; don't quote anyone at length; no spoilers beyond what a trailer shows.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from model");
  return text;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Streaming chat scoped to a single title. Returns the Groq chunk stream. */
export function streamTitleChat(media: TitleContext, turns: ChatTurn[]) {
  const client = getClient();
  return client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 1024,
    stream: true,
    messages: [
      {
        role: "system",
        content: `You are Watchlr's assistant for ${describe(media)}. Answer questions about this title only — plot, characters, themes, cast, trivia, genre gossip. Be sharp and funny, never long-winded: under 120 words unless depth is genuinely needed, zero filler. Warn before major spoilers and let the user opt in, unless they've made clear they want them. Off-topic questions get steered back to this title with a joke.`,
      },
      ...turns.slice(-12),
    ],
  });
}

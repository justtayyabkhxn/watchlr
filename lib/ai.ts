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

const SUMMARY_PROMPTS: Record<SummaryType, (m: TitleContext) => string> = {
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
  "You are Watchr's resident film nerd — sharp, funny, allergic to filler. Write like a witty friend, not a press release. Plain prose only: no markdown, no bullet lists, no headings, no 'in conclusion', no hedging, no restating the question. Every sentence earns its place. If you don't actually know this title, say so in one honest line instead of inventing plot details.";

/** One-shot summary generation (cached in Mongo by the caller). */
export async function generateSummary(
  summaryType: SummaryType,
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
          "You are Watchr's recommendation brain. You only recommend real, verifiable movies and TV shows. Respond with strict JSON only.",
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
        content: `You are Watchr's assistant for ${describe(media)}. Answer questions about this title only — plot, characters, themes, cast, trivia, genre gossip. Be sharp and funny, never long-winded: under 120 words unless depth is genuinely needed, zero filler. Warn before major spoilers and let the user opt in, unless they've made clear they want them. Off-topic questions get steered back to this title with a joke.`,
      },
      ...turns.slice(-12),
    ],
  });
}

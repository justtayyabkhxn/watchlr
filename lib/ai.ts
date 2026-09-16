import "server-only";
import Groq from "groq-sdk";
import type { SummaryType } from "@/models/AISummary";

export const AI_MODEL = "qwen/qwen3.8-27b";

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
  sarcastic_tagline: (m) =>
    `Write ONE sarcastic one-liner summing up ${describe(m)}. Dry, deadpan, a little mean to the premise but affectionate — the kind of caption someone slaps on an instagram story. Max 12 words. No spoilers past act one, no quotes around it, no emoji, no trailing period.`,
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

/* ---------- the watchlist archaeologist ---------- */

export interface DustEntry extends TriageEntry {
  /** How long it has sat untouched, already humanised: "2 years", "8 months". */
  age: string;
}

export interface ArchaeologyResult {
  /** The opening line: names the real number, says the quiet part. */
  verdict: string;
  keep: { index: number; reason: string }[];
  clear: { index: number; reason: string }[];
}

/**
 * Audit a want-to-watch pile that has stopped moving: which few are still
 * worth keeping, and which the user is quietly never going to watch.
 *
 * Same pipeline as generateTriage — number the pile, get indices and reasons
 * back — with one addition: each entry carries how long it has been sitting
 * there, because age is the whole argument this prompt is making.
 *
 * `clear` is advisory, not exhaustive. Models reliably name a handful of
 * titles and quietly drop the rest, so the caller derives the real clear set
 * as "everything not kept" and uses these reasons where they exist. That way
 * a lazy response still produces a complete, correct audit.
 */
export async function generateArchaeology(
  entries: DustEntry[],
): Promise<ArchaeologyResult> {
  const client = getClient();
  const list = entries
    .map(
      (e) =>
        // "untouched for", never "added" — age comes from updatedAt, so a
        // re-shelved title is old news, not a fresh addition. Saying "added"
        // would invite the model to date it wrong out loud.
        `${e.index}. ${e.title} (${e.year}, ${e.mediaType}${e.genres.length ? `, ${e.genres.join("/")}` : ""}) — untouched for ${e.age}`,
    )
    .join("\n");

  const keepTarget = Math.min(3, entries.length);

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 1200,
    // No user input to vary on, so the temperature is what keeps a re-dig of
    // an unchanged pile from reading like a photocopy of the last one.
    temperature: 0.85,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Watchlr's watchlist archaeologist. You dig through want-to-watch piles that stopped moving and say the thing the user already knows: they are not going to watch most of this. You are affectionate, never scolding — the point is a shelf they'd actually use, not guilt. Respond with strict JSON only.",
      },
      {
        role: "user",
        content: `These ${entries.length} titles have been sitting on the user's want-to-watch shelf, untouched, longest-untouched first. The ages are how long each has gone without being opened or re-shelved — not when it was added, so never claim a date they joined the list:

${list}

Three jobs:
1. "verdict": open with the honest read on this pile. Name the real number (${entries.length}), say roughly how many they're realistically never getting to, and land on keeping a few. Two sentences, max 40 words, lowercase-friendly, dry and warm — never preachy, never a lecture about productivity.
2. "keep": the ${keepTarget} genuinely worth rescuing, referenced ONLY by the numbers above. Favour the ones with real staying power over the ones they added on a whim. Each "reason" argues for it in one line, max 12 words.
3. "clear": the ones to let go, by number, up to 20 of them. Each "reason" is a short dismissal, max 8 words — "you'd have watched it by now", "this was a phase". Never cruel about the film itself, only about the odds.

A number appears in "keep" or in "clear", never both.

Return JSON exactly like: {"verdict":"...","keep":[{"index":3,"reason":"..."}],"clear":[{"index":7,"reason":"..."}]}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  let parsed: { verdict?: unknown; keep?: unknown; clear?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  const valid = new Set(entries.map((e) => e.index));
  // One shared seen-set across both lists: a title the model argued for
  // keeping must not also show up on the chopping block, and "keep" is
  // read first so it wins that collision.
  const seen = new Set<number>();
  const picks = (raw: unknown, cap: number, reasonLength: number) =>
    (Array.isArray(raw) ? raw : [])
      .filter(
        (p): p is { index: number; reason: string } =>
          Number.isInteger(p?.index) && valid.has(p.index) && typeof p?.reason === "string",
      )
      .filter((p) => {
        if (seen.has(p.index)) return false;
        seen.add(p.index);
        return true;
      })
      .map((p) => ({ index: p.index, reason: p.reason.slice(0, reasonLength) }))
      .slice(0, cap);

  const keep = picks(parsed.keep, 4, 120);
  const clear = picks(parsed.clear, 20, 60);

  const verdict =
    typeof parsed.verdict === "string" && parsed.verdict.trim()
      ? parsed.verdict.trim().slice(0, 240)
      : "";

  if (!verdict && keep.length === 0 && clear.length === 0) {
    throw new Error("Empty archaeology");
  }
  return { verdict, keep, clear };
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

/* ---------- the suggestion conversation ---------- */

export interface DiscoverShelfEntry {
  index: number;
  title: string;
  year: string;
  mediaType: "movie" | "tv";
  genres: string[];
}

export interface DiscoverContext {
  taste: TasteProfile;
  /** The user's want-to-watch pile, numbered — suggested by index, never by name. */
  shelf: DiscoverShelfEntry[];
  /** The visible, user-editable chips. Deleting one here removes it from the prompt. */
  constraints: string[];
  /** Everything this thread has already put on screen — stops turn six repeating turn two. */
  alreadySuggested: string[];
  /** Titles the user actively swiped away, which is stronger signal than never seeing them. */
  dismissed: string[];
}

/**
 * The delimiter that splits a turn in two. Everything before it is prose we
 * stream to the user a token at a time; everything after is the JSON payload
 * we resolve against TMDB before anything reaches the screen.
 *
 * One call rather than two, because a separate JSON pass writes picks the
 * prose has never seen — "here are three short ones" over a 160-minute film.
 */
export const DISCOVER_DELIMITER = "<<<PICKS>>>";

export interface DiscoverPayload {
  shelf: { index: number; reason: string }[];
  fresh: FreshPick[];
  constraints: string[];
  chips: string[];
}

/** Streaming suggestion turn: prose, then a JSON block behind the delimiter. */
export function streamDiscoverTurn(ctx: DiscoverContext, turns: ChatTurn[]) {
  const client = getClient();
  const shelfList = ctx.shelf
    .map(
      (e) =>
        `${e.index}. ${e.title} (${e.year}, ${e.mediaType}${e.genres.length ? `, ${e.genres.join("/")}` : ""})`,
    )
    .join("\n");

  return client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 1100,
    temperature: 0.8,
    stream: true,
    messages: [
      {
        role: "system",
        content: `You are Watchlr's suggestion desk. The user talks to you like a friend with good taste, and you hand back real things to watch — narrowing with every turn instead of starting over.

WHO YOU'RE TALKING TO
- recently watched: ${ctx.taste.watched.slice(0, 25).join("; ") || "nothing yet"}
- loved (favorites + rated 8-10): ${ctx.taste.loved.slice(0, 15).join("; ") || "unknown"}
- disliked or dropped: ${ctx.taste.avoided.slice(0, 10).join("; ") || "unknown"}
- favorite genres: ${ctx.taste.genres.join(", ") || "unknown"}

THEIR WANT-TO-WATCH PILE (refer to these by number only):
${shelfList || "(empty)"}

LOCKED CONSTRAINTS — the user can see these as chips and delete them at will. Honour every one:
${ctx.constraints.length ? ctx.constraints.map((c) => `- ${c}`) : "- (none yet)"}

ALREADY SUGGESTED THIS CONVERSATION — never offer any of these again:
${ctx.alreadySuggested.slice(0, 60).join("; ") || "(nothing yet)"}

TURNED DOWN — they saw these and said no. Read the pattern, don't just avoid the titles:
${ctx.dismissed.slice(0, 20).join("; ") || "(nothing yet)"}

HOW YOU ANSWER
Always in two parts, in this exact order.

1. Prose. Two sentences, maximum 35 words. Say what you're going for and why, in the house voice — sharp, funny, no filler, no markdown, no lists, no preamble like "Sure!" or "Here are". If they asked a question rather than for suggestions, answer it in the same two sentences.

2. The line ${DISCOVER_DELIMITER} on its own, then ONE JSON object and nothing else:
{"shelf":[{"index":3,"reason":"..."}],"fresh":[{"title":"...","year":"2014","mediaType":"movie","reason":"..."}],"constraints":["under 100 min"],"chips":["shorter","weirder"]}

- "shelf": up to 2 things already on their pile that fit. Their own list comes first — something they already meant to watch beats a stranger. Empty array if the pile is empty or nothing fits. Reference by the numbers above and never invent one.
- "fresh": 3 to 5 real titles NOT on the pile and NOT already suggested. Only titles you are certain exist; anything you invent is dropped before it renders and the user gets a thinner answer.
- Every "reason" is one line, max 12 words, tied to what they actually asked for. No spoilers.
- "constraints": the full updated list of hard limits in play — runtime, genre, era, language, mood, streaming service. Carry the locked ones forward verbatim, add whatever they just said, drop anything they've explicitly lifted. Each is 4 words or fewer, lowercase. Never re-add one that's missing from the locked list unless they say it again.
- "chips": exactly 4 two-or-three-word follow-ups that would sharpen the search from here — "shorter", "less bleak", "nothing pre-2000". They are next steps, never restatements of what's already locked.`,
      },
      ...turns.slice(-10),
      /* Replayed assistant turns are prose only — the JSON tail never comes
         back from the client — so by turn three the model's own examples have
         taught it that a reply is a sentence and nothing else. This reminder
         sits last, where recency wins. */
      {
        role: "system",
        content: `Answer in the two-part format now: at most 35 words of prose, then the line ${DISCOVER_DELIMITER} on its own, then the JSON object. The JSON half is mandatory — without it the user sees no posters at all.`,
      },
    ],
  });
}

/**
 * Recovery for a turn whose JSON tail never arrived. Prose has already
 * streamed by the time we know, so this asks for the picks alone, in JSON
 * mode where the format is guaranteed rather than requested.
 */
export async function generateDiscoverPicks(
  ctx: DiscoverContext,
  turns: ChatTurn[],
  prose: string,
): Promise<DiscoverPayload> {
  const client = getClient();
  const shelfList = ctx.shelf
    .map((e) => `${e.index}. ${e.title} (${e.year}, ${e.mediaType})`)
    .join("\n");
  const asked = [...turns].reverse().find((t) => t.role === "user")?.content ?? "";

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 700,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Watchlr's suggestion desk. You only name real, verifiable movies and TV shows. Respond with strict JSON only.",
      },
      {
        role: "user",
        content: `The user asked: "${asked}"

You already replied: "${prose}"

Now produce the picks that reply promised.

Their taste — loved: ${ctx.taste.loved.slice(0, 12).join("; ") || "unknown"}; avoided: ${ctx.taste.avoided.slice(0, 8).join("; ") || "unknown"}.
Constraints to honour: ${ctx.constraints.join("; ") || "(none)"}.
Never repeat any of these: ${ctx.alreadySuggested.slice(0, 40).join("; ") || "(nothing yet)"}.
They turned these down: ${ctx.dismissed.slice(0, 15).join("; ") || "(nothing)"}.

Their want-to-watch pile:
${shelfList || "(empty)"}

Return up to 2 from the pile by number, 3 to 5 real titles that are not on it, the full list of constraints in play (each 4 words or fewer, lowercase), and exactly 4 short follow-up suggestions. Every reason is one line, max 12 words.

Return JSON exactly like: {"shelf":[{"index":3,"reason":"..."}],"fresh":[{"title":"...","year":"2014","mediaType":"movie","reason":"..."}],"constraints":["under 100 min"],"chips":["shorter","weirder","less bleak","nothing pre-2000"]}`,
      },
    ],
  });

  return parseDiscoverPayload(response.choices[0]?.message?.content ?? "{}");
}

/** Parse the JSON tail of a discover turn. Never throws — a bad tail is an empty turn. */
export function parseDiscoverPayload(tail: string): DiscoverPayload {
  const empty: DiscoverPayload = { shelf: [], fresh: [], constraints: [], chips: [] };
  const start = tail.indexOf("{");
  const end = tail.lastIndexOf("}");
  if (start === -1 || end <= start) return empty;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(tail.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return empty;
  }

  const strings = (v: unknown, cap: number, len: number) =>
    (Array.isArray(v) ? v : [])
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim().slice(0, len))
      .slice(0, cap);

  const shelf = (Array.isArray(parsed.shelf) ? parsed.shelf : [])
    .filter(
      (p): p is { index: number; reason: string } =>
        Number.isInteger((p as { index?: unknown })?.index) &&
        typeof (p as { reason?: unknown })?.reason === "string",
    )
    .map((p) => ({ index: p.index, reason: p.reason.slice(0, 120) }))
    .slice(0, 2);

  const fresh = (Array.isArray(parsed.fresh) ? parsed.fresh : [])
    .filter(
      (p): p is FreshPick =>
        typeof (p as { title?: unknown })?.title === "string" &&
        (p as { title: string }).title.length > 0 &&
        ((p as { mediaType?: unknown })?.mediaType === "movie" ||
          (p as { mediaType?: unknown })?.mediaType === "tv"),
    )
    .map((p) => ({
      title: p.title,
      year: String(p.year ?? ""),
      mediaType: p.mediaType,
      reason: typeof p.reason === "string" ? p.reason.slice(0, 120) : "",
    }))
    .slice(0, 5);

  return {
    shelf,
    fresh,
    constraints: strings(parsed.constraints, 8, 40),
    chips: strings(parsed.chips, 4, 30),
  };
}

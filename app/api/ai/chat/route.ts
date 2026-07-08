import { NextResponse } from "next/server";
import { streamTitleChat, type ChatTurn, type TitleContext } from "@/lib/ai";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb";
import { releaseYear } from "@/lib/media";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { tmdbId, mediaType, messages } = body ?? {};

  if (
    !Number.isInteger(tmdbId) ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    !Array.isArray(messages) ||
    messages.length === 0 ||
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

  let media: TitleContext;
  try {
    if (mediaType === "movie") {
      const m = await getMovieDetails(tmdbId);
      media = {
        title: m.title,
        year: releaseYear(m.release_date),
        mediaType,
        overview: m.overview,
        genres: m.genres.map((g) => g.name),
      };
    } else {
      const t = await getTvDetails(tmdbId);
      media = {
        title: t.name,
        year: releaseYear(t.first_air_date),
        mediaType,
        overview: t.overview,
        genres: t.genres.map((g) => g.name),
      };
    }
  } catch {
    return NextResponse.json({ error: "Couldn't load title context." }, { status: 502 });
  }

  try {
    const groqStream = await streamTitleChat(media, messages as ChatTurn[]);
    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of groqStream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("GROQ_API_KEY")
        ? "AI chat needs GROQ_API_KEY set in .env.local."
        : "The AI couldn't answer right now.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

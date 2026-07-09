"use client";

import { useRef, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import type { MediaType } from "@/types/tmdb";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export function TitleChat({
  tmdbId,
  mediaType,
  title,
  year,
}: {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  };

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || streaming) return;

    setError("");
    setInput("");
    const history: Turn[] = [...turns, { role: "user", content: question }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setStreaming(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType, messages: history }),
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Chat is unavailable right now.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setTurns([...history, { role: "assistant", content: answer }]);
        scrollToBottom();
      }
    } catch (err) {
      setTurns(history);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-border bg-card">
      <div className="flex items-center gap-2 border-b-2 border-border px-5 py-4">
        <span className="grid size-8 -rotate-6 place-items-center rounded-xl bg-accent-soft">
          <MessageCircle className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-black leading-tight">Ask about {title}</h2>
          <p className="text-[11px] font-bold text-muted">plot, lore, cast — anything ({year})</p>
        </div>
      </div>

      <div ref={scrollRef} data-lenis-prevent className="max-h-80 space-y-3 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="space-y-2 py-2">
            <p className="text-xs font-bold text-muted">Try asking:</p>
            {["Is it worth finishing?", "Explain that twist", "Similar vibes to what?"].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setInput(q)}
                className="mr-1.5 rounded-full bg-surface-hover px-3 py-1.5 text-xs font-bold transition-colors hover:bg-accent-soft"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {turns.map((turn, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              turn.role === "user"
                ? "ml-auto bg-ink text-white"
                : "bg-surface-hover text-ink"
            }`}
          >
            {turn.content || (
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Sparkles className="size-3.5 animate-pulse text-accent" aria-hidden />
                thinking…
              </span>
            )}
          </div>
        ))}
        {error && <p className="text-xs font-bold text-accent">{error}</p>}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t-2 border-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          aria-label={`Ask about ${title}`}
          maxLength={2000}
          className="h-10 min-w-0 flex-1 rounded-full border-2 border-border bg-background px-4 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          aria-label="Send message"
          className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-accent shadow-offset-xs transition-all duration-150 hover:scale-105 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}

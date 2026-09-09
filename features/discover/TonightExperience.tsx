"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Popcorn, Send, Sparkles } from "lucide-react";
import { ThinkingBubble } from "@/components/ui/LoadingMessage";
import { ConstraintBar } from "./ConstraintBar";
import { PickStrip } from "./PickStrip";
import { itemKey, itemLabel, type SuggestedItem, type Turn } from "./types";

/* Openers for a cold page. Deliberately not genre buttons — the whole point
   of the page is that you can say something a dropdown can't hold. */
const STARTERS = [
  "something short and funny, i'm tired",
  "i loved the bear. what now?",
  "a thriller i can half-watch",
  "pick from my list, i can't decide",
];

const TILTS = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1"];

interface StreamEvent {
  type: "text" | "picks" | "constraints" | "chips" | "error";
  value?: string;
  items?: SuggestedItem[] | string[];
  message?: string;
}

export function TonightExperience() {
  const params = useSearchParams();
  const reduceMotion = useReducedMotion();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  /* Every send needs the newest thread state, and setState is async — so the
     source of truth for the request body is this mirror, not the closure. */
  const stateRef = useRef({ turns, constraints, dismissed });
  useEffect(() => {
    stateRef.current = { turns, constraints, dismissed };
  }, [turns, constraints, dismissed]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() =>
      endRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "end",
      }),
    );
  }, [reduceMotion]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || streaming) return;

      setError("");
      setInput("");

      const { turns: prior, constraints: locks, dismissed: nos } = stateRef.current;
      const history: Turn[] = [
        ...prior,
        { role: "user", content: question, items: [], chips: [] },
      ];
      setTurns([...history, { role: "assistant", content: "", items: [], chips: [] }]);
      setStreaming(true);
      scrollToEnd();

      const controller = new AbortController();
      abortRef.current = controller;

      /* A watchdog, not a deadline: a long answer is fine, a silent one is
         not. Every chunk pushes the timer out, so this only fires when the
         stream has genuinely stopped talking — otherwise a dropped connection
         mid-answer leaves the thinking bubble pulsing forever. */
      let watchdog: number | undefined;
      const kick = () => {
        if (watchdog !== undefined) window.clearTimeout(watchdog);
        watchdog = window.setTimeout(() => controller.abort("stalled"), 25_000);
      };
      kick();

      /** Patch the assistant turn we just optimistically appended. */
      const patchLast = (patch: Partial<Turn>) =>
        setTurns((current) =>
          current.map((t, i) => (i === current.length - 1 ? { ...t, ...patch } : t)),
        );

      try {
        const res = await fetch("/api/ai/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
            constraints: locks,
            dismissed: nos,
            suggested: prior.flatMap((t) => t.items.map(itemLabel)),
            knownKeys: prior.flatMap((t) => t.items.map(itemKey)),
          }),
        });

        if (!res.ok || !res.body) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "suggestions are unavailable right now.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let prose = "";

        // NDJSON: one event per line, so a half-arrived line waits its turn.
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          kick();
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            let event: StreamEvent;
            try {
              event = JSON.parse(line) as StreamEvent;
            } catch {
              continue;
            }

            if (event.type === "text" && event.value) {
              prose += event.value;
              patchLast({ content: prose });
            } else if (event.type === "picks") {
              patchLast({ items: (event.items ?? []) as SuggestedItem[] });
              scrollToEnd();
            } else if (event.type === "constraints") {
              setConstraints((event.items ?? []) as string[]);
            } else if (event.type === "chips") {
              patchLast({ chips: (event.items ?? []) as string[] });
            } else if (event.type === "error") {
              setError(event.message ?? "something went wrong.");
            }
          }
        }

        // A turn that produced nothing at all is worse than an error message.
        if (!prose.trim()) {
          setTurns(history);
          setError("that came back empty. try phrasing it differently?");
        }
      } catch (err) {
        if (controller.signal.aborted) {
          if (controller.signal.reason === "stalled") {
            setTurns(history);
            setError("that answer stalled on the way over. try again?");
            setStreaming(false);
          }
          return;
        }
        setTurns(history);
        setError(err instanceof Error ? err.message : "something went wrong.");
      } finally {
        if (watchdog !== undefined) window.clearTimeout(watchdog);
        if (!controller.signal.aborted) setStreaming(false);
        abortRef.current = null;
        scrollToEnd();
      }
    },
    [streaming, scrollToEnd],
  );

  /* Restore the saved thread, unless we arrived with a question in the URL —
     a seeded visit is a new mood and shouldn't land mid-conversation. */
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    const seed = params.get("q")?.trim();
    if (seed) {
      void send(seed);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/ai/discover");
        if (!res.ok) return;
        const json = (await res.json()) as {
          turns?: Turn[];
          constraints?: string[];
          dismissed?: string[];
        };
        if (cancelled || !json.turns?.length) return;
        setTurns(
          json.turns.map((t) => ({
            role: t.role,
            content: t.content,
            items: t.items ?? [],
            chips: t.chips ?? [],
          })),
        );
        setConstraints(json.constraints ?? []);
        setDismissed(json.dismissed ?? []);
      } catch {
        // A thread that won't load is just an empty page, which is fine.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, send]);

  const dismiss = (item: SuggestedItem) => {
    setDismissed((current) =>
      current.includes(itemLabel(item)) ? current : [...current, itemLabel(item)],
    );
    setTurns((current) =>
      current.map((t) => ({
        ...t,
        items: t.items.filter((i) => itemKey(i) !== itemKey(item)),
      })),
    );
  };

  const reset = async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setTurns([]);
    setConstraints([]);
    setDismissed([]);
    setError("");
    setInput("");
    await fetch("/api/ai/discover", { method: "DELETE" }).catch(() => null);
  };

  const last = turns[turns.length - 1];
  const chips = !streaming && last?.role === "assistant" ? last.chips : [];

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24">
      <header className="relative pb-6 pt-10">
        <p className="overline-track text-accent">no thinking required</p>
        <h1 className="text-offset mt-2 text-4xl font-black tracking-tight sm:text-5xl">
          what are we watching?
        </h1>
        <p className="mt-3 max-w-lg text-sm font-bold text-muted">
          say it the way you&apos;d say it to a friend. it reads your history, raids your own
          list first, and narrows down every time you answer back.
        </p>

        {/* the desk clerk, bobbing away in the corner */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 top-10 hidden animate-float sm:block"
        >
          <span className="grid size-16 -rotate-6 place-items-center rounded-3xl border-2 border-ink bg-accent-soft shadow-offset">
            <Popcorn className="size-8" strokeWidth={2.25} />
          </span>
        </span>
      </header>

      <ConstraintBar
        constraints={constraints}
        dismissedCount={dismissed.length}
        onRemove={(c) => setConstraints((current) => current.filter((x) => x !== c))}
        onReset={reset}
        busy={streaming}
      />

      {/* the tail padding is what lets the last card scroll clear of the
          sticky composer instead of sitting under it */}
      <div className="space-y-7 pb-4 pt-7">
        {turns.length === 0 && (
          <div className="rounded-3xl border-2 border-ink bg-card p-6 shadow-offset">
            <p className="flex items-center gap-2 text-sm font-black">
              <span className="grid size-8 -rotate-6 place-items-center rounded-xl bg-accent-soft">
                <Sparkles className="size-4" aria-hidden />
              </span>
              try one of these
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {STARTERS.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className={`rounded-full border-2 border-ink bg-accent-soft px-3.5 py-1.5 text-xs font-bold shadow-offset-xs transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-0 hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${TILTS[i % TILTS.length]}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) =>
          turn.role === "user" ? (
            /* The bubble hugs the text — flex-end plus w-fit, never a fixed
               column, so "yes" doesn't get the same box as a paragraph. */
            <div key={i} className="flex justify-end">
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="w-fit max-w-[85%] rotate-1 rounded-3xl border-2 border-ink bg-ink px-4 py-2.5 text-sm font-bold leading-relaxed text-white shadow-offset-xs"
              >
                {turn.content}
              </motion.p>
            </div>
          ) : (
            <div key={i} className="space-y-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 -rotate-6 place-items-center rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs"
                >
                  <Popcorn className="size-4.5" strokeWidth={2.25} />
                </span>
                {turn.content ? (
                  <motion.p
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-fit max-w-[85%] -rotate-[0.6deg] whitespace-pre-wrap rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink bg-card px-5 py-3 text-sm leading-relaxed shadow-offset-xs"
                  >
                    {turn.content}
                  </motion.p>
                ) : (
                  <ThinkingBubble context="triage" />
                )}
              </div>
              <PickStrip items={turn.items} onDismiss={dismiss} />
            </div>
          ),
        )}

        {error && (
          <p className="w-fit -rotate-1 rounded-2xl border-2 border-ink bg-accent-soft px-4 py-2 text-sm font-bold shadow-offset-xs">
            {error}
          </p>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 pl-12">
            <span className="text-xs font-bold text-muted">or:</span>
            {chips.map((c, i) => (
              <button
                key={c}
                type="button"
                onClick={() => void send(c)}
                className={`rounded-full border-2 border-ink bg-card px-3.5 py-1.5 text-xs font-bold shadow-offset-xs transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-0 hover:bg-accent-soft hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${TILTS[i % TILTS.length]}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {turns.length > 0 && (
          <p className="pl-12 text-[11px] font-bold text-muted">
            ai-generated — it can get details wrong. every poster above is a real title.
          </p>
        )}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-4 mt-7 flex gap-2 rounded-full border-2 border-ink bg-card p-2 shadow-offset-sm transition-shadow duration-200 focus-within:shadow-offset"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            turns.length ? "or tell it what to change…" : "something funny, under 100 minutes…"
          }
          aria-label="describe what you want to watch"
          maxLength={2000}
          className="h-10 min-w-0 flex-1 rounded-full bg-transparent px-4 text-sm placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          aria-label="ask"
          className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-accent shadow-offset-xs transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-offset-xs"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}

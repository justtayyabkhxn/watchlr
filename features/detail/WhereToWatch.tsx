"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import type { MediaType, TmdbWatchProviders } from "@/types/tmdb";
import type { StreamingOption } from "@/types/streaming";
import { Providers } from "@/features/detail/Providers";
import { Skeleton } from "@/components/ui/Skeleton";

const GROUPS: [StreamingOption["type"][], string][] = [
  [["subscription", "free"], "Stream"],
  [["addon"], "Channels"],
  [["rent"], "Rent"],
  [["buy"], "Buy"],
];

function OptionRow({ option }: { option: StreamingOption }) {
  return (
    <a
      href={option.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-2xl border-2 border-border bg-surface-hover/40 px-3 py-2.5 transition-colors hover:border-ink hover:bg-accent-soft"
    >
      {/* Service marks are SVGs off Movie of the Night's CDN — next/image
          blocks SVG by default, so a plain img is the right tool here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={option.logoLight}
        alt=""
        className="h-6 w-auto max-w-16 shrink-0"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">
          {option.serviceName}
          {option.addonName && (
            <span className="ml-1 font-bold text-muted">
              · {option.addonName}
            </span>
          )}
        </p>
        {option.expiresSoon && option.expiresOn && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-black text-accent">
            <CalendarClock className="size-3" aria-hidden />
            Leaving {new Date(option.expiresOn).toLocaleDateString(undefined, { month: "short", day: "numeric" })} — watch it while you can
          </p>
        )}
      </div>
      {option.price && (
        <span className="shrink-0 text-xs font-bold text-muted">{option.price}</span>
      )}
      {option.quality && (
        <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[10px] font-black uppercase text-white">
          {option.quality}
        </span>
      )}
      <ArrowUpRight
        className="size-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
        aria-hidden
      />
    </a>
  );
}

/**
 * Live "where to watch" via Movie of the Night: real deep links, prices,
 * quality, and leaving-soon warnings. Falls back to TMDB's provider
 * logos when the API isn't configured or doesn't know the title.
 */
export function WhereToWatch({
  tmdbId,
  mediaType,
  providers,
}: {
  tmdbId: number;
  mediaType: MediaType;
  providers?: TmdbWatchProviders;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["streaming", mediaType, tmdbId],
    queryFn: async (): Promise<{ options?: StreamingOption[]; country?: string }> => {
      const res = await fetch(
        `/api/streaming?tmdbId=${tmdbId}&mediaType=${mediaType}`,
      );
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    );
  }

  const options = data?.options ?? [];
  if (options.length === 0) {
    return <Providers providers={providers} />;
  }

  return (
    <div className="space-y-4">
      {GROUPS.map(([types, label]) => {
        const list = options.filter((o) => types.includes(o.type));
        if (list.length === 0) return null;
        return (
          <div key={label}>
            <p className="mb-2 text-[11px] font-black text-muted">{label}</p>
            <div className="space-y-2">
              {list.map((o) => (
                <OptionRow key={`${o.serviceId}-${o.type}-${o.addonName}`} option={o} />
              ))}
            </div>
          </div>
        );
      })}
      {data?.country && (
        <p className="text-[11px] font-bold text-muted">
          Availability in {data.country.toUpperCase()} · links go straight to the title
        </p>
      )}
    </div>
  );
}

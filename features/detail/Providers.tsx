import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { TmdbWatchProviders } from "@/types/tmdb";
import { tmdbImage } from "@/lib/media";

const GROUPS = [
  ["flatrate", "Stream"],
  ["rent", "Rent"],
  ["buy", "Buy"],
] as const;

export function Providers({
  providers,
  region = "US",
}: {
  providers?: TmdbWatchProviders;
  region?: string;
}) {
  const data = providers?.results?.[region] ?? providers?.results?.IN;
  if (!data || GROUPS.every(([key]) => !data[key]?.length)) {
    return (
      <p className="text-sm text-muted">
        Not on streaming right now — keep an eye out.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {GROUPS.map(([key, label]) => {
        const list = data[key];
        if (!list?.length) return null;
        return (
          <div key={key}>
            <p className="mb-2 text-[11px] font-black text-muted">{label}</p>
            <div className="flex flex-wrap gap-2">
              {list.slice(0, 8).map((p) => (
                <Image
                  key={p.provider_id}
                  src={tmdbImage(p.logo_path, "w92")!}
                  alt={p.provider_name}
                  title={p.provider_name}
                  width={40}
                  height={40}
                  className="rounded-xl border border-border"
                />
              ))}
            </div>
          </div>
        );
      })}
      <a
        href={data.link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-bold text-accent underline underline-offset-2 hover:text-ink"
      >
        All viewing options
        <ArrowUpRight className="size-3.5" aria-hidden />
      </a>
    </div>
  );
}

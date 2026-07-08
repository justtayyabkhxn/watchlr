import Image from "next/image";
import type { TmdbCastMember } from "@/types/tmdb";
import { tmdbImage } from "@/lib/media";
import { Rail } from "@/components/cards/Rail";

export function CastRail({ cast }: { cast: TmdbCastMember[] }) {
  const members = cast.slice(0, 16);
  if (members.length === 0) return null;

  return (
    <Rail label="Cast">
      {members.map((m) => {
        const photo = tmdbImage(m.profile_path, "w185");
        return (
          <div key={m.id} className="w-28 shrink-0 text-center">
            <div className="relative mx-auto aspect-square w-24 overflow-hidden rounded-full border-2 border-border bg-border">
              {photo ? (
                <Image src={photo} alt="" fill sizes="96px" draggable={false} className="object-cover" />
              ) : (
                <span className="grid h-full place-items-center text-xl font-black text-muted">
                  {m.name[0]}
                </span>
              )}
            </div>
            <p className="mt-2 line-clamp-1 text-sm font-bold">{m.name}</p>
            <p className="line-clamp-1 text-xs text-muted">{m.character}</p>
          </div>
        );
      })}
    </Rail>
  );
}

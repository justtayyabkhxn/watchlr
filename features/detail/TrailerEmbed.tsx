"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

/** Lite YouTube embed: thumbnail until clicked, then autoplay iframe. */
export function TrailerEmbed({ videoKey, title }: { videoKey: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl border-2 border-border bg-ink shadow-soft">
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0`}
          title={`${title} trailer`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${title} trailer`}
          className="group absolute inset-0"
        >
          <Image
            src={`https://i.ytimg.com/vi/${videoKey}/hqdefault.jpg`}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 640px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-16 place-items-center rounded-full bg-accent shadow-lift transition-transform group-hover:scale-110">
              <Play className="ml-1 size-7 fill-ink" aria-hidden />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

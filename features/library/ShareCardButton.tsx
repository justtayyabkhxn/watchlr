"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { Download, ImagePlus, Loader2, Share2, X } from "lucide-react";
import { genreName, releaseYear, tmdbImage } from "@/lib/media";
import { renderShareCard } from "@/lib/shareCard";
import type { TitlePayload } from "./hooks";
import { useRatings } from "./hooks";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Letterboxd-style story card: renders a 1080×1920 png of the title and
 *  hands it to the share sheet (instagram stories shows up there), with a
 *  download fallback on desktop. */
export function ShareCardButton({ item }: { item: TitlePayload }) {
  const [open, setOpen] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const { data: ratings } = useRatings(item.tmdbId, item.mediaType);
  const { status: authStatus } = useSession();
  // the public handle lives on the profile, not the session — fetch it lazily
  const { data: profile } = useQuery<{ username?: string }>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("profile unavailable");
      return res.json();
    },
    enabled: authStatus === "authenticated",
    staleTime: 5 * 60 * 1000,
  });

  const filename = `watchlr-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
  }, [previewUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const generate = async () => {
    setOpen(true);
    setRendering(true);
    setError(null);
    try {
      // the profile query may still be in flight when the button is clicked —
      // wait for the handle here so it always makes it onto the card
      let username = profile?.username || null;
      if (!username && authStatus === "authenticated") {
        try {
          const res = await fetch("/api/profile");
          if (res.ok) username = (await res.json()).username || null;
        } catch {
          // card just renders without the handle
        }
      }
      // ai one-liner for the card — best-effort, the card is fine without it
      let tagline: string | null = null;
      try {
        const res = await fetch("/api/ai/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            summaryType: "sarcastic_tagline",
          }),
        });
        if (res.ok) tagline = (await res.json()).content || null;
      } catch {
        // no tagline, no drama
      }
      const blob = await renderShareCard({
        title: item.title,
        year: releaseYear(item.releaseDate),
        mediaType: item.mediaType,
        posterUrl: tmdbImage(item.posterPath, "w780"),
        rating: item.voteAverage ?? 0,
        myRating: ratings?.mine ?? null,
        username,
        runtime: item.runtime ?? null,
        genres: (item.genreIds ?? []).map(genreName).filter(Boolean),
        tagline,
      });
      blobRef.current = blob;
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setError("couldn't draw the card — try again?");
    } finally {
      setRendering(false);
    }
  };

  const download = () => {
    const blob = blobRef.current;
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const share = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    setSharing(true);
    setError(null);
    try {
      if (Capacitor.isNativePlatform()) {
        // android/ios webviews have no navigator.share — write the png to
        // cache and hand its uri to the native sheet instead
        const [{ Filesystem, Directory }, { Share }] = await Promise.all([
          import("@capacitor/filesystem"),
          import("@capacitor/share"),
        ]);
        const written = await Filesystem.writeFile({
          path: filename,
          data: await blobToBase64(blob),
          directory: Directory.Cache,
        });
        await Share.share({ title: item.title, files: [written.uri] });
        return;
      }
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: item.title });
        return;
      }
      download(); // desktop browsers mostly can't share files — save it instead
    } catch (err) {
      // user dismissing the sheet is not an error worth surfacing
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof Error && /cancel/i.test(err.message)) return;
      setError("sharing didn't work — downloaded it instead");
      download();
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={generate}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-ink bg-card px-4 text-sm font-bold shadow-offset-xs transition-all duration-150 hover:-translate-x-px hover:-translate-y-px hover:rotate-1 hover:bg-accent-soft hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:rotate-0 active:shadow-none"
      >
        <ImagePlus className="size-4" aria-hidden />
        Story card
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Share a story card"
            onClick={(e) => e.target === e.currentTarget && close()}
          >
            <div className="w-full max-w-sm -rotate-1 rounded-3xl border-2 border-ink bg-card p-5 shadow-offset">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="overline-track text-accent">Made for stories</p>
                  <h2 className="text-xl font-black tracking-tight">Your story card</h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-card shadow-offset-xs transition-all duration-150 hover:-rotate-6 hover:bg-accent-soft active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  <X className="size-4" strokeWidth={3} aria-hidden />
                </button>
              </div>

              <div className="mx-auto aspect-[9/16] w-56 rotate-1 overflow-hidden rounded-2xl border-2 border-border bg-background shadow-soft">
                {rendering ? (
                  <div className="grid h-full place-items-center">
                    <Loader2 className="size-6 animate-spin text-muted" aria-hidden />
                  </div>
                ) : previewUrl ? (
                  // object url of a canvas render — next/image has nothing to optimize
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={`${item.title} story card`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center p-4 text-center text-xs font-bold text-muted">
                    {error ?? "nothing here yet"}
                  </div>
                )}
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={share}
                  disabled={rendering || sharing || !previewUrl}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border-2 border-ink bg-accent px-4 text-sm font-black shadow-offset-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-offset active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-60 disabled:shadow-offset-sm disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  {sharing ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Share2 className="size-4" aria-hidden />
                  )}
                  Share it
                </button>
                <button
                  type="button"
                  onClick={download}
                  disabled={rendering || !previewUrl}
                  aria-label="Download the card"
                  className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-card shadow-offset-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent-soft hover:shadow-offset active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-60"
                >
                  <Download className="size-4" aria-hidden />
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] font-bold text-muted">
                pick instagram in the share sheet — it lands right in your story
              </p>
              {error && previewUrl && (
                <p className="mt-2 text-center text-[11px] font-bold text-accent">{error}</p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

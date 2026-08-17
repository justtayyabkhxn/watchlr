"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

async function share(url: string, title: string): Promise<"shared" | "copied"> {
  // Prefer the native share sheet on mobile; fall back to clipboard on desktop.
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch {
      /* user dismissed — fall through to copy */
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

/** Share the current page URL (used on the public list page itself). */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const res = await share(window.location.href, document.title);
        if (res === "copied") {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-accent px-3 py-1 text-xs font-black text-ink shadow-offset-xs transition-transform hover:-translate-y-0.5"
    >
      {copied ? <Check className="size-3.5" strokeWidth={3} /> : <Share2 className="size-3.5" />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

/** Share a specific list by id (used in the library's list manager). */
export function ShareListButton({ id, name }: { id: string; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Share list ${name}`}
      onClick={async () => {
        const url = `${window.location.origin}/list/${id}`;
        const res = await share(url, name);
        if (res === "copied") {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
      className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-ink"
    >
      {copied ? (
        <Check className="size-4 text-accent" strokeWidth={3} />
      ) : (
        <Share2 className="size-4" />
      )}
    </button>
  );
}

/**
 * Canonical site config, shared by metadata, robots, sitemap and JSON-LD.
 * Override the origin per-environment with NEXT_PUBLIC_SITE_URL; the
 * production domain is the fallback so a missing env var never breaks
 * canonical/OG URLs on prod.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://watchlr.justtayyabkhan.com"
).replace(/\/$/, "");

export const SITE_NAME = "Watchlr";

export const SITE_DESCRIPTION =
  "Watchlr is a movie & TV tracker with AI summaries, ending explanations, spoiler-free reviews, and mood-based recommendations. Track what you watch, want to watch, and dropped — then let AI tell you what to watch tonight.";

/** Build an absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

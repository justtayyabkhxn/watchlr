import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getTrending, getTopRated } from "@/lib/tmdb";
import type { MediaItem } from "@/types/tmdb";

// Served at /sitemap.xml. Seeds crawlers with the marketing home plus a
// rotating set of real movie/TV title URLs pulled from TMDB, so generative
// engines and search bots have concrete pages to discover and cite. If TMDB
// is unreachable the sitemap still ships with the static routes.
export const revalidate = 86400; // refresh at most once a day

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
  ];

  let titles: MediaItem[] = [];
  try {
    const [trendingMovies, trendingTv, topMovies, topTv] = await Promise.all([
      getTrending("movie"),
      getTrending("tv"),
      getTopRated("movie"),
      getTopRated("tv"),
    ]);
    titles = [...trendingMovies, ...trendingTv, ...topMovies, ...topTv];
  } catch {
    // Degrade to the static routes when TMDB can't be reached at build time.
  }

  // De-dupe by media type + id, then map to canonical detail URLs.
  const seen = new Set<string>();
  const titleRoutes: MetadataRoute.Sitemap = [];
  for (const item of titles) {
    const key = `${item.mediaType}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    titleRoutes.push({
      url: `${SITE_URL}/${item.mediaType}/${item.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return [...staticRoutes, ...titleRoutes];
}

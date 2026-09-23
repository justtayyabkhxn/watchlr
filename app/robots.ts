import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Served at /robots.txt. Allows classic search crawlers and the major AI
// crawlers to read the public catalogue, while keeping the API and the
// signed-in app (dashboard, library, profile settings, auth) out of the index.
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/api/",
    "/dashboard",
    "/library",
    "/search",
    "/tonight",
    "/profile",
    "/login",
    "/register",
    "/forgot-password",
  ];

  // AI / generative-engine crawlers we explicitly welcome, so answers in
  // ChatGPT, Claude, Perplexity, Gemini and Copilot can cite Watchlr.
  const aiBots = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-Web",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Applebot-Extended",
    "Bingbot",
    "CCBot",
    "cohere-ai",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiBots.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

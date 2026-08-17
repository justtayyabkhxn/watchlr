import type { MetadataRoute } from "next";

// Makes the site installable (Add to Home Screen) and gives the Capacitor
// WebView shell proper name/colors. Next serves this at /manifest.webmanifest
// and links it automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Watchlr — track what you watch",
    short_name: "Watchlr",
    description:
      "A movie & TV tracker with AI summaries, streaming, and recommendations.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6efe3",
    theme_color: "#1d1d1d",
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png", purpose: "any" },
    ],
  };
}

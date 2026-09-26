import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// Default branded social/OG card for the whole site. Pages that set their own
// openGraph.images (movie, tv, list) override this; everything else (home,
// profiles, auth) gets this card. Rendered in the site palette — beige page,
// ink text, an amber dot grid, and the accent underline from the UI.
// No runtime override: with no dynamic inputs this is rendered once at build
// and served as a static PNG, instead of re-drawn on every crawler/share hit.
export const alt = "Watchlr — track what you watch";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#f6efe3",
          backgroundImage:
            "radial-gradient(rgba(213,184,133,0.5) 3px, transparent 3px)",
          backgroundSize: "48px 48px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 40,
            fontWeight: 800,
            color: "#1d1d1d",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              backgroundColor: "#f59e52",
              border: "3px solid #1d1d1d",
              marginRight: 20,
            }}
          />
          {SITE_NAME.toLowerCase()}
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 104,
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            color: "#1d1d1d",
            maxWidth: 980,
          }}
        >
          track what you watch.
        </div>
        <div
          style={{
            marginTop: 8,
            height: 22,
            width: 620,
            backgroundColor: "#f59e52",
            borderRadius: 4,
          }}
        />
        <div
          style={{
            marginTop: 40,
            fontSize: 38,
            fontWeight: 500,
            color: "#666666",
            maxWidth: 900,
          }}
        >
          ai summaries, ending explanations, and what to watch tonight.
        </div>
      </div>
    ),
    size,
  );
}

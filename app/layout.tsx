import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Bricolage_Grotesque } from "next/font/google";
import { Providers } from "./providers";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { RouteProgress } from "@/components/layout/RouteProgress";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Watchlr — track what you watch",
    template: "%s · Watchlr",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "movie tracker",
    "tv tracker",
    "watchlist",
    "what to watch",
    "AI movie recommendations",
    "ending explained",
    "spoiler-free summaries",
    "watch history",
    "watchlr",
  ],
  authors: [{ name: "Tayyab Khan", url: "https://justtayyabkhan.vercel.app/" }],
  creator: "Tayyab Khan",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    title: "Watchlr — track what you watch",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Watchlr — track what you watch",
    description: SITE_DESCRIPTION,
  },
  appleWebApp: { capable: true, title: "Watchlr", statusBarStyle: "default" },
};

// Brand entity anchor for AI knowledge graphs and rich results. Rendered into
// the SSR HTML so crawlers that don't execute JS still see it.
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "EntertainmentApplication",
  operatingSystem: "Web, Android",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: {
    "@type": "Person",
    name: "Tayyab Khan",
    url: "https://justtayyabkhan.vercel.app/",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d1d1d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={bricolage.variable}>
      <body className="min-h-dvh antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/* a few backdrop dots blink out and back — staggered prime-ish
            durations so the loop never reads as a loop */}
        <div aria-hidden>
          <span className="dot-blinker" style={{ animationDuration: "1.6s" }} />
          <span
            className="dot-blinker"
            style={{
              backgroundSize: "130px 130px",
              backgroundPosition: "26px 52px",
              animationDuration: "2.3s",
              animationDelay: "0.7s",
            }}
          />
          <span
            className="dot-blinker"
            style={{
              backgroundSize: "182px 182px",
              backgroundPosition: "52px 104px",
              animationDuration: "3.1s",
              animationDelay: "1.3s",
            }}
          />
        </div>
        <SmoothScroll />
        <RouteProgress />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { Providers } from "./providers";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "watchlr | track what you watch",
    template: "%s · watchlr",
  },
  description:
    "A movie & TV tracker with AI summaries, ending explanations, and recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={bricolage.variable}>
      <body className="min-h-dvh antialiased">
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

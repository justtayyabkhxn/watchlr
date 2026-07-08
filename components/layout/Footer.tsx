import Link from "next/link";
import { ArrowRight, Clapperboard } from "lucide-react";

const columns = [
  {
    heading: "Explore",
    links: [
      { href: "/search", label: "Discover" },
      { href: "/library", label: "Library" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/register", label: "Create account" },
      { href: "/profile", label: "Profile" },
    ],
  },
];

export function Footer() {
  return (
    // transparent bg: the body's beige + dot grid shows straight through
    <footer className="relative mt-24 overflow-hidden border-t-2 border-ink shadow-offset-up">
      {/* one giant wordmark watermarked behind the whole footer */}
      <p
        aria-hidden
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center whitespace-nowrap text-[24vw] font-black leading-none text-[#c96f28] opacity-15"
      >
        watchr
      </p>

      {/* mobile: brand full-width, explore + account side by side below */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-6 py-12 sm:grid-cols-[1.5fr_1fr_1fr] sm:gap-10 sm:py-14">
        <div className="col-span-2 max-w-xs sm:col-span-1">
          {/* same lockup + wiggle as the navbar */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-lg font-black tracking-tight active:scale-95"
          >
            <span className="grid size-8 -rotate-6 place-items-center rounded-xl border-2 border-ink bg-accent shadow-offset-xs transition-all duration-200 group-hover:animate-wiggle group-hover:bg-accent-soft">
              <Clapperboard className="size-4.5" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="transition-transform duration-200 group-hover:-rotate-2 group-hover:scale-105">
              watchr
            </span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Track everything you watch. Endings explained, spoilers dodged,
            recommendations that actually fit your taste.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h3 className="overline-track inline-block -rotate-2 rounded-full border-2 border-ink bg-accent-soft px-3 py-1 shadow-offset-xs">
              {col.heading}
            </h3>
            <ul className="mt-5 space-y-1">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-0 rounded-full px-3 py-1.5 text-sm font-bold text-muted transition-all duration-150 hover:-translate-y-0.5 hover:bg-surface-hover hover:text-ink active:translate-y-0"
                  >
                    <span className="w-0 overflow-hidden transition-all duration-200 group-hover:w-4" aria-hidden>
                      <ArrowRight className="size-3.5 text-accent" strokeWidth={3} />
                    </span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="relative border-t-2 border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-5 text-xs font-semibold text-muted">
          <p>© {new Date().getFullYear()} Watchr — made for people who watch too much.</p>
          <p>
            Crafted by{" "}
            <a
              href="https://justtayyabkhan.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-black text-ink underline decoration-accent decoration-2 underline-offset-2 transition-transform duration-150 hover:-rotate-2 hover:scale-105"
            >
              @justtayyabkhan
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

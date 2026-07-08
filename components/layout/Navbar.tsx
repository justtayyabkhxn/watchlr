"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { Clapperboard, Menu, Search, X, LogOut } from "lucide-react";
import { useUIStore } from "@/store/ui";

const links = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Discover" },
  { href: "/library", label: "Library" },
  { href: "/dashboard", label: "Dashboard" },
];

function SearchBox({ className = "", autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        useUIStore.getState().setMobileMenuOpen(false);
        router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
      }}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted transition-all duration-300 group-focus-within:rotate-12 group-focus-within:text-accent"
      />
      <input
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search movies & shows…"
        aria-label="Search movies and shows"
        className="h-10 w-full rounded-full border-2 border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted transition-all duration-300 focus:border-ink focus:shadow-offset-xs focus:outline-none"
      />
    </form>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-background/95 shadow-offset-down backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 text-xl font-black tracking-tight active:scale-95"
        >
          <span className="grid size-8 -rotate-6 place-items-center rounded-xl border-2 border-ink bg-accent shadow-offset-xs transition-all duration-200 group-hover:animate-wiggle group-hover:bg-accent-soft">
            <Clapperboard className="size-4.5" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="transition-transform duration-200 group-hover:-rotate-2 group-hover:scale-105">
            watchlr
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-3.5 py-1.5 text-sm font-bold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                  active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {/* sliding sticker pill glides between active links */}
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-0 -z-10 -rotate-2 rounded-full border-2 border-ink bg-accent-soft shadow-offset-xs"
                  />
                )}
                {!active && (
                  <span className="absolute inset-0 -z-10 scale-75 rounded-full bg-surface-hover opacity-0 transition-all duration-150 hover:scale-100 hover:opacity-100" aria-hidden />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <SearchBox className="group hidden w-48 transition-[width] duration-300 ease-out focus-within:w-72 lg:block" />
          {session?.user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/profile"
                className="grid size-9 place-items-center rounded-full border-2 border-ink bg-accent-soft text-sm font-black shadow-offset-xs transition-all duration-150 hover:-rotate-6 hover:scale-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                aria-label="Your profile"
              >
                {session.user.name?.[0] ?? "?"}
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="group/out inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-ink bg-ink px-4 text-xs font-black text-white shadow-offset-xs transition-all duration-150 hover:-translate-x-px hover:-translate-y-px hover:-rotate-2 hover:bg-accent hover:text-ink hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:rotate-0 active:shadow-none"
              >
                <LogOut className="size-3.5 transition-transform duration-200 group-hover/out:translate-x-1" aria-hidden />
                log out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full bg-ink px-5 py-2 text-sm font-bold text-white shadow-offset-xs transition-all duration-150 hover:-translate-x-px hover:-translate-y-px hover:bg-accent hover:text-ink hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none md:block"
            >
              Sign in
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="grid size-10 place-items-center rounded-full border-2 border-ink bg-card shadow-offset-xs transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none md:hidden"
          >
            <span className={`transition-transform duration-300 ${mobileMenuOpen ? "rotate-90" : ""}`}>
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden border-t-2 border-border md:hidden"
          >
            <div className="space-y-1 px-6 py-4">
              <SearchBox className="mb-3" />
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-lg font-black transition-colors hover:bg-surface-hover"
                >
                  {link.label}
                </Link>
              ))}
              {session?.user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-lg font-black transition-colors hover:bg-surface-hover"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-ink px-4 py-3 text-lg font-black text-white shadow-offset-sm transition-all duration-150 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                  >
                    <LogOut className="size-4" aria-hidden />
                    Log out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 block rounded-full bg-ink px-4 py-3 text-center text-lg font-black text-white"
                >
                  Sign in
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

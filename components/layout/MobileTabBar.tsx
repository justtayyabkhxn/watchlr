"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Bookmark, Home, Search, User } from "lucide-react";

const tabs = [
  { href: "/", label: "home", icon: Home },
  { href: "/library", label: "library", icon: Bookmark },
  { href: "/dashboard", label: "stats", icon: BarChart3 },
  { href: "/profile", label: "you", icon: User },
] as const;

/**
 * Thumb-reach navigation for phones: a fixed bottom bar with a raised
 * sticker search button in the middle. Desktop keeps the top navbar
 * (this renders md:hidden). Content clearance comes from the body
 * padding-bottom rule in globals.css.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // hide on auth screens — they have their own focused layout
  if (["/login", "/register", "/forgot-password"].includes(pathname)) return null;

  const searchActive = pathname.startsWith("/search");

  return (
    <nav
      aria-label="Bottom navigation"
      data-mobile-tabbar
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-ink bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-offset-up backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-between px-3">
        {tabs.slice(0, 2).map((tab) => (
          <Tab key={tab.href} {...tab} pathname={pathname} />
        ))}

        {/* raised center search sticker */}
        <Link
          href="/search"
          aria-label="Search movies and shows"
          aria-current={searchActive ? "page" : undefined}
          className="relative -top-5 self-center"
        >
          <motion.span
            whileTap={reduceMotion ? undefined : { scale: 0.9, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className={`grid size-14 -rotate-3 place-items-center rounded-full border-2 border-ink shadow-offset-sm transition-colors duration-150 ${
              searchActive ? "bg-ink text-white" : "bg-accent text-ink"
            }`}
          >
            <Search className="size-6" strokeWidth={2.5} aria-hidden />
          </motion.span>
        </Link>

        {tabs.slice(2).map((tab) => (
          <Tab key={tab.href} {...tab} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function Tab({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  pathname: string;
}) {
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex w-16 flex-col items-center justify-center gap-0.5 text-[10px] font-black transition-colors duration-150 active:scale-95 ${
        active ? "text-ink" : "text-muted"
      }`}
    >
      {active && (
        <motion.span
          layoutId="mobile-tab-pill"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="absolute inset-x-1 inset-y-2 -z-10 -rotate-2 rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs"
          aria-hidden
        />
      )}
      <Icon className="size-5" strokeWidth={active ? 2.5 : 2} aria-hidden />
      {label}
    </Link>
  );
}

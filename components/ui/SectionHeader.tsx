import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Editorial section header: tracked-out overline + oversized title. */
export function SectionHeader({
  overline,
  title,
  href,
  hrefLabel = "see all",
  action,
}: {
  overline: string;
  title: string;
  href?: string;
  hrefLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="overline-track text-accent">{overline}</p>
        <h2 className="text-offset mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          {title}
        </h2>
      </div>
      {action}
      {href && (
        <Link
          href={href}
          className="group mb-1 inline-flex shrink-0 items-center gap-1 text-sm font-bold text-muted transition-colors hover:text-ink"
        >
          {hrefLabel}
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

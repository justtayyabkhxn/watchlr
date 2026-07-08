import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-border bg-card px-6 py-14 text-center">
      <span className="grid size-14 -rotate-6 place-items-center rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs">
        <Icon className="size-6" strokeWidth={2.25} aria-hidden />
      </span>
      <h3 className="mt-5 text-xl font-black">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-6 rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-white shadow-offset-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent hover:text-ink hover:shadow-offset active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

import Link from "next/link";
import {
  Brain,
  CloudRain,
  Ghost,
  Heart,
  Laugh,
  Rocket,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";

/** Playful mood → TMDB genre shortcuts. Each card deep-links into discover. */
const MOODS: { icon: LucideIcon; label: string; genre: number }[] = [
  { icon: Laugh, label: "make me laugh", genre: 35 },
  { icon: Ghost, label: "scare me silly", genre: 27 },
  { icon: Heart, label: "love story pls", genre: 10749 },
  { icon: Rocket, label: "blast off", genre: 878 },
  { icon: Brain, label: "twist my brain", genre: 9648 },
  { icon: Zap, label: "big loud action", genre: 28 },
  { icon: CloudRain, label: "make me cry", genre: 18 },
  { icon: Wand2, label: "pure magic", genre: 14 },
];

const tilts = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1"];

export function MoodPicker() {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <SectionHeader
        overline="No thinking required"
        title="Pick tonight's mood"
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {MOODS.map(({ icon: Icon, label, genre }, i) => (
          <Link
            key={genre}
            href={`/search?genre=${genre}`}
            className={`group flex flex-col items-center gap-3 rounded-3xl border-2 border-ink bg-card p-6 shadow-offset transition-all duration-150 ease-out hover:-translate-y-1 hover:rotate-0 hover:bg-accent-soft hover:shadow-offset-lg active:translate-x-[4px] active:translate-y-[4px] active:shadow-none ${tilts[i % tilts.length]}`}
          >
            <span
              className="grid size-14 place-items-center rounded-2xl bg-accent-soft transition-all duration-200 group-hover:animate-wiggle group-hover:bg-accent"
              aria-hidden
            >
              <Icon className="size-7" strokeWidth={2.25} />
            </span>
            <span className="text-sm font-black">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

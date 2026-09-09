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

/*
 * Playful mood shortcuts. Each card opens the suggestion conversation with
 * its `seed` already asked, rather than dumping the user in a genre filter —
 * a mood is an opening line, and the useful part is the follow-up.
 */
const MOODS: { icon: LucideIcon; label: string; seed: string }[] = [
  { icon: Laugh, label: "make me laugh", seed: "make me laugh, nothing heavy" },
  { icon: Ghost, label: "scare me silly", seed: "scare me, but i still want to sleep tonight" },
  { icon: Heart, label: "love story pls", seed: "a love story that isn't corny" },
  { icon: Rocket, label: "blast off", seed: "big sci-fi, take me somewhere else" },
  { icon: Brain, label: "twist my brain", seed: "something that messes with my head" },
  { icon: Zap, label: "big loud action", seed: "big loud action, no thinking required" },
  { icon: CloudRain, label: "make me cry", seed: "i want to cry about it" },
  { icon: Wand2, label: "pure magic", seed: "something magical and warm" },
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
        {MOODS.map(({ icon: Icon, label, seed }, i) => (
          <Link
            key={label}
            href={`/tonight?q=${encodeURIComponent(seed)}`}
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

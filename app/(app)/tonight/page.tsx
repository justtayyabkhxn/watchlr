import { Suspense } from "react";
import type { Metadata } from "next";
import { TonightExperience } from "@/features/discover/TonightExperience";

export const metadata: Metadata = {
  title: "Tonight",
  description:
    "Tell watchlr what you're in the mood for and it picks — from your own list first, then the rest of the catalogue, narrowing every time you answer back.",
};

export default function TonightPage() {
  return (
    <Suspense>
      <TonightExperience />
    </Suspense>
  );
}

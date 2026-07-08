import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchExperience } from "@/features/search/SearchExperience";

export const metadata: Metadata = { title: "Discover" };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchExperience />
    </Suspense>
  );
}

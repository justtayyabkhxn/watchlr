import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LibraryView } from "@/features/library/LibraryView";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?from=/library");
  return <LibraryView />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Collection } from "@/models/Collection";
import { User } from "@/models/User";
import { tmdbImage } from "@/lib/media";
import { CopyLinkButton } from "@/features/library/ShareListButton";

interface CollectionItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
}

async function loadList(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const list = await Collection.findById(id).lean();
  if (!list) return null;
  const owner = await User.findById(list.userId).select("name username").lean();
  return {
    name: list.name,
    description: list.description,
    items: list.items as unknown as CollectionItem[],
    ownerName: owner?.name ?? "A watchlr user",
    ownerUsername: owner?.username ?? null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const list = await loadList(id);
  if (!list) return { title: "List not found" };
  const poster = tmdbImage(list.items[0]?.posterPath ?? null, "w500");
  return {
    title: `${list.name} — a watchlr list`,
    description:
      list.description || `${list.items.length} titles curated by ${list.ownerName}.`,
    openGraph: {
      title: list.name,
      description:
        list.description || `${list.items.length} titles curated by ${list.ownerName}.`,
      images: poster ? [poster] : undefined,
    },
  };
}

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const list = await loadList(id);
  if (!list) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-14">
      <header className="mb-10">
        <p className="overline-track text-accent">A watchlr list</p>
        <h1 className="text-offset mt-2 text-4xl font-black tracking-tight sm:text-5xl">
          {list.name}
        </h1>
        {list.description && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{list.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold text-muted">
          <span>
            {list.items.length} title{list.items.length === 1 ? "" : "s"} ·{" "}
            {list.ownerUsername ? (
              <Link href={`/${list.ownerUsername}`} className="text-ink hover:underline">
                @{list.ownerUsername}
              </Link>
            ) : (
              list.ownerName
            )}
          </span>
          <CopyLinkButton />
        </div>
      </header>

      {list.items.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-sm font-bold text-muted">
          This list is empty for now.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {list.items.map((item) => {
            const poster = tmdbImage(item.posterPath, "w342");
            return (
              <Link
                key={`${item.mediaType}-${item.tmdbId}`}
                href={`/${item.mediaType}/${item.tmdbId}`}
                className="group block"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-border bg-border shadow-soft transition-shadow group-hover:shadow-lift">
                  {poster && (
                    <Image
                      src={poster}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 45vw, 210px"
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-bold group-hover:underline">
                  {item.title}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

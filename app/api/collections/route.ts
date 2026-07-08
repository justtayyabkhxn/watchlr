import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Collection } from "@/models/Collection";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  const collections = await Collection.find({ userId }).sort({ updatedAt: -1 }).lean();
  return NextResponse.json({
    collections: collections.map((c) => ({
      id: String(c._id),
      name: c.name,
      description: c.description,
      items: c.items,
    })),
  });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { name, description } = body ?? {};
  if (typeof name !== "string" || name.trim().length < 1) {
    return NextResponse.json({ error: "List needs a name." }, { status: 400 });
  }

  await connectDB();
  const collection = await Collection.create({
    userId,
    name: name.trim().slice(0, 80),
    description: typeof description === "string" ? description.slice(0, 300) : "",
  });

  return NextResponse.json({ id: String(collection._id) }, { status: 201 });
}

/** Add or remove an item: { id, action: "add" | "remove", item: {tmdbId, mediaType, title, posterPath} } */
export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { id, action, item } = body ?? {};
  if (
    typeof id !== "string" ||
    (action !== "add" && action !== "remove") ||
    !Number.isInteger(item?.tmdbId) ||
    (item?.mediaType !== "movie" && item?.mediaType !== "tv")
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  await connectDB();

  if (action === "add") {
    if (typeof item.title !== "string" || !item.title) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    await Collection.updateOne(
      { _id: id, userId, "items.tmdbId": { $ne: item.tmdbId } },
      {
        $push: {
          items: {
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath ?? null,
          },
        },
      },
    );
  } else {
    await Collection.updateOne(
      { _id: id, userId },
      { $pull: { items: { tmdbId: item.tmdbId, mediaType: item.mediaType } } },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  await connectDB();
  await Collection.deleteOne({ _id: id, userId });
  return NextResponse.json({ ok: true });
}

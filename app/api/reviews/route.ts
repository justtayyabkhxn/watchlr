import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { Rating } from "@/models/Rating";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const tmdbId = Number(p.get("tmdbId"));
  const mediaType = p.get("mediaType");
  if (!tmdbId || (mediaType !== "movie" && mediaType !== "tv")) {
    return NextResponse.json({ error: "Invalid params." }, { status: 400 });
  }

  await connectDB();
  const userId = await getUserId();

  const reviews = await Review.find({ tmdbId, mediaType })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("userId", "name username")
    .lean();

  // Attach each reviewer's star rating for the same title.
  const reviewerIds = reviews
    .map((r) => (r.userId as { _id?: unknown })?._id)
    .filter(Boolean)
    .map(String);
  const ratings = await Rating.find({
    tmdbId,
    mediaType,
    userId: { $in: reviewerIds },
  }).lean();
  const ratingByUser = new Map(ratings.map((r) => [String(r.userId), r.value]));

  return NextResponse.json({
    reviews: reviews.map((r) => {
      const author = r.userId as unknown as {
        _id: unknown;
        name?: string;
        username?: string;
      } | null;
      return {
        id: String(r._id),
        author: author?.username ? `@${author.username}` : (author?.name ?? "Someone"),
        username: author?.username ?? null,
        isMine: userId != null && String(author?._id) === userId,
        rating: ratingByUser.get(String(author?._id)) ?? null,
        content: r.content,
        hasSpoilers: r.hasSpoilers,
        createdAt: r.createdAt,
      };
    }),
  });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { tmdbId, mediaType, content, hasSpoilers } = body ?? {};
  if (
    !Number.isInteger(tmdbId) ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    typeof content !== "string" ||
    content.trim().length < 3
  ) {
    return NextResponse.json({ error: "Review must be at least 3 characters." }, { status: 400 });
  }

  await connectDB();
  await Review.findOneAndUpdate(
    { userId, tmdbId, mediaType },
    { $set: { content: content.trim().slice(0, 4000), hasSpoilers: !!hasSpoilers } },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  await connectDB();
  await Review.deleteOne({ _id: id, userId });
  return NextResponse.json({ ok: true });
}

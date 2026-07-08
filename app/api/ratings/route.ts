import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
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

  const [mine, agg] = await Promise.all([
    userId ? Rating.findOne({ userId, tmdbId, mediaType }).lean() : null,
    Rating.aggregate<{ avg: number; count: number }>([
      { $match: { tmdbId, mediaType } },
      { $group: { _id: null, avg: { $avg: "$value" }, count: { $sum: 1 } } },
    ]),
  ]);

  return NextResponse.json({
    mine: mine?.value ?? null,
    average: agg[0]?.avg ?? null,
    count: agg[0]?.count ?? 0,
  });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { tmdbId, mediaType, value } = body ?? {};
  if (
    !Number.isInteger(tmdbId) ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 10
  ) {
    return NextResponse.json({ error: "Rating must be 1–10." }, { status: 400 });
  }

  await connectDB();
  await Rating.findOneAndUpdate(
    { userId, tmdbId, mediaType },
    { $set: { value } },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}

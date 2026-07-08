import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { RecentSearch } from "@/models/RecentSearch";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ searches: [] });

  await connectDB();
  const rows = await RecentSearch.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  return NextResponse.json({ searches: rows.map((r) => r.query) });
}

export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  await RecentSearch.deleteMany({ userId });
  return NextResponse.json({ ok: true });
}

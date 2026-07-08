import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AIPick } from "@/models/AIPick";

/** Reshuffle: drop the cached picks so the next render regenerates. */
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  await AIPick.deleteOne({ userId });
  return NextResponse.json({ ok: true });
}

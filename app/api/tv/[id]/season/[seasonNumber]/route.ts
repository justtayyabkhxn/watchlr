import { NextResponse } from "next/server";
import { getSeasonDetails } from "@/lib/tmdb";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; seasonNumber: string }> },
) {
  const { id, seasonNumber } = await params;
  const tvId = Number(id);
  const season = Number(seasonNumber);
  if (!Number.isInteger(tvId) || !Number.isInteger(season)) {
    return NextResponse.json({ error: "Invalid params." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getSeasonDetails(tvId, season));
  } catch {
    return NextResponse.json({ error: "Season unavailable." }, { status: 502 });
  }
}

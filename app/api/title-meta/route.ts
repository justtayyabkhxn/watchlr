import { NextRequest, NextResponse } from "next/server";
import { getTitleMeta } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const id = Number(p.get("id"));
  const type = p.get("type");
  if (!Number.isInteger(id) || id <= 0 || (type !== "movie" && type !== "tv")) {
    return NextResponse.json({ error: "Invalid params." }, { status: 400 });
  }

  try {
    const meta = await getTitleMeta(id, type);
    return NextResponse.json(meta, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate" },
    });
  } catch {
    return NextResponse.json({ runtime: null, seasons: null }, { status: 200 });
  }
}

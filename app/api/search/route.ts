import { NextRequest, NextResponse } from "next/server";
import { searchMulti } from "@/lib/tmdb";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { RecentSearch } from "@/models/RecentSearch";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);

  if (!q) {
    return NextResponse.json({ items: [], page: 1, totalPages: 0 });
  }

  try {
    const result = await searchMulti(q, page);

    // Record the search for signed-in users (first page only, fire-and-forget).
    if (page === 1) {
      const userId = await getUserId();
      if (userId) {
        await connectDB();
        await RecentSearch.findOneAndUpdate(
          { userId, query: q.toLowerCase() },
          { $set: { updatedAt: new Date() } },
          { upsert: true },
        ).catch(() => {});
        // Keep only the 10 most recent
        const stale = await RecentSearch.find({ userId })
          .sort({ updatedAt: -1 })
          .skip(10)
          .select("_id");
        if (stale.length) {
          await RecentSearch.deleteMany({ _id: { $in: stale.map((s) => s._id) } });
        }
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof Error && "status" in err ? 502 : 500;
    return NextResponse.json({ error: "Search is unavailable right now." }, { status });
  }
}

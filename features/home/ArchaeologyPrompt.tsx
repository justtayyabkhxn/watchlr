import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Watchlist } from "@/models/Watchlist";
import { MAX_DIG, STALE_BEFORE, STALE_MIN_PILE } from "@/lib/archaeology";
import { WatchlistArchaeologist } from "@/features/library/WatchlistArchaeologist";

/**
 * Home-page gate for the watchlist archaeologist.
 *
 * Renders nothing at all unless there is genuinely a graveyard to dig: signed
 * out, a healthy shelf, or a shelf someone is actively working through all
 * get silence rather than an empty-state card. A maintenance chore only earns
 * space on the home page on the days it's real — and the count is a cheap
 * countDocuments, so the check costs one indexed query, not a model call.
 */
export async function ArchaeologyPrompt() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const staleCount = await Watchlist.countDocuments({
    userId: new Types.ObjectId(session.user.id),
    status: "want_to_watch",
    updatedAt: { $lt: STALE_BEFORE() },
  });

  if (staleCount < STALE_MIN_PILE) return null;

  return <WatchlistArchaeologist staleCount={Math.min(staleCount, MAX_DIG)} />;
}

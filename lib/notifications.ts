import "server-only";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";

type NotificationType = "achievement" | "system" | "reminder";

/** Create a notification. Assumes the caller has already connected to the DB,
 *  but connects defensively so it's safe to call from anywhere. */
export async function createNotification(input: {
  userId: string;
  type?: NotificationType;
  message: string;
  link?: string;
}) {
  await connectDB();
  await Notification.create({
    userId: input.userId,
    type: input.type ?? "system",
    message: input.message,
    link: input.link ?? "",
  });
}

// Achievement copy keyed by cumulative watch count. Kept intentionally small so
// milestones feel earned rather than spammy.
const WATCH_MILESTONES: Record<number, string> = {
  1: "First watch logged — welcome to watchlr. 🎬",
  10: "10 watches in. You're getting the hang of this.",
  25: "25 watches. Officially a regular.",
  50: "50 watches. That's a lot of popcorn. 🍿",
  100: "100 watches. Absolute cinema.",
  250: "250 watches. Do you even sleep?",
  500: "500 watches. The credits will never roll on you.",
};

/**
 * Fire an achievement notification when the user's cumulative watch count lands
 * exactly on a milestone. Idempotent: the same milestone never notifies twice,
 * even if the count dips and returns (e.g. after un-logging then re-logging).
 */
export async function checkWatchMilestone(userId: string, totalCount: number) {
  const message = WATCH_MILESTONES[totalCount];
  if (!message) return;

  await connectDB();
  const already = await Notification.findOne({
    userId,
    type: "achievement",
    message,
  }).lean();
  if (already) return;

  await createNotification({
    userId,
    type: "achievement",
    message,
    link: "/dashboard",
  });
}

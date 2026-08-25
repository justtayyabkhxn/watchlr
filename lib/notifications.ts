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
  1: "First watch logged — welcome to watchlr.",
  10: "10 watches in. You're getting the hang of this.",
  25: "25 watches. Officially a regular.",
  50: "50 watches. That's a lot of popcorn.",
  100: "100 watches. Absolute cinema.",
  250: "250 watches. Do you even sleep?",
  500: "500 watches. The credits will never roll on you.",
};

/**
 * Fire an achievement notification when the user's cumulative watch count
 * reaches a milestone. Catch-up aware: if the count jumps past milestones
 * (bulk import, completed-shelf cross-writes), the highest reached-but-
 * unnotified milestone still fires — exact landings are not required.
 * Idempotent: each milestone notifies at most once, and only the highest
 * outstanding one fires per call so a big jump doesn't spam the bell.
 */
export async function checkWatchMilestone(userId: string, totalCount: number) {
  const reached = Object.keys(WATCH_MILESTONES)
    .map(Number)
    .filter((m) => m <= totalCount);
  if (reached.length === 0) return;

  await connectDB();
  const sent = await Notification.find({
    userId,
    type: "achievement",
    message: { $in: reached.map((m) => WATCH_MILESTONES[m]) },
  })
    .select("message")
    .lean();
  const sentMessages = new Set(sent.map((s) => s.message));
  const outstanding = reached.filter((m) => !sentMessages.has(WATCH_MILESTONES[m]));
  if (outstanding.length === 0) return;

  await createNotification({
    userId,
    type: "achievement",
    message: WATCH_MILESTONES[Math.max(...outstanding)],
    link: "/dashboard",
  });
}

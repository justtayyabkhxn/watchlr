import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  const [rows, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ userId, read: false }),
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: rows.map((n) => ({
      id: String(n._id),
      type: n.type,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt,
    })),
  });
}

// Mark notifications read. Body `{ id }` marks one; empty body marks all.
export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = body?.id;

  await connectDB();
  if (typeof id === "string" && id) {
    await Notification.updateOne({ _id: id, userId }, { $set: { read: true } });
  } else {
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
  }

  return NextResponse.json({ ok: true });
}

// Clear notifications. `?id=` deletes one; otherwise clears all for the user.
export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");

  await connectDB();
  if (id) {
    await Notification.deleteOne({ _id: id, userId });
  } else {
    await Notification.deleteMany({ userId });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({
    name: user.name,
    username: user.username ?? "",
    email: user.email,
    bio: user.bio,
    favoriteGenres: user.favoriteGenres,
    favoriteActors: user.favoriteActors,
    createdAt: user.createdAt,
  });
}

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) {
    update.name = body.name.trim().slice(0, 60);
  }
  if (typeof body.username === "string" && body.username.trim()) {
    const username = body.username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-20 chars: letters, numbers, _" },
        { status: 400 },
      );
    }
    await connectDB();
    const taken = await User.findOne({ username, _id: { $ne: userId } });
    if (taken) {
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    }
    update.username = username;
  }
  if (typeof body.bio === "string") update.bio = body.bio.slice(0, 500);
  if (Array.isArray(body.favoriteGenres)) {
    update.favoriteGenres = body.favoriteGenres
      .filter((g: unknown) => typeof g === "string")
      .slice(0, 10);
  }
  if (Array.isArray(body.favoriteActors)) {
    update.favoriteActors = body.favoriteActors
      .filter((a: unknown) => typeof a === "string" && a.trim())
      .map((a: string) => a.trim().slice(0, 60))
      .slice(0, 10);
  }

  await connectDB();
  await User.findByIdAndUpdate(userId, { $set: update });
  return NextResponse.json({ ok: true });
}

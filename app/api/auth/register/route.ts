import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function POST(req: Request) {
  const { name, username, email, password } = await req.json().catch(() => ({}));

  if (
    typeof name !== "string" ||
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    name.trim().length < 2 ||
    !USERNAME_RE.test(username.toLowerCase().trim()) ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    password.length < 8
  ) {
    return NextResponse.json(
      {
        error:
          "Need a name, a username (3-20 chars: letters, numbers, _), a valid email and a password (8+ chars).",
      },
      { status: 400 },
    );
  }

  await connectDB();

  const cleanEmail = email.toLowerCase().trim();
  const cleanUsername = username.toLowerCase().trim();

  const existing = await User.findOne({
    $or: [{ email: cleanEmail }, { username: cleanUsername }],
  });
  if (existing) {
    const field = existing.email === cleanEmail ? "email" : "username";
    return NextResponse.json(
      { error: `That ${field} is already taken.` },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    name: name.trim(),
    username: cleanUsername,
    email: cleanEmail,
    passwordHash,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

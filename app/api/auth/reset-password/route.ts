import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  if (
    typeof token !== "string" ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return NextResponse.json(
      { error: "Valid token and password (8+ chars) required." },
      { status: 400 },
    );
  }

  await connectDB();
  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetToken: hashed,
    resetTokenExpiry: { $gt: new Date() },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Reset link is invalid or expired." },
      { status: 400 },
    );
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  return NextResponse.json({ ok: true });
}

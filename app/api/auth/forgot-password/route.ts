import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

/**
 * No email provider is configured, so the reset link is logged to the
 * server console. Swap the console.log for an email send when a
 * provider (Resend, SES, …) is chosen.
 */
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || !email) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always answer OK so the endpoint can't be used to enumerate accounts.
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = crypto.createHash("sha256").update(token).digest("hex");
    user.resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    console.log(
      `[watchlr] Password reset link for ${user.email}: ${base}/forgot-password?token=${token}`,
    );
  }

  return NextResponse.json({ ok: true });
}

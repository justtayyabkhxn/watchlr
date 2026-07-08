"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthHeading } from "@/features/auth/AuthHeading";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function RequestForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <AuthHeading
          overline="Check your inbox"
          title="Reset link sent"
          sub="If that email has an account, a reset link is on its way. (In development it's printed to the server console.)"
        />
        <Link href="/login" className="text-sm font-bold underline decoration-accent decoration-2 underline-offset-2">
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        overline="It happens"
        title="Forgot password"
        sub="Tell us your email and we'll send a reset link."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" loading={loading} className="w-full">
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-ink underline decoration-accent decoration-2 underline-offset-2">
          Sign in
        </Link>
      </p>
    </>
  );
}

function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/login");
  }

  return (
    <>
      <AuthHeading
        overline="Almost there"
        title="Choose a new password"
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="8+ characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
        <Button type="submit" loading={loading} className="w-full">
          Reset password
        </Button>
      </form>
    </>
  );
}

function ForgotPasswordInner() {
  const token = useSearchParams().get("token");
  return token ? <ResetForm token={token} /> : <RequestForm />;
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordInner />
    </Suspense>
  );
}

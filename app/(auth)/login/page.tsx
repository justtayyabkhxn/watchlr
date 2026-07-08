"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthHeading } from "@/features/auth/AuthHeading";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Wrong email or password. Try again?");
    } else {
      router.push(searchParams.get("from") ?? "/");
      router.refresh();
    }
  }

  return (
    <>
      <AuthHeading
        overline="Back for more?"
        title="The couch missed you."
        sub="Pick up right where you left off — spoilers still safely locked away."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email or username"
          type="text"
          autoComplete="username"
          required
          placeholder="you@popcorn.com or filmfreak_42"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="your secret handshake"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
        <div className="flex items-center justify-between pt-1">
          <Link
            href="/forgot-password"
            className="text-xs font-bold text-muted hover:text-ink"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Let me in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        First time?{" "}
        <Link
          href="/register"
          className="font-bold text-ink underline decoration-accent decoration-2 underline-offset-2"
        >
          Grab a seat
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthHeading } from "@/features/auth/AuthHeading";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again?");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <AuthHeading
        overline="New here?"
        title="Grab a seat."
        sub="Track everything, spoil nothing. Your movie nights are about to get organized."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Name"
          autoComplete="name"
          required
          minLength={2}
          placeholder="what should we call you?"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Username"
          autoComplete="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          placeholder="filmfreak_42 (letters, numbers, _)"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@popcorn.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="8+ characters, make it a good one"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
        <Button type="submit" loading={loading} className="mt-2 w-full">
          Start my watchlist
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already one of us?{" "}
        <Link
          href="/login"
          className="font-bold text-ink underline decoration-accent decoration-2 underline-offset-2"
        >
          Back to your couch
        </Link>
      </p>
    </>
  );
}

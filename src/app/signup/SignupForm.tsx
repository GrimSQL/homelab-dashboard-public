"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

export function SignupForm({
  code,
  role,
  expiresAt,
}: {
  code: string;
  role: string;
  expiresAt: string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, email, name, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Signup failed" }));
      setError(body.error ?? "Signup failed");
      setPending(false);
      return;
    }
    // Auto-sign-in after successful account creation. If that fails we
    // redirect to /login so the user can retry manually.
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (signInRes?.ok) {
      window.location.href = "/";
    } else {
      window.location.href = "/login";
    }
  }

  return (
    <form onSubmit={onSubmit} className="login-form" noValidate>
      <p
        style={{
          fontSize: 11,
          color: "var(--ink-mute)",
          fontFamily: "var(--mono)",
          marginBottom: 4,
        }}
      >
        role: {role} · expires {new Date(expiresAt).toISOString().slice(0, 10)}
      </p>
      <label className="caps" htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="caps" htmlFor="name">Name</label>
      <input
        id="name"
        type="text"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="caps" htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <p style={{ fontSize: 10, color: "var(--ink-mute)", fontFamily: "var(--mono)" }}>
        Min 12 chars. Must include upper + lower + digit + symbol.
      </p>
      {error ? <p className="login-error" role="alert">{error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "..." : "Create account"}
      </button>
    </form>
  );
}

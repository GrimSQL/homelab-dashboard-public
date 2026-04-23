"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (!res || res.error) {
      setError("Invalid email or password.");
      return;
    }
    if (res.ok) {
      // Hard navigation so the dashboard layout re-renders with the new session.
      window.location.href = callbackUrl;
    }
  }

  return (
    <form onSubmit={onSubmit} className="login-form" noValidate>
      <label className="caps" htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoFocus
      />
      <label className="caps" htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error ? <p className="login-error" role="alert">{error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "..." : "Sign in"}
      </button>
    </form>
  );
}

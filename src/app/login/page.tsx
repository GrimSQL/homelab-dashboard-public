import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const [session, { callbackUrl, error }] = await Promise.all([auth(), searchParams]);
  if (session?.user) redirect(callbackUrl || "/");

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="brand-name"><b>homelab</b><span>.example</span></div>
        </div>
        <h1 className="caps">Sign in</h1>
        {error ? <p className="login-error">Invalid email or password.</p> : null}
        <LoginForm callbackUrl={callbackUrl ?? "/"} />
      </div>
    </div>
  );
}

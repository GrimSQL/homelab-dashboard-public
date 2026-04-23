import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { validateInviteCode } from "@/lib/invites";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { code } = await searchParams;
  const validity = code
    ? await validateInviteCode(code)
    : ({ ok: false, reason: "not-found" } as const);

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="brand-name"><b>homelab</b><span>.example</span></div>
        </div>
        <h1 className="caps">Create account</h1>
        {!validity.ok ? (
          <div>
            <p className="login-error">
              This invite link is <b>{validity.reason.replace("-", " ")}</b>. Ask an admin for a new one.
            </p>
            <p style={{ marginTop: 12, fontSize: 12, color: "var(--ink-mute)" }}>
              Already have an account?{" "}
              <a href="/login" style={{ color: "var(--accent)" }}>Sign in</a>.
            </p>
          </div>
        ) : (
          <SignupForm
            code={code!}
            role={validity.invite.role}
            expiresAt={validity.invite.expiresAt.toISOString()}
          />
        )}
      </div>
    </div>
  );
}

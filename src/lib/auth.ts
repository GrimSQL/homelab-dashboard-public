import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { prisma } from "./db";
import { verifyPassword } from "./password";
import { bootstrapAdmin } from "./bootstrap-admin";
import { checkLoginAllowed, recordLoginAttempt } from "./services/login-throttle";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Argon2 dummy hash used to maintain near-constant verification time when the
// user record doesn't exist. Without this, "email not found" returns much
// faster than "wrong password", leaking account existence via timing.
const DUMMY_ARGON2_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$a0F0VDJYaGNKM0pONzBHNQ$dummydummydummydummydummydummydummydummydum";

// Auth.js v5 explicitly blocks the Credentials provider with database
// sessions (UnsupportedStrategy error). We use JWT sessions with a 7-day
// max age. The JWT is signed with AUTH_SECRET, so rotating that secret
// invalidates every outstanding session — a coarse but effective "logout
// everyone" mechanism. For a homelab-only app with a handful of accounts
// this is the right trade-off. The PrismaAdapter is still attached so
// that `prisma.user` is the source of truth for login + admin UI.
// PrismaAdapter's type is bound to the @prisma/client PrismaClient, but we
// import our client from @/generated/prisma (schema output path). At runtime
// they are the same thing, so we cast here.
export const { handlers, signIn, signOut, auth } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // 7 days
  trustHost: true, // required when behind a reverse proxy (Traefik / Cloudflare)
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw, req) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        // Best-effort client IP extraction. Behind Cloudflare → CF-Connecting-IP
        // is the real client; behind Traefik only → X-Forwarded-For first hop.
        // `req` is a Fetch-API Request on Auth.js v5.
        const headers =
          (req as { headers?: Headers } | undefined)?.headers ?? new Headers();
        const ip =
          headers.get("cf-connecting-ip") ??
          headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";

        // Layer A: in-app throttle. Check BEFORE DB lookup so we can't
        // accidentally extend a lockout by recording further failures.
        const allowed = await checkLoginAllowed(email, ip);
        if (!allowed.ok) {
          console.warn(
            `[auth] login throttled for ${email}@${ip}, retry after ${allowed.retryAfterSec}s`,
          );
          return null;
        }

        // Ensure the admin user exists before the first real login attempt.
        // Idempotent; cheap after the first call.
        await bootstrapAdmin();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await recordLoginAttempt(email, ip, false);
          // Constant-time guard: verify against a dummy hash so unknown emails
          // take roughly the same wall-clock time as wrong passwords.
          await verifyPassword(DUMMY_ARGON2_HASH, parsed.data.password).catch(
            () => false,
          );
          return null;
        }

        const ok = await verifyPassword(user.passwordHash, parsed.data.password);
        await recordLoginAttempt(email, ip, ok);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, copy id + role from the authorize() return value into
      // the token so we don't have to hit the DB on every request.
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      // Mirror the JWT claims onto the client-facing session object.
      const t = token as { id?: string; role?: string };
      (session.user as unknown as { id: string; role: string }).id = t.id ?? "";
      (session.user as unknown as { id: string; role: string }).role = t.role ?? "user";
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Defensive: only allow same-origin redirects after sign-in/out. This
      // is Auth.js v5's documented default, but we make it explicit so an
      // attacker who gets to control a `callbackUrl` query param cannot
      // bounce the user off to a phishing site.
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // Fall through to baseUrl on malformed URLs.
      }
      return baseUrl;
    },
  },
});

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
    };
  }
}

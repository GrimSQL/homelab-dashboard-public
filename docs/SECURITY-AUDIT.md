# Security Audit - reference notes

This document summarises the security posture of the dashboard and the categories of weaknesses you should check for if you fork the project. Specific findings from the original audit against a live deployment have been removed; use this as a checklist, not a disclosure.

## Posture summary

- **Auth:** Auth.js v5 with JWT sessions, 256-bit `AUTH_SECRET`, argon2id password hashing (`t=3, m=64 MiB, p=4`), invite-code flow with 128-bit entropy.
- **Cookies:** `HttpOnly`, `Secure`, `SameSite=Lax`, `__Secure-` prefixed.
- **Secrets:** not in git. `.env*` (except `.example`) is gitignored; verify with `git ls-files`.
- **Queries:** Prisma-parameterised; no `$queryRaw` / `$executeRaw` call sites.
- **Markdown:** rendered through `marked` + `isomorphic-dompurify`.

## Categories of weakness to check in a fork

### Authorization granularity
API routes under `/api/ha/*`, `/api/camera/[id]`, `/api/projects` must do both:
1. `auth()` for "is logged in".
2. An explicit role check (e.g. `requireAdminApi()`) where the resource is admin-only.

Middleware session-cookie presence is not sufficient on its own. If a feature is meant to be admin-only, enforce it inside the handler, not only via the sidebar link visibility.

### Login rate-limiting
Add both:
1. **In-app throttle** (`src/lib/services/login-throttle.ts`): sliding-window limit keyed by email + IP. Default: 5 failures / 15 min → 30 min lockout. A dummy argon2 verify on unknown emails keeps response-time near-constant.
2. **Perimeter rule** (Cloudflare / Traefik / your reverse proxy): rate-limit `/api/auth/callback/credentials` at the edge.

### Transport hardening
- Reverse proxy / CDN: SSL mode `full` (not `flexible`), min TLS 1.2, Always-HTTPS on, HSTS enabled with `max-age >= 31536000; includeSubDomains`.
- App: `next.config.ts` emits `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `poweredByHeader: false`.

### TLS scoping for self-signed origins
Do **not** set `NODE_TLS_REJECT_UNAUTHORIZED=0` globally. It also disables cert validation for every other outbound `fetch()` (GitHub API, any public HA URL, etc.), which creates an MITM footgun. Use a per-host `undici.Agent({ connect: { rejectUnauthorized: false } })` in `src/lib/http.ts` and only opt-in the clients that need it (PVE, Portainer).

### Input validation on admin-settable fields
The projects `url` field is interpolated into `href={\`https://${proj.url}.<domain>\`}`. Tighten the Zod schema to `z.string().regex(/^[a-z0-9-]+$/).nullable().optional()`. Add `rel="noopener noreferrer"` to every outbound anchor.

### Trusted host
`AUTH_TRUST_HOST=true` is fine behind a reverse proxy + tunnel that sets `Host` authoritatively. Revisit this before enabling any OAuth provider - a Host-header attack could redirect the OAuth callback to an attacker site. Pin `callbacks.redirect` to same-origin / relative URLs.

### Ship-check

- [ ] `NODE_TLS_REJECT_UNAUTHORIZED=0` not set in any compose or CI env.
- [ ] `git log --all -p -S "ptr_"` / `-S "gho_"` / `-S "ghp_"` return nothing.
- [ ] Admin routes return 404 to non-admins, not 403.
- [ ] Login throttle unit tests pass.
- [ ] Security headers present on every route (verify with `curl -I`).
- [ ] `pnpm audit --prod` clean.

### Deliberately out of scope

- Audit logging of admin actions. Add an `AuditLog` Prisma model if you expect more than one admin.
- Password-reset logout-everywhere. Add a `passwordChangedAt` check in the JWT callback to force immediate logout on reset without rotating `AUTH_SECRET`.
- CSP. Next 15's no-flash theme inline script + next/font inline styles conflict with `script-src 'self'` / `style-src 'self'` without nonces. Enable with nonces when you have the budget.

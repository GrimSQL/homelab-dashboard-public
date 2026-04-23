# homelab-dashboard

A Next.js 15 ops dashboard for a self-hosted homelab. Calm-terminal aesthetic with live data from Home Assistant, Proxmox, and Portainer. Invite-only auth, a Zigbee room overview, camera snapshots, energy metrics, backups, tailnet map, and more.

> This repo is a **sanitised public mirror** of a personal homelab dashboard. The mock data (`src/lib/data/mock.ts`) is synthetic - adapt it to your own inventory if you fork it.

## What it does

- **17 pages** covering a typical homelab: Dashboard, Status, Rack, Services, Network, Metrics, Backups, Tailscale, AdGuard, Bastion, Home Assistant, Energy & UPS, Zigbee, Cameras, Vehicles, Projects, Settings.
- **Live data** (15 s cache, background refresh) from three sources:
  - **Home Assistant** - mapped to room temperatures, hardware temps, disks, power, door/window sensors.
  - **Proxmox** - live CPU / RAM / uptime for the hypervisor + VM/LXC list.
  - **Portainer** - all docker containers with live CPU %, RAM MB, uptime.
- **Camera snapshots** proxied from HA with per-camera fallback.
- **Room control on `/hass`** - tap a card to toggle the lights group, brightness slider when on.
- **GitHub auto-sync for `/projects`** - private repos under a chosen owner show up in the projects list on a configurable interval.

## Auth + access

- Email + password via Auth.js v5 (Credentials provider, argon2id-hashed passwords, JWT sessions).
- **Invite-only signup** - admin generates single-use 32-hex codes via `/admin/invites`.
- Login rate-limited (5 failures / 15 min → 30 min lockout per email + IP).
- HSTS + X-Frame-Options + Permissions-Policy enforced at the app layer.

## Stack

- **Next.js 15** App Router, React 19, standalone output
- **Tailwind v4** + CSS variables for design tokens
- **Prisma + SQLite** for users, sessions, invite codes, projects, login throttle
- **Auth.js v5** (Credentials provider, JWT strategy)
- **Zustand** for client-side tweaks (theme / accent / density / font)
- **ky** for HTTP calls with per-host TLS scoping (undici Agent for self-signed origins)
- **Vitest** + **Playwright**

## Deploy

- **Image:** built locally or via GitHub Actions -> ghcr
- **Runtime:** any Docker host; reverse proxy of your choice
- **SQLite persisted** via a named Docker volume
- **Deploy script:** `bash scripts/deploy-portainer.sh` (uses `.env.deploy`)

See [`docs/DEPLOY.md`](./docs/DEPLOY.md) for the full runbook.

## Data sources

Each source has its own client in `src/lib/sources/`:
- `ha.ts` - `GET /api/states` via a long-lived access token
- `pve.ts` - `/api2/json/nodes` + `/cluster/resources` via API token
- `portainer.ts` - `/docker/containers/json` + per-container stats via API key
- `github.ts` - `/user/repos` for projects auto-sync

All three are fetched in parallel on a 15 s background loop. `getHomelab()` on the request path is a pure cache read (< 5 ms). Stale-while-revalidate means user requests never block on upstream fetches.

## Security posture

- All routes except `/login`, `/signup`, `/api/auth/*` gated by middleware
- Admin routes return 404 (not 403) to non-admins to avoid leaking endpoint existence
- Argon2id params: t=3, m=64 MiB, p=4
- Invite codes: 128-bit entropy, single-use with CAS transaction
- Per-host TLS relaxation only for internal self-signed origins

Audit trail: [`docs/SECURITY-AUDIT.md`](./docs/SECURITY-AUDIT.md).

## Local dev

```bash
pnpm install
cp .env.example .env.local
# fill in tokens + AUTH_SECRET (openssl rand -hex 32)
pnpm exec prisma db push
pnpm dev
```

Then visit `http://localhost:3000/login`.

## License

MIT - do whatever you want. No warranty, no support, fork it and make it yours.

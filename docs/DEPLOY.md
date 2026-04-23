# Deploy runbook — homelab.example.com

## Architecture

- Source: `example-user/homelab-dashboard` (private)
- Image: `ghcr.io/example-user/homelab-dashboard:latest` (tagged per SHA too)
- CI: GitHub Actions on push to `main` — typecheck, test, build, push image
- Runtime: Portainer stack `homelab-dashboard` on endpoint `2` (docker-proxmox)
- Reverse proxy: Traefik (container `traefik` on network `traefik-proxy`), Host rule on `homelab.example.com`
- External reach: existing Cloudflare Tunnel `example-tunnel` -> `http://traefik:80`

## Env contract

The stack needs these env vars at runtime:

| Name | Purpose |
|---|---|
| `IMAGE_TAG` | Image tag to pin (`latest` or a short SHA). Default `latest`. |
| `HA_BASE_URL` | Default `https://example.com`. The LAN IP `http://10.0.0.12:8123` is NOT reachable from inside docker-proxmox containers (HA trusted_networks + binding). Public URL goes in-and-out through Cloudflare. |
| `HA_TOKEN` | HA Long-Lived Access Token. Rotate via HA UI -> Profile -> Security. |
| `PVE_BASE_URL` | Proxmox URL (default `https://10.0.0.10:8006`). |
| `PVE_TOKEN_ID` | `homelab-dashboard@pve!readonly`. |
| `PVE_TOKEN_SECRET` | Secret from `pveum user token add`. Rotate on proxmox shell. |
| `PORTAINER_BASE_URL` | Default `https://10.0.0.13:9443`. |
| `PORTAINER_API_KEY` | API key the dashboard uses at runtime to query Portainer. |
| `PORTAINER_ENDPOINT_ID` | `2` (docker-proxmox). |
| `AUTH_SECRET` | Auth.js session signing key. `openssl rand -hex 32`. Rotating this invalidates every outstanding session (useful for "log everyone out"). |
| `AUTH_URL` | `https://homelab.example.com`. Used for OAuth-style redirects; we use Credentials, but Auth.js still reads this. |
| `ADMIN_EMAIL` | First-boot admin email. Used once on first boot to seed the admin user, then ignored. |
| `ADMIN_PASSWORD` | First-boot admin password (>= 12 chars with mixed classes). Once the admin exists, this env var is a no-op — use /admin/users to change the password later. |

All values are set at the Portainer stack level, NEVER committed to the repo.

## Persistent data

Auth data (users + hashed passwords) lives in SQLite at `/app/data/auth.sqlite`
inside the container, mounted from a named Docker volume
`homelab-dashboard-data`. The volume survives container recreation and image
upgrades. **Losing it means losing all user accounts** — on next startup the
admin bootstrap will recreate just the admin user from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` (family members would need to be re-added via /admin/users).

## Adding users (invite flow)

As of v0.3.0, new accounts are created by the user themselves via a
single-use invite URL. Admin CAN'T create accounts directly from the UI
anymore — the `/admin/users` page only does delete + reset-password.

Flow:

1. Admin signs in and opens `/admin/invites`.
2. Fills in: **Role** (user/admin), optional **Note** (e.g. "For family member"),
   **Expires** (1/7/14/30 days — default 14).
3. Clicks **Generate**. The full URL appears with a **Copy** button —
   shape `https://homelab.example.com/signup?code=<32-hex-chars>`.
4. Admin shares that URL out-of-band (SMS, Signal, whatever).
5. Recipient opens the URL, fills email + name + password (same policy as
   admin: >= 12 chars, upper + lower + digit + symbol), submits.
6. Account is created + the recipient is auto-signed-in. The invite is
   marked used and the URL stops working.

Invites can be **revoked** from `/admin/invites` before they're used — the
URL stops working immediately, even if it hasn't expired. Used invites
can't be revoked (the associated user stays intact; delete them from
`/admin/users` if needed).

Storage: invites live in the same SQLite file as users
(`/app/data/auth.sqlite`). Losing the volume loses all invites too.

## Creating the first admin user

Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` in `.env.deploy` before the first deploy.
On the very first container boot, `bootstrapAdmin()` creates the user if the
database has no row for that email. On every subsequent boot the check finds
the existing user and does nothing. This means:

- Changing `ADMIN_PASSWORD` in `.env.deploy` after first boot does NOT update
  the password.
- To change the admin password, sign in and use `/admin/users` -> reset
  password (or edit the SQLite file directly).

## Resetting passwords

Sign in as admin, open `/admin/users`, click "reset password" on the row,
type a new password (policy: >= 12 chars, upper + lower + digit + symbol),
save. The change applies immediately but existing JWT sessions remain valid
until they expire (max 7 days) or `AUTH_SECRET` is rotated. For forcing a
full logout of a user after a password reset, rotate `AUTH_SECRET`.

## Rotating AUTH_SECRET (force logout everyone)

1. `openssl rand -hex 32` -> new value
2. Update `AUTH_SECRET` in `.env.deploy`
3. Re-run `./scripts/deploy-portainer.sh`
4. Every user has to sign in again on their next request.

## Initial deployment

1. Ensure GitHub Actions has completed a successful build+push. Verify:
   ```bash
   gh run list --repo example-user/homelab-dashboard --limit 1
   ```
   The image must exist at `ghcr.io/example-user/homelab-dashboard:latest`.

2. Make the ghcr image pullable by Portainer. Two options:
   - **Public package** (simplest): go to GitHub -> package settings for `homelab-dashboard` -> Change visibility -> Public. This is a private app behind Cloudflare Access anyway — the image doesn't contain secrets.
   - **Private package**: add a ghcr registry in Portainer (Settings -> Registries) with a GitHub PAT scoped to `read:packages`. Then the compose `image:` reference must use the registry hostname Portainer knows about.

3. Copy `.env.deploy.example` to `.env.deploy` and fill in secrets.

4. Run the deploy script:
   ```bash
   ./scripts/deploy-portainer.sh
   ```
   This creates the stack on first run and updates it on subsequent runs.

5. Configure Cloudflare:
   - **DNS**: add CNAME `homelab.example.com` -> `<tunnel-id>.cfargotunnel.com`, proxied (orange cloud). Tunnel ID can be found in Cloudflare Zero Trust -> Access -> Tunnels.
   - **Tunnel route**: Zero Trust -> Access -> Tunnels -> `example-tunnel` -> Public Hostnames -> Add a public hostname:
     - Subdomain: `homelab`
     - Domain: `example.com`
     - Service: `http://traefik:80` (assuming the tunnel can reach Traefik by container name on the same Docker network) OR `http://docker-proxmox:80`. Check how existing routes like `app1.example.com` are configured.

6. Verify externally:
   ```bash
   curl -sI https://homelab.example.com/
   ```
   Expect HTTP 200.

## Redeploy (after a code change)

1. Push to `main`. CI builds + pushes `:latest` and `:<sha>`.
2. Re-run `./scripts/deploy-portainer.sh`. Portainer pulls the new `:latest` and recreates the container.
3. Or use Portainer UI -> Stacks -> homelab-dashboard -> "Update the stack" + "Re-pull image" checkbox.

## Rollback

Pin to a previous SHA:
```bash
IMAGE_TAG=abc123 ./scripts/deploy-portainer.sh
```

## Recovery when source APIs are down

The dashboard gracefully falls back to mocked data if HA / PVE / Portainer is unreachable. A `DataErrorBanner` surfaces which source is offline.

## Rotating tokens

### HA
Create a new LLAT in HA UI, update `HA_TOKEN` in `.env.deploy`, redeploy. Old token can stay or be revoked from HA Profile.

### Proxmox
```bash
ssh proxmox "pveum user token remove homelab-dashboard@pve readonly && \
  pveum user token add homelab-dashboard@pve readonly --privsep 0 --output-format json"
```
Copy the new secret into `.env.deploy`, redeploy.

### Portainer
Portainer user settings -> Access tokens -> Revoke + create new. Update `.env.deploy`, redeploy.

## Logs

- Container logs (live): Portainer UI -> container -> Logs, or SSH + `docker logs -f homelab-dashboard`
- Build logs: `gh run view <run-id> --repo example-user/homelab-dashboard --log`
